/**
 * Real fal.ai pricing — single source of truth.
 * Verify against https://fal.ai/models/{model-name} before deploying.
 * Last verified: April 2026
 */

// Per-call or per-unit pricing (see calculateCost for unit logic)
export const FAL_PRICING: Record<string, number> = {
  // Image generation — price per image
  'fal-ai/nano-banana-2':                          0.039,
  'fal-ai/nano-banana-2/edit':                     0.039,
  'fal-ai/bytedance/seedream/v4.5/text-to-image':  0.060,  // ~$0.03/MP, ~$0.06 at 2K landscape
  'fal-ai/bytedance/seedream/v4.5/edit':            0.080,  // edit model costs more
  'fal-ai/flux-pro/v1.1':                          0.040,
  'fal-ai/flux/schnell':                           0.003,

  // Video generation — price per SECOND of output
  'fal-ai/kling-video/o3/pro/image-to-video':       0.190,  // ~$0.95 for 5s
  'fal-ai/kling-video/o3/pro/text-to-video':        0.190,
  'fal-ai/kling-video/o3/pro/reference-to-video':   0.240,  // multi-char costs more
  'fal-ai/kling-video/v2.5-turbo/standard/image-to-video': 0.050,

  // Audio — price per generation
  'fal-ai/elevenlabs/tts/turbo-v2.5':               0.030,
  'fal-ai/elevenlabs/text-to-dialogue/eleven-v3':   0.050,
  'fal-ai/elevenlabs/music':                        0.100,  // per ~30s

};

/**
 * Calculate the real cost of a fal.ai API call.
 * 
 * @param model - The fal.ai model endpoint string
 * @param params - Optional parameters that affect pricing
 * @returns Cost in USD
 */
export function calculateCost(model: string, params?: {
  durationSeconds?: number;
  numImages?: number;
  resolution?: string;
}): number {
  const basePrice = FAL_PRICING[model];
  if (basePrice === undefined) {
    console.warn(`[fal-pricing] No pricing data for model: ${model} — returning $0`);
    return 0;
  }

  // Video models: price per second
  if (model.includes('kling-video') || model.includes('veo') || model.includes('hailuo') || model.includes('minimax')) {
    const duration = params?.durationSeconds || 5;
    return Math.round(basePrice * duration * 1000) / 1000; // round to 3 decimals
  }

  // Image models: price per image, with resolution multiplier
  if (model.includes('nano-banana') || model.includes('seedream') || model.includes('flux')) {
    const count = params?.numImages || 1;
    let multiplier = 1;

    // Seedream charges by megapixel — 4K is ~2.5x more than 2K
    if (model.includes('seedream') && params?.resolution === 'auto_4K') {
      multiplier = 2.5;
    }

    return Math.round(basePrice * count * multiplier * 1000) / 1000;
  }

  // Audio and other models: flat per-generation price
  return basePrice;
}

// Used when a model has no price in FAL_PRICING, so an unknown model never counts as free
const FALLBACK_PRICE = { image: 0.08, videoPerSecond: 0.3, audio: 0.05 };

/** Cost of one node, with a safe upper fallback for unknown models. */
export function estimateNodeCost(node: { data: { type: string; config: Record<string, any> } }): number {
  const t = node.data.type;
  const config = node.data.config || {};
  if (['photo_generator', 'element_reference', 'image_gen'].includes(t)) {
    const model = config.model || 'fal-ai/nano-banana-2';
    return FAL_PRICING[model] !== undefined ? calculateCost(model, { numImages: 1, resolution: config.resolution }) : FALLBACK_PRICE.image;
  }
  if (['video_generator', 'video_gen'].includes(t)) {
    const model = config.model || 'fal-ai/kling-video/o3/pro/image-to-video';
    const seconds = Number(config.duration) || 5;
    return FAL_PRICING[model] !== undefined ? calculateCost(model, { durationSeconds: seconds }) : FALLBACK_PRICE.videoPerSecond * seconds;
  }
  if (['voiceover_generator', 'voice_gen'].includes(t)) {
    const model = config.model || 'fal-ai/elevenlabs/tts/turbo-v2.5';
    return FAL_PRICING[model] ?? FALLBACK_PRICE.audio;
  }
  return 0;
}

/**
 * Estimate the total cost of a workflow before running it.
 * Priced per node, so shots with different video lengths are counted correctly.
 */
export function estimateWorkflowCost(nodes: Array<{ data: { type: string; config: Record<string, any> } }>): {
  total: number;
  breakdown: { type: string; count: number; unitCost: number; subtotal: number }[];
} {
  const groups = new Map<string, { count: number; subtotal: number }>();
  let total = 0;
  for (const node of nodes) {
    const cost = estimateNodeCost(node);
    if (cost <= 0) continue;
    const t = node.data.type;
    const kind = ['video_generator', 'video_gen'].includes(t) ? 'video' : ['voiceover_generator', 'voice_gen'].includes(t) ? 'audio' : 'image';
    const g = groups.get(kind) || { count: 0, subtotal: 0 };
    g.count++;
    g.subtotal += cost;
    groups.set(kind, g);
    total += cost;
  }
  const breakdown = [...groups].map(([type, g]) => ({
    type,
    count: g.count,
    unitCost: Math.round((g.subtotal / g.count) * 1000) / 1000,
    subtotal: Math.round(g.subtotal * 1000) / 1000,
  }));
  return { total: Math.round(total * 100) / 100, breakdown };
}

// Default cost cap per workflow run (USD)
export const DEFAULT_COST_CAP = 10.00;

/**
 * Format cost for display.
 * Total: "$5.42" — Line item: "$0.039"
 */
export function formatCostDisplay(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function formatCostTotal(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
