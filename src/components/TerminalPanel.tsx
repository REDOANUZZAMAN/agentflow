'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Filter, Search, Download, Maximize2, Minimize2, ChevronDown, X, Copy, ExternalLink } from 'lucide-react';
import { useApp } from '@/lib/context';

// ─── Log Entry Types ─────────────────────────────────────────
export interface TerminalLogEntry {
  id: string;
  timestamp: Date;
  level: 'agent' | 'plan' | 'build' | 'run' | 'node' | 'http' | 'store' | 'think' | 'error' | 'fail' | 'fix' | 'notify' | 'cost' | 'task';
  message: string;
  metadata?: {
    nodeId?: string;
    nodeName?: string;
    httpMethod?: string;
    httpUrl?: string;
    httpStatus?: number;
    requestBody?: any;
    responseBody?: any;
    cost?: number;
    durationMs?: number;
    expanded?: boolean;
  };
}

const LEVEL_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  agent:  { emoji: '>',  color: 'text-purple-400', label: 'agent' },
  plan:   { emoji: '>',  color: 'text-blue-400',   label: 'plan'  },
  build:  { emoji: '>',  color: 'text-cyan-400',   label: 'build' },
  run:    { emoji: '>',  color: 'text-green-400',   label: 'run'   },
  node:   { emoji: '*',   color: 'text-gray-300',   label: 'node'  },
  http:   { emoji: '~',  color: 'text-gray-500',   label: 'http'  },
  store:  { emoji: '>',  color: 'text-yellow-400',  label: 'store' },
  think:  { emoji: '.',  color: 'text-purple-300/60', label: 'think' },
  error:  { emoji: '!',   color: 'text-orange-400', label: 'error' },
  fail:   { emoji: 'x',  color: 'text-red-400',     label: 'fail'  },
  fix:    { emoji: '>',  color: 'text-orange-300',  label: 'fix'   },
  notify: { emoji: '>',  color: 'text-green-300',   label: 'notify'},
  cost:   { emoji: '$',  color: 'text-yellow-300',  label: 'cost'  },
  task:   { emoji: '>',  color: 'text-blue-300',    label: 'task'  },
};

