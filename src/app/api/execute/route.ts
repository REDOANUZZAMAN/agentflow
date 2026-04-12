import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeWorkflow, type ExecutionEvent } from '@/lib/execution-engine';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nodes, edges, workflowId, userId } = body;

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return new Response(JSON.stringify({ error: 'No nodes to execute' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check required env vars
  const missingVars: string[] = [];
  const hasGenerationNodes = nodes.some((n: any) =>
    ['element_reference', 'photo_generator', 'video_generator', 'voiceover_generator', 'image_gen', 'video_gen', 'voice_gen'].includes(n.data?.type)
  );
  if (hasGenerationNodes && !process.env.FAL_API_KEY) missingVars.push('FAL_API_KEY');
  if (hasGenerationNodes && !process.env.CLOUDINARY_CLOUD_NAME) missingVars.push('CLOUDINARY_CLOUD_NAME');

  if (missingVars.length > 0) {
    return new Response(JSON.stringify({
      error: `Missing environment variables: ${missingVars.join(', ')}. Set them in .env.local to run real generation.`,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Create execution record in Supabase (if we have workflowId + userId)
  let executionId: string | null = null;
  const startedAt = new Date();
  if (workflowId && userId) {
    try {
      const { data: execRow } = await supabaseAdmin.from('executions').insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'running',
        started_at: startedAt.toISOString(),
        steps: [],
        cost: 0,
      }).select('id').single();
      if (execRow) executionId = execRow.id;
    } catch (err) {
      console.warn('Could not create execution record:', err);
    }
  }

  const encoder = new TextEncoder();
  const executionSteps: any[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch { /* stream may have closed */ }
      };

      const emit = (event: ExecutionEvent) => {
        const timestamped = { ...event, timestamp: new Date().toISOString() };
        send('execution', timestamped);

        // Collect steps for later persistence
        if (event.type === 'node_end' || event.type === 'node_error') {
          executionSteps.push({
            nodeId: event.nodeId,
            nodeName: event.nodeName,
            type: event.type,
            data: event.data,
            duration: event.duration,
            timestamp: timestamped.timestamp,
          });
        }
      };

      try {
        send('status', { phase: 'starting', message: 'Starting workflow execution...', executionId });

        const result = await executeWorkflow(nodes, edges, emit);

        send('result', {
          success: result.success,
          totalCost: result.totalCost,
          assets: result.assets.map(a => ({
            nodeId: a.nodeId,
            type: a._nodeType,
            imageUrl: a.imageUrl || a.photoUrl,
            videoUrl: a.videoUrl || a.finalVideoUrl,
            audioUrl: a.audioUrl,
            elementName: a.elementName,
          })),
          errors: result.errors,
        });

        // Update execution record with final status
        if (executionId) {
          try {
            const completedAt = new Date();
            await supabaseAdmin.from('executions').update({
              status: result.success ? 'completed' : 'failed',
              completed_at: completedAt.toISOString(),
              duration_ms: completedAt.getTime() - startedAt.getTime(),
              cost: result.totalCost || 0,
              steps: executionSteps,
              error: result.errors?.length ? result.errors.join('; ') : null,
            }).eq('id', executionId);
          } catch (err) {
            console.warn('Could not update execution record:', err);
          }
        }

        // Save generated assets to the assets table
        if (userId && result.assets && result.assets.length > 0) {
          for (const asset of result.assets) {
            try {
              const url = asset.imageUrl || asset.photoUrl || asset.videoUrl || asset.finalVideoUrl || asset.audioUrl;
              if (!url) continue;

              let assetType: 'photo' | 'video' | 'audio' | 'other' = 'other';
              if (asset.imageUrl || asset.photoUrl) assetType = 'photo';
              else if (asset.videoUrl || asset.finalVideoUrl) assetType = 'video';
              else if (asset.audioUrl) assetType = 'audio';

              const filename = asset.elementName
                ? `${asset.elementName}_${assetType}`
                : `${asset._nodeType || assetType}_${Date.now()}`;

              await supabaseAdmin.from('assets').insert({
                user_id: userId,
                workflow_id: workflowId || null,
                execution_id: executionId || null,
                type: assetType,
                cloudinary_public_id: asset.cloudinaryPublicId || asset.public_id || null,
                cloudinary_url: url,
                thumbnail_url: asset.thumbnailUrl || (assetType === 'photo' ? url : assetType === 'video' ? url.replace('/video/upload/', '/video/upload/so_0,w_400,h_300,c_fill,f_jpg/').replace(/\.\w+$/, '.jpg') : null),
                filename: filename,
                scene: asset.scene || null,
                shot: asset.shot || null,
                prompt: asset.prompt || null,
                negative_prompt: asset.negativePrompt || null,
                model: asset.model || null,
                cost: asset.cost || 0,
                duration_seconds: asset.duration || null,
                file_size: asset.bytes || null,
                width: asset.width || null,
                height: asset.height || null,
                status: 'ready',
              });
            } catch (err) {
              console.warn('Could not save asset:', err);
            }
          }
        }

      } catch (err: any) {
        send('error', { message: err.message || 'Execution failed' });

        // Mark execution as failed
        if (executionId) {
          try {
            await supabaseAdmin.from('executions').update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt.getTime(),
              steps: executionSteps,
              error: err.message || 'Execution failed',
            }).eq('id', executionId);
          } catch { /* ignore */ }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
