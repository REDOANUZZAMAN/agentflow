'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Sparkles, FolderOpen, MoreHorizontal, Pencil, Trash2, Copy, ExternalLink, X } from 'lucide-react';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface Workflow {
  id: string;
  name: string;
  emoji: string;
  status: string;
  nodes: any[];
  edges: any[];
  run_count: number;
  last_run_at: string | null;
  updated_at: string;
  created_at: string;
}

const TEMPLATES = [
  { emoji: '😂', name: 'Daily joke by email', prompt: 'Make me an agent that sends me a funny joke by email every morning' },
  { emoji: '📰', name: 'News summary', prompt: 'Build an agent that writes a daily news summary and emails it to me' },
  { emoji: '🐦', name: 'Auto-post to X', prompt: 'Create an agent that generates engaging tweets and posts them to X daily' },
  { emoji: '🔍', name: 'Web monitor', prompt: 'Build an agent that monitors a webpage for changes and alerts me' },
  { emoji: '🎬', name: 'Script to video', prompt: 'Create a video pipeline that turns a script into a cinematic short film' },
  { emoji: '📸', name: 'Instagram reels', prompt: 'Build an agent that creates and posts Instagram reels automatically' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/signin'); return; }
      setUser(user);

      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      setWorkflows(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const createWorkflow = async () => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({
      user_id: user.id,
      name: 'Untitled Workflow',
      emoji: '🤖',
      status: 'draft',
      nodes: [],
      edges: [],
    }).select().single();
    if (data) router.push(`/builder/${data.id}`);
  };

  const createFromTemplate = async (template: typeof TEMPLATES[0]) => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({
      user_id: user.id,
      name: template.name,
      emoji: template.emoji,
      status: 'draft',
      nodes: [],
      edges: [],
    }).select().single();
    if (data) router.push(`/builder/${data.id}?prompt=${encodeURIComponent(template.prompt)}`);
  };

  const handleRename = async (workflowId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    await supabase.from('workflows').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', workflowId);
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, name: trimmed } : w));
    setRenamingId(null);
  };

  const handleDuplicate = async (wf: Workflow) => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({
      user_id: user.id,
      name: `${wf.name} (copy)`,
      emoji: wf.emoji,
      status: 'draft',
      nodes: wf.nodes,
      edges: wf.edges,
    }).select().single();
    if (data) setWorkflows(prev => [data, ...prev]);
    setMenuOpen(null);
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    await supabase.from('assets').delete().eq('workflow_id', workflowId);
    await supabase.from('workflows').delete().eq('id', workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    setMenuOpen(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">AgentFlow</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/library" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors">
              <FolderOpen className="w-3.5 h-3.5" /> Library
            </Link>
            <button onClick={createWorkflow} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> New Workflow
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} 👋
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">Build AI agents by just describing what you want.</p>
        </div>

        {/* Your Workflows */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Your Workflows</h3>
            <span className="text-xs text-[var(--muted-foreground)]">{workflows.length} workflows</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-[var(--muted-foreground)]">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-40" />
              <p className="text-sm text-[var(--muted-foreground)] mb-3">No workflows yet. Start by creating one!</p>
              <button onClick={createWorkflow} className="px-4 py-2 text-xs font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90">
                <Plus className="w-3 h-3 inline mr-1" /> Create your first workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New workflow card */}
              <button onClick={createWorkflow} className="border border-dashed border-[var(--border)] rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-colors min-h-[140px]">
                <Plus className="w-8 h-8 text-[var(--muted-foreground)]" />
                <span className="text-xs text-[var(--muted-foreground)]">New Workflow</span>
              </button>

              {/* Existing workflows */}
              {workflows.map(wf => (
                <div key={wf.id} className="group relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-colors">
                  <Link href={`/builder/${wf.id}`} className="block">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{wf.emoji || '🤖'}</span>
                      <div className="flex-1 min-w-0">
                        {renamingId === wf.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(wf.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(wf.id); if (e.key === 'Escape') setRenamingId(null); }}
                            onClick={e => e.preventDefault()}
                            className="w-full bg-[var(--background)] px-2 py-1 rounded text-sm font-semibold border border-[var(--primary)] focus:outline-none text-[var(--foreground)]"
                            maxLength={60}
                          />
                        ) : (
                          <h4 className="text-sm font-semibold text-[var(--foreground)] truncate">{wf.name}</h4>
                        )}
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{(wf.nodes || []).length} nodes • Updated {formatDate(wf.updated_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${wf.status === 'active' ? 'bg-green-500/10 text-green-400' : wf.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                        {wf.status || 'draft'}
                      </span>
                      {wf.run_count > 0 && <span className="text-[10px] text-[var(--muted-foreground)]">{wf.run_count} runs</span>}
                    </div>
                  </Link>

                  {/* 3-dot menu */}
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === wf.id ? null : wf.id); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--secondary)] transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>

                  {menuOpen === wf.id && (
                    <div className="absolute top-10 right-3 z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-44">
                      <button onClick={e => { e.stopPropagation(); setRenamingId(wf.id); setRenameValue(wf.name); setMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] flex items-center gap-2">
                        <Pencil className="w-3 h-3" /> Rename
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDuplicate(wf); }} className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] flex items-center gap-2">
                        <Copy className="w-3 h-3" /> Duplicate
                      </button>
                      <Link href={`/builder/${wf.id}`} className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] flex items-center gap-2">
                        <ExternalLink className="w-3 h-3" /> Open in Builder
                      </Link>
                      <div className="border-t border-[var(--border)] my-1" />
                      <button onClick={e => { e.stopPropagation(); handleDelete(wf.id); }} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Start from a template</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => createFromTemplate(t)} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-colors">
                <span className="text-2xl block mb-2">{t.emoji}</span>
                <span className="text-[11px] text-[var(--foreground)]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
