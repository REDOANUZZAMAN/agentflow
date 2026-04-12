/**
 * Recovery Agent — Claude-powered autonomous error diagnosis and repair.
 * 
 * When a node fails during execution, this agent:
 * 1. Reads the error, node config, upstream outputs, and context
 * 2. Diagnoses the cause via Claude (claude-sonnet-4-5)
 * 3. Picks a fix: retry, config change, model swap, skip, or escalate
 * 4. Retries up to MAX_ATTEMPTS times
 * 5. Escalates to user only if truly hopeless
 */

import { FAL_MODELS } from './fal-models';

// ─── Types ──────────────────────────────────────────────────────────

export interface RecoveryContext {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  nodeConfig: Record<string, any>;
  errorMessage: string;
  httpStatus?: number;
  httpResponse?: any;
  upstreamOutputs: Record<string, any>;
  previousAttempts: RecoveryAttempt[];
  executionId: string;
}

export interface RecoveryAttempt {
  attempt: number;
  action: string;
  changes?: Record<string, any>;
  reasoning: string;
  outcome: 'success' | 'failed';
  error?: string;
  timestamp: string;
}

export interface RecoveryDecision {
  action: 'retry' | 'retry_with_config' | 'switch_model' | 'fix_input' | 'skip' | 'escalate';
  waitSeconds?: number;
  configChanges?: Record<string, any>;
  newModel?: string;
  transformation?: string;
  transformParams?: Record<string, any>;
  reasoning: string;
  userMessage?: string;
  suggestedActions?: string[];
}

// ─── Constants ──────────────────────────────────────────────────────

export const RECOVERY_LIMITS = {
  MAX_ATTEMPTS_PER_NODE: 3,
  MAX_ATTEMPTS_PER_EXECUTION: 10,
  MAX_COST_PER_RECOVERY_USD: 0.50,
  MAX_RECOVERY_TIME_MS: 15 * 60 * 1000, // 15 minutes
};

// Nodes that should NEVER be auto-retried (destructive/non-idempotent)
const NON_IDEMPOTENT_NODES = new Set([
  'post_x', 'post_instagram', 'post_linkedin', 'post_tiktok',
  'send_email', 'send_telegram',
]);

// Model fallback chains — if one fails, try the next
const MODEL_FALLBACKS: Record<string, string[]> = {
  [FAL_MODELS.IMAGE_SEEDREAM]: [FAL_MODELS.IMAGE_NANO_BANANA],
  [FAL_MODELS.IMAGE_SEEDREAM_EDIT]: [FAL_MODELS.IMAGE_NANO_BANANA_EDIT, FAL_MODELS.IMAGE_NANO_BANANA],
  [FAL_MODELS.IMAGE_NANO_BANANA_EDIT]: [FAL_MODELS.IMAGE_NANO_BANANA],
  [FAL_MODELS.VIDEO_KLING_O3_R2V]: [FAL_MODELS.VIDEO_KLING_O3_I2V, FAL_MODELS.VIDEO_KLING_O3_T2V],
  [FAL_MODELS.VIDEO_KLING_O3_I2V]: [FAL_MODELS.VIDEO_KLING_O3_T2V],
  [FAL_MODELS.VOICE_TTS]: [FAL_MODELS.VOICE_DIALOGUE],
  [FAL_MODELS.VOICE_DIALOGUE]: [FAL_MODELS.VOICE_TTS],
};

// ─── Fast Pattern Matching (no Claude needed) ───────────────────────

/**
 * Try to diagnose common errors without calling Claude.
 * Returns a RecoveryDecision if a known pattern is matched, null otherwise.
 */
