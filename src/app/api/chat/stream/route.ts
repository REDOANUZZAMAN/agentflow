import { NextRequest } from 'next/server';
import { BUILDER_TOOLS, getNodeMeta, type NodeType } from '@/lib/types';

// BATCHING prompt — Claude makes ALL tool calls without task bookkeeping.
// The server generates synthetic start_task/complete_task events for the frontend.
const SYSTEM_PROMPT = `You are the AgentFlow Builder Agent — a friendly AI assistant that helps non-technical users build automation workflows through conversation.

## Your Role
- You help users build workflows by adding nodes to a visual canvas
- You explain everything in simple, plain English — no jargon
- You're enthusiastic and encouraging!

## CRITICAL: BATCH ALL TOOL CALLS
Make ALL your tool calls in a SINGLE response. Do NOT call start_task or complete_task between nodes.

CORRECT pattern:
  create_task_list([...all tasks...])
  add_node(trigger)
  add_node(element1)
  add_node(element2)
  add_node(photo for shot 1, config: {sceneNumber:1, shotNumber:1})
  add_node(video for shot 1, config: {sceneNumber:1, shotNumber:1})
  add_node(voiceover for shot 1, config: {sceneNumber:1, shotNumber:1, text:"The narration dialogue for this shot...", voice:"Rachel"})
  add_node(photo for shot 2, config: {sceneNumber:1, shotNumber:2})
  ...
  add_node(orchestrator)
  add_node(compiler)
  connect_nodes(...)
  ...all connections...
  workflow_ready(summary)

WRONG (wastes tokens, causes incomplete workflows):
  create_task_list(...)
  start_task("t1")
  add_node(trigger)
  complete_task("t1")
  ...runs out of tokens...

RULE: create_task_list ONCE → ALL add_node calls → ALL connect_nodes calls → workflow_ready.
The system auto-tracks task progress from your add_node calls.

## CRITICAL: NO DUPLICATE SHOTS
For a script with N shots, create EXACTLY:
- N photo_generator nodes (one per shot)
- N video_generator nodes (one per shot)  
- N voiceover_generator nodes (one per shot, if voiceover enabled)

Each shot node MUST include sceneNumber and shotNumber in its config:
  add_node(type: "photo_generator", config: { sceneNumber: 1, shotNumber: 3, prompt: "..." })

CRITICAL — DYNAMIC FIELD POPULATION:
All node configs must be filled with REAL content from the user's request, not placeholders:

- voiceover_generator: "text" MUST contain the actual narration/dialogue for that specific shot.
  Extract it from the user's script. If no script, WRITE appropriate narration based on the scene.
  CRITICAL: Keep voiceover text SHORT — max ~12 words per 5s video clip (~2.5 words/second).
  If the text is longer, the engine auto-speeds it up (max 1.2x), but very long text will still overflow.
  Split long narration across multiple shots instead of cramming into one.
  add_node(type: "voiceover_generator", config: { sceneNumber: 1, shotNumber: 1, text: "She stepped off the train into the cold morning air.", voice: "Rachel", duration: 5 })

- photo_generator: "prompt" must describe the specific visual content of that shot in detail.
  add_node(type: "photo_generator", config: { sceneNumber: 1, shotNumber: 1, prompt: "A young woman in a red coat stepping off a vintage train onto a foggy platform, cinematic lighting" })

- video_generator: "prompt" must describe the specific motion/action for that shot.
  add_node(type: "video_generator", config: { sceneNumber: 1, shotNumber: 1, prompt: "Slow camera pan following the woman as she walks along the platform, steam rising from the train" })

- project_orchestrator: "projectName" should match the user's project/workflow name, NOT "Video Project".
  add_node(type: "project_orchestrator", config: { projectName: "The Train Window" })

- element_reference: "description" must be a detailed visual description of the character/location.
  add_node(type: "element_reference", config: { elementName: "Traveler", description: "A young woman in her late 20s with dark hair, wearing a red winter coat and brown leather gloves" })

- final_video_compiler: Do NOT set projectId — it is auto-generated at runtime.

NEVER leave text/prompt/description fields empty. If the user didn't provide specific content, CREATE it based on context.

NEVER create two photo_generator nodes with the same sceneNumber+shotNumber.
NEVER create two video_generator nodes with the same sceneNumber+shotNumber.
The backend will REJECT duplicate shot nodes — if you try, you'll get an error.

When CONTINUING from a previous round, call list_nodes() FIRST to see what exists.

## DO NOT SET POSITIONS
Never pass a "position" in add_node — the backend auto-calculates optimal grid positions based on node type, scene number, and shot number. This produces a clean left-to-right layout.

## Available Node Types
Triggers: manual_trigger, schedule_trigger, webhook_trigger
AI: claude_chat, image_gen, video_gen, voice_gen
Video Pipeline: script_parser, element_reference, photo_generator, video_generator, voiceover_generator, project_orchestrator, final_video_compiler
Social: post_x, post_instagram, post_linkedin, post_tiktok
Comms: send_email, send_telegram
Web: http_request, web_search, web_scraper
Files: file_read, file_write, file_generate
Logic: if_else, loop, wait

## Confirmed Model Endpoints (use ONLY these exact strings)
Image:
- fal-ai/nano-banana-2 → Default for elements & photos. Fast, $0.04.
- fal-ai/nano-banana-2/edit → Same model WITH reference images (max 4 refs). $0.04.
- fal-ai/bytedance/seedream/v4.5/text-to-image → 4K, best text-in-image. Use for posters/thumbnails/signs. $0.06.
- fal-ai/bytedance/seedream/v4.5/edit → Up to 10 refs. Complex composites. $0.08.

Video:
- fal-ai/kling-video/o3/pro/image-to-video → Default. Premium. 3-15s. $0.95.
- fal-ai/kling-video/o3/pro/text-to-video → No input image needed. $0.95.
- fal-ai/kling-video/o3/pro/reference-to-video → Multi-character consistency. $1.20.

Audio:
- fal-ai/elevenlabs/tts/turbo-v2.5 → Default voiceover/narration. Fast, low latency, 32 languages. $0.03.
- fal-ai/elevenlabs/text-to-dialogue/eleven-v3 → Multi-speaker dialogue. $0.05.
- fal-ai/elevenlabs/music → Background music/soundtrack. $0.10.

## Model Selection Rules
- Default to fal-ai/nano-banana-2 for general images.
- Use fal-ai/nano-banana-2/edit when @Element references need visual consistency.
- Use fal-ai/bytedance/seedream/v4.5/text-to-image when the image needs visible text (signs, posters, titles).
- Use fal-ai/bytedance/seedream/v4.5/edit when >4 reference images are needed.
- For video with a starting photo → fal-ai/kling-video/o3/pro/image-to-video
- For video from text only → fal-ai/kling-video/o3/pro/text-to-video
- For multi-character video → fal-ai/kling-video/o3/pro/reference-to-video
- NEVER invent or guess model names. Only use the exact strings above.

## Rules
1. ALWAYS start with a trigger node
2. Fill sensible defaults using the confirmed model strings above
3. DO NOT pass position — backend auto-layouts
4. ALWAYS include sceneNumber + shotNumber in config for shot pipeline nodes
5. ALWAYS connect nodes in the right order
6. Give the workflow a fun name with emoji
7. NEVER stop until ALL nodes are created. For a video pipeline with N shots, that means trigger + elements + N×(photo+video+voiceover) + orchestrator + compiler + ALL connections.`;

