/**
 * Real Execution Engine — Calls fal.ai, Cloudinary, and other real APIs.
 * Each node type has a real executor that produces actual assets.
 */

import { fal } from '@fal-ai/client';
import { v2 as cloudinary } from 'cloudinary';
import { FAL_MODELS, getModelCost, pickImageModel, pickVideoModel } from './fal-models';
import { calculateCost as calcRealCost } from './fal-pricing';

// Types for execution context
export interface ExecutionContext {
  projectId: string;
  executionId: string;
  userId: string;
  nodeOutputs: Map<string, any>;
  edges: Array<{ source: string; target: string }>;
  emit: (event: ExecutionEvent) => void;
}

export interface ExecutionEvent {
  type: 'node_start' | 'node_end' | 'node_error' | 'log' | 'api_call' | 'asset_created' | 'workflow_done';
  nodeId?: string;
  nodeName?: string;
  data: any;
  duration?: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label: string;
    emoji: string;
    config: Record<string, any>;
  };
}

// Initialize fal.ai
function initFal() {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set — cannot run generation nodes');
  fal.config({ credentials: key });
}

// Initialize Cloudinary
function initCloudinary() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials not set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)');
  }
  cloudinary.config({ cloud_name: cloud, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

// Upload to Cloudinary — NEVER overwrite, always unique IDs
async function uploadToCloudinary(
  url: string,
  folder: string,
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ secure_url: string; public_id: string; width?: number; height?: number; bytes?: number; duration?: number }> {
  const cld = initCloudinary();
  // Append timestamp suffix to guarantee uniqueness even if caller sends same publicId
  const uniqueId = `${publicId}_${Date.now()}`;
  const result = await cld.uploader.upload(url, {
    folder,
    public_id: uniqueId,
    resource_type: resourceType,
    overwrite: false,  // CRITICAL: refuse to overwrite existing files
  });
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    duration: result.duration,
  };
}

// Get upstream outputs by type
function getUpstream(ctx: ExecutionContext, nodeId: string, nodeType?: string): any[] {
  const results: any[] = [];
  for (const edge of ctx.edges) {
    if (edge.target === nodeId) {
      const output = ctx.nodeOutputs.get(edge.source);
      if (output && (!nodeType || output._nodeType === nodeType)) {
        results.push(output);
      }
    }
  }
  return results;
}

// ─── Node Executors ────────────────────────────────────────────────

async function executeManualTrigger(node: WorkflowNode, ctx: ExecutionContext) {
  return { triggered: true, timestamp: new Date().toISOString(), _nodeType: 'manual_trigger' };
}

async function executeScheduleTrigger(node: WorkflowNode, ctx: ExecutionContext) {
  return { triggered: true, schedule: node.data.config.schedule || 'manual', _nodeType: 'schedule_trigger' };
}

async function executeElementReference(node: WorkflowNode, ctx: ExecutionContext) {
  initFal();
  const { element_name, description, model } = node.data.config;
  const elementName = element_name || 'Element';
  const prompt = description || `High quality reference image of ${elementName}`;
  const falModel = model || FAL_MODELS.IMAGE_NANO_BANANA;

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🎨 Generating reference for "${elementName}" via ${falModel}...` } });
  ctx.emit({ type: 'api_call', nodeId: node.id, data: { service: 'fal.ai', model: falModel, prompt } });

  const result = await fal.subscribe(falModel, {
    input: {
      prompt,
      num_images: 1,
      image_size: 'landscape_16_9',
      enable_safety_checker: false,
    },
  });

  const imageUrl = (result as any).data?.images?.[0]?.url || (result as any).images?.[0]?.url;
  if (!imageUrl) throw new Error(`No image returned from fal.ai for element "${elementName}"`);

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📤 Uploading to Cloudinary...` } });

  const cldResult = await uploadToCloudinary(
    imageUrl,
    `agentflow/${ctx.projectId}/elements`,
    elementName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    'image'
  );

  const realCost = calcRealCost(falModel, { numImages: 1 });
  ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'image', url: cldResult.secure_url, name: elementName, cost: realCost } });

  return {
    _nodeType: 'element_reference',
    elementName,
    imageUrl: cldResult.secure_url,
    cloudinaryId: cldResult.public_id,
    width: cldResult.width,
    height: cldResult.height,
    model: falModel,
    cost: realCost,
  };
}

