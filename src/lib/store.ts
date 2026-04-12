// ============================================================
// AgentFlow Global Store (using React context + useReducer)
// ============================================================

import { ChatMessage, ExecutionEvent, WorkflowNode, WorkflowEdge, NodeType, getNodeMeta, Task, TaskList } from './types';
import type { TerminalLogEntry } from '@/components/TerminalPanel';

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

  // Terminal
  terminalLogs: TerminalLogEntry[];

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
        { label: '🎬 Script to video', action: 'I have a script with scenes and shots. Build me a pipeline that generates photos, videos, and voiceovers for each shot using fal.ai and organizes everything in Cloudinary.' },
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

  terminalLogs: [],

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
  // Terminal actions
  | { type: 'ADD_TERMINAL_LOG'; payload: TerminalLogEntry }
  | { type: 'CLEAR_TERMINAL_LOGS' }
  | { type: 'TOGGLE_TERMINAL_LOG_EXPAND'; payload: string };

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

// Smart grid-based auto-layout for video pipeline workflows
export function autoLayout(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  if (nodes.length === 0) return nodes;

  const COL_W = 280;
  const ROW_H = 180;

  // Categorize nodes
  const triggers: WorkflowNode[] = [];
  const elements: WorkflowNode[] = [];
  const photos: WorkflowNode[] = [];
  const videos: WorkflowNode[] = [];
  const voiceovers: WorkflowNode[] = [];
  const orchestrators: WorkflowNode[] = [];
  const compilers: WorkflowNode[] = [];
  const others: WorkflowNode[] = [];

  for (const n of nodes) {
    const t = n.data.type;
    if (['manual_trigger', 'schedule_trigger', 'webhook_trigger'].includes(t)) triggers.push(n);
    else if (t === 'element_reference') elements.push(n);
    else if (t === 'photo_generator' || t === 'image_gen') photos.push(n);
    else if (t === 'video_generator' || t === 'video_gen') videos.push(n);
    else if (t === 'voiceover_generator' || t === 'voice_gen') voiceovers.push(n);
    else if (t === 'project_orchestrator') orchestrators.push(n);
    else if (t === 'final_video_compiler') compilers.push(n);
    else others.push(n);
  }

  // Check if this is a video pipeline workflow
  const isVideoPipeline = photos.length > 0 || videos.length > 0;

  if (!isVideoPipeline) {
    // Simple vertical layout for non-pipeline workflows
    const hasIncoming = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !hasIncoming.has(n.id));
    const visited = new Set<string>();
    const ordered: WorkflowNode[] = [];
    const queue = [...roots];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      ordered.push(node);
      const children = edges.filter(e => e.source === node.id).map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as WorkflowNode[];
      queue.push(...children);
    }
    for (const n of nodes) { if (!visited.has(n.id)) ordered.push(n); }
    return ordered.map((node, i) => ({ ...node, position: { x: 300, y: 80 + i * 150 } }));
  }

  // Video pipeline grid layout
  const sortByShot = (a: WorkflowNode, b: WorkflowNode) =>
    ((a.data.config as any)?.shotNumber || 0) - ((b.data.config as any)?.shotNumber || 0);
  photos.sort(sortByShot);
  videos.sort(sortByShot);
  voiceovers.sort(sortByShot);

  const maxCols = Math.max(elements.length, photos.length, videos.length, voiceovers.length, 1);
  const centerX = 150 + ((maxCols - 1) * COL_W) / 2;

  const result: WorkflowNode[] = [];

  // Row 0: Triggers (centered)
  for (const n of triggers) {
    result.push({ ...n, position: { x: centerX, y: 0 } });
  }
  // Row 1: Element references
  for (let i = 0; i < elements.length; i++) {
    result.push({ ...elements[i], position: { x: 150 + i * COL_W, y: ROW_H } });
  }
  // Row 2: Photos (by shot number)
  for (let i = 0; i < photos.length; i++) {
    result.push({ ...photos[i], position: { x: 150 + i * COL_W, y: 2 * ROW_H } });
  }
  // Row 3: Videos
  for (let i = 0; i < videos.length; i++) {
    result.push({ ...videos[i], position: { x: 150 + i * COL_W, y: 3 * ROW_H } });
  }
  // Row 4: Voiceovers
  for (let i = 0; i < voiceovers.length; i++) {
    result.push({ ...voiceovers[i], position: { x: 150 + i * COL_W, y: 4 * ROW_H } });
  }
  // Row 5: Orchestrator
  for (const n of orchestrators) {
    result.push({ ...n, position: { x: centerX, y: 5 * ROW_H } });
  }
  // Row 6: Compiler
  for (const n of compilers) {
    result.push({ ...n, position: { x: centerX, y: 6 * ROW_H } });
  }
  // Remaining nodes below
  let othersY = 7 * ROW_H;
  for (const n of others) {
    result.push({ ...n, position: { x: centerX, y: othersY } });
    othersY += 150;
  }

  return result;
}
