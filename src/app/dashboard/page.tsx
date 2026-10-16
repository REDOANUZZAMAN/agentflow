'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Plus, Home, Layers, BookOpen, LayoutTemplate, LogOut,
  MoreVertical, Pencil, Copy, Trash2, ClipboardList, Activity, Play,
  BarChart3, Search, Wallet, HardDrive, AlertTriangle,
  Bot, Clock, Workflow, ArrowRight, Sparkles, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { WorkflowIcon as WorkflowIconComponent, getNodeColor } from '@/lib/node-icons';
import { TEMPLATES, TEMPLATE_CATEGORIES, getTemplate, type Template, type TemplateCategory } from '@/lib/templates';

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
  const [search, setSearch] = useState('');
  const [templateTab, setTemplateTab] = useState<TemplateCategory | 'all'>('all');
  const [usage, setUsage] = useState<{ unlimited: boolean; limit: number; used: number; remaining: number | null; resetsAt: string; disk?: { freeGb: number; totalGb: number; ok: boolean; minFreeGb: number } } | null>(null);

  useEffect(() => {
    fetch('/api/usage').then(r => r.ok ? r.json() : null).then(setUsage).catch(() => {});
  }, []);

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

  const createFromTemplate = async (t: Template) => {
    if (!user || t.comingSoon) return;
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
    if (!confirm('Delete this workflow and all of its generated files? This cannot be undone.')) return;
    // The API also removes the workflow's photos/videos/audio from the server disk
    const res = await fetch(`/api/projects?workflowId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Could not delete: ${err.error || res.statusText}`);
      return;
    }
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
    const t = getTemplate(emoji);
    if (t) { const Icon = t.icon; return <Icon className={`w-4 h-4 ${t.tint.split(' ')[0]}`} />; }
    return <WorkflowIconComponent emoji={emoji} className="w-4 h-4 text-[var(--primary)]" />;
  };

  const NAV_ITEMS = [
    { icon: <Home className="w-4 h-4" />, label: 'Home', active: true, href: '#' },
    { icon: <Workflow className="w-4 h-4" />, label: 'Workflows', href: '#workflows' },
    { icon: <BookOpen className="w-4 h-4" />, label: 'Library', href: '/library' },
    { icon: <LayoutTemplate className="w-4 h-4" />, label: 'Templates', href: '#templates' },
  ];

  const query = search.trim().toLowerCase();
  const visibleWorkflows = query ? workflows.filter(w => (w.name || '').toLowerCase().includes(query)) : workflows;
  const displayName = user?.email?.split('@')[0] || 'Builder';

  const STATS = [
    { label: 'Workflows', value: workflows.length, hint: 'in your workspace', icon: <ClipboardList className="w-4 h-4" />, tint: 'text-violet-300 bg-violet-500/10 ring-violet-500/25' },
    { label: 'Active', value: activeCount, hint: 'have at least one node', icon: <Activity className="w-4 h-4" />, tint: 'text-emerald-300 bg-emerald-500/10 ring-emerald-500/25' },
    { label: 'Total runs', value: totalRuns, hint: 'all time', icon: <Play className="w-4 h-4" />, tint: 'text-sky-300 bg-sky-500/10 ring-sky-500/25' },
    { label: 'This month', value: monthExecutions, hint: 'runs since the 1st', icon: <BarChart3 className="w-4 h-4" />, tint: 'text-amber-300 bg-amber-500/10 ring-amber-500/25' },
  ];

  return (
    <div className="h-screen flex bg-[var(--background)] overflow-hidden">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`${sidebarCollapsed ? 'w-[68px]' : 'w-64'} flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sunken)] flex flex-col transition-all duration-200`}>
        <div className="h-16 flex items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_rgba(124,58,237,0.4)]" style={{ background: 'var(--primary-gradient)' }}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            {!sidebarCollapsed && <span className="text-[15px] font-semibold tracking-tight">AgentFlow</span>}
          </Link>
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} className="icon-btn" title="Collapse sidebar">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-3 pb-3">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setSidebarCollapsed(false)} className="icon-btn" title="Expand sidebar">
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <button onClick={createWorkflow} className="btn btn-primary w-10 h-10 !p-0" title="New workflow">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={createWorkflow} className="btn btn-primary w-full">
              <Plus className="w-4 h-4" /> New workflow
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {!sidebarCollapsed && <p className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace</p>}
          {NAV_ITEMS.map((item, i) => (
            <a
              key={i}
              href={item.href}
              title={item.label}
              className={`relative flex items-center gap-3 rounded-lg text-[13px] font-medium transition-colors ${sidebarCollapsed ? 'justify-center h-10' : 'px-3 py-2'} ${item.active ? 'bg-[var(--accent-glow)] text-[var(--foreground)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]'}`}
            >
              {item.active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--accent)]" />}
              <span className={item.active ? 'text-[var(--accent)]' : ''}>{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </a>
          ))}
        </nav>

        <div className="p-3">
          <div className={`flex items-center gap-2.5 rounded-xl ${sidebarCollapsed ? 'justify-center' : 'p-2.5 surface'}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-[var(--border)]" style={{ background: 'var(--primary-gradient)' }}>
              <span className="text-[12px] font-semibold text-white">{user?.email?.[0]?.toUpperCase() || '?'}</span>
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{displayName}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email || 'Loading...'}</p>
                </div>
                <button onClick={handleSignOut} className="icon-btn !w-7 !h-7" title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.16),transparent_65%)]" />

        {/* Top bar */}
        <div className="sticky top-0 z-30 h-16 glass !border-x-0 !border-t-0 flex items-center gap-4 px-8">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[var(--text-muted)]">Workspace</span>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="font-medium text-[var(--foreground)]">Dashboard</span>
          </div>
          <div className="ml-auto relative w-72 max-w-[40vw]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workflows..."
              className="input-field !py-2 !pl-9 text-[13px]"
            />
          </div>
        </div>

        <div className="relative max-w-[1180px] mx-auto px-8 pt-10 pb-16">
          {/* Welcome */}
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-reveal">
            <div>
              <p className="chip mb-4"><Sparkles className="w-3 h-3 text-[var(--accent)]" /> {getGreeting()}</p>
              <h1 className="text-h1">
                Welcome back, <span className="gradient-text">{displayName}</span>
              </h1>
              <p className="text-body-lg text-[var(--text-secondary)] mt-2">Describe an agent in plain English and watch it build itself.</p>
            </div>
            <button onClick={createWorkflow} className="btn btn-primary btn-lg">
              <Plus className="w-4 h-4" /> New workflow
            </button>
          </div>

          {/* Disk warning (owner only) */}
          {usage?.disk && usage.disk.freeGb < 5 && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <p className="text-small text-amber-100">
                Server disk is getting full: <b>{usage.disk.freeGb} GB free</b> of {usage.disk.totalGb} GB.
                {usage.disk.ok ? ' Delete old workflows to free space.' : ` New runs are paused until at least ${usage.disk.minFreeGb} GB is free.`}
              </p>
            </div>
          )}

          {/* Today's free allowance */}
          {usage && (
            <div className="card !p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="w-9 h-9 rounded-lg ring-1 flex items-center justify-center text-violet-300 bg-violet-500/10 ring-violet-500/25"><Wallet className="w-4 h-4" /></div>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="font-medium">{usage.unlimited ? 'Owner account — no daily limit' : "Today's free usage"}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">${usage.used.toFixed(2)}{usage.unlimited ? ' used today' : ` of $${usage.limit.toFixed(2)}`}</span>
                </div>
                {!usage.unlimited && (
                  <div className="h-1.5 rounded-full bg-[var(--secondary)] overflow-hidden">
                    <div className={`h-full ${usage.used >= usage.limit ? 'bg-red-500' : 'bg-[var(--accent)]'}`} style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
                  </div>
                )}
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Resets at {new Date(usage.resetsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              {usage.disk && (
                <span className={`chip ${usage.disk.ok ? '' : '!text-amber-200 !border-amber-500/30'}`}><HardDrive className="w-3 h-3" /> {usage.disk.freeGb} GB free on server</span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {STATS.map((s, i) => (
              <div key={i} className="card !p-5 animate-reveal" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)]">{s.label}</span>
                  <div className={`w-8 h-8 rounded-lg ring-1 flex items-center justify-center ${s.tint}`}>{s.icon}</div>
                </div>
                {loading ? <div className="skeleton h-8 w-14" /> : <p className="text-[30px] leading-none font-semibold tracking-tight tabular-nums">{s.value}</p>}
                <p className="text-[11px] text-[var(--text-muted)] mt-2">{s.hint}</p>
              </div>
            ))}
          </div>

          {/* Templates */}
          <section id="templates" className="mb-12 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-h3">Start from a template</h2>
                <p className="text-small text-[var(--text-muted)] mt-0.5">One click — the builder agent takes it from there.</p>
              </div>
              <div className="seg">
                {TEMPLATE_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setTemplateTab(c.id)} className={`seg-item ${templateTab === c.id ? 'seg-item-active' : ''}`}>
                    {c.label}
                    <span className="text-[10px] text-[var(--text-muted)]">{c.id === 'all' ? TEMPLATES.length : TEMPLATES.filter(t => t.category === c.id).length}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TEMPLATES.filter(t => templateTab === 'all' || t.category === templateTab).map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => createFromTemplate(t)}
                    disabled={t.comingSoon}
                    title={t.comingSoon ? 'Needs email / web / posting nodes, which are not built yet' : t.prompt}
                    className={`card !p-4 text-left group flex items-start gap-4 ${t.comingSoon ? 'opacity-55 cursor-not-allowed' : 'card-interactive'}`}
                  >
                    <div className={`w-11 h-11 rounded-xl ring-1 flex items-center justify-center flex-shrink-0 ${t.tint}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                        <span className="truncate">{t.name}</span>
                        {!t.comingSoon && <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0" />}
                      </p>
                      <p className="text-small text-[var(--text-muted)] mt-1 line-clamp-2">{t.prompt}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="chip !py-0 !text-[10px] capitalize">{t.category}</span>
                        {t.estimate && <span className="chip !py-0 !text-[10px]">{t.estimate} per run</span>}
                        {t.comingSoon && <span className="chip !py-0 !text-[10px] !text-amber-200 !border-amber-500/30">Coming soon</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Workflows */}
          <section id="workflows" className="scroll-mt-24">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-h3">Your workflows</h2>
                <p className="text-small text-[var(--text-muted)] mt-0.5">
                  {query ? `${visibleWorkflows.length} of ${workflows.length} match "${search.trim()}"` : `${workflows.length} total · most recently edited first`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card !p-4">
                    <div className="skeleton h-28 w-full rounded-lg mb-4" />
                    <div className="skeleton h-4 w-40 rounded mb-2" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="card text-center !py-16">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-glow)] ring-1 ring-[var(--border)] flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-7 h-7 text-[var(--accent)]" />
                </div>
                <h3 className="text-h3 text-[var(--foreground)] mb-2">No workflows yet</h3>
                <p className="text-body text-[var(--text-secondary)] mb-6">Create your first agent or pick a template above.</p>
                <button onClick={createWorkflow} className="btn btn-primary">
                  <Plus className="w-3.5 h-3.5" />
                  New workflow
                </button>
              </div>
            ) : visibleWorkflows.length === 0 ? (
              <div className="card text-center !py-12 text-[var(--text-secondary)] text-body">No workflows match your search.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleWorkflows.map(wf => (
                  <div key={wf.id} className="card card-interactive !p-0 relative group overflow-visible" onClick={() => menuOpen !== wf.id && renamingId !== wf.id && router.push(`/builder/${wf.id}`)}>
                    {/* Mini map of the flow */}
                    <div className="h-32 m-3 mb-0 rounded-lg bg-[var(--bg-sunken)] border border-[var(--border-subtle)] overflow-hidden relative bg-[radial-gradient(rgba(167,139,250,0.12)_1px,transparent_1px)] [background-size:14px_14px]">
                      {wf.nodes.length > 0 ? <FlowPreview nodes={wf.nodes} edges={wf.edges} /> : (
                        <div className="h-full flex items-center justify-center text-tiny text-[var(--text-muted)]">Empty canvas</div>
                      )}
                      <span className={`absolute top-2 left-2 chip !py-0.5 !text-[10px] ${wf.status === 'active' ? '!text-emerald-300 !border-emerald-500/30' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${wf.status === 'active' ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
                        {wf.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 p-4">
                      <div className="min-w-0 flex-1">
                        {renamingId === wf.id ? (
                          <input
                            autoFocus
                            className="input-field text-body font-medium !py-1 !px-2"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(wf.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(wf.id); if (e.key === 'Escape') setRenamingId(null); }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className="text-body font-semibold text-[var(--foreground)] truncate flex items-center gap-2">
                            <span className="flex-shrink-0">{getWorkflowIconLocal(wf.emoji)}</span>
                            <span className="truncate">{wf.name}</span>
                          </h3>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                            <Layers className="w-3 h-3" /> {wf.nodes.length} nodes
                          </span>
                          <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                            <Clock className="w-3 h-3" /> {formatDate(wf.updated_at)}
                          </span>
                          {wf.run_count > 0 && (
                            <span className="flex items-center gap-1 text-tiny text-[var(--text-muted)]">
                              <Play className="w-3 h-3" /> {wf.run_count} runs
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setMenuOpen(menuOpen === wf.id ? null : wf.id)} className={`icon-btn !w-7 !h-7 ${menuOpen === wf.id ? 'opacity-100 icon-btn-active' : 'opacity-0 group-hover:opacity-100'}`} title="More">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {menuOpen === wf.id && (
                          <div className="context-menu-appear absolute right-0 top-9 w-44 bg-[var(--popover)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] p-1 z-50">
                            <button onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setMenuOpen(null); }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-small text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]">
                              <Pencil className="w-3.5 h-3.5" /> Rename
                            </button>
                            <button onClick={() => handleDuplicate(wf)} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-small text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--foreground)]">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <div className="border-t border-[var(--border-subtle)] my-1" />
                            <button onClick={() => handleDelete(wf.id)} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-small text-[var(--destructive)] hover:bg-[var(--destructive)]/10">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Click-away to close menus */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}

// Tiny read-only drawing of a workflow, scaled from the saved node positions
function FlowPreview({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const W = 300, H = 128, PAD = 18, R = 7;
  const pts = nodes.map(n => ({ id: n.id, type: n.data?.type || '', x: n.position?.x ?? 0, y: n.position?.y ?? 0 }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY, 0.35);
  const offX = (W - spanX * scale) / 2, offY = (H - spanY * scale) / 2;
  const pos: Record<string, { x: number; y: number }> = {};
  pts.forEach(p => { pos[p.id] = { x: offX + (p.x - minX) * scale, y: offY + (p.y - minY) * scale }; });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {(edges || []).map((e: any, i: number) => {
        const a = pos[e.source], b = pos[e.target];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2;
        return <path key={i} d={`M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`} fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth={1.2} />;
      })}
      {pts.map(p => (
        <g key={p.id} className={getNodeColor(p.type).icon}>
          <rect x={pos[p.id].x - R} y={pos[p.id].y - R} width={R * 2} height={R * 2} rx={3.5} fill="#1C1530" stroke="currentColor" strokeOpacity={0.7} strokeWidth={1.2} />
          <rect x={pos[p.id].x - 2.5} y={pos[p.id].y - 2.5} width={5} height={5} rx={1.5} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
