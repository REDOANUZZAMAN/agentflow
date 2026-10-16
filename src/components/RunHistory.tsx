'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CheckCircle2, XCircle, Loader2, Square, ChevronDown, ChevronRight, History, RefreshCw, Image as ImageIcon, AudioLines } from 'lucide-react';
import { useApp } from '@/lib/context';
import VideoCard from './VideoCard';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Run { id: string; status: string; started_at: string; completed_at: string | null; cost: number | null; events: { error?: string | null } | null }
interface Asset { id: string; type: string; cloudinary_url: string; thumbnail_url: string | null; filename: string; tags: string[] | null; scene: number | null; shot: number | null }

// DB statuses are 'running' | 'success' | 'error'; a stop is an error with "Stopped by user"
const STATUS = {
  success: { label: 'Completed', icon: CheckCircle2, cls: 'text-emerald-300' },
  error: { label: 'Failed', icon: XCircle, cls: 'text-red-300' },
  stopped: { label: 'Stopped', icon: Square, cls: 'text-amber-300' },
  running: { label: 'Running', icon: Loader2, cls: 'text-[var(--accent)]' },
} as const;

// Past runs of this workflow: result, cost, time — open one to see its files again
export default function RunHistory() {
  const { state } = useApp();
  const params = useParams();
  const workflowId = params?.workflowId as string;
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, Asset[]>>({});

  const load = useCallback(async () => {
    if (!workflowId || workflowId === 'new') { setRuns([]); return; }
    const { data } = await supabase.from('executions')
      .select('id, status, started_at, completed_at, cost, events')
      .eq('workflow_id', workflowId).order('started_at', { ascending: false }).limit(50);
    setRuns(data || []);
  }, [workflowId]);

  // Reload whenever a run starts or finishes
  useEffect(() => { load(); }, [load, state.isRunning]);

  const toggle = async (id: string) => {
    setOpen(open === id ? null : id);
    if (!assets[id]) {
      const { data } = await supabase.from('assets')
        .select('id, type, cloudinary_url, thumbnail_url, filename, tags, scene, shot')
        .eq('execution_id', id).order('created_at', { ascending: true });
      setAssets(prev => ({ ...prev, [id]: data || [] }));
    }
  };

  if (runs === null) return <div className="p-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" /></div>;

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 h-full">
        <History className="w-8 h-8 text-[var(--text-muted)] mb-3" />
        <p className="text-[13px] font-medium">No runs yet</p>
        <p className="text-small text-[var(--text-muted)] mt-1">Every time you run this workflow it appears here, with its cost and files.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-[var(--text-muted)]">{runs.length} run{runs.length > 1 ? 's' : ''} · newest first</span>
        <button onClick={load} className="icon-btn !w-6 !h-6" title="Refresh"><RefreshCw className="w-3 h-3" /></button>
      </div>
      {runs.map(run => {
        const files = assets[run.id];
        const runError = run.events && !Array.isArray(run.events) ? run.events.error : null;
        const st = runError === 'Stopped by user' ? STATUS.stopped : STATUS[run.status as keyof typeof STATUS] || STATUS.error;
        const Icon = st.icon;
        const seconds = run.completed_at ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000) : null;
        const final = files?.find(a => a.type === 'video' && ((a.tags || []).includes('final') || a.filename?.startsWith('final_video_compiler')));
        const others = files?.filter(a => a !== final) || [];
        return (
          <div key={run.id} className="surface overflow-hidden">
            <button onClick={() => toggle(run.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors">
              {open === run.id ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              <Icon className={`w-3.5 h-3.5 ${st.cls} ${run.status === 'running' ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium">{new Date(run.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{st.label}{seconds !== null ? ` · ${seconds}s` : ''}</p>
              </div>
              <span className="text-[12px] tabular-nums text-[var(--text-secondary)]">${Number(run.cost || 0).toFixed(2)}</span>
            </button>
            {open === run.id && (
              <div className="px-3 pb-3 space-y-2.5 border-t border-[var(--border-subtle)] pt-2.5">
                {runError && runError !== 'Stopped by user' && <p className="text-[11px] text-red-300/90 break-words">{runError}</p>}
                {!files && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />}
                {final && <VideoCard url={final.cloudinary_url} poster={final.thumbnail_url || undefined} executionId={run.id} />}
                {others.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {others.map(a => (
                      <a key={a.id} href={a.cloudinary_url} target="_blank" rel="noreferrer" title={a.filename}
                        className="relative aspect-video rounded-md overflow-hidden bg-[var(--bg-sunken)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 flex items-center justify-center">
                        {a.type === 'audio' ? <AudioLines className="w-4 h-4 text-sky-300" />
                          : a.thumbnail_url ? <img src={a.thumbnail_url} alt={a.filename} className="w-full h-full object-cover" loading="lazy" />
                          : <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />}
                        {a.shot && <span className="absolute bottom-0.5 left-0.5 text-[9px] px-1 rounded bg-black/60">S{a.scene}·{a.shot}</span>}
                      </a>
                    ))}
                  </div>
                )}
                {files && files.length === 0 && !runError && <p className="text-[11px] text-[var(--text-muted)]">No files from this run.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
