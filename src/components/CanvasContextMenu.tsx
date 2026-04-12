'use client';

import React, { useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, Clipboard, Search } from 'lucide-react';

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  destructive?: boolean;
  divider?: boolean;
}

interface CanvasContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function CanvasContextMenu({ x, y, items, onClose }: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Ensure menu stays within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 36 - 20),
    zIndex: 50,
  };

  return (
    <div ref={ref} style={menuStyle} className="min-w-[180px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden py-1 context-menu-appear">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider && <div className="my-1 border-t border-[var(--border)]" />}
          <button
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
              item.destructive
                ? 'text-[var(--destructive)] hover:bg-[var(--destructive)]/10'
                : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'
            }`}
          >
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{item.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

// Helper to create context menu items for different scenarios
export function getCanvasMenuItems(
  canvasPos: { x: number; y: number },
  callbacks: {
    onAddNode: (pos: { x: number; y: number }) => void;
    onPaste?: () => void;
    onSelectAll: () => void;
    onFitView: () => void;
  }
): ContextMenuItem[] {
  return [
    { label: 'Add node here', icon: <Plus className="w-3.5 h-3.5" />, action: () => callbacks.onAddNode(canvasPos) },
    { label: 'Paste', icon: <Clipboard className="w-3.5 h-3.5" />, action: () => callbacks.onPaste?.(), shortcut: '⌘V' },
    { label: 'Select all', icon: <Search className="w-3.5 h-3.5" />, action: callbacks.onSelectAll, shortcut: '⌘A', divider: true },
    { label: 'Fit view', icon: <Search className="w-3.5 h-3.5" />, action: callbacks.onFitView, shortcut: '⌘0' },
  ];
}

export function getNodeMenuItems(
  nodeId: string,
  callbacks: {
    onDuplicate: () => void;
    onDelete: () => void;
    onCopy: () => void;
    onDisable: () => void;
  }
): ContextMenuItem[] {
  return [
    { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, action: callbacks.onDuplicate, shortcut: '⌘D' },
    { label: 'Copy', icon: <Clipboard className="w-3.5 h-3.5" />, action: callbacks.onCopy, shortcut: '⌘C' },
    { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, action: callbacks.onDelete, shortcut: 'Del', destructive: true, divider: true },
  ];
}
