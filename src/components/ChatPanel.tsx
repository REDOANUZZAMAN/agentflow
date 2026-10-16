'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Sparkles, Bot, Loader2, Brain, Zap, CheckCircle2, Link2, Film, Image as ImageIcon, X, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '@/lib/context';
import { createNode, createEdge } from '@/lib/store';
import type { ChatMessage, NodeType, Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import TaskListCard from './TaskListCard';
import VideoCard from './VideoCard';

export default function ChatPanel() {
  const { state, dispatch, addMessage } = useApp();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.isAiTyping]);

  // Keyboard shortcut: Ctrl+Shift+M to toggle mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        dispatch({ type: 'SET_CHAT_MODE', payload: state.chatMode === 'plan' ? 'act' : 'plan' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.chatMode, dispatch]);

  // Process tool calls from API response and apply to canvas
  const processToolCalls = useCallback((toolCalls: any[], nodeIdMap?: Record<string, string>) => {
    const idMap: Record<string, string> = {};
    const addedNodeIds: string[] = [];

    for (const tool of toolCalls) {
      if (tool.name === 'add_node' && tool.result) {
        const result = tool.result;
        const node = createNode(result.type as NodeType, result.config || {}, result.position);
        idMap[result.nodeId] = node.id;
        addedNodeIds.push(node.id);
        dispatch({ type: 'ADD_NODE', payload: node });
      }
    }

    setTimeout(() => {
      for (const tool of toolCalls) {
        if (tool.name === 'connect_nodes' && tool.result) {
          const fromId = idMap[tool.input.from_node_id] || tool.input.from_node_id;
          const toId = idMap[tool.input.to_node_id] || tool.input.to_node_id;
          const fromResult = toolCalls.find(t => t.name === 'add_node' && t.result?.nodeId === tool.input.from_node_id);
          const toResult = toolCalls.find(t => t.name === 'add_node' && t.result?.nodeId === tool.input.to_node_id);
          const actualFromId = fromResult ? idMap[fromResult.result.nodeId] : fromId;
          const actualToId = toResult ? idMap[toResult.result.nodeId] : toId;
          if (actualFromId && actualToId) {
            dispatch({ type: 'ADD_EDGE', payload: createEdge(actualFromId, actualToId) });
          }
        } else if (tool.name === 'update_node' && tool.result) {
          const nodeId = idMap[tool.input.node_id] || tool.input.node_id;
          dispatch({ type: 'UPDATE_NODE', payload: { id: nodeId, data: { ...(tool.input.config ? { config: tool.input.config } : {}), ...(tool.input.label ? { label: tool.input.label } : {}) } } });
        } else if (tool.name === 'delete_node') {
          dispatch({ type: 'DELETE_NODE', payload: idMap[tool.input.node_id] || tool.input.node_id });
        } else if (tool.name === 'run_workflow') {
          simulateWorkflowRun();
        } else if (tool.name === 'create_task_list' && tool.input?.tasks) {
          const tasks: Task[] = (tool.input.tasks as any[]).map((t: any) => ({ id: t.id, title: t.title, status: 'pending' as const }));
          dispatch({ type: 'CREATE_TASK_LIST', payload: tasks });
        } else if (tool.name === 'start_task' && tool.input?.task_id) {
          dispatch({ type: 'START_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'complete_task' && tool.input?.task_id) {
          dispatch({ type: 'COMPLETE_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'fail_task' && tool.input?.task_id) {
          dispatch({ type: 'FAIL_TASK', payload: { id: tool.input.task_id as string, reason: (tool.input.reason as string) || 'Unknown error' } });
        } else if (tool.name === 'workflow_ready') {
          dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_ready_${Date.now()}`, timestamp: new Date(), level: 'run', message: `[OK] Workflow ready: ${tool.input?.summary || 'Complete'}` } });
        }
      }
    }, 300);

    const hasConnections = toolCalls.some(t => t.name === 'connect_nodes');
    if (!hasConnections && addedNodeIds.length > 1) {
      setTimeout(() => {
        for (let i = 0; i < addedNodeIds.length - 1; i++) {
          dispatch({ type: 'ADD_EDGE', payload: createEdge(addedNodeIds[i], addedNodeIds[i + 1]) });
        }
      }, 500);
    }
  }, [dispatch]);

  // The builder page owns runs (cost check, Stop, result message); ask it to start one
  const simulateWorkflowRun = useCallback(() => {
    window.dispatchEvent(new CustomEvent('agentflow:run'));
  }, []);

  const handleSubmit = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isSubmitting) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsSubmitting(true);

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: message, timestamp: new Date() };
    addMessage(userMsg);
    dispatch({ type: 'SET_AI_TYPING', payload: true });

    let streamChangedGraph = false; // Outer scope — nodes/edges added or removed → tidy layout in finally

    try {
      const apiPayload = {
        message: state.confirmedPlan && state.chatMode === 'act'
          ? `<confirmed_plan>\n${state.confirmedPlan}\n</confirmed_plan>\n\n${message}`
          : message,
        history: [...state.messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        nodes: state.nodes,
        edges: state.edges,
        mode: state.chatMode,
      };

      // Plan mode: use batch endpoint (no stream needed for conversation)
      if (state.chatMode === 'plan') {
        const planRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        });
        const data = await planRes.json();
        addMessage({
          id: uuidv4(), role: 'assistant',
          content: data.response || data.error || 'Something went wrong. Please try again.',
          timestamp: new Date(),
          buttons: data.buttons,
        });
        setIsSubmitting(false);
        dispatch({ type: 'SET_AI_TYPING', payload: false });
        return;
      }

      // Act mode: use streaming endpoint for live build
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok || !response.body) {
        // Fallback to batch endpoint
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: [...state.messages, userMsg].map((m) => ({ role: m.role, content: m.content })), nodes: state.nodes, edges: state.edges, mode: state.chatMode }),
        });
        const data = await fallbackRes.json();
        if (data.toolCalls?.length) processToolCalls(data.toolCalls, data.nodeIdMap);
        if (data.taskList?.length) {
          const tasks: Task[] = data.taskList.map((t: any) => ({ id: t.id, title: t.title, status: 'pending' as const }));
          dispatch({ type: 'CREATE_TASK_LIST', payload: tasks });
          let d = 200;
          tasks.forEach(t => { setTimeout(() => dispatch({ type: 'START_TASK', payload: t.id }), d); d += 400; setTimeout(() => dispatch({ type: 'COMPLETE_TASK', payload: t.id }), d); d += 300; });
        }
        if (data.workflowName) dispatch({ type: 'SET_WORKFLOW_META', payload: { name: data.workflowName, emoji: data.workflowEmoji } });
        addMessage({ id: uuidv4(), role: 'assistant', content: data.response, timestamp: new Date(), toolCalls: data.toolCalls?.map((tc: any) => ({ id: tc.id, name: tc.name, input: tc.input, status: 'done' as const })), buttons: data.buttons });
        setTimeout(() => dispatch({ type: 'AUTO_LAYOUT' }), 600);
        setIsSubmitting(false);
        dispatch({ type: 'SET_AI_TYPING', payload: false });
        return;
      }

      // Stream SSE events with CLIENT-SIDE PACING
      // (Server sends all events at once; Vercel buffers SSE. So we queue + pace on the client.)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamText = '';
      const streamToolCalls: any[] = [];
      const streamNodeIdMap: Record<string, string> = {};

      // Force a browser paint + wait — guarantees React renders between dispatches
      const clientDelay = (ms: number) => new Promise<void>(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, ms));
      });

      // Queue for client-side pacing
      const toolEventQueue: any[] = [];

      // Read the ENTIRE SSE stream first, collecting all events into the queue
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); }
          else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case 'tool': toolEventQueue.push(data); break;
                case 'text': streamText = data.content || ''; break;
                case 'status': break;
                case 'done': streamText = data.text || streamText; break;
                case 'error': throw new Error(data.message || 'Stream error');
              }
            } catch (e) { if (currentEvent === 'error') throw e; }
            currentEvent = '';
          } else if (line === '') { currentEvent = ''; }
        }
      }

      // SMART CANVAS CLEAR: Only clear if this is a NEW workflow build (has add_node calls).
      // If Claude is UPDATING existing nodes, don't clear or we'll lose them!
      const hasAddNodes = toolEventQueue.some(t => t.name === 'add_node');
      const hasUpdateNodes = toolEventQueue.some(t => t.name === 'update_node');
      const hasTaskList = toolEventQueue.some(t => t.name === 'create_task_list');
      // Clear only if we have a task list AND add_nodes AND no update_nodes (= fresh build)
      const shouldClearCanvas = hasTaskList && hasAddNodes && !hasUpdateNodes;

      // Process a single tool event — dispatches to React store
      const processStreamedTool = (tool: any) => {
        if (tool.name === 'add_node' && tool.result && !tool.result.rejected && !tool.result.duplicate) {
          const node = createNode(tool.result.type as NodeType, tool.result.config || {}, tool.result.position);
          streamNodeIdMap[tool.result.nodeId] = node.id;
          dispatch({ type: 'ADD_NODE', payload: node });
          console.log('[AgentFlow] ADD_NODE:', tool.result.type, node.id, tool.result.position);
        } else if (tool.name === 'connect_nodes' && tool.result && tool.result.success !== false) {
          const fromServer = tool.result.from || tool.input.from_node_id;
          const toServer = tool.result.to || tool.input.to_node_id;
          const fromId = streamNodeIdMap[fromServer] || fromServer;
          const toId = streamNodeIdMap[toServer] || toServer;
          if (fromId && toId) {
            dispatch({ type: 'ADD_EDGE', payload: createEdge(fromId, toId) });
          }
        } else if (tool.name === 'create_task_list' && tool.input?.tasks) {
          if (shouldClearCanvas) {
            dispatch({ type: 'CLEAR_CANVAS' });
            console.log('[AgentFlow] CLEAR_CANVAS (fresh build)');
          }
          dispatch({ type: 'CREATE_TASK_LIST', payload: (tool.input.tasks as any[]).map((t: any) => ({ id: t.id, title: t.title, status: 'pending' as const })) });
        } else if (tool.name === 'start_task' && tool.input?.task_id) {
          dispatch({ type: 'START_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'complete_task' && tool.input?.task_id) {
          dispatch({ type: 'COMPLETE_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'fail_task' && tool.input?.task_id) {
          dispatch({ type: 'FAIL_TASK', payload: { id: tool.input.task_id as string, reason: (tool.input.reason as string) || 'Unknown error' } });
        } else if (tool.name === 'update_node' && tool.result) {
          const nodeId = streamNodeIdMap[tool.input.node_id] || tool.input.node_id;
          const updateData: any = {};
          if (tool.input.config) updateData.config = tool.input.config;
          if (tool.input.label) updateData.label = tool.input.label;
          if (tool.result.label) updateData.label = tool.result.label;
          if (tool.result.config) updateData.config = { ...updateData.config, ...tool.result.config };
          dispatch({ type: 'UPDATE_NODE', payload: { id: nodeId, data: updateData } });
          console.log('[AgentFlow] UPDATE_NODE:', nodeId, updateData);
        } else if (tool.name === 'workflow_ready') {
          dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_ready_${Date.now()}`, timestamp: new Date(), level: 'run', message: `[OK] Workflow ready: ${tool.input?.summary || 'Complete'}` } });
        } else if (tool.name === 'delete_node') {
          dispatch({ type: 'DELETE_NODE', payload: streamNodeIdMap[tool.input.node_id] || tool.input.node_id });
        } else if (tool.name === 'run_workflow') {
          simulateWorkflowRun();
        }
        streamToolCalls.push(tool);
      };

      console.log('[AgentFlow] Queue ready:', toolEventQueue.length, 'events. shouldClear:', shouldClearCanvas, 'hasAdd:', hasAddNodes, 'hasUpdate:', hasUpdateNodes);

      // Now process the queued tool events ONE BY ONE with client-side pacing
      for (let i = 0; i < toolEventQueue.length; i++) {
        const tool = toolEventQueue[i];
        
        // Track graph changes for the final layout pass
        if (['add_node', 'delete_node', 'connect_nodes'].includes(tool.name)) streamChangedGraph = true;

        // Process the tool (dispatches to store)
        processStreamedTool(tool);

        // CLIENT-SIDE PACING: delay AFTER processing each tool
        // These delays are REAL pauses that the user sees — each step is visually distinct
        if (tool.name === 'create_task_list') {
          await clientDelay(600); // Let user READ the full task list before building starts
        } else if (tool.name === 'start_task') {
          await clientDelay(400); // See the "running" spinner on this task
        } else if (tool.name === 'add_node' || tool.name === 'update_node' || tool.name === 'delete_node') {
          await clientDelay(600); // Node appears on canvas — satisfying pause
        } else if (tool.name === 'complete_task') {
          await clientDelay(350); // Green checkmark appears — user sees the tick!
        } else if (tool.name === 'connect_nodes') {
          await clientDelay(150); // Connections draw quickly
        } else {
          await clientDelay(80); // workflow_ready, list_nodes, etc.
        }
      }

      // Auto-connect if no explicit connections
      const addedNodeIds = streamToolCalls.filter(t => t.name === 'add_node').map(t => streamNodeIdMap[t.result?.nodeId]).filter(Boolean);
      const hasConnections = streamToolCalls.some(t => t.name === 'connect_nodes' && t.result?.success !== false);
      if (!hasConnections && addedNodeIds.length > 1) {
        for (let i = 0; i < addedNodeIds.length - 1; i++) {
          dispatch({ type: 'ADD_EDGE', payload: createEdge(addedNodeIds[i], addedNodeIds[i + 1]) });
        }
      }

      addMessage({
        id: uuidv4(), role: 'assistant', content: streamText || '**Workflow built!**', timestamp: new Date(),
        toolCalls: streamToolCalls.filter(tc => !['start_task', 'complete_task', 'create_task_list', 'fail_task', 'workflow_ready'].includes(tc.name)).map((tc: any) => ({ id: tc.id, name: tc.name, input: tc.input, status: 'done' as const })),
        buttons: streamToolCalls.some(tc => tc.name === 'add_node') ? [{ label: 'Run Workflow', action: 'Run the workflow to test it' }, { label: 'Make Changes', action: 'What changes can you make?' }] : undefined,
      });
    } catch (error) {
      addMessage({ id: uuidv4(), role: 'assistant', content: "Oops, something went wrong on my end. Could you try again? If the problem persists, check that your API key is set up correctly in `.env.local`.", timestamp: new Date() });
    } finally {
      // Server grid positions stack nodes top-to-bottom, but handles connect left-to-right,
      // so re-run the left-to-right dagre layout once the build has changed the graph.
      // Pure chat / config edits leave the user's own arrangement alone.
      if (streamChangedGraph) {
        dispatch({ type: 'AUTO_LAYOUT' });
      }
      dispatch({ type: 'SET_AI_TYPING', payload: false });
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleButtonClick = (action: string) => {
    // Special handling for Plan→Act handoff
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('switch to act') || lowerAction.includes('looks good') || lowerAction.includes('act mode')) {
      const lastAssistantMsg = [...state.messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) dispatch({ type: 'SET_CONFIRMED_PLAN', payload: lastAssistantMsg.content });
      dispatch({ type: 'SET_CHAT_MODE', payload: 'act' });
      setInput('Build this workflow');
      inputRef.current?.focus();
      return;
    }
    handleSubmit(action);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-sunken)]">
      {/* Agent header + Plan / Act toggle */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(124,58,237,0.35)]" style={{ background: 'var(--primary-gradient)' }}>
          <Sparkles className="w-4 h-4 text-white" />
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-sunken)] ${state.isAiTyping ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)] leading-tight">Builder Agent</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {state.isAiTyping ? 'Thinking…' : state.chatMode === 'plan' ? 'Planning with you' : 'Ready to build'}
          </p>
        </div>

        <div className="seg flex-shrink-0">
          <button
            onClick={() => dispatch({ type: 'SET_CHAT_MODE', payload: 'plan' })}
            className={`seg-item !px-2.5 !py-1 ${state.chatMode === 'plan' ? 'seg-item-active !text-violet-200' : ''}`}
            title="Plan Mode — talk it through first (Ctrl+Shift+M)"
          >
            <Brain className="w-3.5 h-3.5" /> Plan
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_CHAT_MODE', payload: 'act' })}
            className={`seg-item !px-2.5 !py-1 ${state.chatMode === 'act' ? 'seg-item-active !text-amber-200' : ''}`}
            title="Act Mode — build on the canvas (Ctrl+Shift+M)"
          >
            <Zap className="w-3.5 h-3.5" /> Act
          </button>
        </div>
      </div>

      {/* Confirmed plan banner */}
      {state.confirmedPlan && state.chatMode === 'act' && (
        <div className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] text-emerald-200 truncate">Building from your approved plan</span>
          <button
            onClick={() => dispatch({ type: 'SET_CONFIRMED_PLAN', payload: null })}
            className="ml-auto text-emerald-300/70 hover:text-emerald-200"
            title="Clear plan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Task List Card */}
      <TaskListCard />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onButtonClick={handleButtonClick} />
        ))}

        {state.isAiTyping && (
          <div className="flex items-start gap-2.5">
            <AgentAvatar />
            <div className="surface rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-3 pb-3 pt-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] transition-all focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
            }}
            onKeyDown={handleKeyDown}
            onPaste={(e) => {
              requestAnimationFrame(() => {
                const el = e.currentTarget || inputRef.current;
                if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 300) + 'px'; }
              });
            }}
            placeholder={state.chatMode === 'plan' ? 'Describe what you want to create…' : 'Tell me what to build on the canvas…'}
            className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--foreground)] placeholder-[var(--text-muted)] resize-none outline-none min-h-[44px] max-h-[300px] overflow-y-auto px-3.5 pt-3"
            rows={1}
            disabled={isSubmitting}
            style={{ height: 'auto' }}
          />
          <div className="flex items-center justify-between px-2.5 pb-2.5">
            <span className={`chip !py-0.5 !text-[10px] ${state.chatMode === 'plan' ? '!text-violet-200' : '!text-amber-200'}`}>
              {state.chatMode === 'plan' ? <Brain className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {state.chatMode === 'plan' ? 'Plan mode' : 'Act mode'}
            </span>
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isSubmitting}
              className="btn btn-primary !w-8 !h-8 !p-0 !rounded-lg"
              title="Send (Enter)"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
          <span className="kbd">Enter</span> to send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> new line · Powered by Claude
        </p>
      </div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-gradient)' }}>
      <Bot className="w-3.5 h-3.5 text-white" />
    </div>
  );
}

