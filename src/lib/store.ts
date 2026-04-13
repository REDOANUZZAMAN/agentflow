// ============================================================
// AgentFlow Global Store (using React context + useReducer)
// ============================================================

import { ChatMessage, ExecutionEvent, WorkflowNode, WorkflowEdge, NodeType, getNodeMeta, Task, TaskList } from './types';
import type { TerminalLogEntry } from '@/components/TerminalPanel';
import { applyDefaults } from './node-defaults';
import dagre from 'dagre';

// History snapshot for undo/redo
interface HistorySnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const MAX_HISTORY = 50;

// State
export interface AppState {
  // Workflow
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  workflowName: string;
  workflowEmoji: string;
  // Chat
  messages: ChatMessage[];
  isAiTyping: boolean;

  // Inspector
  executionEvents: ExecutionEvent[];
  inspectorOpen: boolean;
  inspectorTab: 'timeline' | 'network' | 'logs' | 'variables' | 'cost';

  // Execution
  isRunning: boolean;
  selectedNodeId: string | null;

  // Task List
  taskList: Task[] | null;
  taskListCollapsed: boolean;

  // Chat mode
  chatMode: 'plan' | 'act';
  confirmedPlan: string | null;

  // Terminal
  terminalLogs: TerminalLogEntry[];

  // Panel widths (percentages)
  leftPanelWidth: number;
  rightPanelWidth: number;

  // Undo/Redo history
  history: HistorySnapshot[];
  future: HistorySnapshot[];
}

export const initialState: AppState = {
  nodes: [],
  edges: [],
  workflowName: 'My Workflow',
  workflowEmoji: '[bot]',

  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: `**Hi! I'm your AI Agent Builder.**\n\nTell me what you want your agent to do, and I'll build it right here on the canvas. You'll see every step as I create it!\n\nHere are some ideas to get started:`,
      timestamp: new Date(),
      buttons: [
        { label: '[email] Daily news summary by email', action: 'Make me an agent that writes a daily news summary and emails it to me' },
        { label: '[bird] Auto-post to social media', action: 'Create an agent that generates a motivational quote and posts it to Twitter every morning' },
        { label: '[joke] Daily joke by email', action: 'Send me a daily joke by email every morning at 8am' },
        { label: '[search] Web monitor with alerts', action: 'Monitor a website for changes and send me a Telegram message when something changes' },
        { label: '[video] Script to video', action: 'I have a script with scenes and shots. Build me a pipeline that generates photos, videos, and voiceovers for each shot using fal.ai and organizes everything in Cloudinary.' },
      ],
    },
  ],
  isAiTyping: false,

  executionEvents: [],
  inspectorOpen: true,
  inspectorTab: 'timeline',

  isRunning: false,
  selectedNodeId: null,

  taskList: null,
  taskListCollapsed: false,

  chatMode: 'plan',
  confirmedPlan: null,

  terminalLogs: [],

  leftPanelWidth: 25,
  rightPanelWidth: 25,

  history: [],
  future: [],
};

