'use client';

import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useApp } from '@/lib/context';
import { createNode, createEdge } from '@/lib/store';
import { getNodeMeta, type NodeType } from '@/lib/types';
import WorkflowNodeComponent from './WorkflowNode';
import { NodeIcon, WorkflowIcon } from '@/lib/node-icons';
import { FloatingTaskWidget } from './TaskListCard';
import CanvasContextMenu, { getCanvasMenuItems, getNodeMenuItems } from './CanvasContextMenu';

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}

function WorkflowCanvasInner() {
  const { state, dispatch } = useApp();
  const { fitView, screenToFlowPosition } = useReactFlow();

  // React Flow internal state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([] as Node[]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: 'canvas' | 'node'; nodeId?: string;
    canvasPos?: { x: number; y: number };
  } | null>(null);

  // Node picker for "Add node here"
  const [showNodePicker, setShowNodePicker] = useState<{ x: number; y: number } | null>(null);

  // Sync store → React Flow
  const prevStoreNodesRef = useRef<string>('');
  const prevStoreEdgesRef = useRef<string>('');

  useEffect(() => {
    const storeNodesKey = state.nodes.map(n => `${n.id}:${n.position.x}:${n.position.y}`).join(',');
    const storeEdgesKey = state.edges.map(e => e.id).join(',');

    if (storeNodesKey !== prevStoreNodesRef.current) {
      prevStoreNodesRef.current = storeNodesKey;
      setRfNodes(state.nodes.map((n) => ({
        id: n.id,
        type: n.type || 'workflowNode',
        position: n.position,
        data: { ...n.data } as Record<string, unknown>,
      })));
      if (state.nodes.length > 0) {
        setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 300);
      }
    }
    if (storeEdgesKey !== prevStoreEdgesRef.current) {
      prevStoreEdgesRef.current = storeEdgesKey;
      setRfEdges(state.edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      })));
    }
  }, [state.nodes, state.edges, state.isRunning, setRfNodes, setRfEdges, fitView]);

  // Sync node statuses
  useEffect(() => {
    setRfNodes((nds) => nds.map((n) => {
      const sn = state.nodes.find((s) => s.id === n.id);
      return sn ? { ...n, data: { ...sn.data } as Record<string, unknown>, selected: n.id === state.selectedNodeId } : n;
    }));
  }, [state.nodes.map(n => `${n.data.status}:${n.data.label}`).join(','), state.selectedNodeId, setRfNodes]);

  useEffect(() => {
    setRfEdges((eds) => eds.map((e) => ({ ...e, animated: state.isRunning })));
  }, [state.isRunning, setRfEdges]);

  const nodeTypes: NodeTypes = useMemo(() => ({ workflowNode: WorkflowNodeComponent }), []);

  // Manual connection
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      const edge = createEdge(connection.source, connection.target);
      dispatch({ type: 'ADD_EDGE', payload: edge });
      setRfEdges((eds) => addEdge({
        ...connection, id: edge.id, type: 'smoothstep', animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }, eds));
    }
  }, [dispatch, setRfEdges, state.isRunning]);

  // Node click
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: node.id });
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: null });
    setContextMenu(null);
    setShowNodePicker(null);
  }, [dispatch]);

  // Drag stop → sync position to store
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    dispatch({ type: 'MOVE_NODE', payload: { id: node.id, position: node.position } });
  }, [dispatch]);

  // Right-click context menu
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    const clientX = 'clientX' in event ? event.clientX : 0;
    const clientY = 'clientY' in event ? event.clientY : 0;
    const canvasPos = screenToFlowPosition({ x: clientX, y: clientY });
    setContextMenu({ x: clientX, y: clientY, type: 'canvas', canvasPos });
  }, [screenToFlowPosition]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    dispatch({ type: 'SET_SELECTED_NODE', payload: node.id });
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
  }, [dispatch]);

  // Drop zone for drag-from-sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/agentflow-node') as NodeType;
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const node = createNode(type, {}, position);
    dispatch({ type: 'ADD_NODE', payload: node });
  }, [screenToFlowPosition, dispatch]);

  // Get React Flow instance for reading selection
  const { getNodes, getEdges } = useReactFlow();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') return;

      // Undo: Ctrl+Z / Cmd+Z
      if (isCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z  or  Ctrl+Y
      if ((isCmd && e.key === 'z' && e.shiftKey) || (isCmd && e.key === 'y')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Delete selected nodes/edges (multi-select aware)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = getNodes().filter((n) => n.selected);
        const selectedEdges = getEdges().filter((e) => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          dispatch({
            type: 'DELETE_SELECTED',
            payload: {
              nodeIds: selectedNodes.map((n) => n.id),
              edgeIds: selectedEdges.map((e) => e.id),
            },
          });
        } else if (state.selectedNodeId) {
          // Fallback: single selected node from our state
          e.preventDefault();
          dispatch({ type: 'DELETE_NODE', payload: state.selectedNodeId });
          dispatch({ type: 'SET_SELECTED_NODE', payload: null });
        }
      }
      // Duplicate: Cmd+D
      if (isCmd && e.key === 'd' && state.selectedNodeId) {
        e.preventDefault();
        const node = state.nodes.find((n) => n.id === state.selectedNodeId);
        if (node) {
          const newNode = createNode(node.data.type, { ...node.data.config }, {
            x: node.position.x + 30, y: node.position.y + 30,
          });
          newNode.data.label = node.data.label;
          dispatch({ type: 'ADD_NODE', payload: newNode });
          dispatch({ type: 'SET_SELECTED_NODE', payload: newNode.id });
        }
      }
      // Select all: Cmd+A
      if (isCmd && e.key === 'a') {
        e.preventDefault();
        setRfNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }
      // Fit view: Cmd+0
      if (isCmd && e.key === '0') {
        e.preventDefault();
        fitView({ padding: 0.3, duration: 400 });
      }
      // Escape
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_SELECTED_NODE', payload: null });
        setContextMenu(null);
        setShowNodePicker(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedNodeId, state.nodes, dispatch, fitView, setRfNodes, getNodes, getEdges]);

  // Context menu actions
  const duplicateSelected = useCallback(() => {
    const node = state.nodes.find((n) => n.id === state.selectedNodeId);
    if (node) {
      const newNode = createNode(node.data.type, { ...node.data.config }, {
        x: node.position.x + 30, y: node.position.y + 30,
      });
      newNode.data.label = node.data.label;
      dispatch({ type: 'ADD_NODE', payload: newNode });
    }
  }, [state.selectedNodeId, state.nodes, dispatch]);

  const deleteSelected = useCallback(() => {
    if (state.selectedNodeId) {
      dispatch({ type: 'DELETE_NODE', payload: state.selectedNodeId });
      dispatch({ type: 'SET_SELECTED_NODE', payload: null });
    }
  }, [state.selectedNodeId, dispatch]);

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    if (contextMenu.type === 'node' && contextMenu.nodeId) {
      return getNodeMenuItems(contextMenu.nodeId, {
        onDuplicate: duplicateSelected,
        onDelete: deleteSelected,
        onCopy: () => {},
        onDisable: () => {},
      });
    }
    return getCanvasMenuItems(contextMenu.canvasPos || { x: 300, y: 200 }, {
      onAddNode: (pos) => setShowNodePicker(pos),
      onSelectAll: () => setRfNodes((nds) => nds.map((n) => ({ ...n, selected: true }))),
      onFitView: () => fitView({ padding: 0.3, duration: 400 }),
    });
  }, [contextMenu, duplicateSelected, deleteSelected, fitView, setRfNodes]);

  return (
    <div className="h-full w-full relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <WorkflowIcon emoji={state.workflowEmoji} className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{state.workflowName}</h2>
          <span className="text-xs text-[var(--muted-foreground)]">
            {state.nodes.length} node{state.nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Undo/Redo buttons */}
          <button
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.history.length === 0}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            title={`Undo (Ctrl+Z) • ${state.history.length} steps`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.69 3L3 13" />
            </svg>
          </button>
          <button
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={state.future.length === 0}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            title={`Redo (Ctrl+Shift+Z) • ${state.future.length} steps`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.69 3L21 13" />
            </svg>
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          {state.isRunning && (
            <div className="flex items-center gap-2 text-xs text-[var(--success)]">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Running...
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-[var(--background)]"
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#6366f1', strokeWidth: 2 }, animated: false }}
        connectionLineType={'smoothstep' as any}
        deleteKeyCode={null}
        panOnDrag
        selectionKeyCode="Shift"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls className="!bg-[var(--card)] !border-[var(--border)] !rounded-lg !shadow-lg [&>button]:!bg-[var(--card)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--foreground)] [&>button:hover]:!bg-[var(--secondary)]" />
        <MiniMap className="!bg-[var(--card)] !border-[var(--border)] !rounded-lg" nodeColor="#6366f1" maskColor="rgba(0, 0, 0, 0.5)" />
      </ReactFlow>

      {/* Floating task widget */}
      <FloatingTaskWidget />

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Quick node picker (after "Add node here") */}
      {showNodePicker && (
        <QuickNodePicker
          position={showNodePicker}
          onSelect={(type) => {
            const node = createNode(type, {}, showNodePicker);
            dispatch({ type: 'ADD_NODE', payload: node });
            setShowNodePicker(null);
          }}
          onClose={() => setShowNodePicker(null)}
        />
      )}

      {/* Empty state */}
      {state.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4 flex justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)] opacity-40"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Your canvas is empty</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Drag a node from the sidebar, right-click to add, or ask the AI in chat!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick node picker modal (appears when "Add node here" is clicked)
function QuickNodePicker({ position, onSelect, onClose }: {
  position: { x: number; y: number };
  onSelect: (type: NodeType) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { NODE_CATEGORIES } = require('@/lib/types');

  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const allNodes = NODE_CATEGORIES.flatMap((cat: any) =>
    cat.types.map((t: any) => ({ ...t, category: cat.name }))
  ).filter((t: any) =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={ref}
      className="absolute z-30 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-[260px] max-h-[320px] overflow-hidden context-menu-appear"
      style={{ left: '50%', top: '30%', transform: 'translate(-50%, 0)' }}
    >
      <div className="p-2 border-b border-[var(--border)]">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="w-full px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && allNodes.length > 0) {
              onSelect(allNodes[0].type);
            }
          }}
        />
      </div>
      <div className="overflow-y-auto max-h-[260px] p-1">
        {allNodes.map((node: any) => (
          <button
            key={node.type}
            onClick={() => onSelect(node.type)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors"
          >
            <NodeIcon type={node.type} className="w-3.5 h-3.5" />
            <span className="font-medium">{node.label}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">{node.category}</span>
          </button>
        ))}
        {allNodes.length === 0 && (
          <p className="text-center text-xs text-[var(--muted-foreground)] py-4">No nodes found</p>
        )}
      </div>
    </div>
  );
}
