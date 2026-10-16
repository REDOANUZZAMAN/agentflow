import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Zap, Download } from 'lucide-react';
import { readShareToken } from '@/lib/share';

export const dynamic = 'force-dynamic';

async function loadShared(token: string) {
  const executionId = readShareToken(decodeURIComponent(token));
  if (!executionId) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: assets } = await db
    .from('assets').select('cloudinary_url, thumbnail_url, type, tags, filename, created_at, workflow_id')
    .eq('execution_id', executionId).eq('type', 'video').order('created_at', { ascending: false });
  const video = (assets || []).find(a => (a.tags || []).includes('final') || a.filename?.startsWith('final_video_compiler')) || assets?.[0];
  if (!video) return null;
  const { data: wf } = await db.from('workflows').select('name').eq('id', video.workflow_id).maybeSingle();
  return { video, title: wf?.name || 'AgentFlow video' };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const shared = await loadShared((await params).token);
  if (!shared) return { title: 'Video not found — AgentFlow' };
  return {
    title: `${shared.title} — AgentFlow`,
    openGraph: { title: shared.title, type: 'video.other', images: shared.video.thumbnail_url ? [shared.video.thumbnail_url] : [], videos: [shared.video.cloudinary_url] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const shared = await loadShared((await params).token);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-[var(--background)] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.16),transparent_60%)]">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">AgentFlow</span>
        </div>

        {shared ? (
          <>
            <h1 className="text-h2 mb-4">{shared.title}</h1>
            <div className="surface overflow-hidden !rounded-2xl shadow-[var(--shadow-lg)]">
              <video src={shared.video.cloudinary_url} poster={shared.video.thumbnail_url || undefined} controls playsInline className="w-full aspect-video bg-black" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <p className="text-small text-[var(--text-muted)]">Made with AgentFlow — AI agents built by chatting.</p>
              <div className="flex gap-2">
                <a href={shared.video.cloudinary_url} download className="btn btn-secondary btn-sm"><Download className="w-3.5 h-3.5" /> Download</a>
                <Link href="/" className="btn btn-primary btn-sm">Make your own</Link>
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center !py-16">
            <h1 className="text-h3 mb-2">This video isn&apos;t available</h1>
            <p className="text-body text-[var(--text-secondary)]">The link may be wrong, or the video was deleted.</p>
          </div>
        )}
      </div>
    </main>
  );
}