// Long raw URLs (Cloudinary assets etc.) become short chips instead of filling the chat
function LinkChip({ href, children }: { href?: string; children?: React.ReactNode }) {
  const text = React.Children.toArray(children).join('');
  if (!href || text !== href) {
    return <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]">{children}</a>;
  }
  let host = href, file = '';
  try {
    const u = new URL(href);
    host = u.hostname.replace(/^www\./, '');
    file = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
  } catch { /* not a URL */ }
  const isVideo = /\.(mp4|webm|mov)$/i.test(file);
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(file);
  const Icon = isVideo ? Film : isImage ? ImageIcon : Link2;
  const short = file.length > 28 ? `${file.slice(0, 12)}…${file.slice(-12)}` : file;
  return (
    <a href={href} target="_blank" rel="noreferrer" title={href}
      className="inline-flex items-center gap-1.5 max-w-full align-middle my-0.5 px-2 py-0.5 rounded-md bg-[var(--bg-sunken)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 text-[11px] text-[var(--text-secondary)] hover:text-[var(--foreground)] no-underline transition-colors">
      <Icon className="w-3 h-3 flex-shrink-0 text-[var(--accent)]" />
      <span className="truncate">{short || host}</span>
      {short && <span className="text-[var(--text-muted)] truncate hidden sm:inline">· {host}</span>}
    </a>
  );
}

