import { NextRequest, NextResponse } from 'next/server';

// fal.ai + Cloudinary integration for the video pipeline
// These routes handle the actual generation calls

const FAL_API_KEY = process.env.FAL_API_KEY || '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

interface GenerateRequest {
  type: 'photo' | 'video' | 'voiceover' | 'element_reference';
  prompt: string;
  negativePrompt?: string;
  model?: string;
  duration?: number;
  firstFrameUrl?: string;
  elementRefs?: string[];
  width?: number;
  height?: number;
  voice?: string;
  text?: string;
  projectId?: string;
  sceneName?: string;
  shotId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    // If no fal.ai key, return demo data
    if (!FAL_API_KEY) {
      return NextResponse.json(getDemoResponse(body));
    }

    // Real fal.ai integration
    const result = await callFalAi(body);

    // Upload to Cloudinary if configured
    let cloudinaryUrl = result.url;
    if (CLOUDINARY_CLOUD_NAME && result.url) {
      cloudinaryUrl = await uploadToCloudinary(result.url, body);
    }

    return NextResponse.json({
      success: true,
      url: cloudinaryUrl,
      originalUrl: result.url,
      model: body.model,
      cost: result.cost || estimateCost(body),
      duration: result.duration,
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}

async function callFalAi(body: GenerateRequest) {
  const modelEndpoints: Record<string, string> = {
    // Photo models
    'flux-pro': 'fal-ai/flux-pro/v1.1',
    'flux-dev': 'fal-ai/flux/dev',
    // Video models
    'kling': 'fal-ai/kling-video/v2/master',
    'veo': 'fal-ai/veo2',
    'runway': 'fal-ai/runway-gen3/turbo/image-to-video',
    'hailuo': 'fal-ai/hailuo-ai/minimax-video-01',
    // TTS
    'elevenlabs': 'fal-ai/elevenlabs/tts',
    'playai-tts': 'fal-ai/playai/tts/v3',
  };

  const model = body.model || 'flux-pro';
  const endpoint = modelEndpoints[model] || modelEndpoints['flux-pro'];

  let input: Record<string, unknown> = {};

  if (body.type === 'photo' || body.type === 'element_reference') {
    input = {
      prompt: body.prompt,
      negative_prompt: body.negativePrompt,
      image_size: { width: body.width || 1920, height: body.height || 1080 },
      num_images: 1,
    };
  } else if (body.type === 'video') {
    input = {
      prompt: body.prompt,
      negative_prompt: body.negativePrompt,
      image_url: body.firstFrameUrl,
      duration: body.duration || 4,
    };
  } else if (body.type === 'voiceover') {
    input = {
      text: body.text || body.prompt,
      voice: body.voice || 'adam',
    };
  }

  const response = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error(`fal.ai error: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  
  // Extract URL based on response type
  let url = '';
  if (result.images?.[0]?.url) url = result.images[0].url;
  else if (result.video?.url) url = result.video.url;
  else if (result.audio?.url) url = result.audio.url;
  else if (result.output?.url) url = result.output.url;

  return { url, cost: result.cost, duration: result.duration };
}

async function uploadToCloudinary(url: string, body: GenerateRequest): Promise<string> {
  const folder = body.projectId
    ? `projects/${body.projectId}/${body.sceneName || 'misc'}/${body.shotId || 'asset'}`
    : 'projects/uploads';

  const resourceType = body.type === 'voiceover' ? 'video' : body.type === 'video' ? 'video' : 'image';

  const formData = new FormData();
  formData.append('file', url);
  formData.append('upload_preset', 'agentflow');
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    console.error('Cloudinary upload failed, using original URL');
    return url;
  }

  const result = await response.json();
  return result.secure_url;
}

function estimateCost(body: GenerateRequest): number {
  const costs: Record<string, number> = {
    'flux-pro': 0.05,
    'flux-dev': 0.025,
    'kling': 0.50,
    'veo': 0.50,
    'runway': 0.50,
    'hailuo': 0.30,
    'elevenlabs': 0.03,
    'playai-tts': 0.02,
  };
  return costs[body.model || 'flux-pro'] || 0.05;
}

function getDemoResponse(body: GenerateRequest) {
  const demoUrls: Record<string, string> = {
    photo: 'https://placehold.co/1920x1080/1a1a2e/6366f1?text=Generated+Photo',
    video: 'https://placehold.co/1920x1080/1a1a2e/ef4444?text=Generated+Video',
    voiceover: 'https://placehold.co/800x200/1a1a2e/22c55e?text=Generated+Audio',
    element_reference: 'https://placehold.co/1024x1024/1a1a2e/f59e0b?text=Element+Reference',
  };

  return {
    success: true,
    url: demoUrls[body.type] || demoUrls.photo,
    model: body.model || 'demo',
    cost: estimateCost(body),
    demo: true,
  };
}