// ─── Terminal Component ──────────────────────────────────────
export default function TerminalPanel() {
  const { state, dispatch } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [verboseMode, setVerboseMode] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const logs = state.terminalLogs || [];

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll]);

  // Detect scroll pause
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter && log.level !== filter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (!verboseMode && ['http', 'think', 'store'].includes(log.level)) return false;
    return true;
  });

  // Handle commands
  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    
    if (trimmed === '/clear') {
      dispatch({ type: 'CLEAR_TERMINAL_LOGS' });
    } else if (trimmed === '/cost') {
      const totalCost = logs.filter(l => l.metadata?.cost).reduce((s, l) => s + (l.metadata?.cost || 0), 0);
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `cmd_${Date.now()}`, timestamp: new Date(), level: 'cost', message: `Running total: $${totalCost.toFixed(2)}` } });
    } else if (trimmed === '/help') {
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `cmd_${Date.now()}`, timestamp: new Date(), level: 'agent', message: 'Commands: /clear /cost /run /stop /pause /resume /export /help' } });
    } else if (trimmed === '/run') {
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `cmd_${Date.now()}`, timestamp: new Date(), level: 'run', message: 'Starting workflow...' } });
    } else if (trimmed === '/stop') {
      dispatch({ type: 'SET_RUNNING', payload: false });
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `cmd_${Date.now()}`, timestamp: new Date(), level: 'run', message: 'Workflow stopped by user' } });
    } else if (trimmed === '/export') {
      exportLogs();
    } else {
      dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `cmd_${Date.now()}`, timestamp: new Date(), level: 'error', message: `Unknown command: ${trimmed}. Type /help for available commands.` } });
    }
    setCommandInput('');
  };

  const exportLogs = () => {
    const text = logs.map(l => {
      const ts = new Date(l.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
      const cfg = LEVEL_CONFIG[l.level] || LEVEL_CONFIG.node;
      return `[${ts}] ${cfg.emoji} ${cfg.label.padEnd(6)} ${l.message}`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentflow-session-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLine = (log: TerminalLogEntry) => {
    const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.node;
    const ts = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
    navigator.clipboard.writeText(`[${ts}] ${cfg.emoji} ${cfg.label} ${log.message}`);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleExpand = (logId: string) => {
    dispatch({ type: 'TOGGLE_TERMINAL_LOG_EXPAND', payload: logId });
  };

  // Keyboard shortcut: Ctrl+`
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const lastLog = logs[logs.length - 1];
  const isLive = state.isRunning || state.isAiTyping;

  // ─── Collapsed bar ─────────────────────────────────
  if (!isExpanded && !isFullscreen) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border-t border-[#30363d] cursor-pointer hover:bg-[#161b22] transition-colors select-none"
      >
        <Terminal className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] font-mono text-gray-500">
          {isLive ? (
            <span className="text-green-400">Terminal ⟳ (live)</span>
          ) : (
            'Terminal · idle'
          )}
        </span>
        {lastLog && (
          <span className="text-[10px] font-mono text-gray-600 truncate flex-1">
            {lastLog.message.slice(0, 80)}
          </span>
        )}
        <span className="text-[9px] text-gray-600 font-mono">{logs.length} lines</span>
        <kbd className="text-[8px] text-gray-600 bg-[#21262d] px-1 rounded">Ctrl+`</kbd>
      </div>
    );
  }

  // ─── Expanded / Fullscreen ─────────────────────────
  return (
    <div className={`flex flex-col bg-[#0d1117] border-t border-[#30363d] ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`} style={!isFullscreen ? { height: '35vh', minHeight: 200 } : undefined}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#30363d] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[11px] font-mono font-medium text-gray-300">
            {isLive ? (
              <><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5" />Terminal (live)</>
            ) : (
              'Terminal · idle'
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Filter dropdown */}
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="Filter">
              <Filter className={`w-3 h-3 ${filter ? 'text-purple-400' : 'text-gray-500'}`} />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                <button onClick={() => { setFilter(null); setShowFilter(false); }} className={`w-full text-left px-3 py-1 text-[10px] font-mono hover:bg-[#30363d] ${!filter ? 'text-purple-400' : 'text-gray-400'}`}>All levels</button>
                {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => { setFilter(key); setShowFilter(false); }} className={`w-full text-left px-3 py-1 text-[10px] font-mono hover:bg-[#30363d] ${filter === key ? 'text-purple-400' : 'text-gray-400'}`}>
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowSearch(!showSearch)} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="Search (Ctrl+F)">
            <Search className={`w-3 h-3 ${showSearch ? 'text-purple-400' : 'text-gray-500'}`} />
          </button>
          <button onClick={() => setVerboseMode(!verboseMode)} className="px-1.5 py-0.5 rounded text-[8px] font-mono hover:bg-[#30363d] transition-colors" title={verboseMode ? 'Switch to simple mode' : 'Switch to verbose mode'}>
            <span className={verboseMode ? 'text-green-400' : 'text-gray-500'}>{verboseMode ? 'VERBOSE' : 'SIMPLE'}</span>
          </button>
          <button onClick={() => dispatch({ type: 'CLEAR_TERMINAL_LOGS' })} className="p-1 rounded hover:bg-[#30363d] transition-colors text-gray-500" title="Clear">
            <X className="w-3 h-3" />
          </button>
          <button onClick={exportLogs} className="p-1 rounded hover:bg-[#30363d] transition-colors text-gray-500" title="Export">
            <Download className="w-3 h-3" />
          </button>
          <button onClick={() => { setIsFullscreen(!isFullscreen); if (!isExpanded) setIsExpanded(true); }} className="p-1 rounded hover:bg-[#30363d] transition-colors text-gray-500" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button onClick={() => { setIsExpanded(false); setIsFullscreen(false); }} className="p-1 rounded hover:bg-[#30363d] transition-colors text-gray-500" title="Collapse">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#30363d] bg-[#0d1117]">
          <Search className="w-3 h-3 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="flex-1 text-[11px] font-mono bg-transparent text-gray-300 placeholder-gray-600 outline-none"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[9px] text-gray-500 font-mono">{filteredLogs.length} matches</span>
          )}
        </div>
      )}

      {/* Log lines */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-[11px] leading-[1.6]">
        {filteredLogs.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-600 text-[11px] font-mono">
            {logs.length === 0 ? 'Waiting for events... Start a workflow to see live output.' : 'No matching logs.'}
          </div>
        )}
        {filteredLogs.map((log) => {
          const cfg = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.node;
          const ts = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
          const hasExpandable = log.metadata?.requestBody || log.metadata?.responseBody;
          const isExpandedLog = log.metadata?.expanded;

          return (
            <div key={log.id} className="group flex items-start hover:bg-[#161b22] px-3 py-[1px] transition-colors relative">
              <span className="text-gray-600 w-[85px] flex-shrink-0 select-none">{ts}</span>
              <span className={`${cfg.color} w-[18px] flex-shrink-0 select-none`}>{cfg.emoji}</span>
              <span className={`${cfg.color} w-[48px] flex-shrink-0 select-none opacity-70`}>{cfg.label}</span>
              <span className={`${cfg.color} flex-1 min-w-0 ${log.level === 'error' || log.level === 'fail' ? 'font-medium' : ''}`}>
                {log.message}
                {log.metadata?.durationMs != null && (
                  <span className="text-gray-600 ml-1">({(log.metadata.durationMs / 1000).toFixed(1)}s)</span>
                )}
                {log.metadata?.cost != null && (
                  <span className="text-yellow-500/70 ml-1">(${log.metadata.cost.toFixed(2)})</span>
                )}
                {hasExpandable && (
                  <button onClick={() => toggleExpand(log.id)} className="ml-1 text-gray-500 hover:text-gray-300">
                    {isExpandedLog ? '▾' : '▸'}
                  </button>
                )}
              </span>
              {/* Hover actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 absolute right-2 top-[1px]">
                <button onClick={() => copyLine(log)} className="p-0.5 rounded hover:bg-[#30363d]" title="Copy">
                  {copiedId === log.id ? <span className="text-[8px] text-green-400">✓</span> : <Copy className="w-2.5 h-2.5 text-gray-500" />}
                </button>
                {log.metadata?.nodeId && (
                  <button onClick={() => dispatch({ type: 'SET_SELECTED_NODE', payload: log.metadata!.nodeId! })} className="p-0.5 rounded hover:bg-[#30363d]" title="Go to node">
                    <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
                  </button>
                )}
              </div>
              {/* Expanded content */}
              {isExpandedLog && hasExpandable && (
                <div className="mt-1 ml-[151px] text-[10px] text-gray-500 bg-[#0d1117] border border-[#30363d] rounded p-2 mb-1 max-h-[200px] overflow-auto">
                  {log.metadata?.requestBody && (
                    <div className="mb-2">
                      <span className="text-gray-400 font-medium">Request:</span>
                      <pre className="text-gray-500 whitespace-pre-wrap break-all mt-0.5">{typeof log.metadata.requestBody === 'string' ? log.metadata.requestBody : JSON.stringify(log.metadata.requestBody, null, 2)}</pre>
                    </div>
                  )}
                  {log.metadata?.responseBody && (
                    <div>
                      <span className="text-gray-400 font-medium">Response:</span>
                      <pre className="text-gray-500 whitespace-pre-wrap break-all mt-0.5">{typeof log.metadata.responseBody === 'string' ? log.metadata.responseBody : JSON.stringify(log.metadata.responseBody, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Resume auto-scroll button */}
      {!autoScroll && (
        <button
          onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          className="absolute bottom-12 right-4 px-2 py-1 text-[10px] font-mono bg-[#30363d] text-gray-300 rounded-lg shadow-lg hover:bg-[#484f58] transition-colors z-10"
        >
          ↓ Resume
        </button>
      )}

      {/* Command input */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[#30363d] bg-[#0d1117] flex-shrink-0">
        <span className="text-green-500 font-mono text-[11px] select-none">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommand(commandInput); }}
          placeholder="Type /help for commands..."
          className="flex-1 text-[11px] font-mono bg-transparent text-gray-300 placeholder-gray-700 outline-none"
        />
        <div className="flex items-center gap-3 text-[9px] font-mono text-gray-600">
          {state.nodes.length > 0 && <span>{state.nodes.length} nodes</span>}
          <span>{logs.length} lines</span>
        </div>
      </div>
    </div>
  );
}
