/**
 * Library Types — NO mock data. All real types only.
 */

export type AssetType = 'photo' | 'video' | 'audio' | 'other';

export interface Asset {
  id: string;
  workflow_id: string | null;
  execution_id: string | null;
  user_id: string;
  type: AssetType;
  cloudinary_public_id: string;
  cloudinary_url: string;
  thumbnail_url?: string;
  filename: string;
  scene?: number;
  shot?: number;
  prompt?: string;
  negative_prompt?: string;
  model?: string;
  cost?: number;
  duration_seconds?: number;
  file_size?: number;
  width?: number;
  height?: number;
  created_at: string;
  tags: string[];
  starred: boolean;
  status: 'ready' | 'processing' | 'failed';
  // Joined fields
  workflow_name?: string;
  workflow_emoji?: string;
  execution_started_at?: string;
}

export interface WorkflowFolder {
  id: string;
  name: string;
  emoji: string;
  updated_at: string;
  created_at: string;
  asset_count: number;
  run_count: number;
  total_cost: number;
  runs: ExecutionRun[];
}

export interface ExecutionRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'done' | 'failed';
  started_at: string;
  finished_at: string | null;
  asset_count: number;
  total_cost: number;
  assets: Asset[];
}

export interface LibraryFilters {
  search: string;
  type: AssetType | 'all';
  workflowId: string | null;
  executionId: string | null;
  sortBy: 'newest' | 'oldest' | 'name' | 'size' | 'cost';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatCost(cost?: number): string {
  if (!cost) return '$0.00';
  return `$${cost.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function getAssetIcon(type: AssetType): string {
  switch (type) {
    case 'photo': return '🖼️';
    case 'video': return '🎬';
    case 'audio': return '🔊';
    default: return '📄';
  }
}
