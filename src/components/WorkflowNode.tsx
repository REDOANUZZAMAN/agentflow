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

// Compact n8n-style node with horizontal (left→right) connections
export default function WorkflowNodeComponent(props: NodeProps) {
  const data = props.data || {};
  const status = (data.status as string) || 'idle';
  const label = (data.label as string) || 'Node';
  const type = (data.type as string) || 'unknown';
  const error = data.error as string | undefined;
  const config = (data.config as Record<string, unknown>) || {};
  const selected = props.selected;

  const nodeColor = getNodeColor(type);
  const isTrigger = type.includes('trigger');

  // Status-specific border
  const statusBorder: Record<string, string> = {
    idle: 'border-[var(--border)]',
    running: 'border-[var(--primary)] shadow-[0_0_12px_rgba(99,102,241,0.4)]',
    success: 'border-emerald-500/60',
    error: 'border-red-500/60',
  };

  // Status badge
  const statusBadge = () => {
    if (status === 'running') return <Loader2 className="w-3 h-3 text-[var(--primary)] animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (status === 'error') return <XCircle className="w-3 h-3 text-red-400" />;
    return null;
  };

  const subtitle = getNodeSubtitle(type, config);

  return (
    <div
      className={`
        node-appear relative flex items-center gap-2.5
        bg-[var(--card)] rounded-xl border ${statusBorder[status] || statusBorder.idle}
        ${selected ? '!border-[var(--primary)] ring-2 ring-[var(--primary)]/20' : ''}
        shadow-md hover:shadow-lg transition-all duration-150
        px-3 py-2.5 min-w-[140px] max-w-[200px]
      `}
    >
      {/* Left handle (input) — not for triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-[var(--muted-foreground)] !border-2 !border-[var(--card)] !-left-[6px]"
        />
      )}

      {/* Colored icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${nodeColor.bg} ring-1 ${nodeColor.ring} flex items-center justify-center`}>
        <NodeIcon type={type} className={`w-4.5 h-4.5 ${nodeColor.icon}`} />
      </div>

      {/* Label + subtitle */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[12px] font-semibold text-[var(--foreground)] truncate leading-tight">{label}</h3>
        {subtitle && (
          <p className="text-[10px] text-[var(--muted-foreground)] truncate leading-tight mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Status badge */}
      {statusBadge() && (
        <div className="flex-shrink-0">{statusBadge()}</div>
      )}

      {/* Right handle (output) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[var(--primary)] !border-2 !border-[var(--card)] !-right-[6px]"
      />

      {/* Error tooltip */}
      {error && (
        <div className="absolute left-0 -bottom-6 right-0 text-center">
          <span className="inline-block px-2 py-0.5 bg-red-500/90 text-white text-[9px] rounded-md truncate max-w-[180px]">
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

function getNodeSubtitle(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case 'schedule_trigger':
      return config.schedule ? `${config.schedule}` : '';
    case 'manual_trigger':
      return 'Click to run';
    case 'webhook_trigger':
      return config.url ? `${config.url}` : '';
    case 'claude_chat':
      return config.prompt ? `${(config.prompt as string).slice(0, 25)}...` : '';
    case 'send_email':
      return config.to ? `To: ${config.to}` : '';
    case 'post_x':
      return 'Twitter/X';
    case 'post_instagram':
      return 'Instagram';
    case 'post_linkedin':
      return 'LinkedIn';
    case 'post_tiktok':
      return 'TikTok';
    case 'http_request':
      return config.url ? `${config.method || 'GET'} ...` : '';
    case 'web_search':
      return config.query ? `"${(config.query as string).slice(0, 20)}"` : '';
    case 'final_video_compiler':
      return config.transition ? `${config.transition}` : '';
    case 'project_orchestrator':
      return config.projectName ? `${(config.projectName as string).slice(0, 20)}` : '';
    case 'element_reference':
      return config.elementName ? `${config.elementName}` : '';
    case 'photo_generator':
    case 'video_generator':
    case 'voiceover_generator':
      return config.prompt ? `${(config.prompt as string).slice(0, 22)}...` : '';
    default:
      return '';
  }
}