async function executePhotoGenerator(node: WorkflowNode, ctx: ExecutionContext) {
  initFal();
  const { prompt, negative_prompt, model, scene_number, shot_number, sceneNumber, shotNumber } = node.data.config;
  
  // CONNECTIONS ARE THE ONLY SOURCE OF TRUTH for element references
  // Never read from config.elementRefs — only from upstream graph edges
  const elementRefs = getUpstream(ctx, node.id, 'element_reference');
  const hasRefs = elementRefs.length > 0;
  const referenceUrls = elementRefs.map((r: any) => r.imageUrl).filter(Boolean);
  
  ctx.emit({ type: 'log', nodeId: node.id, data: { 
    message: `📸 Found ${elementRefs.length} connected element refs: ${elementRefs.map((r: any) => r.elementName || 'unnamed').join(', ') || 'none'}` 
  }});
  
  const falModel = model || pickImageModel(hasRefs, elementRefs.length, false);
  // Accept both snake_case and camelCase config keys
  const sceneNum = scene_number || sceneNumber || 1;
  const shotNum = shot_number || shotNumber || 1;
  const finalPrompt = prompt || 'A beautiful scene';

  // Validate prompt
  if (!finalPrompt || finalPrompt.trim().length < 3) {
    throw new Error(`Photo prompt is empty or too short: "${finalPrompt}". Provide a descriptive prompt.`);
  }
  
  // Validate: edit model requires connected element refs
  if (falModel.includes('/edit') && referenceUrls.length === 0) {
    ctx.emit({ type: 'log', nodeId: node.id, data: { 
      message: `⚠️ Edit model ${falModel} requires connected Element Reference nodes but found none. Falling back to non-edit model.` 
    }});
  }
  
  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📸 Generating photo for Scene ${sceneNum}, Shot ${shotNum} via ${falModel}...` } });
  ctx.emit({ type: 'api_call', nodeId: node.id, data: { service: 'fal.ai', model: falModel, prompt: finalPrompt, elementRefs: referenceUrls.length } });

  const input: any = {
    prompt: finalPrompt,
    num_images: 1,
    image_size: 'landscape_16_9',
    enable_safety_checker: false,
  };
  if (negative_prompt) input.negative_prompt = negative_prompt;
  
  // Pass element reference images to fal.ai for /edit models
  if (referenceUrls.length > 0 && falModel.includes('/edit')) {
    input.image_urls = referenceUrls;
    ctx.emit({ type: 'log', nodeId: node.id, data: { 
      message: `🔗 Passing ${referenceUrls.length} reference image(s) to ${falModel}` 
    }});
  }

  // Fix 4: Log full request body on error
  let result: any;
  try {
    result = await fal.subscribe(falModel, { input });
  } catch (err: any) {
    ctx.emit({ type: 'log', nodeId: node.id, data: { 
      message: `❌ fal.ai photo request FAILED. Model: ${falModel}, Input: ${JSON.stringify(input, null, 2)}`,
      error: err.message,
      body: err.body || err.response || null,
    }});
    throw new Error(`fal.ai photo generation failed (${falModel}): ${err.message}`);
  }

  const imageUrl = (result as any).data?.images?.[0]?.url || (result as any).images?.[0]?.url;
  if (!imageUrl) throw new Error('No photo URL returned from fal.ai');

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📤 Uploading photo to Cloudinary (scene-${sceneNum}/shot-${shotNum})...` } });

  // Fix 1: Unique path per scene/shot/execution
  const cldResult = await uploadToCloudinary(
    imageUrl,
    `agentflow/${ctx.executionId}/scene-${sceneNum}/shot-${shotNum}`,
    'photo',
    'image'
  );

  ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'photo', url: cldResult.secure_url, scene: sceneNum, shot: shotNum } });

  return {
    _nodeType: 'photo_generator',
    photoUrl: cldResult.secure_url,
    cloudinaryId: cldResult.public_id,
    sceneNumber: sceneNum,
    shotNumber: shotNum,
    width: cldResult.width,
    height: cldResult.height,
    cost: calcRealCost(falModel, { numImages: 1 }),
  };
}

