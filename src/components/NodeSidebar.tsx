'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { NODE_CATEGORIES, type NodeType } from '@/lib/types';
import { NodeIcon, CategoryIcon } from '@/lib/node-icons';

interface NodeSidebarProps {
  onDragStart: (type: NodeType) => void;
}

export default function NodeSidebar({ onDragStart }: NodeSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showTooltip, setShowTooltip] = useState(true);

  const filteredCategories = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter(
      (t) =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.types.length > 0);

  const toggleCategory = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/agentflow-node', type);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(type);
    setShowTooltip(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">Node Library</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      {/* Tooltip for first-timers */}
      {showTooltip && (
        <div className="mx-3 mt-3 px-3 py-2 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-lg text-xs text-[var(--primary)]">
            <strong>Drag</strong> any node onto the canvas to add it!
        </div>
      )}

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filteredCategories.map((cat) => (
          <div key={cat.name}>
            <button
              onClick={() => toggleCategory(cat.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-md hover:bg-[var(--secondary)]/50"
            >
              {collapsed[cat.name] ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              <CategoryIcon name={cat.name} className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
              <span className="ml-auto text-[10px] text-[var(--muted-foreground)]/60">
                {cat.types.length}
              </span>
            </button>

            {!collapsed[cat.name] && (
              <div className="ml-2 space-y-0.5 mt-0.5">
                {cat.types.map((nodeType) => (
                  <div
                    key={nodeType.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, nodeType.type)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[var(--card)] border border-transparent hover:border-[var(--border)] transition-all group"
                    title={nodeType.description}
                  >
                    <GripVertical className="w-3 h-3 text-[var(--muted-foreground)]/30 group-hover:text-[var(--muted-foreground)]/60 flex-shrink-0" />
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[var(--secondary)]"><NodeIcon type={nodeType.type} className="w-3.5 h-3.5 text-[var(--foreground)]" /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">
                        {nodeType.label}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                        {nodeType.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
            No nodes match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
