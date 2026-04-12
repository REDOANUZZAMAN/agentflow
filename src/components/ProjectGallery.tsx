'use client';

import React, { useState } from 'react';
import { X, Image, Film, Volume2, Download, ExternalLink, FolderOpen, ChevronDown, ChevronRight, Eye } from 'lucide-react';

interface Shot {
  id: string;
  duration: number;
  photo?: string;
  video?: string;
  voice?: string;
  prompts?: { photo?: string; video?: string; voiceover?: string };
}

interface Scene {
  name: string;
  shots: Shot[];
}

interface ProjectManifest {
  projectId: string;
  title: string;
  createdAt: string;
  elements: Record<string, string>;
  scenes: Scene[];
  totalCost?: number;
}

interface ProjectGalleryProps {
  manifest?: ProjectManifest;
  onClose: () => void;
}

export default function ProjectGallery({ manifest, onClose }: ProjectGalleryProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<{ url: string; type: string; label: string } | null>(null);

  if (!manifest) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-[var(--muted-foreground)] opacity-40" />
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">No Project Data</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">Run a workflow first to generate assets that will appear here.</p>
          <button onClick={onClose} className="px-4 py-2 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90">Close</button>
        </div>
      </div>
    );
  }

  const toggleScene = (name: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const elements = Object.entries(manifest.elements || {});
  const scenes = manifest.scenes || [];

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
      <div className="flex-1 flex flex-col bg-[var(--background)] m-4 rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">{manifest.title}</h2>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              {elements.length} elements • {scenes.length} scenes • {scenes.reduce((s, sc) => s + sc.shots.length, 0)} shots
              {manifest.totalCost ? ` • $${manifest.totalCost.toFixed(2)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left — tree */}
          <div className="w-60 flex-shrink-0 border-r border-[var(--border)] overflow-y-auto p-3 space-y-1">
            {/* Elements */}
            {elements.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1 px-2">Elements</p>
                {elements.map(([name, url]) => (
                  <button key={name} onClick={() => setSelectedAsset({ url, type: 'image', label: name })}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${selectedAsset?.url === url ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}>
                    <Image className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Scenes */}
            {scenes.map(scene => (
              <div key={scene.name}>
                <button onClick={() => toggleScene(scene.name)} className="w-full flex items-center gap-1 px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-lg">
                  {expandedScenes.has(scene.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <FolderOpen className="w-3 h-3" /> {scene.name} <span className="text-[10px] opacity-50 ml-auto">{scene.shots.length}</span>
                </button>
                {expandedScenes.has(scene.name) && scene.shots.map(shot => (
                  <div key={shot.id} className="pl-6 space-y-0.5">
                    {shot.photo && (
                      <button onClick={() => setSelectedAsset({ url: shot.photo!, type: 'image', label: `${scene.name} Shot ${shot.id} Photo` })}
                        className="w-full flex items-center gap-2 px-2 py-0.5 text-[10px] rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        <Image className="w-2.5 h-2.5" /> photo.jpg
                      </button>
                    )}
                    {shot.video && (
                      <button onClick={() => setSelectedAsset({ url: shot.video!, type: 'video', label: `${scene.name} Shot ${shot.id} Video` })}
                        className="w-full flex items-center gap-2 px-2 py-0.5 text-[10px] rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        <Film className="w-2.5 h-2.5" /> video.mp4
                      </button>
                    )}
                    {shot.voice && (
                      <button onClick={() => setSelectedAsset({ url: shot.voice!, type: 'audio', label: `${scene.name} Shot ${shot.id} Voice` })}
                        className="w-full flex items-center gap-2 px-2 py-0.5 text-[10px] rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        <Volume2 className="w-2.5 h-2.5" /> voice.mp3
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right — preview */}
          <div className="flex-1 flex items-center justify-center p-6">
            {selectedAsset ? (
              <div className="max-w-2xl w-full">
                <p className="text-xs text-[var(--muted-foreground)] mb-2">{selectedAsset.label}</p>
                {selectedAsset.type === 'video' ? (
                  <video src={selectedAsset.url} controls className="w-full rounded-xl border border-[var(--border)] bg-black" />
                ) : selectedAsset.type === 'audio' ? (
                  <audio src={selectedAsset.url} controls className="w-full" />
                ) : (
                  <img src={selectedAsset.url} alt={selectedAsset.label} className="w-full rounded-xl border border-[var(--border)]" />
                )}
                <div className="mt-3 flex gap-2">
                  <a href={selectedAsset.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-1">
                    <Download className="w-3 h-3" /> Download
                  </a>
                  <a href={selectedAsset.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs bg-[var(--secondary)] text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Eye className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)] opacity-30" />
                <p className="text-xs text-[var(--muted-foreground)]">Select an asset to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
