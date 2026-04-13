'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { NodeIcon, getNodeColor } from '@/lib/node-icons';

// n8n-style square node: icon box with handles attached to it + label below
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

  // Status ring colors
  const statusRing: Record<string, string> = {
    idle: '',
    running: 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]',
    success: 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--background)]',
    error: 'ring-2 ring-red-500 ring-offset-2 ring-offset-[var(--background)]',
  };

  const subtitle = getNodeSubtitle(type, config);

  return (
    <div className="node-appear flex flex-col items-center gap-1.5 group" style={{ width: '100px' }}>
      {/* Icon box — handles are INSIDE this so they attach to the box edges */}
      <div
        className={`
          relative w-[64px] h-[64px] rounded-xl flex items-center justify-center
          bg-[var(--card)] border-2 border-[var(--border)]
          ${selected ? '!border-[var(--primary)] shadow-[0_0_0_2px_rgba(99,102,241,0.2)]' : ''}
          ${statusRing[status] || ''}
          shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer
        `}
      >
        {/* Colored icon background */}
        <div className={`w-10 h-10 rounded-lg ${nodeColor.bg} flex items-center justify-center`}>
          <NodeIcon type={type} className={`w-5 h-5 ${nodeColor.icon}`} />
        </div>

        {/* LEFT handle (input) — centered vertically on the icon box */}
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            className="!w-2.5 !h-2.5 !bg-[var(--muted-foreground)] !border-2 !border-[var(--background)] !rounded-full"
            style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
          />
        )}

        {/* RIGHT handle (output) — centered vertically on the icon box */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !bg-[var(--primary)] !border-2 !border-[var(--background)] !rounded-full"
          style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
        />

        {/* Status badge - top right corner */}
        {status === 'running' && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--card)] flex items-center justify-center border border-[var(--border)]">
            <Loader2 className="w-2.5 h-2.5 text-[var(--primary)] animate-spin" />
          </div>
        )}
        {status === 'success' && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <XCircle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Green trigger indicator */}
        {isTrigger && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-emerald-500" />
        )}
      </div>

      {/* Label below the box */}
      <div className="text-center w-full px-0.5">
        <p className="text-[11px] font-semibold text-[var(--foreground)] truncate leading-tight">
          {label}
        </p>
        {subtitle && (
          <p className="text-[9px] text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Error tooltip on hover */}
      {error && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="inline-block px-2 py-0.5 bg-red-500/90 text-white text-[8px] rounded-md whitespace-nowrap max-w-[140px] truncate">
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
      return '';
    case 'webhook_trigger':
      return config.url ? 'Webhook URL' : '';
    case 'claude_chat':
      return config.prompt ? `${(config.prompt as string).slice(0, 18)}...` : '';
    case 'send_email':
      return config.to ? `To: ${(config.to as string).slice(0, 15)}` : '';
    case 'post_x':
    case 'post_instagram':
    case 'post_linkedin':
    case 'post_tiktok':
      return '';
    case 'http_request':
      return config.method ? `${config.method}` : '';
    case 'web_search':
      return config.query ? `"${(config.query as string).slice(0, 14)}"` : '';
    case 'final_video_compiler':
      return config.transition ? `${config.transition}` : '';
    case 'project_orchestrator':
      return config.projectName ? `${(config.projectName as string).slice(0, 15)}` : '';
    case 'element_reference':
      return config.elementName ? `${config.elementName}` : '';
    case 'photo_generator':
      return 'Photo';
    case 'video_generator':
      return 'Video';
    case 'voiceover_generator':
      return 'Voiceover';
    default:
      return '';
  }
}