// Filter out task bookkeeping tools — Claude only needs create_task_list and workflow_ready
const TOOLS_FOR_CLAUDE = BUILDER_TOOLS.filter(t =>
  !['start_task', 'complete_task', 'fail_task', 'add_task', 'update_task'].includes(t.name)
);

function sseEvent(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Plan mode system prompt — no tools, just conversation
const PLAN_MODE_SYSTEM_PROMPT = `You are the AgentFlow Planner — a friendly AI collaborator that helps non-technical users figure out WHAT they want to create before anything is built.

## RULES
1. You do NOT have access to canvas-editing tools. You CANNOT add nodes, run workflows, or generate anything.
2. Your only job is conversation, writing, and planning.
3. Ask clarifying questions when the user is vague — one question at a time.
4. Use simple, plain English. No jargon. Be enthusiastic and supportive!
5. Use emoji to make responses feel friendly.

## WHEN WRITING SCRIPTS/PLANS
Write in a clear format with TITLE, DESCRIPTION, ELEMENTS, STEPS/SHOTS, and ESTIMATED COST.

## AFTER EVERY PLAN
ALWAYS end with:
"✅ **Does this look right?** Tell me what to change, or switch to **⚡ Act mode** when you're ready to build it!"

Keep responses focused and conversational. You're a brainstorming partner, not a builder.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, history, nodes, edges, mode } = body;
  const isPlanMode = mode === 'plan';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try { controller.enqueue(encoder.encode(sseEvent(event, data))); } catch { /* closed */ }
      };
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      try {
        // Build context
        const canvasContext = nodes.length > 0
          ? `\n\nCurrent canvas has ${nodes.length} node(s):\n${nodes.map((n: any) => `- ${n.id}: ${n.data.emoji} ${n.data.label} (${n.data.type})`).join('\n')}\nEdges: ${edges.map((e: any) => `${e.source} → ${e.target}`).join(', ') || 'none'}`
          : '\n\nThe canvas is currently empty.';

        const messages: Array<{ role: string; content: any }> = [];
        for (const msg of (history || []).slice(-10)) {
          if (msg.role === 'user' || msg.role === 'assistant') messages.push({ role: msg.role, content: msg.content });
        }
        if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
          messages.push({ role: 'user', content: message + canvasContext });
        } else {
          messages[messages.length - 1] = { role: 'user', content: message + canvasContext };
        }

        send('status', { phase: 'thinking', message: isPlanMode ? 'Thinking about your plan...' : 'Planning your workflow...' });

        // Proxy helper — uses plan mode prompt (no tools) or act mode prompt (with tools)
        async function callProxy(msgs: any[]) {
          const proxyBody: Record<string, any> = {
            messages: msgs,
            system: isPlanMode ? PLAN_MODE_SYSTEM_PROMPT : SYSTEM_PROMPT,
            model: 'claude-sonnet-4-6',
            max_tokens: isPlanMode ? 4096 : 32768,
          };
          // Only include tools in Act mode — Plan mode is purely conversational
          if (!isPlanMode) {
            proxyBody.tools = TOOLS_FOR_CLAUDE;
          }

          const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
            body: JSON.stringify(proxyBody),
          });
          if (!res.ok) throw new Error(`Proxy ${res.status}: ${await res.text()}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return data;
        }

        // ─── PLAN MODE: simple conversation, no tools ───
        if (isPlanMode) {
          const data = await callProxy(messages);
          let text = '';
          for (const block of (data.content || [])) {
            if (block.type === 'text') text += block.text;
          }
          send('text', { content: text });
          send('done', { text, toolCalls: [], nodeIdMap: {}, workflowComplete: false });
          controller.close();
          return;
        }

        // Process a tool_use block
        const allToolCalls: any[] = [];
        const nodeIdMap: Record<string, string> = {};
        let workflowComplete = false;
        let taskList: any[] = [];
        let plannedTaskCount = 0;

        // Track created shot nodes for dedup — pre-populate from existing canvas nodes
        const shotTracker = new Map<string, string>(); // "type:scene:shot" → nodeId
        // Pre-load existing canvas nodes into tracker (prevents duplicates across continuation rounds)
        for (const existingNode of (nodes || [])) {
          const nd = existingNode.data;
          if (nd && nd.config) {
            const sn = nd.config.sceneNumber || nd.config.scene_number;
            const sh = nd.config.shotNumber || nd.config.shot_number;
            if (sn && sh) {
              const key = `${nd.type}:${sn}:${sh}`;
              shotTracker.set(key, existingNode.id);
            }
          }
        }

        // Smart grid position calculator — uses sequential column index per type
        const COL_W = 280;
        const ROW_H = 180;
        function calcPosition(type: string, config: any): { x: number; y: number } {
          const existingAddNodes = allToolCalls.filter(c => c.name === 'add_node' && c.result && !c.result.duplicate && !c.result.rejected);
          // Count how many of the SAME type already exist (including pre-existing canvas nodes)
          const existingCanvasOfType = (nodes || []).filter((n: any) => n.data?.type === type).length;

          switch (type) {
            case 'manual_trigger':
            case 'schedule_trigger':
            case 'webhook_trigger':
              return { x: 500, y: 0 };
            case 'element_reference': {
              const elemIdx = existingAddNodes.filter(c => c.result?.type === 'element_reference').length + existingCanvasOfType;
              return { x: 150 + elemIdx * COL_W, y: ROW_H };
            }
            case 'photo_generator':
            case 'image_gen': {
              // Use sequential column index — each new photo goes to next column
              const colIdx = existingAddNodes.filter(c => c.result?.type === type).length + existingCanvasOfType;
              return { x: 150 + colIdx * COL_W, y: 2 * ROW_H };
            }
            case 'video_generator':
            case 'video_gen': {
              const colIdx = existingAddNodes.filter(c => c.result?.type === type || c.result?.type === 'video_gen').length + existingCanvasOfType;
              return { x: 150 + colIdx * COL_W, y: 3 * ROW_H };
            }
            case 'voiceover_generator':
            case 'voice_gen': {
              const colIdx = existingAddNodes.filter(c => c.result?.type === type || c.result?.type === 'voice_gen').length + existingCanvasOfType;
              return { x: 150 + colIdx * COL_W, y: 4 * ROW_H };
            }
            case 'project_orchestrator': {
              // Center orchestrator based on how many columns we have
              const maxCols = Math.max(
                existingAddNodes.filter(c => c.result?.type === 'photo_generator').length,
                existingAddNodes.filter(c => ['video_generator', 'video_gen'].includes(c.result?.type)).length,
                1
              );
              return { x: 150 + Math.floor((maxCols - 1) / 2) * COL_W, y: 5 * ROW_H };
            }
            case 'final_video_compiler': {
              const maxCols = Math.max(
                existingAddNodes.filter(c => c.result?.type === 'photo_generator').length,
                existingAddNodes.filter(c => ['video_generator', 'video_gen'].includes(c.result?.type)).length,
                1
              );
              return { x: 150 + Math.floor((maxCols - 1) / 2) * COL_W, y: 6 * ROW_H };
            }
            default: {
              const idx = existingAddNodes.length;
              return { x: 300, y: 80 + idx * 150 };
            }
          }
        }

        function processToolBlock(block: any) {
          const inp = block.input as Record<string, unknown>;
          let result: any = {};
          switch (block.name) {
            case 'add_node': {
              const t = inp.type as NodeType;
              const config = (inp.config || {}) as Record<string, any>;

              // HARD BACKEND VALIDATION for shot-type nodes
              const shotTypes = ['photo_generator', 'video_generator', 'voiceover_generator', 'video_gen', 'voice_gen'];
              if (shotTypes.includes(t)) {
                const sn = config.sceneNumber || config.scene_number;
                const sh = config.shotNumber || config.shot_number;

                // REJECT if scene/shot numbers are missing
                if (!sn || !sh) {
                  result = { error: `REJECTED: ${t} MUST include sceneNumber and shotNumber in config. Got: scene=${sn}, shot=${sh}. Fix your add_node call.`, rejected: true };
                  const processed = { id: block.id, name: block.name, input: inp, result, status: 'error' };
                  allToolCalls.push(processed);
                  return processed;
                }

                // Normalize to camelCase
                config.sceneNumber = Number(sn);
                config.shotNumber = Number(sh);

                // REJECT duplicates
                const key = `${t}:${config.sceneNumber}:${config.shotNumber}`;
                if (shotTracker.has(key)) {
                  result = { error: `DUPLICATE REJECTED: ${t} for scene ${config.sceneNumber} shot ${config.shotNumber} already exists (${shotTracker.get(key)}). Skipped.`, duplicate: true };
                  const processed = { id: block.id, name: block.name, input: inp, result, status: 'error' };
                  allToolCalls.push(processed);
                  return processed;
                }
              }

              const meta = getNodeMeta(t);
              const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              const pos = calcPosition(t, config);
              result = { nodeId: id, type: t, label: meta.label, emoji: meta.emoji, config, position: pos };
              nodeIdMap[block.id] = id;

              // Track shot nodes
              if (shotTypes.includes(t) && config.shotNumber && config.sceneNumber) {
                shotTracker.set(`${t}:${config.sceneNumber}:${config.shotNumber}`, id);
              }
              break;
            }
            case 'connect_nodes': result = { from: inp.from_node_id, to: inp.to_node_id, success: true }; break;
            case 'update_node': result = { nodeId: inp.node_id, config: inp.config, label: inp.label, success: true }; break;
            case 'delete_node': result = { nodeId: inp.node_id, success: true }; break;
            case 'run_workflow': result = { success: true }; break;
            case 'list_nodes': {
              // Return current nodes for continuation rounds
              const existing = allToolCalls
                .filter(c => c.name === 'add_node' && c.result && !c.result.duplicate)
                .map(c => ({ id: c.result.nodeId, type: c.result.type, label: c.result.label, shotNumber: c.result.config?.shotNumber, sceneNumber: c.result.config?.sceneNumber }));
              // Also include pre-existing canvas nodes
              const canvasNodes = (nodes || []).map((n: any) => ({ id: n.id, type: n.data.type, label: n.data.label, shotNumber: n.data.config?.shotNumber, sceneNumber: n.data.config?.sceneNumber }));
              result = { nodes: [...canvasNodes, ...existing] };
              break;
            }
            case 'create_task_list':
              taskList = (inp.tasks as any[]) || [];
              plannedTaskCount = taskList.length;
              result = { success: true, tasks: taskList };
              break;
            case 'workflow_ready':
              workflowComplete = true;
              result = { success: true, summary: inp.summary };
              break;
            default: result = { success: true }; break;
          }
          const processed = { id: block.id, name: block.name, input: inp, result, status: 'done' };
          allToolCalls.push(processed);
          return processed;
        }

        // === TOOL USE LOOP with auto-continuation ===
        let currentMessages = [...messages];
        let allText = '';
        const MAX_ROUNDS = 15;
        const MAX_CONTINUATIONS = 8;
        let continuationCount = 0;

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const data = await callProxy(currentMessages);
          let text = '';
          const tools: any[] = [];
          for (const block of (data.content || [])) {
            if (block.type === 'text') text += block.text;
            else if (block.type === 'tool_use') tools.push(block);
          }

          if (text && (round === 0 || tools.length === 0)) allText = text;
          if (text && round === 0) send('text', { content: text });

          if (tools.length === 0 && data.stop_reason !== 'tool_use') {
            // No tools — check if we should auto-continue
            const addNodeCount = allToolCalls.filter(t => t.name === 'add_node').length;
            const deficit = plannedTaskCount > 0 ? plannedTaskCount - addNodeCount : 0;
            if (addNodeCount >= 1 && !workflowComplete && continuationCount < MAX_CONTINUATIONS && deficit > 0) {
              continuationCount++;
              send('status', { phase: 'continuing', message: `Building... (${addNodeCount} nodes, ${deficit} remaining)` });
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: data.content },
                { role: 'user', content: `You have ${addNodeCount} nodes but need ${plannedTaskCount}. Continue adding the remaining ${deficit} nodes NOW with add_node calls. Then connect them all and call workflow_ready().` },
              ];
              continue;
            }
            if (text && round > 0) send('text', { content: text });
            break;
          }

          // Process and STREAM each tool call with pacing
          send('status', { phase: 'building', message: `Building...` });

          // Separate tool calls into categories for smart pacing
          const addNodeTools = tools.filter(t => t.name === 'add_node');
          const connectTools = tools.filter(t => t.name === 'connect_nodes');
          const otherTools = tools.filter(t => t.name !== 'add_node' && t.name !== 'connect_nodes');

          // Process create_task_list first (instantly)
          for (const t of otherTools.filter(t => t.name === 'create_task_list')) {
            const processed = processToolBlock(t);
            send('tool', processed);
            await sleep(50);
          }

          // Now stream add_node calls with synthetic task events
          let taskIdx = 0;
          for (const toolBlock of addNodeTools) {
            // Synthetic: start corresponding task
            if (taskList.length > 0 && taskIdx < taskList.length) {
              send('tool', {
                id: `syn_start_${taskList[taskIdx].id}`, name: 'start_task',
                input: { task_id: taskList[taskIdx].id },
                result: { success: true, task_id: taskList[taskIdx].id, status: 'running' },
                status: 'done',
              });
              await sleep(100);
            }

            // Real add_node
            const processed = processToolBlock(toolBlock);
            send('tool', processed);
            await sleep(350); // Satisfying pace

            // Synthetic: complete corresponding task
            if (taskList.length > 0 && taskIdx < taskList.length) {
              send('tool', {
                id: `syn_complete_${taskList[taskIdx].id}`, name: 'complete_task',
                input: { task_id: taskList[taskIdx].id },
                result: { success: true, task_id: taskList[taskIdx].id, status: 'done' },
                status: 'done',
              });
              taskIdx++;
              await sleep(100);
            }
          }

          // Stream connect_nodes calls (faster pacing)
          if (connectTools.length > 0) {
            // Synthetic: start "connect" task if available
            if (taskList.length > 0 && taskIdx < taskList.length) {
              send('tool', {
                id: `syn_start_${taskList[taskIdx].id}`, name: 'start_task',
                input: { task_id: taskList[taskIdx].id },
                result: { success: true, task_id: taskList[taskIdx].id, status: 'running' },
                status: 'done',
              });
              await sleep(100);
            }
            for (const toolBlock of connectTools) {
              const processed = processToolBlock(toolBlock);
              send('tool', processed);
              await sleep(150);
            }
            // Complete remaining tasks
            while (taskIdx < taskList.length) {
              send('tool', {
                id: `syn_complete_${taskList[taskIdx].id}`, name: 'complete_task',
                input: { task_id: taskList[taskIdx].id },
                result: { success: true, task_id: taskList[taskIdx].id, status: 'done' },
                status: 'done',
              });
              taskIdx++;
              await sleep(50);
            }
          }

          // Process remaining other tools (workflow_ready, etc.)
          for (const t of otherTools.filter(t => t.name !== 'create_task_list')) {
            const processed = processToolBlock(t);
            send('tool', processed);
            await sleep(50);
          }

          // Build tool results for next round
          const toolResults = tools.map(t => ({
            type: 'tool_result',
            tool_use_id: t.id,
            content: JSON.stringify(allToolCalls.find(tc => tc.id === t.id)?.result || { success: true }),
          }));

          if (workflowComplete) {
            // Get final summary
            currentMessages = [...currentMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
            try {
              const finalData = await callProxy(currentMessages);
              for (const block of (finalData.content || [])) {
                if (block.type === 'text' && block.text) { allText = block.text; send('text', { content: block.text }); }
              }
            } catch { /* ignore */ }
            break;
          }

          if (data.stop_reason !== 'tool_use') {
            // Check auto-continuation
            const addNodeCount = allToolCalls.filter(t => t.name === 'add_node').length;
            const deficit = plannedTaskCount > 0 ? plannedTaskCount - addNodeCount : 0;
            if (!workflowComplete && continuationCount < MAX_CONTINUATIONS && deficit > 0) {
              continuationCount++;
              send('status', { phase: 'continuing', message: `Continuing... (${addNodeCount}/${plannedTaskCount} nodes)` });
              currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: data.content },
                { role: 'user', content: `Good progress! ${addNodeCount} nodes created, ${deficit} more needed. Continue with more add_node calls, then connect_nodes, then workflow_ready().` },
              ];
              continue;
            }
            break;
          }

          // stop_reason === 'tool_use' — continue with results
          currentMessages = [...currentMessages, { role: 'assistant', content: data.content }, { role: 'user', content: toolResults }];
        }

        // Generate narrative if no text
        if (!allText && allToolCalls.length > 0) {
          const nodeCount = allToolCalls.filter(t => t.name === 'add_node').length;
          const edgeCount = allToolCalls.filter(t => t.name === 'connect_nodes').length;
          allText = `[sparkle] Built your workflow! ${nodeCount} nodes created, ${edgeCount} connections made. Ready to run!`;
          send('text', { content: allText });
        }

        send('done', { text: allText, toolCalls: allToolCalls, nodeIdMap, workflowComplete });

      } catch (err: any) {
        send('error', { message: err.message || 'Stream error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