// Fix 3: Find photo by matching scene+shot across all completed outputs
function findPhotoBySceneShot(ctx: ExecutionContext, sceneNum: number, shotNum: number): string | null {
  for (const [, output] of ctx.nodeOutputs) {
    if (output._nodeType === 'photo_generator' && output.photoUrl &&
        output.sceneNumber === sceneNum && output.shotNumber === shotNum) {
      return output.photoUrl;
    }
  }
  // Also check element references as fallback
  for (const [, output] of ctx.nodeOutputs) {
    if (output._nodeType === 'element_reference' && output.imageUrl) {
      return output.imageUrl;
    }
  }
  return null;
}

async function executeVideoGenerator(node: WorkflowNode, ctx: ExecutionContext) {
  initFal();
  const { prompt, negative_prompt, duration, model, scene_number, shot_number, sceneNumber, shotNumber } = node.data.config;
  // Accept both snake_case and camelCase
  const sceneNum = scene_number || sceneNumber || 1;
  const shotNum = shot_number || shotNumber || 1;
  const videoDuration = duration || 5;

  // Fix 3: Smart photo lookup — first try edges, then scene/shot match
  const upstreamPhotos = getUpstream(ctx, node.id, 'photo_generator');
  const upstreamRefs = getUpstream(ctx, node.id, 'element_reference');
  let sourceImageUrl = upstreamPhotos[0]?.photoUrl;

  if (!sourceImageUrl) {
    // Try any upstream with a photo URL
    const anyUpstream = getUpstream(ctx, node.id);
    sourceImageUrl = anyUpstream.find(u => u.photoUrl)?.photoUrl || anyUpstream.find(u => u.imageUrl)?.imageUrl;
  }

  if (!sourceImageUrl) {
    // Fix 3: Fallback — find by matching scene+shot in ALL completed outputs
    ctx.emit({ type: 'log', nodeId: node.id, data: { message: `⚠️ No upstream photo via edges — searching by scene ${sceneNum}, shot ${shotNum}...` } });
    sourceImageUrl = findPhotoBySceneShot(ctx, sceneNum, shotNum);
    if (sourceImageUrl) {
      ctx.emit({ type: 'log', nodeId: node.id, data: { message: `✅ Found matching photo by scene/shot lookup` } });
    }
  }

  if (!sourceImageUrl) {
    throw new Error(`Video for scene ${sceneNum} shot ${shotNum}: no photo found. Check that a photo_generator with matching sceneNumber/shotNumber exists and is connected.`);
  }

  const falModel = model || pickVideoModel(!!sourceImageUrl, upstreamRefs.length > 0);

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🎬 Generating ${videoDuration}s video for Scene ${sceneNum}, Shot ${shotNum} via ${falModel}...` } });
  ctx.emit({ type: 'api_call', nodeId: node.id, data: { service: 'fal.ai', model: falModel, duration: videoDuration } });

  const input: any = {
    prompt: prompt || 'Cinematic motion',
    image_url: sourceImageUrl,
    duration: String(videoDuration),
    aspect_ratio: '16:9',
  };
  if (negative_prompt) input.negative_prompt = negative_prompt;

  // Fix 4: Log full request body on error
  let result: any;
  try {
    result = await fal.subscribe(falModel, { input });
  } catch (err: any) {
    ctx.emit({ type: 'log', nodeId: node.id, data: {
      message: `❌ fal.ai video request FAILED. Model: ${falModel}, Input: ${JSON.stringify(input, null, 2)}`,
      error: err.message,
    }});
    throw new Error(`fal.ai video generation failed (${falModel}): ${err.message}`);
  }

  const videoUrl = (result as any).data?.video?.url || (result as any).video?.url;
  if (!videoUrl) throw new Error('No video URL returned from fal.ai');

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📤 Uploading video to Cloudinary (scene-${sceneNum}/shot-${shotNum})...` } });

  // Fix 1: Unique path per execution
  const cldResult = await uploadToCloudinary(
    videoUrl,
    `agentflow/${ctx.executionId}/scene-${sceneNum}/shot-${shotNum}`,
    'video',
    'video'
  );

  ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'video', url: cldResult.secure_url, scene: sceneNum, shot: shotNum } });

  return {
    _nodeType: 'video_generator',
    videoUrl: cldResult.secure_url,
    cloudinaryId: cldResult.public_id,
    sceneNumber: sceneNum,
    shotNumber: shotNum,
    duration: videoDuration,
    cost: calcRealCost(falModel, { durationSeconds: videoDuration }),
  };
}

