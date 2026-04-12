'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Clock, Globe, FileText, Variable, DollarSign,
  ChevronRight, ChevronDown, PanelRightClose, PanelRightOpen,
  CheckCircle2, XCircle, Loader2, ArrowRight, Copy, ExternalLink,
  Image as ImageIcon, Film, Volume2,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import type { ExecutionEvent } from '@/lib/types';

const TABS = [
  { id: 'timeline' as const, label: 'Timeline', icon: Clock },
  { id: 'network' as const, label: 'Network', icon: Globe },
  { id: 'logs' as const, label: 'Logs', icon: FileText },
  { id: 'variables' as const, label: 'Variables', icon: Variable },
  { id: 'cost' as const, label: 'Cost', icon: DollarSign },
];

export default function InspectorPanel() {
  const { state, dispatch } = useApp();
  const { inspectorOpen, inspectorTab, executionEvents, terminalLogs } = state;

  if (!inspectorOpen) {
    return (
      <button
        onClick={() => dispatch({ type: 'SET_INSPECTOR_OPEN', payload: true })}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-[var(--card)] border border-[var(--border)] rounded-l-lg p-2 hover:bg-[var(--secondary)] transition-colors"
        title="Open Inspector"
      >
        <PanelRightOpen className="w-4 h-4 text-[var(--muted-foreground)]" />
      </button>
    );
  }

  // Count badges for each tab
  const networkCount = executionEvents.filter(e => e.type === 'api_call').length;
  const logCount = terminalLogs.length;
  const varCount = executionEvents.filter(e => e.type === 'node_end').length;
  const costEvents = executionEvents.filter(e => e.type === 'workflow_done');
  const totalCost = costEvents.length > 0 ? (costEvents[costEvents.length - 1].data?.totalCost as number || 0) : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--background)] border-l border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Inspector</h2>
          {state.isRunning && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_INSPECTOR_OPEN', payload: false })}
          className="p-1 rounded hover:bg-[var(--secondary)] transition-colors"
        >
          <PanelRightClose className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = inspectorTab === tab.id;
          const badge = tab.id === 'network' ? networkCount
            : tab.id === 'logs' ? logCount
            : tab.id === 'variables' ? varCount
            : tab.id === 'cost' && totalCost > 0 ? `$${totalCost.toFixed(2)}`
            : 0;
          return (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_INSPECTOR_TAB', payload: tab.id })}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
              {badge !== 0 && (
                <span className={`text-[9px] px-1 py-0 rounded-full ${isActive ? 'bg-[var(--primary)]/20' : 'bg-[var(--secondary)]'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {inspectorTab === 'timeline' && <TimelineView events={executionEvents} />}
        {inspectorTab === 'network' && <NetworkView events={executionEvents} />}
        {inspectorTab === 'logs' && <LogsView />}
        {inspectorTab === 'variables' && <VariablesView events={executionEvents} />}
        {inspectorTab === 'cost' && <CostView events={executionEvents} />}
      </div>
    </div>
  );
}

// ─── TIMELINE TAB ───────────────────────────────────────────

function TimelineView({ events }: { events: ExecutionEvent[] }) {
  if (events.length === 0) {
    return <EmptyState emoji="" title="No events yet" description="Run your workflow to see the execution timeline here" />;
  }

  return (
    <div className="p-3 space-y-1">
      {events.map((event, i) => (
        <TimelineItem key={event.id} event={event} isLast={i === events.length - 1} />
      ))}
    </div>
  );
}

function TimelineItem({ event, isLast }: { event: ExecutionEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const iconMap: Record<string, React.ReactNode> = {
    node_start: <ArrowRight className="w-3 h-3 text-blue-400" />,
    node_end: <CheckCircle2 className="w-3 h-3 text-green-400" />,
    node_error: <XCircle className="w-3 h-3 text-red-400" />,
    error: <XCircle className="w-3 h-3 text-red-400" />,
    api_call: <Globe className="w-3 h-3 text-cyan-400" />,
    log: <FileText className="w-3 h-3 text-[var(--muted-foreground)]" />,
    asset_created: <ImageIcon className="w-3 h-3 text-purple-400" />,
    workflow_done: <CheckCircle2 className="w-3 h-3 text-green-500" />,
    variable_set: <Variable className="w-3 h-3 text-amber-400" />,
  };

  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center">
        <div className="w-5 h-5 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
          {iconMap[event.type] || <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--border)] my-1" />}
      </div>
      <div className="flex-1 pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {event.nodeName || event.type.replace(/_/g, ' ')}
        </button>
        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {new Date(event.timestamp).toLocaleTimeString()}
          {event.duration !== undefined && ` • ${(event.duration / 1000).toFixed(1)}s`}
        </p>
        {expanded && event.data && (
          <div className="mt-2 p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] overflow-x-auto">
            <pre className="text-[10px] text-[var(--muted-foreground)] whitespace-pre-wrap">
              {JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NETWORK TAB ────────────────────────────────────────────

function NetworkView({ events }: { events: ExecutionEvent[] }) {
  const apiEvents = events.filter(e => e.type === 'api_call');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (apiEvents.length === 0) {
    return <EmptyState emoji="" title="No API calls yet" description="HTTP requests to fal.ai, Cloudinary, and other services will appear here during execution" />;
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {/* Summary bar */}
      <div className="px-3 py-2 bg-[var(--card)] flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
        <span>{apiEvents.length} requests</span>
        <span>•</span>
        <span>
          {apiEvents.reduce((sum, e) => sum + ((e.duration || 0) / 1000), 0).toFixed(1)}s total
        </span>
      </div>

      {/* Request list */}
      {apiEvents.map((event) => {
        const service = (event.data?.service as string) || 'unknown';
        const model = (event.data?.model as string) || '';
        const url = (event.data?.url as string) || '';
        const method = (event.data?.method as string) || 'POST';
        const status = (event.data?.status as number) || 200;
        const isExpanded = expandedId === event.id;

        const statusColor = status >= 500 ? 'text-red-400' : status >= 400 ? 'text-yellow-400' : 'text-green-400';
        const serviceEmoji = service.includes('fal') ? '' : service.includes('cloudinary') ? '' : service.includes('claude') ? '' : '';

        return (
          <div key={event.id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--secondary)] transition-colors text-left"
            >
              <span className="text-xs">{serviceEmoji}</span>
              <span className={`text-[10px] font-mono font-bold ${statusColor}`}>{method}</span>
              <span className="flex-1 text-[11px] text-[var(--foreground)] truncate">
                {model || service || url}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {event.duration ? `${(event.duration / 1000).toFixed(1)}s` : '...'}
              </span>
              {isExpanded ? <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-3 h-3 text-[var(--muted-foreground)]" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2">
                {/* Request details */}
                <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase">Request</span>
                    <CopyButton text={JSON.stringify(event.data, null, 2)} />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    {service && <div><span className="text-[var(--muted-foreground)]">Service:</span> <span className="text-[var(--foreground)]">{service}</span></div>}
                    {model && <div><span className="text-[var(--muted-foreground)]">Model:</span> <span className="text-[var(--foreground)]">{model}</span></div>}
                    {url && <div><span className="text-[var(--muted-foreground)]">URL:</span> <span className="text-[var(--foreground)] break-all">{url}</span></div>}
                    {event.nodeName && <div><span className="text-[var(--muted-foreground)]">Node:</span> <span className="text-[var(--foreground)]">{event.nodeName}</span></div>}
                    <div><span className="text-[var(--muted-foreground)]">Time:</span> <span className="text-[var(--foreground)]">{new Date(event.timestamp).toLocaleTimeString()}</span></div>
                  </div>
                </div>

                {/* Full data dump */}
                <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                  <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase">Full Data</span>
                  <pre className="mt-1 text-[10px] text-[var(--muted-foreground)] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── LOGS TAB ───────────────────────────────────────────────

function LogsView() {
  const { state } = useApp();
  const { terminalLogs } = state;
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs.length, autoScroll]);

  if (terminalLogs.length === 0) {
    return <EmptyState emoji="" title="No logs yet" description="Console logs and events will stream here in real time when you run a workflow" />;
  }

  const levelColors: Record<string, string> = {
    run: 'text-blue-400',
    node: 'text-[var(--foreground)]',
    http: 'text-cyan-400',
    store: 'text-purple-400',
    fail: 'text-red-400',
    warn: 'text-yellow-400',
    info: 'text-[var(--muted-foreground)]',
  };

  const filteredLogs = filter === 'all' ? terminalLogs : terminalLogs.filter(l => l.level === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Log filters */}
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-1 bg-[var(--card)]">
        {['all', 'run', 'node', 'http', 'store', 'fail'].map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              filter === level
                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{filteredLogs.length} entries</span>
      </div>

      {/* Log entries */}
      <div
        className="flex-1 overflow-y-auto p-2 font-mono"
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`text-[11px] py-0.5 leading-relaxed ${levelColors[log.level] || 'text-[var(--muted-foreground)]'}`}
          >
            <span className="text-[var(--muted-foreground)] opacity-50">
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>{' '}
            <span className="opacity-60">[{log.level}]</span>{' '}
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

// ─── VARIABLES TAB ──────────────────────────────────────────

function VariablesView({ events }: { events: ExecutionEvent[] }) {
  const nodeEndEvents = events.filter(e => e.type === 'node_end');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (nodeEndEvents.length === 0) {
    return <EmptyState emoji="" title="No variables yet" description="Data passed between nodes will be shown here after each node completes" />;
  }

  return (
    <div className="p-3 space-y-1">
      {nodeEndEvents.map((event) => {
        const isExpanded = expandedId === event.id;
        const output = (event.data?.output as Record<string, unknown>) || event.data || {};
        const hasUrl = !!(output.imageUrl || output.photoUrl || output.videoUrl || output.finalVideoUrl || output.audioUrl || output.cloudinaryUrl);
        const previewUrl = (output.imageUrl || output.photoUrl || output.cloudinaryUrl) as string | undefined;
        const videoUrl = (output.videoUrl || output.finalVideoUrl) as string | undefined;

        return (
          <div key={event.id} className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--card)]">
            <button
              onClick={() => setExpandedId(isExpanded ? null : event.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--secondary)] transition-colors text-left"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-3 h-3 text-[var(--muted-foreground)]" />}
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="flex-1 text-xs font-medium text-[var(--foreground)] truncate">
                {event.nodeName || 'Unknown Node'}
              </span>
              {hasUrl && <ImageIcon className="w-3 h-3 text-purple-400" />}
              {event.duration !== undefined && (
                <span className="text-[10px] text-[var(--muted-foreground)]">{(event.duration / 1000).toFixed(1)}s</span>
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)]">
                {/* Asset preview */}
                {previewUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)]">
                    <img src={previewUrl} alt="Generated" className="w-full max-h-[200px] object-cover" />
                  </div>
                )}
                {videoUrl && !previewUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)]">
                    <video src={videoUrl} controls className="w-full max-h-[200px]" />
                  </div>
                )}

                {/* Output data */}
                <div className="mt-2 space-y-1">
                  {Object.entries(output).map(([key, value]) => {
                    if (key.startsWith('_')) return null; // skip internal fields
                    const strVal = String(value ?? '');
                    const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                    return (
                      <div key={key} className="flex items-start gap-2 text-[10px]">
                        <span className="text-[var(--muted-foreground)] font-mono min-w-[80px] flex-shrink-0">{key}:</span>
                        {isUrl ? (
                          <a href={strVal} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline break-all flex items-center gap-1">
                            {strVal.slice(0, 60)}... <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          </a>
                        ) : typeof value === 'object' && value !== null ? (
                          <pre className="text-[var(--foreground)] whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
                        ) : (
                          <span className="text-[var(--foreground)] break-all">{strVal}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Copy button */}
                <div className="flex justify-end">
                  <CopyButton text={JSON.stringify(output, null, 2)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── COST TAB ───────────────────────────────────────────────

function CostView({ events }: { events: ExecutionEvent[] }) {
  const nodeEndEvents = events.filter(e => e.type === 'node_end');
  const workflowDoneEvents = events.filter(e => e.type === 'workflow_done');
  const apiCallEvents = events.filter(e => e.type === 'api_call');
  const assetEvents = events.filter(e => e.type === 'asset_created');

  // Calculate total cost from workflow_done event or sum from nodes
  const doneEvent = workflowDoneEvents[workflowDoneEvents.length - 1];
  const totalFromDone = (doneEvent?.data?.totalCost as number) || 0;

  // Per-node costs
  const nodeCosts: Array<{ name: string; cost: number; model: string; duration: number }> = [];
  for (const evt of nodeEndEvents) {
    const output = (evt.data?.output as any) || {};
    const cost = output.cost || (evt.data?.cost as number) || 0;
    const model = output.model || (evt.data?.model as string) || '';
    if (cost > 0 || model) {
      nodeCosts.push({
        name: evt.nodeName || 'Unknown',
        cost,
        model,
        duration: evt.duration || 0,
      });
    }
  }

  const totalCost = totalFromDone || nodeCosts.reduce((sum, n) => sum + n.cost, 0);

  // Group by model
  const byModel = new Map<string, { count: number; cost: number }>();
  for (const nc of nodeCosts) {
    const key = nc.model || 'other';
    const existing = byModel.get(key) || { count: 0, cost: 0 };
    byModel.set(key, { count: existing.count + 1, cost: existing.cost + nc.cost });
  }

  const totalNodes = events.filter(e => e.type === 'node_start').length;
  const completedNodes = nodeEndEvents.length;
  const failedNodes = events.filter(e => e.type === 'node_error').length;
  const { state } = useApp();

  return (
    <div className="p-4 space-y-4">
      {/* Big cost number */}
      <div className="text-center py-4">
        <p className="text-3xl font-bold text-[var(--foreground)]">
          ${totalCost.toFixed(2)}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {completedNodes} of {totalNodes || state.nodes.length} nodes complete
          {failedNodes > 0 && <span className="text-red-400"> • {failedNodes} failed</span>}
        </p>
        {state.isRunning && (
          <div className="mt-2 w-full bg-[var(--secondary)] rounded-full h-1.5">
            <div
              className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="API Calls" value={apiCallEvents.length.toString()} icon="" />
        <StatCard label="Assets Created" value={assetEvents.length.toString()} icon="" />
        <StatCard label="Total Duration" value={`${(nodeEndEvents.reduce((s, e) => s + (e.duration || 0), 0) / 1000).toFixed(1)}s`} icon="⏱" />
        <StatCard label="Avg per Node" value={completedNodes > 0 ? `$${(totalCost / completedNodes).toFixed(3)}` : '$0'} icon="" />
      </div>

      {/* Cost by model */}
      {byModel.size > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2 font-medium">Cost by Model</h3>
          <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--card)]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-3 py-1.5 text-[var(--muted-foreground)] font-medium">Model</th>
                  <th className="text-right px-3 py-1.5 text-[var(--muted-foreground)] font-medium">Calls</th>
                  <th className="text-right px-3 py-1.5 text-[var(--muted-foreground)] font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byModel.entries())
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .map(([model, data]) => (
                    <tr key={model} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-3 py-1.5 text-[var(--foreground)] truncate max-w-[150px]">
                        {model.split('/').pop() || model}
                      </td>
                      <td className="px-3 py-1.5 text-right text-[var(--muted-foreground)]">{data.count}</td>
                      <td className="px-3 py-1.5 text-right text-green-400 font-mono">${data.cost.toFixed(3)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--secondary)]">
                  <td className="px-3 py-1.5 font-medium text-[var(--foreground)]">Total</td>
                  <td className="px-3 py-1.5 text-right text-[var(--muted-foreground)]">
                    {Array.from(byModel.values()).reduce((s, d) => s + d.count, 0)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-green-400 font-mono font-bold">${totalCost.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Per-node breakdown */}
      {nodeCosts.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2 font-medium">Per Node</h3>
          <div className="space-y-1">
            {nodeCosts.map((nc, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--foreground)] flex-1 truncate">{nc.name}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{(nc.duration / 1000).toFixed(1)}s</span>
                <span className="text-[10px] text-green-400 font-mono min-w-[50px] text-right">${nc.cost.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no cost data yet */}
      {nodeCosts.length === 0 && byModel.size === 0 && !state.isRunning && (
        <div className="text-center py-4">
          <p className="text-xs text-[var(--muted-foreground)]">Run a workflow to see cost breakdown</p>
        </div>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ──────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--secondary)] rounded transition-colors"
    >
      <Copy className="w-2.5 h-2.5" />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function EmptyState({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="text-center px-6">
        <div className="text-3xl mb-2">{emoji}</div>
        <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">{title}</h3>
        <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
      </div>
    </div>
  );
}