// Actions
export type Action =
  | { type: 'ADD_NODE'; payload: WorkflowNode }
  | { type: 'UPDATE_NODE'; payload: { id: string; data: Partial<WorkflowNode['data']> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'SET_NODES'; payload: WorkflowNode[] }
  | { type: 'ADD_EDGE'; payload: WorkflowEdge }
  | { type: 'DELETE_EDGE'; payload: string }
  | { type: 'SET_EDGES'; payload: WorkflowEdge[] }
  | { type: 'MOVE_NODE'; payload: { id: string; position: { x: number; y: number } } }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content?: string; toolCalls?: ChatMessage['toolCalls'] } }
  | { type: 'SET_AI_TYPING'; payload: boolean }
  | { type: 'ADD_EXECUTION_EVENT'; payload: ExecutionEvent }
  | { type: 'CLEAR_EXECUTION_EVENTS' }
  | { type: 'SET_INSPECTOR_OPEN'; payload: boolean }
  | { type: 'SET_INSPECTOR_TAB'; payload: AppState['inspectorTab'] }
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_SELECTED_NODE'; payload: string | null }
  | { type: 'SET_NODE_STATUS'; payload: { id: string; status: 'idle' | 'running' | 'success' | 'error'; error?: string; output?: unknown } }
  | { type: 'SET_PANEL_WIDTH'; payload: { panel: 'left' | 'right'; width: number } }
  | { type: 'SET_WORKFLOW_META'; payload: { name?: string; emoji?: string } }
  // Task list actions
  | { type: 'CREATE_TASK_LIST'; payload: Task[] }
  | { type: 'START_TASK'; payload: string }
  | { type: 'COMPLETE_TASK'; payload: string }
  | { type: 'FAIL_TASK'; payload: { id: string; reason: string } }
  | { type: 'ADD_TASK'; payload: { task: Task; afterTaskId?: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; title: string } }
  | { type: 'TOGGLE_TASK_LIST'; payload?: boolean }
  | { type: 'CLEAR_TASK_LIST' }
  | { type: 'AUTO_FIX_DEFAULTS' }
  | { type: 'AUTO_LAYOUT' }
  | { type: 'SET_CHAT_MODE'; payload: 'plan' | 'act' }
  | { type: 'SET_CONFIRMED_PLAN'; payload: string | null }
  // Terminal actions
  | { type: 'ADD_TERMINAL_LOG'; payload: TerminalLogEntry }
  | { type: 'CLEAR_TERMINAL_LOGS' }
  | { type: 'TOGGLE_TERMINAL_LOG_EXPAND'; payload: string }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Multi-select delete
  | { type: 'DELETE_SELECTED'; payload: { nodeIds: string[]; edgeIds: string[] } }
  // Clear canvas for new workflow
  | { type: 'CLEAR_CANVAS' };

