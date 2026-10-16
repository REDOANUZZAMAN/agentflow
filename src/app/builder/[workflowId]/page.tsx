'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { MessageSquare, Puzzle, PanelRightClose, PanelRightOpen, Keyboard, FolderOpen, ArrowLeft, Play, Square, AlertTriangle, Zap, ChevronRight, Pencil, Workflow as WorkflowGlyph, Link2 } from 'lucide-react';
import { AppProvider, useApp } from '@/lib/context';
import { WorkflowIcon } from '@/lib/node-icons';
import ChatPanel from '@/components/ChatPanel';
import WorkflowCanvas from '@/components/WorkflowCanvas';
import InspectorPanel from '@/components/InspectorPanel';
import NodeSidebar from '@/components/NodeSidebar';
import NodeConfigPanel from '@/components/NodeConfigPanel';
import TerminalPanel from '@/components/TerminalPanel';
import RunConfirmDialog from '@/components/RunConfirmDialog';
import { runWorkflow, stopCurrentRun } from '@/lib/run-client';

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
  const { state, dispatch, addMessage } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  // Right panel stays out of the way until there is something to show
  useEffect(() => {
    if (state.selectedNodeId || state.isRunning) dispatch({ type: 'SET_INSPECTOR_OPEN', payload: true });
  }, [state.selectedNodeId, state.isRunning, dispatch]);
  const hasTrigger = state.nodes.some(n => n.data?.type?.includes('trigger'));
  const canRun = state.nodes.length > 0 && hasTrigger && !state.isRunning;

  // Nodes with issues — only flag truly missing critical config, not model fields
  // (execution engine has sensible defaults for model, prompt, etc.)
  const nodesWithIssues: typeof state.nodes = [];

  // Run = show the cost check first; the dialog starts the real run
  const handleRunWorkflow = useCallback(() => {
    if (!canRun) return;
    setConfirmOpen(true);
  }, [canRun]);

  const startConfirmedRun = useCallback(() => {
    setConfirmOpen(false);
    runWorkflow({
      nodes: state.nodes,
      edges: state.edges,
      workflowId,
      workflowName: state.workflowName,
      dispatch,
      addMessage,
    });
  }, [state.nodes, state.edges, state.workflowName, workflowId, dispatch, addMessage]);

  // The builder agent's run_workflow tool asks for a run the same way
  useEffect(() => {
    const onRunRequest = () => handleRunWorkflow();
    window.addEventListener('agentflow:run', onRunRequest);
    return () => window.removeEventListener('agentflow:run', onRunRequest);
  }, [handleRunWorkflow]);

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
      <header className="h-14 flex items-center justify-between gap-4 px-3 border-b border-[var(--border-subtle)] bg-[var(--bg-sunken)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="icon-btn" title="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Link href="/dashboard" className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(124,58,237,0.4)]" style={{ background: 'var(--primary-gradient)' }} title="AgentFlow">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </Link>
          <Link href="/dashboard" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors hidden sm:block">Workflows</Link>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 hidden sm:block" />
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
              className="input-field !py-1 !px-2 text-[13px] font-medium w-56"
              maxLength={60}
            />
          ) : (
            <button
              onClick={() => { setEditName(state.workflowName); setIsEditingName(true); }}
              className="group flex items-center gap-2 min-w-0 px-2 py-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-text"
              title="Click to rename"
            >
              <WorkflowIcon emoji={state.workflowEmoji} className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
              <span className="text-[13px] font-semibold text-[var(--foreground)] truncate max-w-[260px]">{state.workflowName}</span>
              <Pencil className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )}
          <span className="chip hidden md:inline-flex">
            <WorkflowGlyph className="w-3 h-3" /> {state.nodes.length} nodes
            <span className="text-[var(--text-muted)]">·</span>
            <Link2 className="w-3 h-3" /> {state.edges.length}
          </span>
          {state.isRunning && (
            <span className="chip !text-emerald-300 !border-emerald-500/30 !bg-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Running
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href="/library" className="btn btn-ghost btn-sm !gap-1.5" title="Asset library">
            <FolderOpen className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Library</span>
          </Link>
          <button onClick={() => setShowShortcuts(true)} className="icon-btn" title="Keyboard shortcuts">
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_INSPECTOR_OPEN', payload: !state.inspectorOpen })}
            className={`icon-btn ${state.inspectorOpen ? 'icon-btn-active' : ''}`}
            title={state.inspectorOpen ? 'Hide inspector' : 'Show inspector'}
          >
            {state.inspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />
          {state.isRunning ? (
            <button onClick={() => stopCurrentRun()} className="btn btn-danger btn-sm !px-3.5 !py-1.5" title="Stop — cancels the remaining generation">
              <Square className="w-3 h-3" /> Stop
            </button>
          ) : (
            <button
              onClick={handleRunWorkflow}
              disabled={!canRun}
              className="btn btn-primary btn-sm !px-3.5 !py-1.5"
              title={!canRun ? (state.nodes.length === 0 ? 'Add nodes first' : 'Needs a trigger node') : 'Run workflow (Ctrl+Enter)'}
            >
              <Play className="w-3 h-3 fill-current" /> Run workflow
              <span className="kbd !bg-white/10 !border-white/20 !text-white/80 hidden xl:inline">Ctrl ↵</span>
              {nodesWithIssues.length > 0 && canRun && <AlertTriangle className="w-3 h-3 text-yellow-300" />}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex flex-col flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sunken)] min-w-[300px]" style={{ width: `${leftWidth}%` }}>
          <div className="p-2.5 border-b border-[var(--border-subtle)]">
            <div className="seg w-full">
              <button onClick={() => setLeftTab('chat')} className={`seg-item flex-1 ${leftTab === 'chat' ? 'seg-item-active' : ''}`}>
                <MessageSquare className="w-3.5 h-3.5" /> Chat
              </button>
              <button onClick={() => setLeftTab('nodes')} className={`seg-item flex-1 ${leftTab === 'nodes' ? 'seg-item-active' : ''}`}>
                <Puzzle className="w-3.5 h-3.5" /> Nodes
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">{leftTab === 'chat' ? <ChatPanel /> : <NodeSidebar onDragStart={() => {}} />}</div>
        </div>

        <div className="resize-handle" onMouseDown={() => handleMouseDown('left')} />
        <div className="flex-1 min-w-0 overflow-hidden"><WorkflowCanvas /></div>
        <div className="resize-handle" onMouseDown={() => handleMouseDown('right')} />

        {state.inspectorOpen && (
          <div className="flex-shrink-0 border-l border-[var(--border-subtle)] overflow-hidden min-w-[300px]" style={{ width: `${rightWidth}%` }}>
            {hasSelectedNode ? <NodeConfigPanel /> : <InspectorPanel />}
          </div>
        )}
      </div>

      {confirmOpen && (
        <RunConfirmDialog nodes={state.nodes} onCancel={() => setConfirmOpen(false)} onConfirm={startConfirmedRun} />
      )}

      {/* Terminal — bottom drawer */}
      <TerminalPanel />

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-[var(--popover)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] p-6 max-w-sm w-full mx-4 context-menu-appear" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2"><Keyboard className="w-4 h-4 text-[var(--accent)]" /> Keyboard shortcuts</h2>
            <div className="space-y-2.5">
              {[['Ctrl+Enter','Run workflow'],['Ctrl+Shift+M','Switch Plan / Act'],['Delete / Backspace','Delete selected node'],['Ctrl+D','Duplicate selected'],['Ctrl+A','Select all nodes'],['Ctrl+0','Fit view'],['Escape','Deselect / close menus'],['Right-click','Context menu'],['Scroll','Zoom in/out'],['Drag handle','Connect nodes']].map(([key,desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">{desc}</span>
                  <kbd className="kbd">{key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="btn btn-secondary btn-sm mt-5 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
