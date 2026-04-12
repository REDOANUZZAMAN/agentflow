'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  ArrowLeft, FolderOpen, Image, Film, Volume2, Search, ChevronRight, ChevronDown,
  Play, Eye, Download, Trash2, MoreHorizontal, Pencil, ExternalLink, Sparkles, X, Clock,
  DollarSign, FileText, Check, AlertTriangle
} from 'lucide-react';
import { type Asset, type AssetType, formatFileSize, formatCost, formatDate, getAssetIcon } from '@/lib/library-types';

// Generate a thumbnail URL for Cloudinary videos
function getVideoThumbnail(url: string): string {
  if (!url) return '';
  // Convert cloudinary video URL to a jpg thumbnail
  // e.g. .../video/upload/v123/path/video.mp4 → .../video/upload/so_0,w_400,h_300,c_fill/v123/path/video.jpg
  try {
    const transformed = url
      .replace('/video/upload/', '/video/upload/so_0,w_400,h_300,c_fill,f_jpg/')
      .replace(/\.\w+$/, '.jpg');
    return transformed;
  } catch {
    return url;
  }
}

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface WorkflowWithAssets {
  id: string;
  name: string;
  emoji: string;
  updated_at: string;
  runs: RunGroup[];
  totalAssets: number;
}

interface RunGroup {
  execution_id: string;
  started_at: string;
  status: string;
  assets: Asset[];
  steps?: any[];
  cost?: number;
  duration_ms?: number;
}

