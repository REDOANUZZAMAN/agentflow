'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Loader2, Image as ImageIcon, Film, AudioLines, Wallet, AlertTriangle, X } from 'lucide-react';
import { estimateWorkflowCost } from '@/lib/fal-pricing';
import { applyDefaults } from '@/lib/node-defaults';

interface Usage { unlimited: boolean; limit: number; used: number; remaining: number | null; resetsAt: string }

const KIND = {
  image: { label: 'Images', icon: ImageIcon, tint: 'text-rose-300' },
  video: { label: 'Video clips', icon: Film, tint: 'text-red-300' },
  audio: { label: 'Voiceovers', icon: AudioLines, tint: 'text-sky-300' },
} as const;

// "This run will cost about $X — continue?" with today's free allowance
export default function RunConfirmDialog({ nodes, onConfirm, onCancel }: { nodes: any[]; onConfirm: () => void; onCancel: () => void }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Same defaults the engine applies, so the estimate matches what will really run
  const estimate = useMemo(() => estimateWorkflowCost(
    nodes.map(n => ({ data: { type: n.data?.type, config: applyDefaults(n.data?.type, n.data?.config || {}) as Record<string, any> } })),
  ), [nodes]);

  useEffect(() => {
    fetch('/api/usage').then(r => r.ok ? r.json() : Promise.reject()).then(setUsage).catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const overLimit = !!usage && !usage.unlimited && usage.remaining !== null && estimate.total > usage.remaining;
  const resetTime = usage ? new Date(usage.resetsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-[var(--popover)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md mx-4 context-menu-appear" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h2 className="text-[16px] font-semibold">Run this workflow?</h2>
            <p className="text-small text-[var(--text-muted)] mt-0.5">{nodes.length} nodes · AI generation is paid per result</p>
          </div>
          <button onClick={onCancel} className="icon-btn !w-7 !h-7" title="Cancel"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 space-y-2">
          {estimate.breakdown.length === 0 ? (
            <p className="surface px-3.5 py-3 text-small text-[var(--text-secondary)]">No paid AI steps — this run is free.</p>
          ) : estimate.breakdown.map(b => {
            const k = KIND[b.type as keyof typeof KIND] || KIND.image;
            const Icon = k.icon;
            return (
              <div key={b.type} className="surface flex items-center gap-3 px-3.5 py-2.5">
                <Icon className={`w-4 h-4 ${k.tint}`} />
                <span className="text-[13px] flex-1">{k.label} <span className="text-[var(--text-muted)]">× {b.count}</span></span>
                <span className="text-[13px] font-medium tabular-nums">${b.subtotal.toFixed(2)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-1 pt-2">
            <span className="text-[13px] text-[var(--text-secondary)]">Estimated total</span>
            <span className="text-[22px] font-semibold tabular-nums">${estimate.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mx-5 mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3.5 py-3">
          {!usage && !loadError && <p className="text-small text-[var(--text-muted)] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking today&apos;s allowance…</p>}
          {loadError && <p className="text-small text-[var(--text-muted)]">Couldn&apos;t load today&apos;s allowance — the server will still check it.</p>}
          {usage && (usage.unlimited ? (
            <p className="text-small text-[var(--text-secondary)] flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-[var(--accent)]" /> Owner account — no daily limit. Used today: ${usage.used.toFixed(2)}</p>
          ) : (
            <>
              <div className="flex items-center justify-between text-small mb-2">
                <span className="text-[var(--text-secondary)] flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-[var(--accent)]" /> Today&apos;s free usage</span>
                <span className="tabular-nums">${usage.used.toFixed(2)} / ${usage.limit.toFixed(2)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--secondary)] overflow-hidden flex">
                <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
                <div className={`h-full ${overLimit ? 'bg-red-500' : 'bg-[var(--accent)]/40'}`} style={{ width: `${Math.min(100 - Math.min(100, (usage.used / usage.limit) * 100), (estimate.total / usage.limit) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">Resets at {resetTime}. A run stops automatically if it reaches the limit.</p>
            </>
          ))}
        </div>

        {overLimit && (
          <p className="mx-5 mt-3 flex items-start gap-2 text-small text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            This run needs about ${estimate.total.toFixed(2)} but only ${usage!.remaining!.toFixed(2)} is left today. Remove some shots or try again after {resetTime}.
          </p>
        )}

        <div className="flex justify-end gap-2 p-5">
          <button onClick={onCancel} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={onConfirm} disabled={overLimit} className="btn btn-primary btn-sm !px-4" autoFocus>
            <Play className="w-3 h-3 fill-current" /> Run for ~${estimate.total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
