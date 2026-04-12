'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/signin'); return; }
      setUser(user);
      const { data } = await supabase.from('workflows').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      setWorkflows(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  const createWorkflow = async () => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({ user_id: user.id, name: 'Untitled Workflow', emoji: '🤖', status: 'draft', nodes: [], edges: [] }).select().single();
    if (data) router.push(`/builder/${data.id}`);
  };

  const createFromTemplate = async (t: typeof TEMPLATES[0]) => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({ user_id: user.id, name: t.name, emoji: t.emoji, status: 'draft', nodes: [], edges: [] }).select().single();
    if (data) router.push(`/builder/${data.id}?prompt=${encodeURIComponent(t.prompt)}`);
  };

  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    await supabase.from('workflows').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', id);
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name: trimmed } : w));
    setRenamingId(null);
  };

  const handleDuplicate = async (wf: Workflow) => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({ user_id: user.id, name: `${wf.name} (copy)`, emoji: wf.emoji, status: 'draft', nodes: wf.nodes, edges: wf.edges }).select().single();
    if (data) setWorkflows(prev => [data, ...prev]);
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    await supabase.from('assets').delete().eq('workflow_id', id);
    await supabase.from('workflows').delete().eq('id', id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
    setMenuOpen(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const activeCount = workflows.filter(w => w.status === 'active').length;
  const totalRuns = workflows.reduce((s, w) => s + (w.run_count || 0), 0);

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sunken)] flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border-subtle)]">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          {!sidebarCollapsed && <span className="text-[14px] font-semibold tracking-tight">AgentFlow</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', active: true },
            { icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z', label: 'Workflows', href: '#workflows' },
            { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Library', href: '/library' },
            { icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z', label: 'Templates', href: '#templates' },
          ].map((item, i) => (
            <a key={i} href={item.href || '#'} className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${item.active ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              {!sidebarCollapsed && item.label}
              {item.active && !sidebarCollapsed && <div className="ml-auto w-1 h-4 rounded-full bg-[var(--primary)]" />}
            </a>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-tiny text-[var(--primary)]">{user?.email?.[0]?.toUpperCase() || '?'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-tiny text-[var(--foreground)] truncate">{user?.email || 'Loading...'}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={handleSignOut} className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors" title="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/></svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="h-14 border-b border-[var(--border-subtle)] flex items-center px-8">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="mr-4 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <span className="text-small text-[var(--text-muted)]">Dashboard</span>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={createWorkflow} className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New workflow
            </button>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {/* Welcome */}
          <div className="mb-10">
            <p className="text-small text-[var(--text-muted)] mb-1">{getGreeting()}</p>
            <h1 className="text-h2 text-[var(--foreground)]">{user?.email?.split('@')[0] || 'Builder'}</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Workflows', value: workflows.length, icon: '📋' },
              { label: 'Active', value: activeCount, icon: '🟢' },
              { label: 'Total runs', value: totalRuns, icon: '▶️' },
              { label: 'This month', value: workflows.filter(w => w.last_run_at && new Date(w.last_run_at).getMonth() === new Date().getMonth()).length + ' runs', icon: '📊' },
            ].map((s, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tiny text-[var(--text-muted)] uppercase tracking-wider">{s.label}</span>
                  <span className="text-base">{s.icon}</span>
                </div>
                <p className="text-h3 text-[var(--foreground)]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Templates */}
          <div id="templates" className="mb-10">
            <h2 className="text-body-lg font-semibold text-[var(--foreground)] mb-4">Start from a template</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => createFromTemplate(t)} className="card card-interactive p-4 text-left group">
                  <span className="text-xl mb-2 block">{t.emoji}</span>
                  <p className="text-body font-medium text-[var(--foreground)]">{t.name}</p>
                  <p className="text-tiny text-[var(--text-muted)] mt-1 line-clamp-2">{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Workflows */}
          <div id="workflows">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-body-lg font-semibold text-[var(--foreground)]">Your workflows</h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card p-5">
                    <div className="skeleton h-6 w-6 rounded mb-3" />
                    <div className="skeleton h-4 w-32 rounded mb-2" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="card text-center py-16">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-h3 text-[var(--foreground)] mb-2">No workflows yet</h3>
                <p className="text-body text-[var(--text-secondary)] mb-6">Create your first agent or pick a template above.</p>
                <button onClick={createWorkflow} className="btn btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map(wf => (
                  <div key={wf.id} className="card card-interactive relative group" onClick={() => menuOpen !== wf.id && renamingId !== wf.id && router.push(`/builder/${wf.id}`)}>
                    {/* Canvas mini preview */}
                    <div className="h-24 rounded-md bg-[var(--bg-sunken)] border border-[var(--border-subtle)] mb-4 flex items-center justify-center overflow-hidden">
                      {wf.nodes.length > 0 ? (
                        <div className="flex gap-1.5 items-center">
                          {wf.nodes.slice(0, 5).map((n: any, i: number) => (
                            <div key={i} className="w-8 h-8 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px]" title={n.data?.label}>
                              {n.data?.emoji || '📦'}
                            </div>
                          ))}
                          {wf.nodes.length > 5 && <span className="text-tiny text-[var(--text-muted)]">+{wf.nodes.length - 5}</span>}
                        </div>
                      ) : (
                        <span className="text-tiny text-[var(--text-muted)]">Empty canvas</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        {renamingId === wf.id ? (
                          <input
                            autoFocus
                            className="input-field text-body font-medium py-0.5 px-1 -ml-1"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(wf.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(wf.id); if (e.key === 'Escape') setRenamingId(null); }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className="text-body font-medium text-[var(--foreground)] truncate">
                            <span className="mr-1.5">{wf.emoji}</span>{wf.name}
                          </h3>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-tiny text-[var(--text-muted)]">{wf.nodes.length} nodes</span>
                          <span className="text-tiny text-[var(--text-muted)]">{formatDate(wf.updated_at)}</span>
                          {wf.run_count > 0 && <span className="text-tiny text-[var(--text-muted)]">{wf.run_count} runs</span>}
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === wf.id ? null : wf.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)] opacity-0 group-hover:opacity-100 transition-all">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        {menuOpen === wf.id && (
                          <div className="context-menu-appear absolute right-0 top-8 w-40 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 z-50">
                            <button onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Rename
                            </button>
                            <button onClick={() => handleDuplicate(wf)} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              Duplicate
                            </button>
                            <div className="border-t border-[var(--border-subtle)] my-1" />
                            <button onClick={() => handleDelete(wf.id)} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--destructive)] hover:bg-[var(--destructive)]/10">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status dot */}
                    <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${wf.status === 'active' ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Click-away to close menus */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
