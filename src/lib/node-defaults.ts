/**
 * Node Defaults & Validation — Server-side enforcement.
 * 
 * The agent can be as sloppy as it wants; the backend auto-fills defaults
 * and rejects nodes that are still incomplete after defaulting.
 */

// ─── Required Fields + Defaults Per Node Type ────────────────────────

export interface NodeSchema {
  required: string[];
  defaults: Record<string, unknown>;
  /** Fields auto-filled from execution context at runtime */
  runtimeFills?: string[];
}

export const NODE_SCHEMAS: Record<string, NodeSchema> = {
  // ─── Triggers ───
  manual_trigger: {
    required: [],
    defaults: {},
  },
  schedule_trigger: {
    required: ['schedule'],
    defaults: { schedule: 'every day at 8am', cron: '0 8 * * *', timezone: 'UTC' },
  },
  webhook_trigger: {
    required: ['path'],
    defaults: { path: '/webhook', method: 'POST' },
  },

  // ─── AI ───
  claude_chat: {
    required: ['prompt'],
    defaults: { model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 2048 },
  },
  image_gen: {
    required: ['prompt'],
    defaults: { model: 'fal-ai/nano-banana-2', size: '1024x1024' },
  },

  // ─── Video Pipeline ───
  element_reference: {
    required: ['elementName', 'description', 'model'],
    defaults: { model: 'fal-ai/nano-banana-2' },
  },
  photo_generator: {
    required: ['prompt', 'model'],
    defaults: {
      model: 'fal-ai/nano-banana-2',
      width: 1920,
      height: 1080,
      sceneNumber: 1,
      shotNumber: 1,
    },
  },
  video_generator: {
    required: ['prompt', 'model'],
    defaults: {
      model: 'fal-ai/kling-video/o3/pro/image-to-video',
      duration: 5,
      sceneNumber: 1,
      shotNumber: 1,
    },
  },
  voiceover_generator: {
    required: ['text', 'voice', 'model'],
    defaults: {
      voice: 'Rachel',
      model: 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3',
    },
  },
  music_generator: {
    required: ['prompt'],
    defaults: { model: 'fal-ai/elevenlabs/music', durationMs: 30000 },
  },
  script_parser: {
    required: ['script'],
    defaults: { format: 'auto' },
  },
  project_orchestrator: {
    required: ['projectName'],
    defaults: {
      projectName: 'Video Project',
      photoModel: 'fal-ai/nano-banana-2',
      videoModel: 'fal-ai/kling-video/o3/pro/image-to-video',
      voiceModel: 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3',
    },
    runtimeFills: ['cloudinaryFolder'],
  },
  final_video_compiler: {
    required: [],
    defaults: {
      transition: 'cut',
      outputResolution: '1920x1080',
      outputFormat: 'mp4',
      addCaptions: 'no',
      mode: 'cloudinary',
    },
    runtimeFills: ['projectId'],
  },

  // ─── Social ───
  post_x: {
    required: ['text'],
    defaults: {},
  },
  post_instagram: {
    required: ['text'],
    defaults: {},
  },
  post_linkedin: {
    required: ['text'],
    defaults: {},
  },
  post_tiktok: {
    required: ['text'],
    defaults: {},
  },

  // ─── Comms ───
  send_email: {
    required: ['to', 'subject'],
    defaults: {},
  },
  send_telegram: {
    required: ['chatId', 'message'],
    defaults: {},
  },

  // ─── Web ───
  http_request: {
    required: ['url'],
    defaults: { method: 'GET' },
  },
  web_search: {
    required: ['query'],
    defaults: { maxResults: 5 },
  },
  web_scraper: {
    required: ['url'],
    defaults: {},
  },

  // ─── Logic ───
  if_else: {
    required: ['condition'],
    defaults: {},
  },
  loop: {
    required: ['items'],
    defaults: {},
  },
  wait: {
    required: ['duration'],
    defaults: { duration: 60 },
  },

  // ─── Files ───
  file_read: { required: [], defaults: {} },
  file_write: { required: [], defaults: {} },
  file_generate: { required: [], defaults: {} },
};