export default function LibraryPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowWithAssets[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Load real data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/signin'); return; }

      // Get all workflows for this user
      const { data: wfData } = await supabase
        .from('workflows')
        .select('id, name, emoji, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      // Get all assets for this user (table may not exist yet)
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Gracefully handle missing table
      if (assetError) {
        console.warn('Assets table not found or query failed:', assetError.message);
      }

      const allWorkflows = wfData || [];
      const allAssets: Asset[] = (assetData || []).map((a: any) => {
        // Parse scene/shot from Cloudinary path as fallback
        let scene = a.scene;
        let shot = a.shot;
        let tags = a.tags || [];
        const pid = a.cloudinary_public_id || '';
        
        if (!scene && pid) {
          const sceneMatch = pid.match(/scene-(\d+)/);
          if (sceneMatch) scene = parseInt(sceneMatch[1]);
        }
        if (!shot && pid) {
          const shotMatch = pid.match(/shot-(\d+)/);
          if (shotMatch) shot = parseInt(shotMatch[1]);
        }
        // Auto-detect element tags from path
        if (pid.includes('/elements/') && !tags.includes('element')) {
          tags = [...tags, 'element'];
        }
        // Auto-detect final video from filename/path
        if ((a.filename || '').toLowerCase().includes('final') && !tags.includes('final')) {
          tags = [...tags, 'final'];
        }
        
        return {
          ...a,
          scene,
          shot,
          tags,
          starred: a.starred || false,
          status: a.status || 'ready',
        };
      });

      // Also load executions (workflow runs) — table may not exist yet
      let allExecutions: any[] = [];
      try {
        const { data: execData, error: execError } = await supabase
          .from('executions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (execError) console.warn('Executions table not found:', execError.message);
        else allExecutions = execData || [];
      } catch { /* table doesn't exist */ }

      // Group assets and executions by workflow
      const wfMap = new Map<string, WorkflowWithAssets>();

      for (const wf of allWorkflows) {
        wfMap.set(wf.id, {
          id: wf.id,
          name: wf.name || 'Untitled Workflow',
          emoji: wf.emoji || '🤖',
          updated_at: wf.updated_at,
          runs: [],
          totalAssets: 0,
        });
      }

      // Add execution runs to their workflows
      for (const exec of allExecutions) {
        const wfId = exec.workflow_id;
        if (wfId && wfMap.has(wfId)) {
          const wf = wfMap.get(wfId)!;
          wf.runs.push({
            execution_id: exec.id,
            started_at: exec.started_at || exec.created_at,
            status: exec.status || 'done',
            assets: [], // will be filled with assets below
            steps: exec.steps || [],
            cost: exec.cost,
            duration_ms: exec.duration_ms,
          });
        }
      }

      // Group assets by execution
      const execMap = new Map<string, Asset[]>();
      const unlinkedAssets: Asset[] = [];

      for (const asset of allAssets) {
        if (asset.execution_id) {
          if (!execMap.has(asset.execution_id)) execMap.set(asset.execution_id, []);
          execMap.get(asset.execution_id)!.push(asset);
        } else if (asset.workflow_id && wfMap.has(asset.workflow_id)) {
          if (!execMap.has(`default_${asset.workflow_id}`)) execMap.set(`default_${asset.workflow_id}`, []);
          execMap.get(`default_${asset.workflow_id}`)!.push(asset);
        } else {
          unlinkedAssets.push(asset);
        }
      }

      // Assign assets to runs
      for (const [execId, assets] of execMap) {
        const wfId = assets[0]?.workflow_id;
        if (wfId && wfMap.has(wfId)) {
          const wf = wfMap.get(wfId)!;
          const existingRun = wf.runs.find(r => r.execution_id === execId);
          if (existingRun) {
            existingRun.assets = assets;
          } else {
            wf.runs.push({
              execution_id: execId,
              started_at: assets[0]?.created_at || new Date().toISOString(),
              status: 'done',
              assets,
            });
          }
          wf.totalAssets += assets.length;
        }
      }

      // Sort runs by date (newest first)
      for (const wf of wfMap.values()) {
        wf.runs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      }

      // Add unlinked assets as "Unorganized" if any
      if (unlinkedAssets.length > 0) {
        wfMap.set('__unlinked__', {
          id: '__unlinked__',
          name: 'Unorganized Assets',
          emoji: '📦',
          updated_at: unlinkedAssets[0].created_at,
          runs: [{ execution_id: 'unlinked', started_at: unlinkedAssets[0].created_at, status: 'done', assets: unlinkedAssets }],
          totalAssets: unlinkedAssets.length,
        });
      }

      // Show ALL workflows (even without assets — they may have execution runs)
      const result = Array.from(wfMap.values());
      setWorkflows(result);
    } catch (err) {
      console.error('Library load error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Rename workflow
  const handleRename = async (workflowId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    await supabase.from('workflows').update({ name: trimmed, updated_at: new Date().toISOString() }).eq('id', workflowId);
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, name: trimmed } : w));
    setRenamingId(null);
  };

  // Delete workflow
  const handleDelete = async (workflowId: string) => {
    if (!confirm('Delete this workflow and all its assets? This cannot be undone.')) return;
    await supabase.from('assets').delete().eq('workflow_id', workflowId);
    await supabase.from('workflows').delete().eq('id', workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedWorkflow === workflowId) { setSelectedWorkflow(null); setSelectedRun(null); }
    setMenuOpen(null);
  };

  // Get filtered assets for current view
  const getVisibleAssets = (): Asset[] => {
    let assets: Asset[] = [];
    if (selectedWorkflow) {
      const wf = workflows.find(w => w.id === selectedWorkflow);
      if (wf) {
        if (selectedRun) {
          const run = wf.runs.find(r => r.execution_id === selectedRun);
          if (run) assets = run.assets;
        } else {
          assets = wf.runs.flatMap(r => r.assets);
        }
      }
    } else {
      assets = workflows.flatMap(w => w.runs.flatMap(r => r.assets));
    }
    if (typeFilter !== 'all') assets = assets.filter(a => a.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      assets = assets.filter(a => a.filename.toLowerCase().includes(q) || a.prompt?.toLowerCase().includes(q));
    }
    return assets;
  };

  const visibleAssets = getVisibleAssets();
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1 rounded hover:bg-[var(--secondary)]"><ArrowLeft className="w-4 h-4 text-[var(--muted-foreground)]" /></Link>
          <FolderOpen className="w-5 h-5 text-[var(--primary)]" />
          <h1 className="text-sm font-bold text-[var(--foreground)]">Library</h1>
          <span className="text-xs text-[var(--muted-foreground)]">{workflows.reduce((s, w) => s + w.totalAssets, 0)} assets across {workflows.length} workflows</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="pl-8 pr-3 py-1.5 text-xs bg-[var(--secondary)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] w-48 focus:outline-none focus:border-[var(--primary)]" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="text-xs bg-[var(--secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)]">
            <option value="all">All types</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — workflow tree */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--card)]">
          <div className="p-3">
            <button onClick={() => { setSelectedWorkflow(null); setSelectedRun(null); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${!selectedWorkflow ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}>
              📁 All Workflows
            </button>
          </div>

          {loading ? (
            <div className="px-3 py-8 text-center text-xs text-[var(--muted-foreground)]">Loading...</div>
          ) : workflows.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)] opacity-50" />
              <p className="text-xs text-[var(--muted-foreground)]">No assets yet</p>
              <Link href="/dashboard" className="mt-2 inline-block text-xs text-[var(--primary)] hover:underline">Create a workflow →</Link>
            </div>
          ) : (
            <div className="px-2 space-y-0.5">
              {workflows.map(wf => (
                <div key={wf.id}>
                  {/* Workflow folder */}
                  <div className="group relative">
                    <button
                      onClick={() => { setSelectedWorkflow(selectedWorkflow === wf.id ? null : wf.id); setSelectedRun(null); setSelectedAsset(null); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${selectedWorkflow === wf.id ? 'bg-[var(--secondary)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'}`}
                    >
                      {selectedWorkflow === wf.id ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                      <span>{wf.emoji}</span>
                      {renamingId === wf.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(wf.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(wf.id); if (e.key === 'Escape') setRenamingId(null); }}
                          className="flex-1 bg-[var(--background)] px-1 py-0.5 rounded text-xs border border-[var(--primary)] focus:outline-none"
                          onClick={e => e.stopPropagation()}
                          maxLength={60}
                        />
                      ) : (
                        <span className="flex-1 truncate text-left">{wf.name}</span>
                      )}
                      <span className="text-[10px] opacity-60">{wf.totalAssets}</span>
                    </button>
                    {/* Context menu trigger */}
                    {wf.id !== '__unlinked__' && (
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === wf.id ? null : wf.id); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--border)]"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    )}
                    {/* Context menu */}
                    {menuOpen === wf.id && (
                      <div className="absolute right-0 top-full z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-40">
                        <button onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] flex items-center gap-2">
                          <Pencil className="w-3 h-3" /> Rename
                        </button>
                        <button onClick={() => router.push(`/builder/${wf.id}`)} className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" /> Open in Builder
                        </button>
                        <button onClick={() => handleDelete(wf.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Runs (sub-folders) */}
                  {selectedWorkflow === wf.id && wf.runs.map((run, i) => (
                    <button
                      key={run.execution_id}
                      onClick={() => { setSelectedRun(selectedRun === run.execution_id ? null : run.execution_id); setSelectedAsset(null); }}
                      className={`w-full flex items-center gap-2 pl-8 pr-2 py-1 text-[10px] rounded-lg transition-colors ${selectedRun === run.execution_id ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'}`}
                    >
                      <FolderOpen className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Run #{wf.runs.length - i}</span>
                      <span className="ml-auto opacity-60">{run.assets.length}</span>
                      {run.status === 'failed' && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center — asset grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 mb-4 text-xs text-[var(--muted-foreground)]">
            <button onClick={() => { setSelectedWorkflow(null); setSelectedRun(null); }} className="hover:text-[var(--foreground)]">Library</button>
            {currentWorkflow && (
              <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => setSelectedRun(null)} className="hover:text-[var(--foreground)]">{currentWorkflow.emoji} {currentWorkflow.name}</button>
              </>
            )}
            {selectedRun && currentWorkflow && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>Run #{(currentWorkflow.runs.findIndex(r => r.execution_id === selectedRun) ?? 0) + 1}</span>
              </>
            )}
          </div>

          {visibleAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FolderOpen className="w-12 h-12 text-[var(--muted-foreground)] opacity-30 mb-3" />
              <p className="text-sm text-[var(--muted-foreground)] mb-1">No assets yet</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">Build a workflow and run it to start generating content.</p>
              <Link href="/dashboard" className="px-4 py-2 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90">Create your first workflow</Link>
            </div>
          ) : (() => {
            // Group assets hierarchically: elements, scenes→shots, final
            const elements = visibleAssets.filter(a => a.tags?.includes('element') || a.cloudinary_public_id?.includes('/elements/'));
            const finalAssets = visibleAssets.filter(a => a.tags?.includes('final') || a.filename?.includes('final'));
            const sceneAssets = visibleAssets.filter(a => a.scene && a.shot && !a.tags?.includes('element') && !a.tags?.includes('final'));
            const ungrouped = visibleAssets.filter(a => !elements.includes(a) && !finalAssets.includes(a) && !sceneAssets.includes(a));

            // Group scene assets by scene → shot
            const sceneMap = new Map<number, Map<number, Asset[]>>();
            for (const a of sceneAssets) {
              if (!sceneMap.has(a.scene!)) sceneMap.set(a.scene!, new Map());
              const shotMap = sceneMap.get(a.scene!)!;
              if (!shotMap.has(a.shot!)) shotMap.set(a.shot!, []);
              shotMap.get(a.shot!)!.push(a);
            }
            const hasGrouping = elements.length > 0 || sceneMap.size > 0 || finalAssets.length > 0;

            return (
              <div className="space-y-4">
                {/* Final Video — top level */}
                {finalAssets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--foreground)]">
                      <Film className="w-4 h-4 text-yellow-400" /> 🎬 Final Video
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {finalAssets.map(asset => <AssetCard key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} onClick={() => setSelectedAsset(asset)} />)}
                    </div>
                  </div>
                )}

                {/* Elements folder */}
                {elements.length > 0 && (
                  <details open>
                    <summary className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer select-none hover:text-[var(--primary)]">
                      <FolderOpen className="w-4 h-4 text-purple-400" /> 📁 Elements ({elements.length})
                    </summary>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ml-4">
                      {elements.map(asset => <AssetCard key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} onClick={() => setSelectedAsset(asset)} />)}
                    </div>
                  </details>
                )}

                {/* Scene folders */}
                {Array.from(sceneMap.entries()).sort(([a], [b]) => a - b).map(([sceneNum, shotMap]) => (
                  <details key={`scene-${sceneNum}`} open>
                    <summary className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--foreground)] cursor-pointer select-none hover:text-[var(--primary)]">
                      <FolderOpen className="w-4 h-4 text-blue-400" /> 📁 Scene {sceneNum} ({Array.from(shotMap.values()).flat().length} assets, {shotMap.size} shots)
                    </summary>
                    <div className="ml-4 space-y-3">
                      {Array.from(shotMap.entries()).sort(([a], [b]) => a - b).map(([shotNum, assets]) => (
                        <details key={`shot-${sceneNum}-${shotNum}`} open>
                          <summary className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-[var(--muted-foreground)] cursor-pointer select-none hover:text-[var(--foreground)]">
                            <FolderOpen className="w-3.5 h-3.5 text-green-400" /> 📁 Shot {shotNum} ({assets.length})
                          </summary>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ml-4">
                            {assets.sort((a, b) => {
                              const order: Record<string, number> = { photo: 0, video: 1, audio: 2 };
                              return (order[a.type] ?? 3) - (order[b.type] ?? 3);
                            }).map(asset => <AssetCard key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} onClick={() => setSelectedAsset(asset)} />)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}

                {/* Ungrouped / flat assets (no scene/shot metadata) */}
                {ungrouped.length > 0 && (
                  <div>
                    {hasGrouping && (
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--muted-foreground)]">
                        <FolderOpen className="w-4 h-4" /> Other Assets ({ungrouped.length})
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {ungrouped.map(asset => <AssetCard key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} onClick={() => setSelectedAsset(asset)} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
          }
        </div>

        {/* Right — asset detail panel */}
        {selectedAsset && (
          <div className="w-80 flex-shrink-0 border-l border-[var(--border)] overflow-y-auto bg-[var(--card)]">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">{selectedAsset.filename}</h3>
                <button onClick={() => setSelectedAsset(null)} className="p-1 rounded hover:bg-[var(--secondary)]"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Preview */}
              <div className="rounded-lg overflow-hidden border border-[var(--border)] mb-4">
                {selectedAsset.type === 'video' ? (
                  <video src={selectedAsset.cloudinary_url} controls className="w-full aspect-video bg-black" />
                ) : selectedAsset.type === 'photo' ? (
                  <img src={selectedAsset.cloudinary_url} alt={selectedAsset.filename} className="w-full" />
                ) : (
                  <audio src={selectedAsset.cloudinary_url} controls className="w-full p-4" />
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                {selectedAsset.prompt && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">Prompt</span>
                    <p className="text-xs text-[var(--foreground)] mt-0.5">{selectedAsset.prompt}</p>
                  </div>
                )}
                {selectedAsset.model && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[var(--muted-foreground)]">Model</span>
                    <span className="text-xs text-[var(--foreground)]">{selectedAsset.model}</span>
                  </div>
                )}
                {selectedAsset.width && selectedAsset.height && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[var(--muted-foreground)]">Dimensions</span>
                    <span className="text-xs text-[var(--foreground)]">{selectedAsset.width}×{selectedAsset.height}</span>
                  </div>
                )}
                {selectedAsset.file_size && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[var(--muted-foreground)]">Size</span>
                    <span className="text-xs text-[var(--foreground)]">{formatFileSize(selectedAsset.file_size)}</span>
                  </div>
                )}
                {selectedAsset.cost && (
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[var(--muted-foreground)]">Cost</span>
                    <span className="text-xs text-green-400">{formatCost(selectedAsset.cost)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[10px] text-[var(--muted-foreground)]">Created</span>
                  <span className="text-xs text-[var(--foreground)]">{formatDate(selectedAsset.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <a href={selectedAsset.cloudinary_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90">
                  <Download className="w-3 h-3" /> Download
                </a>
                <a href={selectedAsset.cloudinary_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs bg-[var(--secondary)] text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> View
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}

// Reusable Asset thumbnail card
function AssetCard({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:border-[var(--primary)]/50 hover:shadow-lg ${selected ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
    >
      <div className="aspect-video bg-[var(--secondary)] relative overflow-hidden">
        {asset.type === 'photo' ? (
          <img src={asset.cloudinary_url} alt={asset.filename} className="w-full h-full object-cover" loading="lazy" />
        ) : asset.type === 'video' ? (
          <img src={asset.thumbnail_url || getVideoThumbnail(asset.cloudinary_url)} alt={asset.filename} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Volume2 className="w-8 h-8 text-[var(--muted-foreground)] opacity-30" />
          </div>
        )}
        {asset.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"><Play className="w-4 h-4 text-white ml-0.5" /></div>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
          {getAssetIcon(asset.type)} {asset.type}
        </div>
        {asset.scene && asset.shot && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-600/80 text-white">
            S{asset.scene}:S{asset.shot}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium text-[var(--foreground)] truncate">{asset.filename}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {asset.cost ? <span className="text-[10px] text-green-400">{formatCost(asset.cost)}</span> : null}
          {asset.file_size ? <span className="text-[10px] text-[var(--muted-foreground)]">{formatFileSize(asset.file_size)}</span> : null}
        </div>
      </div>
    </div>
  );
}
