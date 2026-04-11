// ============================================================
// AgentFlow Type Definitions
// ============================================================

// Node types available in the builder
export type NodeType =
  // Triggers
  | 'manual_trigger'
  | 'schedule_trigger'
  | 'webhook_trigger'
  // AI
  | 'claude_chat'
  | 'image_gen'
  | 'video_gen'
  | 'voice_gen'
  // Social
  | 'post_x'
  | 'post_instagram'
  | 'post_linkedin'
  | 'post_tiktok'
  // Communications
  | 'send_email'
  | 'send_telegram'
  // Web
  | 'http_request'
  | 'web_search'
  | 'web_scraper'
  // Files
  | 'file_read'
  | 'file_write'
  | 'file_generate'
  // Logic
  | 'if_else'
  | 'loop'
  | 'wait';

export interface NodeCategory {
  name: string;
  emoji: string;
  types: { type: NodeType; label: string; description: string; emoji: string }[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Triggers',
    emoji: '⚡',
    types: [
      { type: 'manual_trigger', label: 'Manual Trigger', description: 'Run manually with a button click', emoji: '👆' },
      { type: 'schedule_trigger', label: 'Schedule', description: 'Run on a schedule (daily, hourly, etc.)', emoji: '⏰' },
      { type: 'webhook_trigger', label: 'Webhook', description: 'Run when a URL is called', emoji: '🔗' },
    ],
  },
  {
    name: 'AI',
    emoji: '🤖',
    types: [
      { type: 'claude_chat', label: 'Claude AI', description: 'Generate text with Claude', emoji: '🧠' },
      { type: 'image_gen', label: 'Image Generator', description: 'Create images with AI', emoji: '🎨' },
      { type: 'video_gen', label: 'Video Generator', description: 'Create videos with AI', emoji: '🎬' },
      { type: 'voice_gen', label: 'Voice Generator', description: 'Create audio with AI', emoji: '🎤' },
    ],
  },
  {
    name: 'Social',
    emoji: '📱',
    types: [
      { type: 'post_x', label: 'Post to X', description: 'Post a tweet on X (Twitter)', emoji: '🐦' },
      { type: 'post_instagram', label: 'Post to Instagram', description: 'Post to Instagram', emoji: '📸' },
      { type: 'post_linkedin', label: 'Post to LinkedIn', description: 'Post to LinkedIn', emoji: '💼' },
      { type: 'post_tiktok', label: 'Post to TikTok', description: 'Post to TikTok', emoji: '🎵' },
    ],
  },
  {
    name: 'Communications',
    emoji: '💬',
    types: [
      { type: 'send_email', label: 'Send Email', description: 'Send an email via Gmail/Resend', emoji: '📧' },
      { type: 'send_telegram', label: 'Send Telegram', description: 'Send a Telegram message', emoji: '✈️' },
    ],
  },
  {
    name: 'Web',
    emoji: '🌐',
    types: [
      { type: 'http_request', label: 'HTTP Request', description: 'Make an API call to any URL', emoji: '🔌' },
      { type: 'web_search', label: 'Web Search', description: 'Search the web for information', emoji: '🔍' },
      { type: 'web_scraper', label: 'Web Scraper', description: 'Extract data from a webpage', emoji: '🕷️' },
    ],
  },
  {
    name: 'Files',
    emoji: '📁',
    types: [
      { type: 'file_read', label: 'Read File', description: 'Read a file', emoji: '📖' },
      { type: 'file_write', label: 'Write File', description: 'Write/create a file', emoji: '✏️' },
      { type: 'file_generate', label: 'Generate File', description: 'Generate a PDF/doc', emoji: '📄' },
    ],
  },
  {
    name: 'Logic',
    emoji: '⚙️',
    types: [
      { type: 'if_else', label: 'If/Else', description: 'Branch based on a condition', emoji: '🔀' },
      { type: 'loop', label: 'Loop', description: 'Repeat steps for each item', emoji: '🔁' },
      { type: 'wait', label: 'Wait', description: 'Pause for a set time', emoji: '⏳' },
    ],
  },
];

export function getNodeMeta(type: NodeType) {
  for (const cat of NODE_CATEGORIES) {
    const found = cat.types.find((t) => t.type === type);
    if (found) return { ...found, category: cat.name, categoryEmoji: cat.emoji };
  }
  return { type, label: type, description: '', emoji: '❓', category: 'Unknown', categoryEmoji: '❓' };
}

// Node config for the canvas
export interface WorkflowNodeData {
  type: NodeType;
  label: string;
  emoji: string;
  config: Record<string, unknown>;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  output?: unknown;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
  buttons?: ChatButton[];
}

export interface ChatButton {
  label: string;
  action: string;
  variant?: 'default' | 'primary' | 'destructive';
}

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'done' | 'error';
}

// Execution events for the inspector
export interface ExecutionEvent {
  id: string;
  timestamp: Date;
  type: 'node_start' | 'node_end' | 'api_call' | 'llm_prompt' | 'llm_response' | 'error' | 'log' | 'variable_set';
  nodeId?: string;
  nodeName?: string;
  data: Record<string, unknown>;
  duration?: number;
}

// Workflow
export interface Workflow {
  id: string;
  name: string;
  emoji: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Builder Agent tool definitions
export const BUILDER_TOOLS = [
  {
    name: 'add_node',
    description: 'Add a new node to the workflow canvas. Use this when the user wants to add a step to their workflow.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          description: 'The node type (e.g., schedule_trigger, claude_chat, send_email, etc.)',
          enum: [
            'manual_trigger', 'schedule_trigger', 'webhook_trigger',
            'claude_chat', 'image_gen', 'video_gen', 'voice_gen',
            'post_x', 'post_instagram', 'post_linkedin', 'post_tiktok',
            'send_email', 'send_telegram',
            'http_request', 'web_search', 'web_scraper',
            'file_read', 'file_write', 'file_generate',
            'if_else', 'loop', 'wait',
          ],
        },
        config: {
          type: 'object',
          description: 'Configuration for the node (e.g., schedule time, prompt text, email address)',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          description: 'Position on the canvas. If not provided, auto-layout will be used.',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'connect_nodes',
    description: 'Connect two nodes with an edge. Creates a data flow from source to target.',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_node_id: { type: 'string', description: 'The ID of the source node' },
        to_node_id: { type: 'string', description: 'The ID of the target node' },
      },
      required: ['from_node_id', 'to_node_id'],
    },
  },
  {
    name: 'update_node',
    description: 'Update the configuration of an existing node.',
    input_schema: {
      type: 'object' as const,
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to update' },
        config: { type: 'object', description: 'New configuration to merge with existing config' },
        label: { type: 'string', description: 'New label for the node' },
      },
      required: ['node_id'],
    },
  },
  {
    name: 'delete_node',
    description: 'Remove a node from the workflow.',
    input_schema: {
      type: 'object' as const,
      properties: {
        node_id: { type: 'string', description: 'The ID of the node to remove' },
      },
      required: ['node_id'],
    },
  },
  {
    name: 'run_workflow',
    description: 'Execute the current workflow. Use this when the user wants to test or run their workflow.',
    input_schema: {
      type: 'object' as const,
      properties: {
        test_mode: { type: 'boolean', description: 'If true, run in test mode with sample data' },
      },
    },
  },
  {
    name: 'explain_error',
    description: 'Explain an error from the last execution in plain, friendly English.',
    input_schema: {
      type: 'object' as const,
      properties: {
        error_message: { type: 'string', description: 'The error message to explain' },
        node_id: { type: 'string', description: 'The node that produced the error' },
      },
      required: ['error_message'],
    },
  },
];
