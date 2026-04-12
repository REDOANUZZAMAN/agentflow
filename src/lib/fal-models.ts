/**
 * Confirmed fal.ai model endpoints — verified from official docs.
 * These are the ONLY model strings that should be used in executors.
 */

export const FAL_MODELS = {
  // ─── Image Generation ──────────────────────────────────────────
  IMAGE_NANO_BANANA: 'fal-ai/nano-banana-2',
  IMAGE_NANO_BANANA_EDIT: 'fal-ai/nano-banana-2/edit',
  IMAGE_SEEDREAM: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
  IMAGE_SEEDREAM_EDIT: 'fal-ai/bytedance/seedream/v4.5/edit',

  // ─── Video Generation ──────────────────────────────────────────
  VIDEO_KLING_O3_I2V: 'fal-ai/kling-video/o3/pro/image-to-video',
  VIDEO_KLING_O3_T2V: 'fal-ai/kling-video/o3/pro/text-to-video',
  VIDEO_KLING_O3_R2V: 'fal-ai/kling-video/o3/pro/reference-to-video',

  // ─── Audio ─────────────────────────────────────────────────────
  VOICE_TTS: 'fal-ai/elevenlabs/tts/turbo-v2.5',
  VOICE_DIALOGUE: 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3',
  MUSIC: 'fal-ai/elevenlabs/music',
} as const;

// ─── Model Catalogs (for UI dropdowns) ─────────────────────────────

export const IMAGE_MODEL_CATALOG = [
  {
    id: FAL_MODELS.IMAGE_NANO_BANANA,
    name: 'Nano Banana 2',
    label: '⚡ Nano Banana 2 (default, fast)',
    description: 'Fast, balanced quality. Great default for most generations.',
    bestFor: ['general images', 'characters', 'scenes', 'fast iteration'],
    cost: '$0.04',
    supportsRefs: false,
  },
  {
    id: FAL_MODELS.IMAGE_NANO_BANANA_EDIT,
    name: 'Nano Banana 2 + Refs',
    label: '🎨 Nano Banana 2 Edit (with refs)',
    description: 'Same model with reference images for character consistency.',
    bestFor: ['element-consistent shots', 'character reuse'],
    cost: '$0.04',
    supportsRefs: true,
    maxRefs: 4,
  },
  {
    id: FAL_MODELS.IMAGE_SEEDREAM,
    name: 'Seedream 4.5',
    label: '✨ Seedream 4.5 (4K, text-in-image)',
    description: 'High-res 4K. Best-in-class text rendering inside images.',
    bestFor: ['posters', 'thumbnails', 'signs/text scenes', 'high detail'],
    cost: '$0.06',
    supportsRefs: false,
  },
  {
    id: FAL_MODELS.IMAGE_SEEDREAM_EDIT,
    name: 'Seedream 4.5 Edit',
    label: '🌟 Seedream 4.5 Edit (up to 10 refs)',
    description: 'Edit images with up to 10 reference images.',
    bestFor: ['complex composites', 'multi-element scenes'],
    cost: '$0.08',
    supportsRefs: true,
    maxRefs: 10,
  },
] as const;

export const VIDEO_MODEL_CATALOG = [
  {
    id: FAL_MODELS.VIDEO_KLING_O3_I2V,
    name: 'Kling O3 Pro (Image→Video)',
    label: '🎬 Kling O3 Pro Image-to-Video (default)',
    description: 'Premium quality. 3–15s. Native audio support.',
    cost: '$0.95',
    inputType: 'image',
  },
  {
    id: FAL_MODELS.VIDEO_KLING_O3_T2V,
    name: 'Kling O3 Pro (Text→Video)',
    label: '📝 Kling O3 Pro Text-to-Video',
    description: 'Generate video from text only, no input image needed.',
    cost: '$0.95',
    inputType: 'text',
  },
  {
    id: FAL_MODELS.VIDEO_KLING_O3_R2V,
    name: 'Kling O3 Pro (Reference→Video)',
    label: '🧬 Kling O3 Pro Reference-to-Video',
    description: 'Multi-character consistency with @Element tags.',
    cost: '$1.20',
    inputType: 'reference',
  },
] as const;

export const VOICE_MODEL_CATALOG = [
  {
    id: FAL_MODELS.VOICE_TTS,
    name: 'ElevenLabs TTS',
    label: '🗣️ ElevenLabs TTS (default)',
    description: 'Simple text-to-speech. Best for narration and voiceovers.',
    cost: '$0.03',
  },
  {
    id: FAL_MODELS.VOICE_DIALOGUE,
    name: 'ElevenLabs v3 Dialogue',
    label: '🎭 ElevenLabs v3 Dialogue (multi-speaker)',
    description: 'Multi-speaker dialogue with script format.',
    cost: '$0.05',
  },
] as const;

export const MUSIC_MODEL_CATALOG = [
  {
    id: FAL_MODELS.MUSIC,
    name: 'ElevenLabs Music',
    label: '🎵 ElevenLabs Music',
    description: 'AI-generated background music and soundtracks.',
    cost: '$0.10',
  },
] as const;

// ─── Cost estimates per model ──────────────────────────────────────

export function getModelCost(model: string): number {
  const costs: Record<string, number> = {
    [FAL_MODELS.IMAGE_NANO_BANANA]: 0.04,
    [FAL_MODELS.IMAGE_NANO_BANANA_EDIT]: 0.04,
    [FAL_MODELS.IMAGE_SEEDREAM]: 0.06,
    [FAL_MODELS.IMAGE_SEEDREAM_EDIT]: 0.08,
    [FAL_MODELS.VIDEO_KLING_O3_I2V]: 0.95,
    [FAL_MODELS.VIDEO_KLING_O3_T2V]: 0.95,
    [FAL_MODELS.VIDEO_KLING_O3_R2V]: 1.20,
    [FAL_MODELS.VOICE_TTS]: 0.03,
    [FAL_MODELS.VOICE_DIALOGUE]: 0.05,
    [FAL_MODELS.MUSIC]: 0.10,
  };
  return costs[model] || 0.05;
}

// ─── Smart model selection based on context ────────────────────────

export function pickImageModel(hasRefs: boolean, refCount: number, needsText: boolean): string {
  if (needsText) {
    return hasRefs && refCount > 0 ? FAL_MODELS.IMAGE_SEEDREAM_EDIT : FAL_MODELS.IMAGE_SEEDREAM;
  }
  if (hasRefs && refCount > 4) return FAL_MODELS.IMAGE_SEEDREAM_EDIT; // >4 refs = Seedream only
  if (hasRefs && refCount > 0) return FAL_MODELS.IMAGE_NANO_BANANA_EDIT;
  return FAL_MODELS.IMAGE_NANO_BANANA;
}

export function pickVideoModel(hasPhoto: boolean, hasRefs: boolean): string {
  if (hasRefs) return FAL_MODELS.VIDEO_KLING_O3_R2V;
  if (hasPhoto) return FAL_MODELS.VIDEO_KLING_O3_I2V;
  return FAL_MODELS.VIDEO_KLING_O3_T2V;
}