function MessageBubble({ message, onButtonClick }: { message: ChatMessage; onButtonClick: (action: string) => void }) {
  const isUser = message.role === 'user';
  const isLongUserMsg = isUser && message.content.length > 200;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`flex items-start gap-2.5 animate-reveal ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && <AgentAvatar />}

      <div className={`max-w-[88%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed overflow-hidden max-w-full ${isUser ? 'text-white rounded-tr-md shadow-[0_4px_14px_rgba(124,58,237,0.25)]' : 'surface text-[var(--foreground)] rounded-tl-md'}`} style={isUser ? { background: 'var(--primary-gradient)' } : undefined}>
          {isUser ? (
            <div className="break-words whitespace-pre-wrap overflow-hidden max-w-full" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {isLongUserMsg && !expanded ? (
                <>
                  <p>{message.content.slice(0, 150)}…</p>
                  <button onClick={() => setExpanded(true)} className="mt-1.5 text-[11px] text-white/75 hover:text-white underline underline-offset-2">
                    Show full prompt ({message.content.length} chars)
                  </button>
                </>
              ) : (
                <>
                  <div className={isLongUserMsg ? 'max-h-[300px] overflow-y-auto overflow-x-hidden' : ''} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <p style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{message.content}</p>
                  </div>
                  {isLongUserMsg && (
                    <button onClick={() => setExpanded(false)} className="mt-1.5 text-[11px] text-white/75 hover:text-white underline underline-offset-2">Collapse</button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="chat-markdown break-words overflow-hidden">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: LinkChip }}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc) => (
              <span key={tc.id} className="chip !py-0.5 !text-[10px]">
                <Wrench className="w-2.5 h-2.5 text-[var(--accent)]" />
                {tc.name.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {message.videoUrl && <VideoCard url={message.videoUrl} poster={message.videoPoster} label={message.videoLabel} executionId={message.executionId} />}

        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.buttons.map((btn, i) => (
              <button key={i} onClick={() => onButtonClick(btn.action)} className="btn btn-secondary btn-sm !rounded-lg hover:!border-[var(--accent)]/60 hover:!text-[var(--foreground)]">
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

