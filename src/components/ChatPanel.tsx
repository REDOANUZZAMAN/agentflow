'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Bot, User, Loader2, Play, Brain, Zap, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams } from 'next/navigation';
import { useApp } from '@/lib/context';
import { createNode, createEdge } from '@/lib/store';
import type { ChatMessage, NodeType, Task } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import TaskListCard from './TaskListCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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

  // Real workflow execution via /api/execute SSE endpoint
  const params = useParams();
  const simulateWorkflowRun = useCallback(async () => {
    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'CLEAR_EXECUTION_EVENTS' });

    const workflowIdParam = params?.workflowId as string | undefined;
    const workflowId = workflowIdParam && workflowIdParam !== 'new' ? workflowIdParam : undefined;
    let userId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch { /* ignore */ }

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: state.nodes, edges: state.edges, workflowId, userId }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: 'Execution failed' }));
        dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_err_${Date.now()}`, timestamp: new Date(), type: 'error', data: { message: err.error || 'Execution failed' } } });
        dispatch({ type: 'SET_RUNNING', payload: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let resultData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        let currentEvent = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'execution') {
                if (data.type === 'node_start' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'running' } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_start`, timestamp: new Date(data.timestamp), type: 'node_start', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data } });
                } else if (data.type === 'node_end' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'success', output: data.data?.output } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_end`, timestamp: new Date(data.timestamp), type: 'node_end', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data, duration: data.duration } });
                } else if (data.type === 'node_error' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'error' } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_err`, timestamp: new Date(data.timestamp), type: 'error', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data } });
                } else if (data.type === 'log') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_log`, timestamp: new Date(data.timestamp), type: 'log', nodeId: data.nodeId, data: data.data } });
                  dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_${Date.now()}`, timestamp: new Date(data.timestamp), level: 'node', message: data.data?.message || '' } });
                } else if (data.type === 'api_call') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_api`, timestamp: new Date(data.timestamp), type: 'api_call', nodeId: data.nodeId, data: data.data } });
                } else if (data.type === 'asset_created') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_asset`, timestamp: new Date(data.timestamp), type: 'asset_created', nodeId: data.nodeId, data: data.data } });
                  dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_${Date.now()}`, timestamp: new Date(data.timestamp), level: 'run', message: `[Asset] ${data.data?.type}: ${data.data?.url}` } });
                } else if (data.type === 'workflow_done') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${Date.now()}_done`, timestamp: new Date(data.timestamp), type: 'workflow_done', data: data.data } });
                  dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_${Date.now()}`, timestamp: new Date(data.timestamp), level: 'run', message: `[Done] Workflow complete! Cost: $${data.data?.totalCost}, ${data.data?.assetCount} assets` } });
                }
              } else if (currentEvent === 'result') {
                resultData = data;
              } else if (currentEvent === 'error') {
                dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_err_${Date.now()}`, timestamp: new Date(), type: 'error', data: { message: data.message } } });
              }
            } catch { /* ignore */ }
            currentEvent = '';
          } else if (line === '') { currentEvent = ''; }
        }
      }

      if (resultData) {
        const assets = resultData.assets || [];
        const images = assets.filter((a: any) => a.imageUrl);
        const videos = assets.filter((a: any) => a.videoUrl);
        let summary = `**Workflow complete!**\n\n**Cost:** $${resultData.totalCost || 0}\n**Assets:** ${assets.length} created\n\n`;
        if (images.length > 0) { summary += `**Images:**\n`; images.forEach((img: any) => { summary += `- ${img.elementName || 'Photo'}: ${img.imageUrl}\n`; }); summary += '\n'; }
        if (videos.length > 0) { summary += `**Videos:**\n`; videos.forEach((vid: any) => { summary += `- ${vid.videoUrl}\n`; }); }
        if (resultData.errors?.length > 0) { summary += `\n**Errors:** ${resultData.errors.join(', ')}`; }
        addMessage({ id: uuidv4(), role: 'assistant', content: summary, timestamp: new Date(), buttons: [{ label: 'Run Again', action: 'Run the workflow again' }, { label: 'View Assets', action: 'Show me all the generated assets' }] });
      }
    } catch (err: any) {
      dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_err_${Date.now()}`, timestamp: new Date(), type: 'error', data: { message: err.message || 'Execution failed' } } });
      addMessage({ id: uuidv4(), role: 'assistant', content: `**Execution failed:** ${err.message}`, timestamp: new Date() });
    } finally {
      dispatch({ type: 'SET_RUNNING', payload: false });
    }
  }, [state.nodes, state.edges, dispatch, addMessage]);

  const handleSubmit = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isSubmitting) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsSubmitting(true);

    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: message, timestamp: new Date() };
    addMessage(userMsg);
    dispatch({ type: 'SET_AI_TYPING', payload: true });

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

      // Stream SSE events
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamText = '';
      const streamToolCalls: any[] = [];
      const streamNodeIdMap: Record<string, string> = {};

      const processStreamedTool = (tool: any) => {
        if (tool.name === 'add_node' && tool.result) {
          const node = createNode(tool.result.type as NodeType, tool.result.config || {}, tool.result.position);
          streamNodeIdMap[tool.result.nodeId] = node.id;
          dispatch({ type: 'ADD_NODE', payload: node });
        } else if (tool.name === 'connect_nodes' && tool.result) {
          const fromId = streamNodeIdMap[tool.input.from_node_id] || tool.input.from_node_id;
          const toId = streamNodeIdMap[tool.input.to_node_id] || tool.input.to_node_id;
          const fromResult = streamToolCalls.find(t => t.name === 'add_node' && t.result?.nodeId === tool.input.from_node_id);
          const toResult = streamToolCalls.find(t => t.name === 'add_node' && t.result?.nodeId === tool.input.to_node_id);
          const actualFrom = fromResult ? streamNodeIdMap[fromResult.result.nodeId] : fromId;
          const actualTo = toResult ? streamNodeIdMap[toResult.result.nodeId] : toId;
          if (actualFrom && actualTo) {
            dispatch({ type: 'ADD_EDGE', payload: createEdge(actualFrom, actualTo) });
          }
        } else if (tool.name === 'create_task_list' && tool.input?.tasks) {
          dispatch({ type: 'CREATE_TASK_LIST', payload: (tool.input.tasks as any[]).map((t: any) => ({ id: t.id, title: t.title, status: 'pending' as const })) });
        } else if (tool.name === 'start_task' && tool.input?.task_id) {
          dispatch({ type: 'START_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'complete_task' && tool.input?.task_id) {
          dispatch({ type: 'COMPLETE_TASK', payload: tool.input.task_id as string });
        } else if (tool.name === 'fail_task' && tool.input?.task_id) {
          dispatch({ type: 'FAIL_TASK', payload: { id: tool.input.task_id as string, reason: (tool.input.reason as string) || 'Unknown error' } });
        } else if (tool.name === 'workflow_ready') {
          dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_ready_${Date.now()}`, timestamp: new Date(), level: 'run', message: `[OK] Workflow ready: ${tool.input?.summary || 'Complete'}` } });
        } else if (tool.name === 'delete_node') {
          dispatch({ type: 'DELETE_NODE', payload: streamNodeIdMap[tool.input.node_id] || tool.input.node_id });
        } else if (tool.name === 'run_workflow') {
          simulateWorkflowRun();
        }
        streamToolCalls.push(tool);
      };

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
                case 'tool': processStreamedTool(data); break;
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

      // Auto-connect if no explicit connections
      const addedNodeIds = streamToolCalls.filter(t => t.name === 'add_node').map(t => streamNodeIdMap[t.result?.nodeId]).filter(Boolean);
      const hasConnections = streamToolCalls.some(t => t.name === 'connect_nodes');
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
      dispatch({ type: 'AUTO_LAYOUT' });
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
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header with tiny inline mode toggle */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--foreground)] leading-tight">Builder Agent</h2>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {state.isAiTyping ? 'Thinking...' : state.chatMode === 'plan' ? 'Planning with you' : 'Ready to build'}
          </p>
        </div>

        {/* Tiny Plan / Act toggle */}
        <div className="flex rounded-md bg-[var(--secondary)]/60 p-[2px] border border-[var(--border)] flex-shrink-0">
          <button
            onClick={() => dispatch({ type: 'SET_CHAT_MODE', payload: 'plan' })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 ${
              state.chatMode === 'plan'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title="Plan Mode (Ctrl+Shift+M)"
          >
            <Brain className="w-3 h-3" />
            Plan
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_CHAT_MODE', payload: 'act' })}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 ${
              state.chatMode === 'act'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title="Act Mode (Ctrl+Shift+M)"
          >
            <Zap className="w-3 h-3" />
            Act
          </button>
        </div>
      </div>

      {/* Confirmed plan banner */}
      {state.confirmedPlan && state.chatMode === 'act' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] text-emerald-300 truncate">Building from your approved plan</span>
          <button
            onClick={() => dispatch({ type: 'SET_CONFIRMED_PLAN', payload: null })}
            className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] ml-auto"
          >
            ✕
          </button>
        </div>
      )}

      {/* Task List Card */}
      <TaskListCard />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {state.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onButtonClick={handleButtonClick} />
        ))}

        {state.isAiTyping && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[var(--card)] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
                <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
                <div className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex items-end gap-2 bg-[var(--card)] rounded-xl border border-[var(--border)] px-3 py-2">
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
            placeholder={state.chatMode === 'plan' ? '🧠 Tell me what you want to create...' : '⚡ Tell me what to build on the canvas...'}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-y outline-none min-h-[36px] max-h-[300px] overflow-y-auto"
            rows={1}
            disabled={isSubmitting}
            style={{ height: 'auto' }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isSubmitting}
            className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-1.5 text-center">
          AgentFlow uses Claude AI • Powered by Anthropic
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, onButtonClick }: { message: ChatMessage; onButtonClick: (action: string) => void }) {
  const isUser = message.role === 'user';
  const isLongUserMsg = isUser && message.content.length > 200;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-[var(--secondary)]' : 'bg-[var(--primary)]'}`}>
        {isUser ? <User className="w-3.5 h-3.5 text-[var(--foreground)]" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>

      <div className={`max-w-[85%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden max-w-full ${isUser ? 'bg-[var(--primary)] text-white rounded-tr-sm' : 'bg-[var(--card)] text-[var(--foreground)] rounded-tl-sm'}`}>
          {isUser ? (
            <div className="break-words whitespace-pre-wrap text-sm overflow-hidden max-w-full" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {isLongUserMsg && !expanded ? (
                <>
                  <p>{message.content.slice(0, 150)}...</p>
                  <button onClick={() => setExpanded(true)} className="mt-1 text-[11px] opacity-70 hover:opacity-100 underline underline-offset-2">
                    Show full prompt ({message.content.length} chars) ▼
                  </button>
                </>
              ) : (
                <>
                  <div className={isLongUserMsg ? 'max-h-[300px] overflow-y-auto overflow-x-hidden' : ''} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                    <p style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{message.content}</p>
                  </div>
                  {isLongUserMsg && (
                    <button onClick={() => setExpanded(false)} className="mt-1 text-[11px] opacity-70 hover:opacity-100 underline underline-offset-2">Collapse ▲</button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="chat-markdown break-words overflow-hidden">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc) => (
              <span key={tc.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {tc.name.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {message.videoUrl && (
          <div className="w-full rounded-xl overflow-hidden border border-[var(--border)] bg-black/50">
            <div className="relative aspect-video bg-[var(--card)] flex items-center justify-center">
              <img src={message.videoUrl} alt="Final video" className="w-full h-full object-contain" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
              </div>
            </div>
            <div className="px-3 py-2 flex items-center justify-between bg-[var(--card)]">
              <span className="text-[11px] text-[var(--foreground)] font-medium">{message.videoLabel || 'Final Video'}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--muted-foreground)]">1080p MP4</span>
                <button className="text-[10px] px-2 py-0.5 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-opacity">Download</button>
              </div>
            </div>
          </div>
        )}

        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.buttons.map((btn, i) => (
              <button key={i} onClick={() => onButtonClick(btn.action)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--secondary)] hover:bg-zinc-700 text-[var(--foreground)] transition-colors border border-[var(--border)] hover:border-indigo-500/50">
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