// Helper: push current nodes/edges to history stack
function pushHistory(state: AppState): { history: HistorySnapshot[]; future: HistorySnapshot[] } {
  const snapshot: HistorySnapshot = {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  };
  return {
    history: [...state.history.slice(-(MAX_HISTORY - 1)), snapshot],
    future: [], // clear redo stack on new action
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── Undo/Redo ────────────────────────────────────
    case 'UNDO': {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      const currentSnapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      return {
        ...state,
        nodes: prev.nodes,
        edges: prev.edges,
        history: state.history.slice(0, -1),
        future: [...state.future, currentSnapshot],
        selectedNodeId: null,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[state.future.length - 1];
      const currentSnapshot: HistorySnapshot = {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
      return {
        ...state,
        nodes: next.nodes,
        edges: next.edges,
        history: [...state.history, currentSnapshot],
        future: state.future.slice(0, -1),
        selectedNodeId: null,
      };
    }

    // ── Multi-select delete ──────────────────────────
    case 'DELETE_SELECTED': {
      const { nodeIds, edgeIds } = action.payload;
      if (nodeIds.length === 0 && edgeIds.length === 0) return state;
      const nodeSet = new Set(nodeIds);
      const edgeSet = new Set(edgeIds);
      const hist = pushHistory(state);
      return {
        ...state,
        ...hist,
        nodes: state.nodes.filter((n) => !nodeSet.has(n.id)),
        edges: state.edges.filter((e) =>
          !edgeSet.has(e.id) && !nodeSet.has(e.source) && !nodeSet.has(e.target)
        ),
        selectedNodeId: null,
      };
    }

    // ── Node/Edge mutations (with history) ───────────
    case 'ADD_NODE': {
      const hist = pushHistory(state);
      return { ...state, ...hist, nodes: [...state.nodes, action.payload] };
    }

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  ...action.payload.data,
                  // Deep merge config so existing config fields aren't lost
                  config: action.payload.data.config
                    ? { ...(n.data.config || {}), ...action.payload.data.config }
                    : n.data.config,
                },
              }
            : n
        ),
      };

    case 'DELETE_NODE': {
      const hist = pushHistory(state);
      return {
        ...state,
        ...hist,
        nodes: state.nodes.filter((n) => n.id !== action.payload),
        edges: state.edges.filter((e) => e.source !== action.payload && e.target !== action.payload),
      };
    }

    case 'SET_NODES': {
      const hist = pushHistory(state);
      return { ...state, ...hist, nodes: action.payload };
    }

    case 'ADD_EDGE': {
      const hist = pushHistory(state);
      return { ...state, ...hist, edges: [...state.edges, action.payload] };
    }

    case 'DELETE_EDGE': {
      const hist = pushHistory(state);
      return { ...state, ...hist, edges: state.edges.filter((e) => e.id !== action.payload) };
    }

    case 'SET_EDGES': {
      const hist = pushHistory(state);
      return { ...state, ...hist, edges: action.payload };
    }

    case 'MOVE_NODE':
      // Don't push history for every pixel of dragging — handled via onNodeDragStop
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, position: action.payload.position } : n
        ),
      };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id
            ? { ...m, ...(action.payload.content !== undefined ? { content: action.payload.content } : {}), ...(action.payload.toolCalls !== undefined ? { toolCalls: action.payload.toolCalls } : {}) }
            : m
        ),
      };

    case 'SET_AI_TYPING':
      return { ...state, isAiTyping: action.payload };

    case 'ADD_EXECUTION_EVENT':
      if (state.executionEvents.some(e => e.id === action.payload.id)) return state;
      return { ...state, executionEvents: [...state.executionEvents, action.payload] };

    case 'CLEAR_EXECUTION_EVENTS':
      return { ...state, executionEvents: [] };

    case 'SET_INSPECTOR_OPEN':
      return { ...state, inspectorOpen: action.payload };

    case 'SET_INSPECTOR_TAB':
      return { ...state, inspectorTab: action.payload };

    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload };

    case 'SET_SELECTED_NODE':
      return { ...state, selectedNodeId: action.payload };

    case 'SET_NODE_STATUS':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id
            ? { ...n, data: { ...n.data, status: action.payload.status, error: action.payload.error, output: action.payload.output } }
            : n
        ),
      };

    case 'SET_PANEL_WIDTH':
      if (action.payload.panel === 'left') {
        return { ...state, leftPanelWidth: action.payload.width };
      }
      return { ...state, rightPanelWidth: action.payload.width };

    case 'SET_WORKFLOW_META':
      return {
        ...state,
        ...(action.payload.name !== undefined ? { workflowName: action.payload.name } : {}),
        ...(action.payload.emoji !== undefined ? { workflowEmoji: action.payload.emoji } : {}),
      };

    // Task list actions
    case 'CREATE_TASK_LIST':
      return { ...state, taskList: action.payload, taskListCollapsed: false };

    case 'START_TASK':
      return {
        ...state,
        taskList: state.taskList?.map((t) =>
          t.id === action.payload ? { ...t, status: 'running' as const, startedAt: new Date() } : t
        ) || null,
      };

    case 'COMPLETE_TASK':
      return {
        ...state,
        taskList: state.taskList?.map((t) =>
          t.id === action.payload ? { ...t, status: 'done' as const, completedAt: new Date() } : t
        ) || null,
      };

    case 'FAIL_TASK':
      return {
        ...state,
        taskList: state.taskList?.map((t) =>
          t.id === action.payload.id ? { ...t, status: 'failed' as const, errorReason: action.payload.reason, completedAt: new Date() } : t
        ) || null,
      };

    case 'ADD_TASK': {
      if (!state.taskList) return { ...state, taskList: [action.payload.task] };
      const tasks = [...state.taskList];
      if (action.payload.afterTaskId) {
        const idx = tasks.findIndex((t) => t.id === action.payload.afterTaskId);
        if (idx !== -1) {
          tasks.splice(idx + 1, 0, action.payload.task);
        } else {
          tasks.push(action.payload.task);
        }
      } else {
        tasks.push(action.payload.task);
      }
      return { ...state, taskList: tasks };
    }

    case 'UPDATE_TASK':
      return {
        ...state,
        taskList: state.taskList?.map((t) =>
          t.id === action.payload.id ? { ...t, title: action.payload.title } : t
        ) || null,
      };

    case 'TOGGLE_TASK_LIST':
      return {
        ...state,
        taskListCollapsed: action.payload !== undefined ? action.payload : !state.taskListCollapsed,
      };

    case 'CLEAR_TASK_LIST':
      return { ...state, taskList: null };

    // Auto-fix: apply schema defaults to all nodes
    case 'AUTO_FIX_DEFAULTS':
      return {
        ...state,
        nodes: state.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            config: applyDefaults(n.data.type, (n.data.config as Record<string, unknown>) || {}),
          },
        })),
      };

    // Auto-layout: use dagre for beautiful graph layout
    case 'AUTO_LAYOUT': {
      if (state.nodes.length === 0) return state;
      const layouted = dagreLayout(state.nodes, state.edges);
      return { ...state, nodes: layouted };
    }

    // Chat mode
    case 'SET_CHAT_MODE':
      return { ...state, chatMode: action.payload };

    case 'SET_CONFIRMED_PLAN':
      return { ...state, confirmedPlan: action.payload };

    // Terminal actions
    case 'ADD_TERMINAL_LOG':
      if (state.terminalLogs.some(l => l.id === action.payload.id)) return state;
      return { ...state, terminalLogs: [...state.terminalLogs.slice(-999), action.payload] };

    case 'CLEAR_TERMINAL_LOGS':
      return { ...state, terminalLogs: [] };

    case 'TOGGLE_TERMINAL_LOG_EXPAND':
      return {
        ...state,
        terminalLogs: state.terminalLogs.map((l) =>
          l.id === action.payload
            ? { ...l, metadata: { ...l.metadata, expanded: !l.metadata?.expanded } }
            : l
        ),
      };

    // Clear canvas before building a new workflow
    case 'CLEAR_CANVAS': {
      const hist = pushHistory(state);
      return { ...state, ...hist, nodes: [], edges: [], selectedNodeId: null };
    }

    default:
      return state;
  }
}

