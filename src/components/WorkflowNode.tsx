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

  const statusStyle: Record<string, string> = {
    idle: '',
    running: 'node-running !border-[var(--primary)]',
    success: '!border-emerald-500/70 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]',
    error: '!border-red-500/70 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
  };

  const subtitle = getNodeSubtitle(type, config);

  return (
    <div className="node-appear relative flex flex-col items-center gap-2 group" style={{ width: '140px' }}>
      {/* Icon box — handles are INSIDE this so they attach to the box edges */}
      <div
        className={`
          relative w-[68px] h-[68px] rounded-2xl flex items-center justify-center
          bg-gradient-to-b from-[#211A36] to-[#171127] border border-[var(--border)]
          shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-all duration-150 cursor-pointer
          group-hover:border-[rgba(167,139,250,0.45)] group-hover:-translate-y-0.5
          ${selected ? '!border-[var(--accent)] shadow-[0_0_0_3px_rgba(139,92,246,0.3),0_8px_24px_rgba(124,58,237,0.35)]' : ''}
          ${statusStyle[status] || ''}
        `}
      >
        <div className={`w-11 h-11 rounded-xl ${nodeColor.bg} ring-1 ${nodeColor.ring} flex items-center justify-center`}>
          <NodeIcon type={type} className={`w-5 h-5 ${nodeColor.icon}`} />
        </div>

        {/* LEFT handle (input) */}
        {!isTrigger && (
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-[#2A2142] !border-2 !border-[var(--accent)]/60 !rounded-full hover:!bg-[var(--accent)]"
            style={{ left: '-7px', top: '50%', transform: 'translateY(-50%)' }}
          />
        )}

        {/* RIGHT handle (output) */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-[var(--primary)] !border-2 !border-[var(--background)] !rounded-full hover:!scale-125"
          style={{ right: '-7px', top: '50%', transform: 'translateY(-50%)' }}
        />

        {/* Status badge */}
        {status === 'running' && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--popover)] flex items-center justify-center ring-1 ring-[var(--border)]">
            <Loader2 className="w-3 h-3 text-[var(--accent)] animate-spin" />
          </div>
        )}
        {status === 'success' && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[var(--background)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-[var(--background)]">
            <XCircle className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Trigger marker */}
        {isTrigger && (
          <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[5px] h-7 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
        )}
      </div>

      {/* Label below the box */}
      <div className="text-center w-full px-1">
        <p className={`text-[12px] font-semibold truncate leading-tight ${selected ? 'text-white' : 'text-[var(--foreground)]'}`} title={label}>
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight mt-0.5" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Error tooltip on hover */}
      {error && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="inline-block px-2 py-1 bg-red-500/95 text-white text-[10px] rounded-md whitespace-nowrap max-w-[180px] truncate shadow-lg">
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