// ─── Placeholder Values That Should NEVER Appear ──────────────────

const PLACEHOLDER_VALUES = new Set([
  'proj_phishing_001',
  'My Video Project',
  '@Hacker',
  '@HackerRoom',
  'YOUR_PROJECT_ID',
  'placeholder',
  'example',
  'test123',
]);

// ─── Apply Defaults to Config ──────────────────────────────────────

/**
 * Merges defaults into config. Agent-provided values take priority.
 * Returns the merged config.
 */
export function applyDefaults(nodeType: string, config: Record<string, unknown>): Record<string, unknown> {
  const schema = NODE_SCHEMAS[nodeType];
  if (!schema) return config;

  const merged = { ...config };

  // Apply defaults for any missing field
  for (const [key, defaultVal] of Object.entries(schema.defaults)) {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      merged[key] = defaultVal;
    }
  }

  // Strip placeholder values
  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === 'string' && PLACEHOLDER_VALUES.has(val)) {
      // Replace with default if available, otherwise clear
      merged[key] = schema.defaults[key] ?? '';
    }
  }

  return merged;
}

// ─── Validate Config ───────────────────────────────────────────────

export interface ValidationError {
  nodeId?: string;
  nodeName?: string;
  nodeType: string;
  missingFields: string[];
  placeholderFields: string[];
}

/**
 * Validates a single node's config against its schema.
 * Returns null if valid, or a ValidationError if not.
 */
export function validateNodeConfig(
  nodeType: string,
  config: Record<string, unknown>,
  nodeId?: string,
  nodeName?: string
): ValidationError | null {
  const schema = NODE_SCHEMAS[nodeType];
  if (!schema) return null;

  const missing: string[] = [];
  const placeholder: string[] = [];

  for (const field of schema.required) {
    const val = config[field];
    if (val === undefined || val === null || val === '') {
      // Skip runtime-filled fields
      if (schema.runtimeFills?.includes(field)) continue;
      missing.push(field);
    }
  }

  for (const [key, val] of Object.entries(config)) {
    if (typeof val === 'string' && PLACEHOLDER_VALUES.has(val)) {
      placeholder.push(key);
    }
  }

  if (missing.length === 0 && placeholder.length === 0) return null;

  return { nodeId, nodeName, nodeType, missingFields: missing, placeholderFields: placeholder };
}

// ─── Pre-flight Workflow Validation ────────────────────────────────

/**
 * Validates ALL nodes in a workflow before execution.
 * Returns an array of errors (empty = valid).
 */
export function validateWorkflow(
  nodes: Array<{ id: string; data: { type: string; label: string; config: Record<string, unknown> } }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    const err = validateNodeConfig(node.data.type, node.data.config, node.id, node.data.label);
    if (err) errors.push(err);
  }

  return errors;
}

/**
 * Auto-fix a workflow by applying defaults to all nodes.
 * Returns the fixed nodes array.
 */
export function autoFixWorkflow(
  nodes: Array<{ id: string; data: { type: string; label: string; emoji: string; config: Record<string, unknown> } }>
): typeof nodes {
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      config: applyDefaults(node.data.type, node.data.config),
    },
  }));
}

/**
 * Format validation errors into a user-friendly string.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const lines = errors.map(err => {
    const parts: string[] = [];
    if (err.missingFields.length > 0) {
      parts.push(`missing: ${err.missingFields.join(', ')}`);
    }
    if (err.placeholderFields.length > 0) {
      parts.push(`placeholder values in: ${err.placeholderFields.join(', ')}`);
    }
    return `• ${err.nodeName || err.nodeType} (${err.nodeType}): ${parts.join('; ')}`;
  });

  return `⚠ Cannot run — ${errors.length} node(s) have issues:\n\n${lines.join('\n')}`;
}
