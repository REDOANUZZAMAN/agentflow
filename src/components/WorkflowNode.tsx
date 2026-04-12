'use client';

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';

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
  const emoji = (data.emoji as string) || '❓';
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

  const categoryColors: Record<string, string> = {
    manual_trigger: 'from-yellow-500/20 to-orange-500/20',
    schedule_trigger: 'from-yellow-500/20 to-orange-500/20',
    webhook_trigger: 'from-yellow-500/20 to-orange-500/20',
    claude_chat: 'from-purple-500/20 to-indigo-500/20',
    image_gen: 'from-pink-500/20 to-purple-500/20',
    video_gen: 'from-pink-500/20 to-purple-500/20',
    voice_gen: 'from-pink-500/20 to-purple-500/20',
    post_x: 'from-blue-500/20 to-cyan-500/20',
    post_instagram: 'from-pink-500/20 to-rose-500/20',
    post_linkedin: 'from-blue-500/20 to-indigo-500/20',
    post_tiktok: 'from-red-500/20 to-pink-500/20',
    send_email: 'from-green-500/20 to-emerald-500/20',
    send_telegram: 'from-blue-500/20 to-sky-500/20',
    http_request: 'from-orange-500/20 to-amber-500/20',
    web_search: 'from-teal-500/20 to-cyan-500/20',
    web_scraper: 'from-gray-500/20 to-zinc-500/20',
    file_read: 'from-amber-500/20 to-yellow-500/20',
    file_write: 'from-amber-500/20 to-yellow-500/20',
    file_generate: 'from-amber-500/20 to-yellow-500/20',
    if_else: 'from-violet-500/20 to-purple-500/20',
    loop: 'from-violet-500/20 to-purple-500/20',
    wait: 'from-gray-500/20 to-slate-500/20',
    // Video Pipeline
    script_parser: 'from-cyan-500/20 to-teal-500/20',
    element_reference: 'from-fuchsia-500/20 to-pink-500/20',
    photo_generator: 'from-rose-500/20 to-orange-500/20',
    video_generator: 'from-red-500/20 to-amber-500/20',
    voiceover_generator: 'from-sky-500/20 to-blue-500/20',
    project_orchestrator: 'from-emerald-500/20 to-cyan-500/20',
    final_video_compiler: 'from-rose-500/20 to-red-500/20',
  };

  const bgGradient = categoryColors[type] || 'from-gray-500/20 to-zinc-500/20';
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
          <span className="text-xl">{emoji}</span>
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
      <div className="px-4 py-2 text-[11px] text-[var(--muted-foreground)]">
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
  const entries = Object.entries(config);
  if (entries.length === 0) return '⚙️ Click to configure';
  
  return entries
    .slice(0, 2)
    .map(([key, val]) => `${key}: ${typeof val === 'string' ? val.slice(0, 25) : JSON.stringify(val)}`)
    .join(' • ');
}
