'use client';

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';
import { NodeIcon, getNodeColor } from '@/lib/node-icons';

// Define node data type
type WorkflowNodeData = Node<{
  type: string;
  label: string;
  emoji: string;
  config: Record<string, unknown>;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  output?: unknown;
}>;

// Use a plain function (no memo) to ensure it renders
export default function WorkflowNodeComponent(props: NodeProps) {
  // Access data from props - React Flow v12 passes data as Record<string, unknown>
  const data = props.data || {};
  const status = (data.status as string) || 'idle';
  const emoji = (data.emoji as string) || '?';
  const label = (data.label as string) || 'Node';
  const type = (data.type as string) || 'unknown';
  const error = data.error as string | undefined;
  const config = (data.config as Record<string, unknown>) || {};
  const selected = props.selected;

  const statusColors: Record<string, string> = {
    idle: 'border-[var(--border)]',
    running: 'border-[var(--primary)] node-running',
    success: 'border-[var(--success)]',
    error: 'border-[var(--destructive)]',
  };

  const nodeColor = getNodeColor(type);
  const bgGradient = nodeColor.gradient;
  const isTrigger = type.includes('trigger');

  return (
    <div
      className={`
        node-appear relative bg-[var(--card)] rounded-xl border-2 ${statusColors[status] || statusColors.idle}
        ${selected ? '!border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : ''}
        shadow-lg hover:shadow-xl transition-all duration-200
        min-w-[180px] max-w-[240px]
      `}
    >
      {/* Top handle (input) - not for triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-[var(--primary)] !border-2 !border-[var(--card)] !-top-1.5"
        />
      )}

      {/* Node content */}
      <div className={`bg-gradient-to-br ${bgGradient} rounded-t-[10px] px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${nodeColor.bg} ring-1 ${nodeColor.ring}`}><NodeIcon type={type} className={`w-4.5 h-4.5 ${nodeColor.icon}`} /></span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">{label}</h3>
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">
              {getNodeDescription(type, config)}
            </p>
          </div>
          {/* Status icon */}
          <div className="flex-shrink-0">
            {status === 'running' && <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />}
            {status === 'error' && <XCircle className="w-4 h-4 text-[var(--destructive)]" />}
          </div>
        </div>
      </div>

      {/* Config summary */}
      <div className="px-4 py-2 text-[11px] text-[var(--muted-foreground)] overflow-hidden break-words line-clamp-2 max-h-[3.5em]">
        {getConfigSummary(type, config)}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-1.5 bg-[var(--destructive)]/10 border-t border-[var(--destructive)]/20 text-[10px] text-[var(--destructive)] rounded-b-[10px]">
          {error}
        </div>
      )}

      {/* Bottom handle (output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[var(--primary)] !border-2 !border-[var(--card)] !-bottom-1.5"
      />

      {/* Show how it works button */}
      <button
        className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-[var(--secondary)] border border-[var(--border)] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        title="Show me how it works"
      >
        <HelpCircle className="w-3 h-3 text-[var(--muted-foreground)]" />
      </button>
    </div>
  );
}

function getNodeDescription(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case 'schedule_trigger':
      return config.schedule ? `Runs ${config.schedule}` : 'Set a schedule';
    case 'manual_trigger':
      return 'Click to run';
    case 'webhook_trigger':
      return config.url ? `${config.url}` : 'Webhook URL';
    case 'claude_chat':
      return config.prompt ? `"${(config.prompt as string).slice(0, 30)}..."` : 'AI text generation';
    case 'send_email':
      return config.to ? `To: ${config.to}` : 'Configure email';
    case 'post_x':
      return 'Post to X (Twitter)';
    case 'http_request':
      return config.url ? `${config.method || 'GET'} ${config.url}` : 'API call';
    case 'web_search':
      return config.query ? `"${config.query}"` : 'Web search';
    case 'final_video_compiler':
      return config.transition ? `${config.transition} • ${config.outputResolution || '1080p'}` : 'Merge all shots into one video';
    case 'project_orchestrator':
      return config.projectName ? `${config.projectName}` : 'Full pipeline orchestrator';
    default:
      return type.replace(/_/g, ' ');
  }
}

function getConfigSummary(type: string, config: Record<string, unknown>): string {
  const entries = Object.entries(config).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return 'Click to configure';
  
  // Show at most 2 fields, each truncated to 30 chars max
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + '…' : s;
  
  return entries
    .slice(0, 2)
    .map(([key, val]) => {
      const display = typeof val === 'string' 
        ? truncate(val, 30) 
        : truncate(JSON.stringify(val), 30);
      return `${key}: ${display}`;
    })
    .join(' • ');
}