async function executeVoiceoverGenerator(node: WorkflowNode, ctx: ExecutionContext) {
  initFal();
  const { text, voice, model } = node.data.config;
  const falModel = model || FAL_MODELS.VOICE_DIALOGUE;

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🗣️ Generating voiceover...` } });

  try {
    const result = await fal.subscribe(falModel, {
      input: {
        text: text || 'Hello, welcome to the video.',
        voice: voice || 'en-US-1',
      },
    });

    const audioUrl = (result as any).data?.audio?.url || (result as any).audio?.url || (result as any).data?.audio_url?.url;
    if (!audioUrl) {
      ctx.emit({ type: 'log', nodeId: node.id, data: { message: `⚠️ No audio URL returned, skipping voiceover` } });
      return { _nodeType: 'voiceover_generator', audioUrl: null, cost: 0 };
    }

    const cldResult = await uploadToCloudinary(audioUrl, `agentflow/${ctx.projectId}/audio`, `voiceover_${Date.now()}`, 'video');
    ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'audio', url: cldResult.secure_url } });

    return { _nodeType: 'voiceover_generator', audioUrl: cldResult.secure_url, cloudinaryId: cldResult.public_id, cost: calcRealCost(falModel) };
  } catch (err: any) {
    ctx.emit({ type: 'log', nodeId: node.id, data: { message: `⚠️ Voiceover failed: ${err.message}` } });
    return { _nodeType: 'voiceover_generator', audioUrl: null, cost: 0 };
  }
}

async function executeImageGen(node: WorkflowNode, ctx: ExecutionContext) {
  initFal();
  const { prompt, model } = node.data.config;
  const falModel = model || FAL_MODELS.IMAGE_NANO_BANANA;

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🖼️ Generating image via ${falModel}...` } });

  const result = await fal.subscribe(falModel, {
    input: { prompt: prompt || 'A beautiful image', num_images: 1, image_size: 'landscape_16_9' },
  });

  const imageUrl = (result as any).data?.images?.[0]?.url || (result as any).images?.[0]?.url;
  if (!imageUrl) throw new Error('No image URL returned');

  const cldResult = await uploadToCloudinary(imageUrl, `agentflow/${ctx.projectId}/images`, `img_${Date.now()}`, 'image');
  ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'image', url: cldResult.secure_url } });

  return { _nodeType: 'image_gen', imageUrl: cldResult.secure_url, cloudinaryId: cldResult.public_id, model: falModel, cost: calcRealCost(falModel, { numImages: 1 }) };
}

async function executeClaudeChat(node: WorkflowNode, ctx: ExecutionContext) {
  const { prompt, model } = node.data.config;

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🧠 Calling Claude AI...` } });

  // Use Supabase proxy or direct API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt || 'Hello!' }],
        model: model || 'claude-sonnet-4-6',
        max_tokens: 2048,
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || 'No response';
    return { _nodeType: 'claude_chat', response: text, cost: 0.003 };
  }

  return { _nodeType: 'claude_chat', response: 'Claude API not configured', cost: 0 };
}

async function executeProjectOrchestrator(node: WorkflowNode, ctx: ExecutionContext) {
  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🎯 Orchestrating project assets...` } });
  
  // Collect all outputs from upstream nodes
  const allOutputs = Array.from(ctx.nodeOutputs.values());
  const photos = allOutputs.filter(o => o._nodeType === 'photo_generator');
  const videos = allOutputs.filter(o => o._nodeType === 'video_generator');
  const elements = allOutputs.filter(o => o._nodeType === 'element_reference');
  const voiceovers = allOutputs.filter(o => o._nodeType === 'voiceover_generator');

  ctx.emit({ type: 'log', nodeId: node.id, data: { 
    message: `📊 Found ${elements.length} elements, ${photos.length} photos, ${videos.length} videos, ${voiceovers.length} voiceovers` 
  }});

  return {
    _nodeType: 'project_orchestrator',
    summary: {
      elements: elements.length,
      photos: photos.length,
      videos: videos.length,
      voiceovers: voiceovers.length,
    },
    assets: { elements, photos, videos, voiceovers },
    cost: 0,
  };
}