export function fastDiagnose(ctx: RecoveryContext): RecoveryDecision | null {
  const err = ctx.errorMessage.toLowerCase();
  const status = ctx.httpStatus;
  const attempt = ctx.previousAttempts.length;

  // ── Auth/Payment — always escalate ──
  if (status === 401 || status === 403 || err.includes('unauthorized') || err.includes('forbidden')) {
    return {
      action: 'escalate',
      reasoning: 'Authentication or permission error — cannot auto-fix.',
      userMessage: `Your API credentials for ${ctx.nodeLabel} are invalid or expired. Please reconnect.`,
      suggestedActions: ['Reconnect your API key in Settings', 'Check if the API key has the required permissions'],
    };
  }

  if (status === 402 || err.includes('insufficient credits') || err.includes('payment required') || err.includes('billing')) {
    return {
      action: 'escalate',
      reasoning: 'Payment/credits issue — cannot auto-fix.',
      userMessage: `You've run out of API credits for ${ctx.nodeLabel}. Please add funds.`,
      suggestedActions: ['Add credits to your fal.ai account', 'Switch to a cheaper model'],
    };
  }

  // ── Non-idempotent nodes — always escalate on failure ──
  if (NON_IDEMPOTENT_NODES.has(ctx.nodeType)) {
    return {
      action: 'escalate',
      reasoning: `${ctx.nodeType} is a destructive action — auto-retry could cause duplicates.`,
      userMessage: `${ctx.nodeLabel} failed but I can't safely retry it (it might double-post or send duplicate messages). Please retry manually.`,
      suggestedActions: ['Check if the action partially completed', 'Retry this step manually'],
    };
  }

  // ── Rate limit — wait and retry ──
  if (status === 429 || err.includes('rate limit') || err.includes('too many requests')) {
    const waitSec = attempt === 0 ? 15 : attempt === 1 ? 30 : 60;
    return {
      action: 'retry',
      waitSeconds: waitSec,
      reasoning: `Rate limited (attempt ${attempt + 1}). Waiting ${waitSec}s before retry.`,
    };
  }

  // ── Timeout / network errors — quick retry ──
  if (err.includes('timeout') || err.includes('etimedout') || err.includes('econnreset') || 
      err.includes('econnrefused') || err.includes('network') || err.includes('socket hang up') ||
      err.includes('fetch failed') || status === 504 || status === 502 || status === 503) {
    const waitSec = attempt === 0 ? 5 : attempt === 1 ? 15 : 30;
    return {
      action: 'retry',
      waitSeconds: waitSec,
      reasoning: `Transient network error (attempt ${attempt + 1}). Retrying in ${waitSec}s.`,
    };
  }

  // ── NSFW / content filter — rewrite prompt ──
  if (err.includes('nsfw') || err.includes('safety') || err.includes('content policy') || 
      err.includes('moderation') || err.includes('inappropriate') || err.includes('not allowed')) {
    if (ctx.nodeConfig.prompt && attempt < 2) {
      return {
        action: 'fix_input',
        transformation: 'rewrite_prompt',
        reasoning: 'Content filter triggered. Rewriting prompt to avoid trigger words.',
      };
    }
  }

  // ── Image too large — resize ──
  if (err.includes('too large') || err.includes('file size') || err.includes('payload too large') || status === 413) {
    if (ctx.nodeConfig.image_url) {
      return {
        action: 'fix_input',
        transformation: 'resize_image',
        transformParams: { width: 1024 },
        reasoning: 'Input image too large. Resizing to 1024px width.',
      };
    }
  }

  // ── Empty output from fal.ai — try once more ──
  if (err.includes('no image') || err.includes('no video') || err.includes('no audio') || err.includes('no url')) {
    if (attempt === 0) {
      return {
        action: 'retry',
        waitSeconds: 3,
        reasoning: 'API returned empty output. Retrying once.',
      };
    }
    // After first retry, try a different model
    const currentModel = ctx.nodeConfig.model;
    const fallbacks = currentModel ? MODEL_FALLBACKS[currentModel] : null;
    if (fallbacks && fallbacks.length > 0 && attempt < 2) {
      return {
        action: 'switch_model',
        newModel: fallbacks[0],
        reasoning: `Empty output from ${currentModel}. Switching to fallback model ${fallbacks[0]}.`,
      };
    }
  }

  // ── Invalid model endpoint ──
  if (err.includes('invalid model') || err.includes('model not found') || err.includes('not_found') ||
      (status === 404 && ctx.nodeConfig.model)) {
    const currentModel = ctx.nodeConfig.model;
    const fallbacks = currentModel ? MODEL_FALLBACKS[currentModel] : null;
    if (fallbacks && fallbacks.length > 0) {
      return {
        action: 'switch_model',
        newModel: fallbacks[0],
        reasoning: `Model ${currentModel} not found. Switching to ${fallbacks[0]}.`,
      };
    }
  }

  // ── Unprocessable Entity (422) — probably bad input format ──
  if (status === 422) {
    if (attempt === 0) {
      // Try removing optional fields that might be malformed
      return {
        action: 'retry_with_config',
        configChanges: { negative_prompt: undefined },
        reasoning: '422 error — removing optional fields and retrying.',
      };
    }
  }

  // ── Prompt too long ──
  if (err.includes('too long') || err.includes('max.*token') || err.includes('character limit')) {
    if (ctx.nodeConfig.prompt) {
      return {
        action: 'fix_input',
        transformation: 'truncate_text',
        transformParams: { maxLength: 500 },
        reasoning: 'Prompt exceeds model limit. Truncating.',
      };
    }
  }

  return null; // No pattern matched — need Claude
}

// ─── Claude-Powered Deep Diagnosis ──────────────────────────────────

