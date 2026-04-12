import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/compile — Final Video Compiler
 *
 * Takes a project manifest and produces a single merged MP4.
 * Default mode: builds a Cloudinary URL using fl_splice transformations.
 * Advanced mode: would dispatch to FFmpeg via BullMQ worker.
 */

interface CompileRequest {
  projectId: string;
  transition?: 'cut' | 'fade' | 'dissolve' | 'wipe';
  backgroundMusicUrl?: string;
  addCaptions?: boolean;
  outputResolution?: string;
  outputFormat?: 'mp4' | 'webm' | 'mov';
  mode?: 'cloudinary' | 'ffmpeg';
  // For demo: inline manifest
  manifest?: {
    scenes: {
      name: string;
      shots: {
        id: string;
        videoUrl: string;
        voiceoverUrl?: string;
        voiceoverText?: string;
        duration: number;
      }[];
    }[];
  };
}

interface CompileStep {
  step: string;
  detail: string;
  progress: number; // 0-100
  timestamp: string;
}

export async function POST(req: NextRequest) {
  const body: CompileRequest = await req.json();
  const {
    projectId,
    transition = 'cut',
    backgroundMusicUrl,
    addCaptions = false,
    outputResolution = '1920x1080',
    outputFormat = 'mp4',
    mode = 'cloudinary',
  } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Simulate the compilation pipeline
  const steps: CompileStep[] = [];
  const totalShots = 17; // Demo: 17-shot video
  const [width, height] = outputResolution.split('x').map(Number);

  // Step 1: Pull manifest
  steps.push({
    step: 'pull_manifest',
    detail: `Loading project manifest for ${projectId}...`,
    progress: 5,
    timestamp: new Date().toISOString(),
  });

  // Step 2: Validate assets
  steps.push({
    step: 'validate_assets',
    detail: `Validating ${totalShots} shot videos and voiceovers...`,
    progress: 10,
    timestamp: new Date().toISOString(),
  });

  // Step 3-19: Process each shot
  for (let i = 1; i <= totalShots; i++) {
    const progress = 10 + Math.round((i / totalShots) * 70);
    steps.push({
      step: `merge_shot_${i}`,
      detail: `Merging shot ${i}/${totalShots}... ${transition !== 'cut' ? `(${transition} transition)` : ''}`,
      progress,
      timestamp: new Date().toISOString(),
    });
  }

  // Step 20: Audio mix
  if (backgroundMusicUrl) {
    steps.push({
      step: 'audio_mix',
      detail: 'Mixing background music at low volume...',
      progress: 85,
      timestamp: new Date().toISOString(),
    });
  }

  // Step 21: Captions
  if (addCaptions) {
    steps.push({
      step: 'burn_captions',
      detail: 'Burning captions from voiceover text...',
      progress: 90,
      timestamp: new Date().toISOString(),
    });
  }

  // Step 22: Encode
  steps.push({
    step: 'encode',
    detail: `Encoding final ${outputFormat.toUpperCase()} at ${width}×${height}...`,
    progress: 95,
    timestamp: new Date().toISOString(),
  });

  // Step 23: Upload
  steps.push({
    step: 'upload',
    detail: `Uploading to Cloudinary at /projects/${projectId}/final.${outputFormat}...`,
    progress: 98,
    timestamp: new Date().toISOString(),
  });

  // Final result
  const totalDuration = totalShots * 4.2; // ~4.2s per shot avg
  const fileSize = Math.round(totalDuration * 2.5 * 1024 * 1024); // ~2.5 MB/s bitrate

  // Build Cloudinary URL
  const cloudinaryBase = 'https://res.cloudinary.com/demo/video/upload';
  let compilationUrl: string;

  if (mode === 'cloudinary') {
    // Cloudinary fl_splice approach: chain transformations
    const spliceTransforms = [];
    for (let i = 1; i <= totalShots; i++) {
      const scene = Math.ceil(i / 3.4);
      const shot = ((i - 1) % 3) + 1;
      spliceTransforms.push(
        `fl_splice,l_video:projects:${projectId}:scene-${scene}:s${scene}-shot${shot}:video`
      );
    }

    // Add transition effect
    const transitionEffect = transition === 'fade' ? '/e_fade:500' :
      transition === 'dissolve' ? '/e_fade:300' :
      transition === 'wipe' ? '/e_transition:wipe' : '';

    compilationUrl = `${cloudinaryBase}/${transitionEffect ? transitionEffect + '/' : ''}w_${width},h_${height},c_fill/${spliceTransforms.slice(0, 3).join('/')}` +
      `/projects/${projectId}/final.${outputFormat}`;
  } else {
    // FFmpeg mode - would dispatch to BullMQ worker
    compilationUrl = `${cloudinaryBase}/w_${width},h_${height},c_fill/projects/${projectId}/final.${outputFormat}`;
  }

  // Demo: use a placeholder video URL
  const finalVideoUrl = `https://placehold.co/${width}x${height}/1a1a2e/ef4444.${outputFormat === 'mp4' ? 'png' : 'png'}?text=🎬+Final+Video+(${Math.round(totalDuration)}s)`;

  const result = {
    success: true,
    projectId,
    finalVideoUrl,
    cloudinaryUrl: compilationUrl,
    cloudinaryPublicId: `projects/${projectId}/final`,
    duration: Math.round(totalDuration * 10) / 10,
    fileSize,
    fileSizeFormatted: `${(fileSize / (1024 * 1024)).toFixed(1)} MB`,
    resolution: `${width}×${height}`,
    format: outputFormat,
    transition,
    mode,
    totalShots,
    hasCaptions: addCaptions,
    hasBackgroundMusic: !!backgroundMusicUrl,
    compilationSteps: steps,
    completedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}

// GET /api/compile?projectId=xxx — check compilation status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId query param required' }, { status: 400 });
  }

  // Demo: return a completed status
  return NextResponse.json({
    projectId,
    status: 'completed',
    finalVideoUrl: `https://placehold.co/1920x1080/1a1a2e/ef4444.png?text=🎬+Final+Video`,
    duration: 71.4,
    fileSize: 187_170_816,
    completedAt: new Date().toISOString(),
  });
}
