import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase-server';
import { executeWorkflow, type ExecutionEvent } from '@/lib/execution-engine';
import { estimateWorkflowCost } from '@/lib/fal-pricing';
import { applyDefaults } from '@/lib/node-defaults';
import { getUsage, reserve, settle, diskStatus, allowanceFor } from '@/lib/usage';
import { registerRun, finishRun } from '@/lib/run-registry';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GENERATION_TYPES = ['element_reference', 'photo_generator', 'video_generator', 'voiceover_generator', 'image_gen', 'video_gen', 'voice_gen'];

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// The live `executions` table has: id, workflow_id, user_id, status, started_at, completed_at, cost, events,
// and its status check only allows 'running' | 'success' | 'error' (see DbExecution in lib/supabase.ts).
// Steps and the error message are kept inside `events`; a stopped run is 'error' with "Stopped by user".
async function finishExecution(id: string, outcome: 'completed' | 'failed' | 'cancelled', cost: number, steps: any[], error: string | null) {
  const { error: dbErr } = await supabaseAdmin.from('executions').update({
    status: outcome === 'completed' ? 'success' : 'error',
    completed_at: new Date().toISOString(),
    cost,
    events: { steps, error: outcome === 'cancelled' ? 'Stopped by user' : error },
  }).eq('id', id);
  if (dbErr) console.warn('Could not update execution record:', dbErr.message);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const userId = user.id;

  const body = await req.json();
  const { nodes, edges, workflowId } = body;

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return json({ error: 'No nodes to execute' }, 400);
  }

  // Every run belongs to one of the user's workflows, so it is recorded and counted
  if (!workflowId) {
    return json({ error: 'Open a saved workflow to run it.' }, 400);
  }
  const { data: owned } = await supabaseAdmin
    .from('workflows').select('id').eq('id', workflowId).eq('user_id', userId).maybeSingle();
  if (!owned) return json({ error: 'Workflow not found' }, 404);

  const hasGenerationNodes = nodes.some((n: any) => GENERATION_TYPES.includes(n.data?.type));

  // Required configuration (placeholder values from .env.example count as missing)
  const isUnset = (v?: string) => !v || /^your_/i.test(v) || v.endsWith('...') || v === '123456789012345';
  if (hasGenerationNodes) {
    const missingVars = ['FAL_API_KEY', 'PUBLIC_BASE_URL'].filter(k => isUnset(process.env[k]));
    if (missingVars.length > 0) {
      return json({
        error: `Can't generate photos/videos/audio yet — these keys are missing or still the example placeholder: ${missingVars.join(', ')}. Add the real values in .env.local and restart.`,
      }, 400);
    }

    const disk = await diskStatus();
    if (!disk.ok) {
      return json({
        error: `The server is almost out of disk space (${disk.freeGb} GB free, needs ${disk.minFreeGb} GB). Delete old workflows or free up space, then try again.`,
      }, 507);
    }
  }

  // Daily free allowance: hold the estimated cost before starting
  // Same defaults the engine applies, so the estimate matches what will really run
  const estimate = estimateWorkflowCost(
    nodes.map((n: any) => ({ data: { type: n.data?.type, config: applyDefaults(n.data?.type, n.data?.config || {}) as Record<string, any> } })),
  ).total;
  const runKey = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (reserve(userId, user.email, runKey, estimate) === null) {
    const usage = getUsage(userId, user.email);
    return json({
      error: `This run needs about $${estimate.toFixed(2)}, but only $${usage.remaining.toFixed(2)} of today's $${usage.limit.toFixed(2)} free limit is left. It resets at midnight (Bangladesh time).`,
      code: 'daily_limit',
      usage,
      estimate,
    }, 402);
  }

  // Execution record — ALWAYS have an id so files are grouped per run
  let executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date();
  try {
    const { data: execRow, error: execErr } = await supabaseAdmin.from('executions').insert({
      workflow_id: workflowId,
      user_id: userId,
      status: 'running',
      started_at: startedAt.toISOString(),
      events: { steps: [] },
      cost: 0,
    }).select('id').single();
    if (execRow?.id) executionId = execRow.id;
    else console.warn('Execution insert returned no id, using local:', executionId, execErr);
  } catch (err) {
    console.warn('Could not create execution record, using local id:', executionId, err);
  }

  const controller = registerRun(executionId, userId);
  // Closing the tab stops the run too, instead of generating (and paying for) results nobody sees
  req.signal.addEventListener('abort', () => controller.abort(new Error('Client disconnected')), { once: true });

  const encoder = new TextEncoder();
  const executionSteps: any[] = [];

  const stream = new ReadableStream({
    async start(streamController) {
      const send = (event: string, data: any) => {
        try {
          streamController.enqueue(encoder.encode(sseEvent(event, data)));
        } catch { /* stream may have closed */ }
      };

      // Running total, so money spent before a crash is still counted against the allowance
      let spentSoFar = 0;
      const emit = (event: ExecutionEvent) => {
        if (event.type === 'node_end') spentSoFar += Number(event.data?.output?.cost) || 0;
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

      let spent = 0;
      try {
        send('status', { phase: 'starting', message: 'Starting workflow execution...', executionId, estimate });

        const result = await executeWorkflow(nodes, edges, emit, {
          workflowId,
          executionId,
          userId,
          signal: controller.signal,
          budget: () => allowanceFor(userId, user.email, runKey),
        });
        spent = result.totalCost || 0;

        send('result', {
          executionId,
          success: result.success,
          stopped: result.stopped,
          totalCost: result.totalCost,
          assets: result.assets.map(a => ({
            nodeId: a.nodeId,
            type: a._nodeType,
            imageUrl: a.imageUrl || a.photoUrl,
            videoUrl: a.videoUrl || a.finalVideoUrl,
            audioUrl: a.audioUrl,
            thumbnailUrl: a.thumbnailUrl,
            elementName: a.elementName,
          })),
          errors: result.errors,
          usage: getUsage(userId, user.email),
        });

        await finishExecution(
          executionId,
          result.stopped === 'cancelled' ? 'cancelled' : result.success ? 'completed' : 'failed',
          result.totalCost || 0,
          executionSteps,
          result.errors?.length ? result.errors.join('; ') : (result.stopped === 'cancelled' ? 'Stopped by user' : null),
        );

        // Save generated assets to the assets table
        for (const asset of result.assets || []) {
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

            const { error: insertErr } = await supabaseAdmin.from('assets').insert({
              user_id: userId,
              workflow_id: workflowId,
              execution_id: executionId,
              type: assetType,
              cloudinary_public_id: asset.cloudinaryId || null,
              cloudinary_url: url,
              thumbnail_url: asset.thumbnailUrl || (assetType === 'photo' ? url : assetType === 'video' ? url.replace(/\.\w+$/, '.jpg') : null),
              filename,
              scene: asset.sceneNumber || asset.scene || null,
              shot: asset.shotNumber || asset.shot || null,
              prompt: asset.prompt || null,
              negative_prompt: asset.negativePrompt || null,
              model: asset.model || null,
              cost: asset.cost || 0,
              duration_seconds: asset.duration || null,
              file_size: asset.bytes || null,
              width: asset.width || null,
              height: asset.height || null,
              tags: asset._nodeType === 'final_video_compiler' ? ['final'] : [],
              status: 'ready',
            });
            if (insertErr) console.warn('Could not save asset:', insertErr.message);
          } catch (err) {
            console.warn('Could not save asset:', err);
          }
        }

      } catch (err: any) {
        send('error', { message: err.message || 'Execution failed' });

        await finishExecution(
          executionId,
          controller.signal.aborted ? 'cancelled' : 'failed',
          Math.max(spent, spentSoFar),
          executionSteps,
          err.message || 'Execution failed',
        ).catch(() => { /* ignore */ });
      } finally {
        settle(userId, runKey, Math.max(spent, spentSoFar));
        finishRun(executionId);
        try { streamController.close(); } catch { /* already closed */ }
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
