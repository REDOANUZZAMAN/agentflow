'use client';

import React, { useState } from 'react';
import { Film, Download, Share2, Check, Loader2 } from 'lucide-react';

// Finished video: play, download, and copy a public share link
export default function VideoCard({ url, poster, label, executionId }: { url: string; poster?: string; label?: string; executionId?: string }) {
  const [share, setShare] = useState<'idle' | 'working' | 'copied' | 'error'>('idle');

  const copyShareLink = async () => {
    if (!executionId) return;
    setShare('working');
    try {
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ executionId }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'failed');
      await navigator.clipboard.writeText(data.url).catch(() => window.prompt('Copy this link:', data.url));
      setShare('copied');
      setTimeout(() => setShare('idle'), 2500);
    } catch {
      setShare('error');
      setTimeout(() => setShare('idle'), 2500);
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden surface">
      <video src={url} poster={poster} controls playsInline preload="metadata" className="w-full aspect-video bg-black" />
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--foreground)] font-medium flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-[var(--accent)]" /> {label || 'Final video'}</span>
        <div className="flex items-center gap-1.5">
          <a href={url} download className="btn btn-secondary btn-sm !py-1 !px-2" title="Download"><Download className="w-3 h-3" /></a>
          {executionId && (
            <button onClick={copyShareLink} disabled={share === 'working'} className="btn btn-primary btn-sm !py-1" title="Copy a public link anyone can watch">
              {share === 'working' ? <Loader2 className="w-3 h-3 animate-spin" /> : share === 'copied' ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
              {share === 'copied' ? 'Link copied' : share === 'error' ? 'Try again' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