const RECOVERY_TOOLS = [
  {
    name: 'retry_node',
    description: 'Retry the failed node with no changes (for transient errors like rate limits, timeouts, network issues)',
    input_schema: {
      type: 'object' as const,
      properties: {
        wait_seconds: { type: 'number' as const, description: 'Wait before retrying (0-60)' },
        reasoning: { type: 'string' as const },
      },
      required: ['wait_seconds', 'reasoning'],
    },
  },
  {
    name: 'retry_with_config_change',
    description: 'Retry the node with modified config (e.g. shorter prompt, different aspect ratio, lower resolution)',
    input_schema: {
      type: 'object' as const,
      properties: {
        config_changes: { type: 'object' as const, description: 'Object of config field => new value' },
        reasoning: { type: 'string' as const },
      },
      required: ['config_changes', 'reasoning'],
    },
  },
  {
    name: 'switch_model',
    description: 'Try a different model when the current one fails repeatedly',
    input_schema: {
      type: 'object' as const,
      properties: {
        new_model: { type: 'string' as const },
        reasoning: { type: 'string' as const },
      },
      required: ['new_model', 'reasoning'],
    },
  },
  {
    name: 'skip_node',
    description: 'Skip this node and continue (only for non-critical nodes like voiceover or music)',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string' as const },
      },
      required: ['reason'],
    },
  },
  {
    name: 'escalate_to_user',
    description: 'Give up and ask the user. Use when you cannot fix the issue automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        plain_english_explanation: { type: 'string' as const },
        suggested_actions: { type: 'array' as const, items: { type: 'string' as const } },
      },
      required: ['plain_english_explanation', 'suggested_actions'],
    },
  },
];

const RECOVERY_SYSTEM_PROMPT = `You are the Recovery Agent. A node in a user's workflow just failed. Your job is to diagnose and fix it automatically.

PRINCIPLES:
1. Diagnose first. Read the error message carefully.
2. Try cheapest fix first: retry → config change → model swap → skip → escalate.
3. Maximum 3 attempts per node. After 3, escalate.
4. NEVER auto-retry destructive actions (social media posts, emails).
5. Explain reasoning in 1-2 sentences.

AVAILABLE FAL.AI MODELS:
- Images: fal-ai/nano-banana-2, fal-ai/nano-banana-2/edit, fal-ai/bytedance/seedream/v4.5/text-to-image, fal-ai/bytedance/seedream/v4.5/edit
- Video: fal-ai/kling-video/o3/pro/image-to-video, fal-ai/kling-video/o3/pro/text-to-video, fal-ai/kling-video/o3/pro/reference-to-video
- Voice: fal-ai/elevenlabs/tts, fal-ai/elevenlabs/text-to-dialogue/eleven-v3
- Music: fal-ai/elevenlabs/music

SKIPPABLE NODES (non-critical): voiceover_generator, music_generator
NON-SKIPPABLE: photo_generator, video_generator, element_reference, final_video_compiler

Call exactly ONE tool.`;

/**
 * Call Claude to diagnose an error that fast-matching couldn't handle.
 */
export async function claudeDiagnose(ctx: RecoveryContext): Promise<RecoveryDecision> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    // Can't call Claude — fall back to simple retry
    return {
      action: 'retry',
      waitSeconds: 10,
      reasoning: 'Claude unavailable for diagnosis. Doing a blind retry.',
    };
  }

  const userMessage = `A workflow node failed. Diagnose and fix it.

NODE TYPE: ${ctx.nodeType}
NODE LABEL: ${ctx.nodeLabel}
CONFIG: ${JSON.stringify(ctx.nodeConfig, null, 2)}

ERROR: ${ctx.errorMessage}
HTTP STATUS: ${ctx.httpStatus || 'N/A'}

UPSTREAM OUTPUTS: ${JSON.stringify(ctx.upstreamOutputs, null, 2).substring(0, 2000)}

PREVIOUS ATTEMPTS: ${ctx.previousAttempts.length}
${ctx.previousAttempts.length > 0 ? JSON.stringify(ctx.previousAttempts, null, 2) : 'None'}

Pick a recovery action.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: RECOVERY_SYSTEM_PROMPT,
        tools: RECOVERY_TOOLS,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude proxy returned ${response.status}`);
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: any) => b.type === 'tool_use');

    if (!toolUse) {
      return { action: 'retry', waitSeconds: 10, reasoning: 'Claude did not pick a tool. Doing blind retry.' };
    }

    // Parse Claude's tool call into a RecoveryDecision
    switch (toolUse.name) {
      case 'retry_node':
        return {
          action: 'retry',
          waitSeconds: toolUse.input.wait_seconds || 5,
          reasoning: toolUse.input.reasoning || 'Claude recommended retry.',
        };

      case 'retry_with_config_change':
        return {
          action: 'retry_with_config',
          configChanges: toolUse.input.config_changes || {},
          reasoning: toolUse.input.reasoning || 'Claude recommended config change.',
        };

      case 'switch_model':
        return {
          action: 'switch_model',
          newModel: toolUse.input.new_model,
          reasoning: toolUse.input.reasoning || 'Claude recommended model switch.',
        };

      case 'skip_node':
        return {
          action: 'skip',
          reasoning: toolUse.input.reason || 'Claude recommended skipping.',
        };

      case 'escalate_to_user':
        return {
          action: 'escalate',
          reasoning: 'Claude could not find an automatic fix.',
          userMessage: toolUse.input.plain_english_explanation,
          suggestedActions: toolUse.input.suggested_actions || [],
        };

      default:
        return { action: 'retry', waitSeconds: 10, reasoning: `Unknown tool: ${toolUse.name}. Blind retry.` };
    }
  } catch (err: any) {
    // Claude call failed — simple retry as last resort
    return {
      action: 'retry',
      waitSeconds: 10,
      reasoning: `Claude diagnosis failed (${err.message}). Doing blind retry.`,
    };
  }
}

