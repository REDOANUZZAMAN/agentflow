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
  // Video Pipeline
  | 'script_parser'
  | 'element_reference'
  | 'photo_generator'
  | 'video_generator'
  | 'voiceover_generator'
  | 'project_orchestrator'
  | 'final_video_compiler'
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
    name: 'Video Pipeline',
    emoji: '🎥',
    types: [
      { type: 'script_parser', label: 'Script Parser', description: 'Parse a script into scenes & shots', emoji: '📜' },
      { type: 'element_reference', label: 'Element Reference', description: 'Generate consistent character/location refs', emoji: '🎭' },
      { type: 'photo_generator', label: 'Photo Generator', description: 'Generate shot photos via fal.ai', emoji: '📸' },
      { type: 'video_generator', label: 'Video Generator (fal)', description: 'Generate shot videos via fal.ai', emoji: '🎬' },
      { type: 'voiceover_generator', label: 'Voiceover Generator', description: 'Generate voiceover audio via fal.ai TTS', emoji: '🗣️' },
      { type: 'project_orchestrator', label: 'Project Orchestrator', description: 'Run full script-to-video pipeline', emoji: '🎯' },
      { type: 'final_video_compiler', label: 'Final Video Compiler', description: 'Merge all shots into one video with transitions & audio', emoji: '🎞️' },
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
  videoUrl?: string;
  videoLabel?: string;
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

// Task List
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorReason?: string;
}

export interface TaskList {
  id: string;
  tasks: Task[];
  createdAt: Date;
}

// Execution events for the inspector
export interface ExecutionEvent {
  id: string;
  timestamp: Date;
  type: 'node_start' | 'node_end' | 'node_error' | 'api_call' | 'llm_prompt' | 'llm_response' | 'error' | 'log' | 'variable_set' | 'asset_created' | 'workflow_done';
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
            'script_parser', 'element_reference', 'photo_generator',
            'video_generator', 'voiceover_generator', 'project_orchestrator', 'final_video_compiler',
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
  // Task list tools
  {
    name: 'create_task_list',
    description: 'Create a task checklist to show the user your plan. ALWAYS use this before doing multi-step work. Break the goal into 3-10 clear, plain-English steps.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique task ID like task_1, task_2' },
              title: { type: 'string', description: 'Plain English description of the step' },
            },
            required: ['id', 'title'],
          },
          description: 'List of tasks in order',
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'start_task',
    description: 'Mark a task as in-progress. Call this before starting work on a task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to start' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed. Call this when you finish a task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to mark done' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'fail_task',
    description: 'Mark a task as failed with a friendly explanation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID that failed' },
        reason: { type: 'string', description: 'Plain English explanation of what went wrong' },
      },
      required: ['task_id', 'reason'],
    },
  },
  {
    name: 'add_task',
    description: 'Add a new task to the existing task list.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'Unique ID for the new task' },
        title: { type: 'string', description: 'Plain English description' },
        after_task_id: { type: 'string', description: 'Insert after this task ID. If omitted, appends to end.' },
      },
      required: ['task_id', 'title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update the title of an existing task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The task ID to update' },
        title: { type: 'string', description: 'New title for the task' },
      },
      required: ['task_id', 'title'],
    },
  },
  {
    name: 'list_nodes',
    description: 'List all existing nodes on the canvas. Call this at the start of continuation rounds to see what has already been built and avoid duplicates.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'workflow_ready',
    description: 'Call this ONLY when the entire workflow is fully built and all nodes are connected. This signals to the system that you are done building. Do NOT call this prematurely — only after every node has been added and every connection made.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: { type: 'string', description: 'A plain English summary of the completed workflow' },
        node_count: { type: 'number', description: 'Total number of nodes created' },
        edge_count: { type: 'number', description: 'Total number of connections made' },
      },
      required: ['summary'],
    },
  },
];