// Helper to generate auto-positioned node
let nodeCounter = 0;
export function createNode(type: NodeType, config: Record<string, unknown> = {}, position?: { x: number; y: number }): WorkflowNode {
  const meta = getNodeMeta(type);
  nodeCounter++;
  const id = `node_${Date.now()}_${nodeCounter}`;

  // Apply defaults from node-defaults schema
  const mergedConfig = applyDefaults(type, config);

  return {
    id,
    type: 'workflowNode',
    position: position || { x: 80 + (nodeCounter - 1) * 160, y: 150 },
    data: {
      type,
      label: meta.label,
      emoji: meta.emoji,
      config: mergedConfig,
      status: 'idle',
    },
  };
}

export function createEdge(source: string, target: string): WorkflowEdge {
  return {
    id: `edge_${source}_${target}`,
    source,
    target,
  };
}

// ─── Dagre-based auto-layout ─────────────────────────────────
// Uses dagre to compute optimal graph layout (left-to-right)
// Handles linear chains, branches, and complex DAGs beautifully
const NODE_WIDTH = 100;  // matches our n8n-style node width
const NODE_HEIGHT = 90;  // icon box (64) + gap (6) + label (20)

export function dagreLayout(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (nodes.length === 0) return nodes;
  if (edges.length === 0) {
    // No edges — just lay out horizontally
    return nodes.map((n, i) => ({ ...n, position: { x: 80 + i * 160, y: 100 } }));
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  // LR = left-to-right, nodesep = vertical gap, ranksep = horizontal gap between ranks
  g.setGraph({
    rankdir: 'LR',
    nodesep: 60,   // vertical spacing between nodes in same rank
    ranksep: 120,  // horizontal spacing between ranks
    marginx: 40,
    marginy: 40,
  });

  // Add nodes
  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges
  for (const edge of edges) {
    // Only add if both source and target exist
    if (nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Apply positions back to nodes (dagre returns center positions, React Flow uses top-left)
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (pos) {
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      };
    }
    return node;
  });
}

// Alias for backward compatibility
export const autoLayout = dagreLayout;
