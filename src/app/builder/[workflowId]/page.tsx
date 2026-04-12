'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { MessageSquare, Puzzle, PanelRightClose, PanelRightOpen, Keyboard, FolderOpen, ArrowLeft, Play, Square, AlertTriangle } from 'lucide-react';
import { AppProvider, useApp } from '@/lib/context';
import ChatPanel from '@/components/ChatPanel';
import WorkflowCanvas from '@/components/WorkflowCanvas';
import InspectorPanel from '@/components/InspectorPanel';
import NodeSidebar from '@/components/NodeSidebar';
import NodeConfigPanel from '@/components/NodeConfigPanel';
import TerminalPanel from '@/components/TerminalPanel';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function BuilderPage() {
  return (
    <AppProvider>
      <BuilderLayout />
    </AppProvider>
  );
}

function BuilderLayout() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.workflowId as string;
  const { state, dispatch } = useApp();
  const [leftTab, setLeftTab] = useState<'chat' | 'nodes'>('chat');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [leftWidth, setLeftWidth] = useState(25);
  const [rightWidth, setRightWidth] = useState(25);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const isDragging = useRef<'left' | 'right' | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load workflow + chat history from Supabase
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId || workflowId === 'new') return;

      // Load workflow
      const { data } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
      if (data) {
        dispatch({ type: 'SET_WORKFLOW_META', payload: { name: data.name || 'Untitled', emoji: data.emoji || '' } });
        // Reset all node statuses to idle on load (they may have stale running/success states)
        if (data.nodes?.length) {
          const cleanNodes = data.nodes.map((n: any) => ({
            ...n,
            data: { ...n.data, status: 'idle', error: undefined, output: undefined },
          }));
          dispatch({ type: 'SET_NODES', payload: cleanNodes });
        }
        if (data.edges?.length) dispatch({ type: 'SET_EDGES', payload: data.edges });
      }

      // Load chat messages from Supabase (gracefully handle missing table)
      try {
        const { data: chatData, error: chatError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('created_at', { ascending: true });

        if (!chatError && chatData && chatData.length > 0) {
          const msgs = chatData.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
            toolCalls: m.tool_calls || undefined,
          }));
          // Prepend welcome message + loaded messages
          const welcome = state.messages.find(m => m.id === 'welcome');
          dispatch({ type: 'SET_MESSAGES', payload: welcome ? [welcome, ...msgs] : msgs });
        }
      } catch {
        // chat_messages table may not exist — try localStorage fallback
        try {
          const cached = localStorage.getItem(`agentflow_chat_${workflowId}`);
          if (cached) {
            const msgs = JSON.parse(cached).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
            if (msgs.length > 1) dispatch({ type: 'SET_MESSAGES', payload: msgs });
          }
        } catch { /* ignore */ }
      }

      // Load terminal logs from localStorage
      try {
        const cachedLogs = localStorage.getItem(`agentflow_logs_${workflowId}`);
        if (cachedLogs) {
          const logs = JSON.parse(cachedLogs).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }));
          if (logs.length > 0) {
            for (const log of logs.slice(-200)) {
              dispatch({ type: 'ADD_TERMINAL_LOG', payload: log });
            }
          }
        }
      } catch { /* ignore */ }
    };
    loadWorkflow();
  }, [workflowId, dispatch]);

  // Auto-save workflow to Supabase on changes
  useEffect(() => {
    if (!workflowId || workflowId === 'new') return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      // Strip runtime status/error/output before saving (ephemeral execution state)
      const cleanNodes = state.nodes.map(n => ({
        ...n,
        data: { ...n.data, status: undefined, error: undefined, output: undefined },
      }));
      await supabase.from('workflows').update({
        name: state.workflowName,
        emoji: state.workflowEmoji,
        nodes: cleanNodes,
        edges: state.edges,
      }).eq('id', workflowId);
    }, 2000);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [state.nodes, state.edges, state.workflowName, state.workflowEmoji, workflowId]);

  // Auto-save chat messages (localStorage always, Supabase when table exists)
  const chatSaveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!workflowId || workflowId === 'new' || state.messages.length <= 1) return;
    if (chatSaveRef.current) clearTimeout(chatSaveRef.current);
    chatSaveRef.current = setTimeout(async () => {
      // Always save to localStorage as fallback
      try {
        const serializable = state.messages.map(m => ({
          id: m.id, role: m.role, content: m.content,
          timestamp: m.timestamp, buttons: m.buttons,
        }));
        localStorage.setItem(`agentflow_chat_${workflowId}`, JSON.stringify(serializable));
      } catch { /* quota exceeded */ }

      // Try Supabase — save only new user/assistant messages (skip welcome)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const realMessages = state.messages.filter(m => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'));
        if (realMessages.length === 0) return;

        // Upsert each message (idempotent)
        for (const msg of realMessages) {
          await supabase.from('chat_messages').upsert({
            id: msg.id,
            workflow_id: workflowId,
            user_id: user.id,
            role: msg.role,
            content: msg.content,
            tool_calls: msg.toolCalls || null,
            created_at: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
          }, { onConflict: 'id' }).then(() => {});
        }
      } catch { /* chat_messages table may not exist */ }
    }, 3000);
    return () => { if (chatSaveRef.current) clearTimeout(chatSaveRef.current); };
  }, [state.messages, workflowId]);

  // Auto-save terminal logs to localStorage
  const logSaveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!workflowId || workflowId === 'new' || state.terminalLogs.length === 0) return;
    if (logSaveRef.current) clearTimeout(logSaveRef.current);
    logSaveRef.current = setTimeout(() => {
      try {
        const last200 = state.terminalLogs.slice(-200).map(l => ({
          id: l.id, timestamp: l.timestamp, level: l.level, message: l.message,
        }));
        localStorage.setItem(`agentflow_logs_${workflowId}`, JSON.stringify(last200));
      } catch { /* quota exceeded */ }
    }, 2000);
    return () => { if (logSaveRef.current) clearTimeout(logSaveRef.current); };
  }, [state.terminalLogs, workflowId]);

  const handleMouseDown = useCallback((panel: 'left' | 'right') => {
    isDragging.current = panel;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const handleMouseMove = (e: MouseEvent) => {
      const pct = (e.clientX / window.innerWidth) * 100;
      if (isDragging.current === 'left') setLeftWidth(Math.min(Math.max(pct, 15), 40));
      else if (isDragging.current === 'right') setRightWidth(Math.min(Math.max(100 - pct, 15), 40));
    };
    const handleMouseUp = () => {
      isDragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const hasSelectedNode = !!state.selectedNodeId;
  const hasTrigger = state.nodes.some(n => n.data?.type?.includes('trigger'));
  const canRun = state.nodes.length > 0 && hasTrigger && !state.isRunning;

  // Nodes with issues — only flag truly missing critical config, not model fields
  // (execution engine has sensible defaults for model, prompt, etc.)
  const nodesWithIssues: typeof state.nodes = [];

  // Run workflow handler — calls real /api/execute SSE endpoint
  const handleRunWorkflow = useCallback(async () => {
    if (!canRun) return;
    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'CLEAR_EXECUTION_EVENTS' });
    let _seq = 0;
    const uid = () => `${Date.now()}_${++_seq}_${Math.random().toString(36).slice(2,6)}`;
    const tlog = (level: any, message: string) => {
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_${uid()}`, timestamp: new Date(), level, message } });
    };
    tlog('run', `> Executing workflow: "${state.workflowName}" — ${state.nodes.length} nodes`);

    // Get user ID for execution persistence
    let currentUserId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    } catch { /* ignore */ }

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: state.nodes,
          edges: state.edges,
          workflowId: workflowId !== 'new' ? workflowId : undefined,
          userId: currentUserId,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: 'Execution failed' }));
        tlog('fail', ` ${err.error || 'Execution failed'}`);
        dispatch({ type: 'SET_RUNNING', payload: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
              if (currentEvent === 'execution') {
                if (data.type === 'node_start' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'running' } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_s`, timestamp: new Date(data.timestamp), type: 'node_start', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data } });
                  tlog('node', `[${data.nodeName}] starting`);
                } else if (data.type === 'node_end' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'success', output: data.data?.output } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_e`, timestamp: new Date(data.timestamp), type: 'node_end', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data, duration: data.duration } });
                  tlog('node', `[${data.nodeName}] done (${((data.duration || 0) / 1000).toFixed(1)}s)`);
                } else if (data.type === 'node_error' && data.nodeId) {
                  dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'error' } });
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_err`, timestamp: new Date(data.timestamp), type: 'node_error', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data, duration: data.duration } });
                  tlog('fail', `[${data.nodeName}]  ${data.data?.error}`);
                } else if (data.type === 'log') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_log`, timestamp: new Date(data.timestamp || Date.now()), type: 'log', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data } });
                  tlog('node', data.data?.message || '');
                } else if (data.type === 'api_call') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_api`, timestamp: new Date(data.timestamp || Date.now()), type: 'api_call', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data, duration: data.duration } });
                  tlog('http', `→ ${data.data?.service} ${data.data?.model || ''}`);
                } else if (data.type === 'asset_created') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_asset`, timestamp: new Date(data.timestamp || Date.now()), type: 'asset_created', nodeId: data.nodeId, nodeName: data.nodeName, data: data.data } });
                  tlog('store', ` ${data.data?.type}: ${data.data?.url}`);
                } else if (data.type === 'workflow_done') {
                  dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_done`, timestamp: new Date(data.timestamp || Date.now()), type: 'workflow_done', data: data.data } });
                  tlog('run', ` Done! Cost: $${data.data?.totalCost}, ${data.data?.assetCount} assets`);
                }
              } else if (currentEvent === 'error') {
                tlog('fail', data.message || 'Unknown error');
              }
            } catch { /* parse error */ }
            currentEvent = '';
          } else if (line === '') { currentEvent = ''; }
        }
      }
    } catch (err: any) {
      tlog('fail', ` ${err.message}`);
    } finally {
      dispatch({ type: 'SET_RUNNING', payload: false });
    }
  }, [canRun, state.nodes, state.edges, state.workflowName, dispatch]);

  // Keyboard shortcut: Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunWorkflow();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRunWorkflow]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--background)]">
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-1 rounded hover:bg-[var(--secondary)] transition-colors" title="Back to dashboard">
            <ArrowLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white text-sm"></span>
          </div>
          <h1 className="text-sm font-bold text-[var(--foreground)]">AgentFlow</h1>
          {isEditingName ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => {
                const trimmed = editName.trim();
                if (trimmed && trimmed.length <= 60) {
                  dispatch({ type: 'SET_WORKFLOW_META', payload: { name: trimmed, emoji: state.workflowEmoji } });
                  if (workflowId && workflowId !== 'new') {
                    supabase.from('workflows').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', workflowId);
                  }
                }
                setIsEditingName(false);
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setIsEditingName(false); }}
              className="text-xs bg-[var(--background)] border border-[var(--primary)] rounded px-2 py-0.5 text-[var(--foreground)] focus:outline-none w-48"
              maxLength={60}
            />
          ) : (
            <button
              onClick={() => { setEditName(state.workflowName); setIsEditingName(true); }}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] px-2 py-0.5 rounded transition-colors cursor-text"
              title="Click to rename"
            >
              {state.workflowEmoji} {state.workflowName}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Run Workflow Button */}
          {state.isRunning ? (
            <button
              onClick={() => dispatch({ type: 'SET_RUNNING', payload: false })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
              title="Stop workflow"
            >
              <Square className="w-3 h-3" /> Stop
            </button>
          ) : (
            <button
              onClick={handleRunWorkflow}
              disabled={!canRun}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                canRun
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  : 'bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)] cursor-not-allowed opacity-50'
              }`}
              title={!canRun ? (state.nodes.length === 0 ? 'Add nodes first' : 'Needs a trigger node') : 'Run workflow (Ctrl+Enter)'}
            >
              <Play className="w-3 h-3" /> Run Workflow
              {nodesWithIssues.length > 0 && canRun && (
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
              )}
            </button>
          )}

          <span className="text-[10px] text-[var(--muted-foreground)]">{state.nodes.length} nodes • {state.edges.length} connections</span>
          <Link href="/library" className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-md transition-colors">
            <FolderOpen className="w-3.5 h-3.5" /> Library
          </Link>
          <button onClick={() => setShowShortcuts(true)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--secondary)] transition-colors" title="Keyboard shortcuts">
            <Keyboard className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col flex-shrink-0 border-r border-[var(--border)]" style={{ width: `${leftWidth}%` }}>
          <div className="flex border-b border-[var(--border)] bg-[var(--card)]">
            <button onClick={() => setLeftTab('chat')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2 ${leftTab === 'chat' ? 'text-[var(--primary)] border-[var(--primary)]' : 'text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]'}`}>
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </button>
            <button onClick={() => setLeftTab('nodes')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2 ${leftTab === 'nodes' ? 'text-[var(--primary)] border-[var(--primary)]' : 'text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]'}`}>
              <Puzzle className="w-3.5 h-3.5" /> Nodes
            </button>
          </div>
          <div className="flex-1 overflow-hidden">{leftTab === 'chat' ? <ChatPanel /> : <NodeSidebar onDragStart={() => {}} />}</div>
        </div>

        <div className="resize-handle" onMouseDown={() => handleMouseDown('left')} />
        <div className="flex-1 min-w-0 overflow-hidden"><WorkflowCanvas /></div>
        <div className="resize-handle" onMouseDown={() => handleMouseDown('right')} />

        {state.inspectorOpen && (
          <div className="flex-shrink-0 border-l border-[var(--border)] overflow-hidden" style={{ width: `${rightWidth}%` }}>
            {hasSelectedNode ? <NodeConfigPanel /> : <InspectorPanel />}
          </div>
        )}
      </div>

      {/* Terminal — bottom drawer */}
      <TerminalPanel />

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-[var(--foreground)] mb-4">⌨ Keyboard Shortcuts</h2>
            <div className="space-y-2">
              {[['Delete / Backspace','Delete selected node'],['Ctrl+D','Duplicate selected'],['Ctrl+A','Select all nodes'],['Ctrl+0','Fit view'],['Escape','Deselect / close menus'],['Right-click','Context menu'],['Scroll','Zoom in/out'],['Drag handle','Connect nodes']].map(([key,desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">{desc}</span>
                  <kbd className="text-[10px] font-mono bg-[var(--secondary)] text-[var(--foreground)] px-2 py-0.5 rounded">{key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full py-1.5 text-xs text-[var(--foreground)] bg-[var(--secondary)] hover:bg-[var(--border)] rounded-lg transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
