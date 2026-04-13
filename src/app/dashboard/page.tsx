'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Plus, Home, Layers, BookOpen, LayoutTemplate, LogOut, Menu,
  MoreVertical, Pencil, Copy, Trash2, ClipboardList, Activity, Play,
  BarChart3, Laugh, Newspaper, AtSign, Search, Clapperboard, Camera,
  Bot, Package, ChevronRight, Clock, Workflow
} from 'lucide-react';
import { WorkflowIcon as WorkflowIconComponent, NodeIcon, getNodeColor } from '@/lib/node-icons';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface WorkflowItem {
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

// Template icons mapping — premium Lucide icons instead of emojis
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'daily-joke': <Laugh className="w-5 h-5 text-amber-400" />,
  'news-summary': <Newspaper className="w-5 h-5 text-blue-400" />,
  'auto-post-x': <AtSign className="w-5 h-5 text-sky-400" />,
  'web-monitor': <Search className="w-5 h-5 text-emerald-400" />,
  'script-video': <Clapperboard className="w-5 h-5 text-rose-400" />,
  'instagram-reels': <Camera className="w-5 h-5 text-pink-400" />,
};

const TEMPLATES = [
  { id: 'daily-joke', name: 'Daily joke by email', prompt: 'Make me an agent that sends me a funny joke by email every morning' },
  { id: 'news-summary', name: 'News summary', prompt: 'Build an agent that writes a daily news summary and emails it to me' },
  { id: 'auto-post-x', name: 'Auto-post to X', prompt: 'Create an agent that generates engaging tweets and posts them to X daily' },
  { id: 'web-monitor', name: 'Web monitor', prompt: 'Build an agent that monitors a webpage for changes and alerts me' },
  { id: 'script-video', name: 'Script to video', prompt: 'Create a video pipeline that turns a script into a cinematic short film' },
  { id: 'instagram-reels', name: 'Instagram reels', prompt: 'Build an agent that creates and posts Instagram reels automatically' },
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
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [monthExecutions, setMonthExecutions] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/signin'); return; }
      setUser(user);
      const { data } = await supabase.from('workflows').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      const wfs = data || [];
      setWorkflows(wfs);

      // Fetch execution counts for real stats
      if (wfs.length > 0) {
        const wfIds = wfs.map(w => w.id);
        try {
          // Total executions
          const { count: totalCount } = await supabase.from('executions').select('*', { count: 'exact', head: true }).in('workflow_id', wfIds);
          setTotalExecutions(totalCount || 0);
          // This month's executions
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          const { count: monthCount } = await supabase.from('executions').select('*', { count: 'exact', head: true }).in('workflow_id', wfIds).gte('started_at', startOfMonth.toISOString());
          setMonthExecutions(monthCount || 0);
        } catch {
          // Executions table might not exist yet — use workflow run_count as fallback
          setTotalExecutions(wfs.reduce((s, w) => s + (w.run_count || 0), 0));
        }
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const createWorkflow = async () => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({ user_id: user.id, name: 'Untitled Workflow', emoji: 'bot', status: 'draft', nodes: [], edges: [] }).select().single();
    if (data) router.push(`/builder/${data.id}`);
  };

  const createFromTemplate = async (t: typeof TEMPLATES[0]) => {
    if (!user) return;
    const { data } = await supabase.from('workflows').insert({ user_id: user.id, name: t.name, emoji: t.id, status: 'draft', nodes: [], edges: [] }).select().single();
    if (data) router.push(`/builder/${data.id}?prompt=${encodeURIComponent(t.prompt)}`);
  };

  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    await supabase.from('workflows').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', id);
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name: trimmed } : w));
    setRenamingId(null);
  };

  const handleDuplicate = async (wf: WorkflowItem) => {
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

  // Active = workflows with at least 1 node (they have content)
  const activeCount = workflows.filter(w => w.nodes && w.nodes.length > 0).length;
  const totalRuns = totalExecutions || workflows.reduce((s, w) => s + (w.run_count || 0), 0);

  // Map workflow emoji field to a Lucide icon
  const getWorkflowIconLocal = (emoji: string) => {
    if (TEMPLATE_ICONS[emoji]) return TEMPLATE_ICONS[emoji];
    return <WorkflowIconComponent emoji={emoji} className="w-4 h-4 text-[var(--primary)]" />;
  };

  const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: 'Home', active: true, href: '#' },
    { icon: <Workflow className="w-4 h-4" />, label: 'Workflows', href: '#workflows' },
    { icon: <BookOpen className="w-4 h-4" />, label: 'Library', href: '/library' },
    { icon: <LayoutTemplate className="w-4 h-4" />, label: 'Templates', href: '#templates' },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sunken)] flex flex-col transition-all duration-200`}>
        {/* Logo — links to landing page */}
        <Link href="/" className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          {!sidebarCollapsed && <span className="text-[14px] font-semibold tracking-tight">AgentFlow</span>}
        </Link>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item, i) => (
            <a key={i} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${item.active ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]'}`}>
              {item.icon}
              {!sidebarCollapsed && item.label}
              {item.active && !sidebarCollapsed && <div className="ml-auto w-1 h-4 rounded-full bg-[var(--primary)]" />}
            </a>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-medium text-[var(--primary)]">{user?.email?.[0]?.toUpperCase() || '?'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-[var(--foreground)] truncate">{user?.email || 'Loading...'}</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={handleSignOut} className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors" title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
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
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-small text-[var(--text-muted)]">Dashboard</span>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={createWorkflow} className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" />
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
              { label: 'Workflows', value: workflows.length, icon: <ClipboardList className="w-4 h-4 text-[var(--primary)]" /> },
              { label: 'Active', value: activeCount, icon: <Activity className="w-4 h-4 text-emerald-400" /> },
              { label: 'Total runs', value: totalRuns, icon: <Play className="w-4 h-4 text-blue-400" /> },
              { label: 'This month', value: `${monthExecutions} runs`, icon: <BarChart3 className="w-4 h-4 text-amber-400" /> },
            ].map((s, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tiny text-[var(--text-muted)] uppercase tracking-wider">{s.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-sunken)] flex items-center justify-center">{s.icon}</div>
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
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-sunken)] border border-[var(--border-subtle)] flex items-center justify-center mb-3">
                    {TEMPLATE_ICONS[t.id]}
                  </div>
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
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-sunken)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-7 h-7 text-[var(--primary)]" />
                </div>
                <h3 className="text-h3 text-[var(--foreground)] mb-2">No workflows yet</h3>
                <p className="text-body text-[var(--text-secondary)] mb-6">Create your first agent or pick a template above.</p>
                <button onClick={createWorkflow} className="btn btn-primary">
                  <Plus className="w-3.5 h-3.5" />
                  New workflow
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map(wf => (
                  <div key={wf.id} className="card card-interactive relative group cursor-pointer" onClick={() => menuOpen !== wf.id && renamingId !== wf.id && router.push(`/builder/${wf.id}`)}>
                    {/* Canvas mini preview */}
                    <div className="h-24 rounded-md bg-[var(--bg-sunken)] border border-[var(--border-subtle)] mb-4 flex items-center justify-center overflow-hidden">
                      {wf.nodes.length > 0 ? (
                        <div className="flex gap-1.5 items-center">
                          {wf.nodes.slice(0, 5).map((n: any, i: number) => (
                            <div key={i} className={`w-8 h-8 rounded ${getNodeColor(n.data?.type || '').bg} ring-1 ${getNodeColor(n.data?.type || '').ring} flex items-center justify-center`} title={n.data?.label}>
                              <NodeIcon type={n.data?.type} className={`w-3.5 h-3.5 ${getNodeColor(n.data?.type || '').icon}`} />
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
                          <h3 className="text-body font-medium text-[var(--foreground)] truncate flex items-center gap-2">
                            {getWorkflowIconLocal(wf.emoji)}
                            {wf.name}
                          </h3>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                            <Layers className="w-3 h-3" /> {wf.nodes.length} nodes
                          </span>
                          <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                            <Clock className="w-3 h-3" /> {formatDate(wf.updated_at)}
                          </span>
                          {wf.run_count > 0 && (
                            <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                              <Play className="w-3 h-3" /> {wf.run_count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === wf.id ? null : wf.id)} className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.04)] opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {menuOpen === wf.id && (
                          <div className="context-menu-appear absolute right-0 top-8 w-40 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 z-50">
                            <button onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]">
                              <Pencil className="w-3.5 h-3.5" /> Rename
                            </button>
                            <button onClick={() => handleDuplicate(wf)} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <div className="border-t border-[var(--border-subtle)] my-1" />
                            <button onClick={() => handleDelete(wf.id)} className="flex items-center gap-2.5 w-full px-3 py-1.5 text-small text-[var(--destructive)] hover:bg-[var(--destructive)]/10">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status dot */}
                    <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${wf.status === 'active' ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
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