// ─── Input Transformations ──────────────────────────────────────────

/**
 * Apply a transformation to the node config before retrying.
 */
export function applyTransformation(
  config: Record<string, any>,
  transformation: string,
  params?: Record<string, any>
): Record<string, any> {
  const fixed = { ...config };

  switch (transformation) {
    case 'resize_image': {
      const width = params?.width || 1024;
      if (fixed.image_url && typeof fixed.image_url === 'string') {
        // Use Cloudinary on-the-fly resize
        fixed.image_url = fixed.image_url.replace('/upload/', `/upload/w_${width},c_limit/`);
      }
      break;
    }

    case 'truncate_text': {
      const maxLen = params?.maxLength || 500;
      if (fixed.prompt && typeof fixed.prompt === 'string' && fixed.prompt.length > maxLen) {
        fixed.prompt = fixed.prompt.substring(0, maxLen);
      }
      if (fixed.text && typeof fixed.text === 'string' && fixed.text.length > maxLen) {
        fixed.text = fixed.text.substring(0, maxLen);
      }
      break;
    }

    case 'rewrite_prompt': {
      // Simple word replacement for common NSFW triggers
      // (Claude-based rewrite would be async, so we do fast regex here)
      if (fixed.prompt && typeof fixed.prompt === 'string') {
        const replacements: Record<string, string> = {
          'blood': 'red liquid',
          'bloody': 'intense',
          'kill': 'defeat',
          'weapon': 'tool',
          'gun': 'device',
          'nude': 'natural',
          'naked': 'bare',
          'violence': 'conflict',
          'violent': 'intense',
          'drug': 'substance',
          'gore': 'damage',
          'death': 'end',
          'dead': 'fallen',
          'corpse': 'figure',
          'suicide': 'crisis',
          'murder': 'crime',
          'terror': 'fear',
          'explode': 'burst',
          'explosion': 'burst',
          'bomb': 'device',
        };
        let prompt = fixed.prompt;
        for (const [trigger, safe] of Object.entries(replacements)) {
          prompt = prompt.replace(new RegExp(`\\b${trigger}\\b`, 'gi'), safe);
        }
        fixed.prompt = prompt;
      }
      break;
    }

    case 'refetch_url':
      // Nothing we can do synchronously — keep as-is
      break;
  }

  return fixed;
}

// ─── Main Recovery Function ─────────────────────────────────────────

/**
 * Diagnose an error and return a recovery decision.
 * Tries fast pattern matching first, falls back to Claude if needed.
 */
export async function diagnose(ctx: RecoveryContext): Promise<RecoveryDecision> {
  // Check limits
  if (ctx.previousAttempts.length >= RECOVERY_LIMITS.MAX_ATTEMPTS_PER_NODE) {
    return {
      action: 'escalate',
      reasoning: `Max ${RECOVERY_LIMITS.MAX_ATTEMPTS_PER_NODE} recovery attempts exhausted.`,
      userMessage: `I tried ${RECOVERY_LIMITS.MAX_ATTEMPTS_PER_NODE} times to fix "${ctx.nodeLabel}" but couldn't solve it. Error: ${ctx.errorMessage}`,
      suggestedActions: [
        'Try running the workflow again',
        'Edit the node config and adjust the settings',
        'Check your API credentials in Settings',
      ],
    };
  }

  // Try fast pattern matching first (free, instant)
  const fastDecision = fastDiagnose(ctx);
  if (fastDecision) {
    return fastDecision;
  }

  // Fall back to Claude diagnosis (costs tokens, takes ~2s)
  return await claudeDiagnose(ctx);
}

/**
 * Sleep helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