async function executeFinalVideoCompiler(node: WorkflowNode, ctx: ExecutionContext) {
  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🎞️ Compiling final video...` } });

  // Get all video URLs from upstream — sort by scene+shot order
  const allOutputs = Array.from(ctx.nodeOutputs.values());
  const videos = allOutputs
    .filter(o => o._nodeType === 'video_generator' && o.videoUrl)
    .sort((a, b) => {
      const sa = (a.sceneNumber || 1) * 1000 + (a.shotNumber || 0);
      const sb = (b.sceneNumber || 1) * 1000 + (b.shotNumber || 0);
      return sa - sb;
    });

  if (videos.length === 0) {
    ctx.emit({ type: 'log', nodeId: node.id, data: { message: `⚠️ No videos found to compile` } });
    return { _nodeType: 'final_video_compiler', finalVideoUrl: null, cost: 0 };
  }

  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📹 Found ${videos.length} video clips to merge` } });

  // Single video — just use it directly
  if (videos.length === 1) {
    ctx.emit({ type: 'asset_created', nodeId: node.id, data: { type: 'final_video', url: videos[0].videoUrl } });
    return { _nodeType: 'final_video_compiler', finalVideoUrl: videos[0].videoUrl, videoCount: 1, cost: 0 };
  }

  // Multiple videos — try Cloudinary splice then upload as new asset
  try {
    const cld = initCloudinary();
    const videoIds = videos.map(v => v.cloudinaryId).filter(Boolean);

    if (videoIds.length >= 2) {
      ctx.emit({ type: 'log', nodeId: node.id, data: { message: `🔗 Splicing ${videoIds.length} clips via Cloudinary...` } });

      // Build Cloudinary splice URL
      const baseId = videoIds[0];
      const spliceOverlays = videoIds.slice(1).map(id => `fl_splice,l_video:${id.replace(/\//g, ':')}`).join('/');
      const spliceUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${spliceOverlays}/${baseId}.mp4`;

      // Upload the spliced URL as a NEW video asset (forces Cloudinary to render it)
      const folder = `workflows/${ctx.projectId}/run-${ctx.executionId}`;
      const finalResult = await cld.uploader.upload(spliceUrl, {
        folder,
        public_id: 'final',
        resource_type: 'video',
        overwrite: true,
      });

      const finalUrl = finalResult.secure_url;
      const totalDuration = videos.reduce((sum: number, v: any) => sum + (v.duration || 0), 0);

      ctx.emit({ type: 'log', nodeId: node.id, data: { message: `✅ Final video merged: ${finalUrl}` } });
      ctx.emit({ type: 'asset_created', nodeId: node.id, data: {
        type: 'final_video',
        url: finalUrl,
        cloudinaryId: finalResult.public_id,
        duration: totalDuration,
        clipCount: videos.length,
        tags: ['final'],
      }});

      return {
        _nodeType: 'final_video_compiler',
        finalVideoUrl: finalUrl,
        cloudinaryId: finalResult.public_id,
        videoCount: videos.length,
        duration: totalDuration,
        cost: 0,
      };
    }
  } catch (err: any) {
    ctx.emit({ type: 'log', nodeId: node.id, data: { message: `⚠️ Cloudinary splice failed: ${err.message}` } });

    // Fallback: return the individual videos as a playlist
    ctx.emit({ type: 'log', nodeId: node.id, data: { message: `📋 Falling back to individual clips list (${videos.length} clips)` } });
    const clipUrls = videos.map((v: any) => v.videoUrl);
    return {
      _nodeType: 'final_video_compiler',
      finalVideoUrl: clipUrls[0],
      allClipUrls: clipUrls,
      videoCount: videos.length,
      spliceError: err.message,
      cost: 0,
    };
  }

  return { _nodeType: 'final_video_compiler', finalVideoUrl: videos[0].videoUrl, videoCount: videos.length, cost: 0 };
}

// Passthrough nodes
async function executePassthrough(node: WorkflowNode, ctx: ExecutionContext) {
  ctx.emit({ type: 'log', nodeId: node.id, data: { message: `✅ ${node.data.label} — passed through` } });
  const upstream = getUpstream(ctx, node.id);
  return { _nodeType: node.data.type, ...(upstream[0] || {}), passthrough: true };
}

// ─── Executor Registry ──────────────────────────────────────────────

const EXECUTORS: Record<string, (node: WorkflowNode, ctx: ExecutionContext) => Promise<any>> = {
  manual_trigger: executeManualTrigger,
  schedule_trigger: executeScheduleTrigger,
  webhook_trigger: executeManualTrigger,
  element_reference: executeElementReference,
  photo_generator: executePhotoGenerator,
  video_generator: executeVideoGenerator,
  voiceover_generator: executeVoiceoverGenerator,
  image_gen: executeImageGen,
  video_gen: executeVideoGenerator,
  voice_gen: executeVoiceoverGenerator,
  claude_chat: executeClaudeChat,
  project_orchestrator: executeProjectOrchestrator,
  final_video_compiler: executeFinalVideoCompiler,
  script_parser: executePassthrough,
  // Fallbacks for unsupported types
  send_email: executePassthrough,
  send_telegram: executePassthrough,
  post_x: executePassthrough,
  post_instagram: executePassthrough,
  post_linkedin: executePassthrough,
  post_tiktok: executePassthrough,
  http_request: executePassthrough,
  web_search: executePassthrough,
  web_scraper: executePassthrough,
  file_read: executePassthrough,
  file_write: executePassthrough,
  file_generate: executePassthrough,
  if_else: executePassthrough,
  loop: executePassthrough,
  wait: executePassthrough,
};

// ─── Topological Sort ───────────────────────────────────────────────

function topologicalSort(nodes: WorkflowNode[], edges: Array<{ source: string; target: string }>): WorkflowNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeMap = new Map<string, WorkflowNode>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    const targets = adjacency.get(edge.source);
    if (targets) targets.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);

    for (const target of (adjacency.get(id) || [])) {
      const newDegree = (inDegree.get(target) || 1) - 1;
      inDegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    }
  }

  return sorted;
}

// ─── Main Execution Function ────────────────────────────────────────

export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: Array<{ source: string; target: string }>,
  emit: (event: ExecutionEvent) => void
): Promise<{ success: boolean; totalCost: number; assets: any[]; errors: string[] }> {
  const projectId = `proj_${Date.now()}`;
  const executionId = `exec_${Date.now()}`;
  const ctx: ExecutionContext = {
    projectId,
    executionId,
    userId: 'local',
    nodeOutputs: new Map(),
    edges,
    emit,
  };

  const sorted = topologicalSort(nodes, edges);
  let totalCost = 0;
  const allAssets: any[] = [];
  const errors: string[] = [];

  emit({ type: 'log', data: { message: `▶️ Starting workflow execution: ${sorted.length} nodes` } });

  for (const node of sorted) {
    const nodeType = node.data.type;
    const executor = EXECUTORS[nodeType];

    if (!executor) {
      emit({ type: 'log', nodeId: node.id, nodeName: `${node.data.emoji} ${node.data.label}`, data: { message: `⚠️ No executor for type "${nodeType}", skipping` } });
      continue;
    }

    const startTime = Date.now();
    emit({ type: 'node_start', nodeId: node.id, nodeName: `${node.data.emoji} ${node.data.label}`, data: { type: nodeType } });

    try {
      const output = await executor(node, ctx);
      const duration = Date.now() - startTime;
      ctx.nodeOutputs.set(node.id, output);
      totalCost += output.cost || 0;

      if (output.imageUrl || output.photoUrl || output.videoUrl || output.audioUrl || output.finalVideoUrl) {
        allAssets.push({ nodeId: node.id, ...output });
      }

      emit({
        type: 'node_end',
        nodeId: node.id,
        nodeName: `${node.data.emoji} ${node.data.label}`,
        data: { output: { ...output, _nodeType: undefined } },
        duration,
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      errors.push(`${node.data.label}: ${err.message}`);
      emit({
        type: 'node_error',
        nodeId: node.id,
        nodeName: `${node.data.emoji} ${node.data.label}`,
        data: { error: err.message },
        duration,
      });
      // Continue execution — don't stop on single node failure
    }
  }

  emit({
    type: 'workflow_done',
    data: {
      success: errors.length === 0,
      totalCost: Math.round(totalCost * 100) / 100,
      assetCount: allAssets.length,
      nodeCount: sorted.length,
      errors,
    },
  });

  return { success: errors.length === 0, totalCost, assets: allAssets, errors };
}
