// ============================================================
// AgentFlow Global Store (using React context + useReducer)
// ============================================================

import { ChatMessage, ExecutionEvent, WorkflowNode, WorkflowEdge, NodeType, getNodeMeta } from './types';

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

  // Panel widths (percentages)
  leftPanelWidth: number;
  rightPanelWidth: number;
}

export const initialState: AppState = {
  nodes: [],
  edges: [],
  workflowName: 'My Workflow',
  workflowEmoji: '🤖',

  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Hi! I'm your AI Agent Builder.**\n\nTell me what you want your agent to do, and I'll build it right here on the canvas. You'll see every step as I create it!\n\nHere are some ideas to get started:`,
      timestamp: new Date(),
      buttons: [
        { label: '📧 Daily news summary by email', action: 'Make me an agent that writes a daily news summary and emails it to me' },
        { label: '🐦 Auto-post to social media', action: 'Create an agent that generates a motivational quote and posts it to Twitter every morning' },
        { label: '😂 Daily joke by email', action: 'Send me a daily joke by email every morning at 8am' },
        { label: '🔍 Web monitor with alerts', action: 'Monitor a website for changes and send me a Telegram message when something changes' },
      ],
    },
  ],
  isAiTyping: false,

  executionEvents: [],
  inspectorOpen: true,
  inspectorTab: 'timeline',

  isRunning: false,
  selectedNodeId: null,

  leftPanelWidth: 25,
  rightPanelWidth: 25,
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
  | { type: 'SET_WORKFLOW_META'; payload: { name?: string; emoji?: string } };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.payload] };

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, data: { ...n.data, ...action.payload.data } } : n
        ),
      };

    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.payload),
        edges: state.edges.filter((e) => e.source !== action.payload && e.target !== action.payload),
      };

    case 'SET_NODES':
      return { ...state, nodes: action.payload };

    case 'ADD_EDGE':
      return { ...state, edges: [...state.edges, action.payload] };

    case 'DELETE_EDGE':
      return { ...state, edges: state.edges.filter((e) => e.id !== action.payload) };

    case 'SET_EDGES':
      return { ...state, edges: action.payload };

    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, position: action.payload.position } : n
        ),
      };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

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

  return {
    id,
    type: 'workflowNode',
    position: position || { x: 250, y: 100 + (nodeCounter - 1) * 150 },
    data: {
      type,
      label: meta.label,
      emoji: meta.emoji,
      config,
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

// Auto-layout nodes vertically
export function autoLayout(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (nodes.length === 0) return nodes;

  // Simple vertical layout
  const startX = 300;
  const startY = 80;
  const gapY = 150;

  // Find root nodes (no incoming edges)
  const hasIncoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));
  const rest = nodes.filter((n) => hasIncoming.has(n.id));

  // BFS ordering
  const ordered: WorkflowNode[] = [];
  const visited = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    ordered.push(node);

    // Find children
    const children = edges
      .filter((e) => e.source === node.id)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean) as WorkflowNode[];

    queue.push(...children);
  }

  // Add any unvisited nodes
  for (const n of rest) {
    if (!visited.has(n.id)) {
      ordered.push(n);
    }
  }

  return ordered.map((node, i) => ({
    ...node,
    position: { x: startX, y: startY + i * gapY },
  }));
}
