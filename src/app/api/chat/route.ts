import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { BUILDER_TOOLS, getNodeMeta, type NodeType } from '@/lib/types';
import { applyDefaults } from '@/lib/node-defaults';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Server-side Supabase client for auth
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Cache the auth token to avoid signing in on every request
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSupabaseToken(): Promise<string | null> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  try {
    // Try anonymous sign-in first
    const { data, error } = await supabaseServer.auth.signInAnonymously();
    if (!error && data?.session?.access_token) {
      cachedToken = data.session.access_token;
      tokenExpiry = Date.now() + (data.session.expires_in || 3600) * 1000;
      console.log('[key] Got anonymous Supabase token for Railway');
      return cachedToken;
    }
    
    // If anonymous auth is disabled, try a dedicated service account
    const serviceEmail = process.env.RAILWAY_SERVICE_EMAIL;
    const servicePassword = process.env.RAILWAY_SERVICE_PASSWORD;
    if (serviceEmail && servicePassword) {
      const { data: signInData, error: signInError } = await supabaseServer.auth.signInWithPassword({
        email: serviceEmail,
        password: servicePassword,
      });
      if (!signInError && signInData?.session?.access_token) {
        cachedToken = signInData.session.access_token;
        tokenExpiry = Date.now() + (signInData.session.expires_in || 3600) * 1000;
        console.log('[key] Got service account Supabase token for Railway');
        return cachedToken;
      }
    }
  } catch (err: any) {
    console.warn('[warn] Could not get Supabase token:', err.message);
  }
  
  return null;
}

// Convert Anthropic tool format to OpenAI format (for OpenRouter)
function toOpenAITools(tools: typeof BUILDER_TOOLS) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

const SYSTEM_PROMPT = `You are the AgentFlow Builder Agent — a friendly AI assistant that helps non-technical users build automation workflows through conversation.

## Your Role
- You help users build workflows by adding nodes to a visual canvas
- You explain everything in simple, plain English — no jargon
- You narrate your actions as you build: "I'm adding a Schedule trigger that runs every morning at 8am... now connecting it to a Claude node that writes the summary..."
- You ask clarifying questions when the user's request is ambiguous
- You're enthusiastic and encouraging!

## How You Build Workflows
You have tools to modify the canvas:
- add_node: Add a new node (trigger, AI, social, email, etc.)
- connect_nodes: Connect two nodes together
- update_node: Change a node's settings
- delete_node: Remove a node
- run_workflow: Test/execute the workflow
- explain_error: Explain errors in plain English

## CRITICAL RULES — BUILD THE ENTIRE WORKFLOW

1. ALWAYS start with a trigger node (manual_trigger, schedule_trigger, or webhook_trigger)
2. After adding nodes, ALWAYS connect them in the right order using connect_nodes
3. **NEVER stop building mid-workflow.** When building a workflow from a structured script or multi-step request, you MUST create EVERY node before saying you're done.
   - For a script with N shots and M elements, create: 1 trigger + M element_reference nodes + N × 3 nodes per shot (photo, video, voiceover) + 1 project_orchestrator + 1 final_video_compiler + ALL connect_nodes calls
   - Do NOT say "I'll continue building the rest later" — complete everything NOW
   - Only after every node is created and connected should you tell the user the workflow is ready
4. **ALWAYS fill ALL config fields — the system applies defaults but YOU must provide prompt text and names.**
   Required defaults per node type:
   - element_reference: model='fal-ai/nano-banana-2', elementName=@Name, description=visual desc
   - photo_generator: model='fal-ai/nano-banana-2', prompt=scene desc, width=1920, height=1080
   - video_generator: model='fal-ai/kling-video/o3/pro/image-to-video', prompt=motion desc, duration=5
   - voiceover_generator: model='fal-ai/elevenlabs/tts/turbo-v2.5', voice='Rachel', text=dialogue (keep ~12 words per 5s shot)
   - project_orchestrator: projectName=workflow name (NOT 'My Video Project'), photoModel, videoModel, voiceModel all filled
   - final_video_compiler: transition='cut', outputResolution='1920x1080', outputFormat='mp4', mode='cloudinary'
   - claude_chat: model='claude-sonnet-4-6', prompt=instruction text
   NEVER use placeholder values like 'proj_phishing_001', 'My Video Project', '@Hacker', 'YOUR_PROJECT_ID'
5. Use descriptive configs — set schedule time, email subject, prompt text, model names, etc.
6. When explaining, use emoji and simple language
7. If a credential/API key is needed, tell the user in a friendly way
8. After building, offer to run a test via the Run Workflow button at the top of the canvas
9. Give the workflow a fun name with an emoji
10. **ELEMENT REFERENCES USE CONNECTIONS, NOT CONFIG.**
    - NEVER set an 'elementRefs' field in photo_generator config — that field does not exist.
    - Element references come ONLY from upstream connect_nodes() edges.
    - After creating each photo_generator, you MUST call connect_nodes() to wire the relevant element_reference nodes to it.
    - Example: if a photo prompt mentions @Barista and @Cafe, connect BOTH element_reference nodes to that photo_generator node.
    - The executor reads element images from graph connections, not from any config field.

## Available Node Types
- Triggers: manual_trigger, schedule_trigger, webhook_trigger
- AI: claude_chat, image_gen, video_gen, voice_gen
- Video Pipeline: script_parser, element_reference, photo_generator, video_generator, voiceover_generator, project_orchestrator, final_video_compiler
- Social: post_x, post_instagram, post_linkedin, post_tiktok
- Comms: send_email, send_telegram
- Web: http_request, web_search, web_scraper
- Files: file_read, file_write, file_generate
- Logic: if_else, loop, wait

## CRITICAL: BATCH ALL TOOL CALLS TOGETHER
You MUST make ALL your tool calls in a SINGLE response. Do NOT interleave start_task/complete_task 
between add_node calls — this wastes tokens and causes incomplete workflows.

CORRECT pattern (all nodes + connections in one batch):
  create_task_list([...])
  add_node(trigger)
  add_node(element_ref_1)
  add_node(element_ref_2)
  add_node(photo_gen)
  add_node(video_gen)
  add_node(voiceover_gen)
  add_node(orchestrator)
  add_node(compiler)
  connect_nodes(trigger → element_ref_1)
  connect_nodes(element_ref_1 → element_ref_2)
  ... all connections ...
  workflow_ready(summary)

WRONG pattern (wastes tokens, causes incomplete builds):
  create_task_list([...])
  start_task(task_1)
  add_node(trigger)
  complete_task(task_1)
  start_task(task_2)
  add_node(element_ref)
  complete_task(task_2)
  ... runs out of tokens before finishing ...

RULE: Call create_task_list ONCE at the start, then make ALL add_node and connect_nodes calls 
WITHOUT any start_task/complete_task in between, then call workflow_ready at the end.
The system will automatically track task progress based on nodes created.

## MULTI-TURN BUILDING
If the workflow requires more nodes than fit in one response, make as many as possible.
After receiving tool results, CONTINUE with more add_node calls immediately.
Only call workflow_ready() when EVERY node is created and connected.

If the user gives you a script with N shots, create at minimum:
- 1 trigger node
- 1 element reference node per @Element tag
- 3 nodes per shot (Photo, Video, Voiceover)
- 1 project orchestrator node
- 1 final video compiler node
For a 5-shot script with 3 elements, that is 21+ nodes. Do NOT stop until all are created.

## AUTONOMOUS MODE
You operate in AUTONOMOUS MODE. Take the user's goal and complete it end-to-end:
1. CREATE a task list first (3-15 clear steps) — ONE call
2. BUILD: Make ALL add_node + connect_nodes calls in the same response — NO task bookkeeping between them
3. Call workflow_ready() as the LAST tool call when everything is built
4. If you couldn't fit all nodes, continue in the next turn with more add_node calls
5. When done, summarize what was built and offer next steps

NEVER ASK PERMISSION FOR: picking defaults, auto-filling configs, layout decisions, retrying failures
ALWAYS CONFIRM BEFORE: posting to social media, sending emails/messages, costs over $5, deleting anything

## Position Guide
You do NOT need to provide position coordinates for nodes — the canvas auto-layouts using dagre after you add all nodes and edges. Just focus on creating the right nodes with correct configs and connecting them properly. The system will arrange them in a beautiful left-to-right graph layout automatically.

Remember: The user can SEE the canvas updating in real-time as you use your tools. Make it feel like magic! [sparkle]`;

// ─── Plan Mode System Prompt ─────────────────────────────────
const PLAN_MODE_SYSTEM_PROMPT = `You are the AgentFlow Planner — a friendly AI collaborator that helps non-technical users figure out WHAT they want to create before anything is built.

## RULES
1. You do NOT have access to canvas-editing tools. You CANNOT add nodes, run workflows, or generate anything.
2. Your only job is conversation, writing, and planning.
3. Ask clarifying questions when the user is vague — one question at a time.
4. Use simple, plain English. No jargon. Be enthusiastic and supportive!
5. Use emoji to make responses feel friendly.

## WHEN WRITING SCRIPTS/PLANS
When asked to create a video script, automation plan, or workflow outline, write it in a clear format:
- **TITLE** and **DESCRIPTION**
- **ELEMENTS** (list of characters/locations with visual descriptions)
- **STEPS/SHOTS** (scene by scene with details)
- **ESTIMATED COST** (based on typical AI generation costs)

## AFTER EVERY PLAN
ALWAYS end with:
"✅ **Does this look right?** Tell me what to change, or click **Switch to Act mode** when you're ready to build it!"

## COMMON REQUESTS
- "I want to make a video about X" → ask about audience, length, tone, then write full script
- "Help me brainstorm" → suggest 3-5 concepts, let user pick
- "Refine shot 3" → keep the rest, rewrite only that shot
- "Add a scene where X happens" → insert and renumber
- "Is this possible?" → answer honestly about capabilities and costs
- "Make me an automation for X" → outline the steps, triggers, and outputs

## WHAT YOU CAN'T DO
- You cannot build anything on the canvas
- You cannot run workflows
- You cannot generate images or videos
- If the user asks you to build something, remind them to switch to Act mode

Keep responses focused and conversational. You're a brainstorming partner, not a builder.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, nodes, edges, mode } = body;
    const isPlanMode = mode === 'plan';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

    // Try providers in order: Supabase Claude Proxy (primary) → OpenRouter DeepSeek → Demo
    
    // 1. Try Supabase Edge Function (Claude API proxy — runs outside China)
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const result = await callSupabaseClaudeProxy(message, history, nodes, edges, supabaseUrl, supabaseAnonKey, isPlanMode);
        console.log('[ok] Supabase Claude proxy succeeded');
        return NextResponse.json(result);
      } catch (proxyError: any) {
        console.warn('[x] Supabase Claude proxy failed:', proxyError.message);
      }
    }

    // 2. Try OpenRouter with model fallback chain (DeepSeek works from China)
    if (openrouterKey && openrouterKey.length > 10) {
      const models = [
        'deepseek/deepseek-chat-v3-0324',          // Primary — works from China, great at tool use
        'google/gemini-2.0-flash-001',               // Fallback 1
        process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4', // Fallback 2 (blocked in China)
      ];
      
      for (const model of models) {
        try {
          const result = await callOpenRouterAPI(message, history, nodes, edges, openrouterKey, model);
          console.log(`[ok] OpenRouter API succeeded (model: ${model})`);
          return NextResponse.json(result);
        } catch (apiError: any) {
          console.warn(`[x] OpenRouter model ${model} failed:`, apiError.message);
        }
      }
    }

    // 3. Fall back to demo mode
    console.log('[demo] Using demo mode (no working API key)');
    return NextResponse.json(simulateResponse(message, nodes, edges));
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Supabase Edge Function (Claude API Proxy) ──────────────────────
async function callSupabaseClaudeProxy(
  message: string, history: any[], nodes: any[], edges: any[],
  supabaseUrl: string, anonKey: string, isPlanMode: boolean = false
) {
  const canvasContext = nodes.length > 0
    ? `\n\nCurrent canvas has ${nodes.length} node(s):\n${nodes.map((n: any) => `- ${n.id}: ${n.data.emoji} ${n.data.label} (${n.data.type})`).join('\n')}\nEdges: ${edges.map((e: any) => `${e.source} → ${e.target}`).join(', ') || 'none'}`
    : '\n\nThe canvas is currently empty.';

  // Build messages with proper Anthropic format (alternating user/assistant)
  const messages: Array<{ role: string; content: any }> = [];
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: message + canvasContext });
  } else {
    messages[messages.length - 1] = { role: 'user', content: message + canvasContext };
  }

  // Filter out task bookkeeping tools to save tokens — Claude only needs
  // create_task_list and workflow_ready. Task progress is auto-tracked server-side.
  const TOOLS_FOR_CLAUDE = BUILDER_TOOLS.filter(t => 
    !['start_task', 'complete_task', 'fail_task', 'add_task', 'update_task'].includes(t.name)
  );

  // ─── PLAN MODE: simple batch call, no tools ───
  if (isPlanMode) {
    const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({
        messages, system: PLAN_MODE_SYSTEM_PROMPT,
        model: 'claude-sonnet-4-6', max_tokens: 4096,
      }),
    });
    if (!res.ok) throw new Error(`Plan proxy ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    let text = '';
    for (const block of (data.content || [])) {
      if (block.type === 'text') text += block.text;
    }
    return {
      response: text || 'I\'m here to help you plan! Tell me more about what you\'d like to create.',
      toolCalls: [], nodeIdMap: {}, provider: 'supabase-claude-plan',
    };
  }

  // Helper to call the proxy (Act mode with tools)
  async function callProxy(msgs: any[]) {
    const response = await fetch(`${supabaseUrl}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        messages: msgs,
        system: SYSTEM_PROMPT,
        tools: TOOLS_FOR_CLAUDE,
        model: 'claude-sonnet-4-6',
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase proxy ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Process a single Claude response, extracting text and tool calls
  function processResponse(data: any) {
    let text = '';
    const tools: any[] = [];

    for (const block of (data.content || [])) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        tools.push(block);
      }
    }
    return { text, tools, stopReason: data.stop_reason };
  }

  // Process a tool_use block and return the result
  function processToolUse(block: any, existingToolCalls: any[]) {
    const toolInput = block.input as Record<string, unknown>;
    let result: any = {};
    switch (block.name) {
      case 'add_node': {
        const nodeType = toolInput.type as NodeType;
        const meta = getNodeMeta(nodeType);
        const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const position = (toolInput.position as { x: number; y: number }) || {
          x: 80 + (nodes.length + existingToolCalls.filter((t: any) => t.name === 'add_node').length) * 160, y: 150,
        };
        // AUTO-FILL: Apply schema defaults to any missing required fields
        const mergedConfig = applyDefaults(nodeType, (toolInput.config as Record<string, unknown>) || {});
        result = { nodeId, type: nodeType, label: meta.label, emoji: meta.emoji, config: mergedConfig, position };
        break;
      }
      case 'connect_nodes':
        result = { from: toolInput.from_node_id, to: toolInput.to_node_id, success: true };
        break;
      case 'update_node':
        result = { nodeId: toolInput.node_id, config: toolInput.config, label: toolInput.label, success: true };
        break;
      case 'delete_node':
        result = { nodeId: toolInput.node_id, success: true };
        break;
      case 'run_workflow':
        result = { success: true, message: 'Workflow execution started' };
        break;
      case 'explain_error':
        result = { explanation: 'Error explained in plain English' };
        break;
      // Task list tools
      case 'create_task_list':
        result = { success: true, tasks: toolInput.tasks };
        break;
      case 'start_task':
        result = { success: true, task_id: toolInput.task_id, status: 'running' };
        break;
      case 'complete_task':
        result = { success: true, task_id: toolInput.task_id, status: 'done' };
        break;
      case 'fail_task':
        result = { success: true, task_id: toolInput.task_id, status: 'failed', reason: toolInput.reason };
        break;
      case 'add_task':
        result = { success: true, task_id: toolInput.task_id };
        break;
      case 'update_task':
        result = { success: true, task_id: toolInput.task_id };
        break;
      case 'workflow_ready':
        result = { success: true, message: 'Workflow is complete and ready to run', summary: toolInput.summary };
        break;
    }
    return { id: block.id, name: block.name, input: toolInput, result, status: 'done' };
  }

  // === TOOL USE LOOP ===
  // Claude makes tool calls across multiple rounds. We loop up to 10 times.
  // Key insight: Claude may stop with end_turn before finishing. We auto-continue
  // by sending a "keep going" message up to MAX_CONTINUATIONS times.
  let allText = '';
  const allToolCalls: any[] = [];
  const nodeIdMap: Record<string, string> = {};
  let currentMessages = [...messages];
  const MAX_ROUNDS = 10;
  const MAX_CONTINUATIONS = 4; // max "keep going" nudges
  let workflowComplete = false;
  let continuationCount = 0;
  let taskListCreated = false;
  let plannedTaskCount = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    console.log(`[refresh] Tool loop round ${round + 1}/${MAX_ROUNDS} (${allToolCalls.filter(t => t.name === 'add_node').length} nodes so far)`);
    const data = await callProxy(currentMessages);
    const { text, tools, stopReason } = processResponse(data);
    
    // Only append text from the LAST round to avoid duplicate narration
    if (round === 0 || tools.length === 0) {
      allText += text;
    }

    if (tools.length === 0 && stopReason !== 'tool_use') {
      // No tool calls — check if we should nudge Claude to continue
      const addNodeCount = allToolCalls.filter(tc => tc.name === 'add_node').length;
      const hasTaskList = taskListCreated && plannedTaskCount > 0;
      const nodeDeficit = hasTaskList ? plannedTaskCount - addNodeCount : 0;
      
      if (addNodeCount >= 2 && !workflowComplete && continuationCount < MAX_CONTINUATIONS && nodeDeficit > 0) {
        continuationCount++;
        console.log(`[loop] Auto-continue #${continuationCount}: ${addNodeCount} nodes built, ~${nodeDeficit} remaining`);
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: `You've created ${addNodeCount} nodes so far but the task list has ${plannedTaskCount} steps. There are still ${nodeDeficit} nodes to build. Continue adding the remaining nodes NOW using add_node tool calls. Do not stop until every node is created and connected, then call workflow_ready().` },
        ];
        continue;
      }
      break;
    }

    // Process tool calls
    const toolResults: any[] = [];
    for (const toolBlock of tools) {
      const processed = processToolUse(toolBlock, allToolCalls);
      allToolCalls.push(processed);
      if (processed.name === 'add_node' && processed.result.nodeId) {
        nodeIdMap[toolBlock.id] = processed.result.nodeId;
      }
      if (processed.name === 'workflow_ready') {
        workflowComplete = true;
      }
      if (processed.name === 'create_task_list' && processed.input?.tasks) {
        taskListCreated = true;
        plannedTaskCount = (processed.input.tasks as any[]).length;
        console.log(`[tasks] Task list created with ${plannedTaskCount} tasks`);
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(processed.result),
      });
    }

    // If workflow_ready was called, get final summary
    if (workflowComplete) {
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: data.content },
        { role: 'user', content: toolResults },
      ];
      try {
        const finalData = await callProxy(currentMessages);
        const { text: finalText } = processResponse(finalData);
        allText = finalText || allText; // prefer final summary
      } catch { /* ignore — we have enough */ }
      break;
    }

    if (stopReason !== 'tool_use') {
      // Claude ended but made tool calls this round — check if more needed
      const addNodeCount = allToolCalls.filter(tc => tc.name === 'add_node').length;
      const hasTaskList = taskListCreated && plannedTaskCount > 0;
      const nodeDeficit = hasTaskList ? plannedTaskCount - addNodeCount : 0;
      
      if (addNodeCount >= 2 && !workflowComplete && continuationCount < MAX_CONTINUATIONS && (nodeDeficit > 0 || !hasTaskList)) {
        continuationCount++;
        const prompt = nodeDeficit > 0
          ? `Good progress! ${addNodeCount} nodes created, but ${nodeDeficit} more are needed per your task list. Continue adding all remaining nodes with add_node, connect them with connect_nodes, then call workflow_ready() when completely done.`
          : `Continue building the rest of the workflow. Add all remaining nodes and connections, then call workflow_ready() when done.`;
        console.log(`[loop] Auto-continue #${continuationCount} (end_turn with tools): ${addNodeCount} nodes, ${nodeDeficit} deficit`);
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: prompt },
        ];
        continue;
      }
      break;
    }

    // stop_reason === 'tool_use' — Claude wants to continue after seeing results
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: data.content },
      { role: 'user', content: toolResults },
    ];
  }

  console.log(`[ok] Tool loop done: ${allToolCalls.filter(t => t.name === 'add_node').length} nodes, ${allToolCalls.filter(t => t.name === 'connect_nodes').length} edges, ${continuationCount} continuations, workflow_ready=${workflowComplete}`);

  // Auto-track task progress: generate synthetic start_task/complete_task calls
  // based on actual add_node calls, so the client task list updates correctly
  if (taskListCreated && plannedTaskCount > 0) {
    const taskListCall = allToolCalls.find(tc => tc.name === 'create_task_list');
    if (taskListCall?.input?.tasks) {
      const tasks = taskListCall.input.tasks as { id: string; title: string }[];
      const addNodeCount = allToolCalls.filter(tc => tc.name === 'add_node').length;
      const tasksToComplete = Math.min(tasks.length, addNodeCount);
      
      // Insert synthetic start/complete calls for each completed task
      for (let i = 0; i < tasksToComplete; i++) {
        allToolCalls.push({
          id: `auto_start_${tasks[i].id}`,
          name: 'start_task',
          input: { task_id: tasks[i].id },
          result: { success: true, task_id: tasks[i].id, status: 'running' },
          status: 'done',
        });
        allToolCalls.push({
          id: `auto_complete_${tasks[i].id}`,
          name: 'complete_task',
          input: { task_id: tasks[i].id },
          result: { success: true, task_id: tasks[i].id, status: 'done' },
          status: 'done',
        });
      }
      
      // Mark next task as running if there's a deficit
      if (tasksToComplete < tasks.length) {
        allToolCalls.push({
          id: `auto_start_${tasks[tasksToComplete].id}`,
          name: 'start_task',
          input: { task_id: tasks[tasksToComplete].id },
          result: { success: true, task_id: tasks[tasksToComplete].id, status: 'running' },
          status: 'done',
        });
      }
    }
  }

  // Generate narrative if no text but has tool calls
  if (!allText && allToolCalls.length > 0) {
    const actions = allToolCalls.map((tc) => {
      switch (tc.name) {
        case 'add_node': return `Added a **${tc.result.emoji} ${tc.result.label}** node`;
        case 'connect_nodes': return `Connected the nodes together`;
        case 'update_node': return `Updated the node settings`;
        default: return `Performed ${tc.name}`;
      }
    });
    allText = actions.join('\n\n') + '\n\n[sparkle] Your workflow is taking shape!';
  }

  return {
    response: allText,
    toolCalls: allToolCalls,
    nodeIdMap,
    provider: 'supabase-claude',
    buttons: allToolCalls.some((tc: any) => tc.name === 'add_node')
      ? [
          { label: '[>] Run Workflow', action: 'Run the workflow to test it' },
          { label: '[pencil] Make Changes', action: 'What changes can you make to this workflow?' },
        ]
      : undefined,
  };
}

// ─── Railway Backend (Claude API Proxy) ──────────────────────
async function callRailwayAPI(message: string, history: any[], nodes: any[], edges: any[], railwayUrl: string) {
  const canvasContext = nodes.length > 0
    ? `\n\nCurrent canvas has ${nodes.length} node(s):\n${nodes.map((n: any) => `- ${n.id}: ${n.data.emoji} ${n.data.label} (${n.data.type})`).join('\n')}\nEdges: ${edges.map((e: any) => `${e.source} → ${e.target}`).join(', ') || 'none'}`
    : '\n\nThe canvas is currently empty.';

  // Build messages array with system prompt + history + current message
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (messages.length <= 1 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: message + canvasContext });
  } else {
    messages[messages.length - 1] = { role: 'user', content: message + canvasContext };
  }

  // Get auth token for Railway backend
  const authToken = await getSupabaseToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Step 1: Init the chat job
  const initRes = await fetch(`${railwayUrl}/api/chat/init`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      model: 'claude-sonnet-4-6',
      conversationId: `agentflow_${Date.now()}`,
      isFirstMessage: history.length === 0,
      userMessageContent: message,
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Railway init ${initRes.status}: ${errText}`);
  }

  const { jobId } = await initRes.json();
  if (!jobId) throw new Error('No jobId returned from Railway');

  // Step 2: Poll for completion (server-side, can't use EventSource)
  let fullResponse = '';
  let attempts = 0;
  const maxAttempts = 60; // 60 * 1.5s = 90s max wait

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    attempts++;

    const statusRes = await fetch(`${railwayUrl}/api/chat/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId }),
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    
    if (statusData.status === 'completed' || statusData.status === 'done') {
      fullResponse = statusData.full_response || statusData.response || statusData.content || '';
      break;
    } else if (statusData.status === 'failed' || statusData.status === 'error') {
      throw new Error(statusData.error || 'Railway job failed');
    }
    // status === 'processing' or 'streaming' — keep polling
  }

  if (!fullResponse) {
    throw new Error('Railway timeout — no response after 90s');
  }

  // Step 3: Parse the response for tool calls (Claude format)
  // The Railway backend returns the raw Claude response which may contain tool_use blocks
  const toolCalls: any[] = [];
  const nodeIdMap: Record<string, string> = {};

  // Try to extract tool calls if the response contains JSON-like tool invocations
  const toolCallRegex = /\[TOOL_CALL:(\w+)\]\s*```json\s*([\s\S]*?)```/g;
  let match;
  let textContent = fullResponse;

  // If no explicit tool calls in text, check if the Railway response included structured data
  // For now, return the text response and let it work with the existing flow
  
  return {
    response: textContent,
    toolCalls,
    nodeIdMap,
    provider: 'railway-claude',
    buttons: textContent.toLowerCase().includes('schedule') || textContent.toLowerCase().includes('trigger')
      ? [
          { label: '[>] Run Workflow', action: 'Run the workflow to test it' },
          { label: '[pencil] Make Changes', action: 'What changes can you make to this workflow?' },
        ]
      : undefined,
  };
}

// ─── OpenRouter API (OpenAI-compatible) ──────────────────────
async function callOpenRouterAPI(message: string, history: any[], nodes: any[], edges: any[], apiKey: string, model?: string) {
  const canvasContext = nodes.length > 0
    ? `\n\nCurrent canvas has ${nodes.length} node(s):\n${nodes.map((n: any) => `- ${n.id}: ${n.data.emoji} ${n.data.label} (${n.data.type})`).join('\n')}\nEdges: ${edges.map((e: any) => `${e.source} → ${e.target}`).join(', ') || 'none'}`
    : '\n\nThe canvas is currently empty.';

  // Build OpenAI-format messages
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (messages.length <= 1 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: message + canvasContext });
  } else {
    messages[messages.length - 1] = { role: 'user', content: message + canvasContext };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AgentFlow',
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324',
      max_tokens: 4096,
      messages,
      tools: toOpenAITools(BUILDER_TOOLS),
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('No response from OpenRouter');

  let textContent = choice.message?.content || '';
  const toolCalls: any[] = [];
  const nodeIdMap: Record<string, string> = {};

  // Process tool calls from OpenAI format
  if (choice.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      if (tc.type === 'function') {
        let toolInput: Record<string, unknown> = {};
        try {
          toolInput = JSON.parse(tc.function.arguments);
        } catch { /* ignore parse errors */ }

        let result: any = {};
        switch (tc.function.name) {
          case 'add_node': {
            const nodeType = toolInput.type as NodeType;
            const meta = getNodeMeta(nodeType);
            const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const position = (toolInput.position as { x: number; y: number }) || {
          x: 80 + (nodes.length + toolCalls.filter((t: any) => t.name === 'add_node').length) * 160,
              y: 150,
            };
            // AUTO-FILL: Apply schema defaults to any missing required fields
            const mergedConfig = applyDefaults(nodeType, (toolInput.config as Record<string, unknown>) || {});
            result = { nodeId, type: nodeType, label: meta.label, emoji: meta.emoji, config: mergedConfig, position };
            nodeIdMap[tc.id] = nodeId;
            break;
          }
          case 'connect_nodes':
            result = { from: toolInput.from_node_id, to: toolInput.to_node_id, success: true };
            break;
          case 'update_node':
            result = { nodeId: toolInput.node_id, config: toolInput.config, label: toolInput.label, success: true };
            break;
          case 'delete_node':
            result = { nodeId: toolInput.node_id, success: true };
            break;
          case 'run_workflow':
            result = { success: true, message: 'Workflow execution started' };
            break;
          case 'explain_error':
            result = { explanation: 'Error explained in plain English' };
            break;
        }

        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          input: toolInput,
          result,
          status: 'done',
        });
      }
    }
  }

  // Generate narrative if no text but has tool calls
  if (!textContent && toolCalls.length > 0) {
    const actions = toolCalls.map((tc) => {
      switch (tc.name) {
        case 'add_node': return `Added a **${tc.result.emoji} ${tc.result.label}** node`;
        case 'connect_nodes': return `Connected the nodes together`;
        case 'update_node': return `Updated the node configuration`;
        case 'delete_node': return `Removed the node`;
        case 'run_workflow': return `Started running the workflow`;
        default: return `Performed ${tc.name}`;
      }
    });
    textContent = actions.join('\n\n') + '\n\n[sparkle] Your workflow is taking shape! Want me to make any changes or shall we test it?';
  }

  return {
    response: textContent,
    toolCalls,
    nodeIdMap,
    buttons: toolCalls.some((tc: any) => tc.name === 'add_node')
      ? [
          { label: '[>] Run Workflow', action: 'Run the workflow to test it' },
          { label: '[pencil] Make Changes', action: 'What changes can you make to this workflow?' },
        ]
      : undefined,
  };
}

async function callClaudeAPI(message: string, history: any[], nodes: any[], edges: any[], apiKey: string) {
    const anthropicClient = new Anthropic({ apiKey });

    // Build context about current canvas state
    const canvasContext = nodes.length > 0
      ? `\n\nCurrent canvas has ${nodes.length} node(s):\n${nodes.map((n: any) => `- ${n.id}: ${n.data.emoji} ${n.data.label} (${n.data.type})`).join('\n')}\nEdges: ${edges.map((e: any) => `${e.source} → ${e.target}`).join(', ') || 'none'}`
      : '\n\nThe canvas is currently empty.';

    // Build message history
    const messages: Anthropic.MessageParam[] = [];
    
    // Add relevant history (last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Ensure the last message is the user's current message
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      messages.push({
        role: 'user',
        content: message + canvasContext,
      });
    } else {
      // Update the last user message with canvas context
      messages[messages.length - 1] = {
        role: 'user',
        content: message + canvasContext,
      };
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: BUILDER_TOOLS as any,
      messages,
    });

    // Process the response
    let textContent = '';
    const toolCalls: any[] = [];
    const nodeIdMap: Record<string, string> = {};

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        const toolInput = block.input as Record<string, unknown>;
        
        // Process tool calls and generate results
        let result: any = {};
        
        switch (block.name) {
          case 'add_node': {
            const nodeType = toolInput.type as NodeType;
            const meta = getNodeMeta(nodeType);
            const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const position = (toolInput.position as { x: number; y: number }) || {
              x: 80 + (nodes.length + toolCalls.filter((t: any) => t.name === 'add_node').length) * 160,
              y: 150,
            };
            
            // AUTO-FILL: Apply schema defaults to any missing required fields
            const mergedConfig = applyDefaults(nodeType, (toolInput.config as Record<string, unknown>) || {});
            result = {
              nodeId,
              type: nodeType,
              label: meta.label,
              emoji: meta.emoji,
              config: mergedConfig,
              position,
            };
            
            // Map for future connect_nodes calls
            nodeIdMap[block.id] = nodeId;
            break;
          }
          case 'connect_nodes': {
            result = {
              from: toolInput.from_node_id,
              to: toolInput.to_node_id,
              success: true,
            };
            break;
          }
          case 'update_node': {
            result = {
              nodeId: toolInput.node_id,
              config: toolInput.config,
              label: toolInput.label,
              success: true,
            };
            break;
          }
          case 'delete_node': {
            result = {
              nodeId: toolInput.node_id,
              success: true,
            };
            break;
          }
          case 'run_workflow': {
            result = {
              success: true,
              message: 'Workflow execution started',
            };
            break;
          }
          case 'explain_error': {
            result = {
              explanation: 'Error explained in plain English',
            };
            break;
          }
        }

        toolCalls.push({
          id: block.id,
          name: block.name,
          input: toolInput,
          result,
          status: 'done',
        });
      }
    }

    // If we have tool calls but need to continue the conversation (tool_use stop reason)
    if (response.stop_reason === 'tool_use' && !textContent) {
      // Generate a narrative about what we did
      const actions = toolCalls.map((tc) => {
        switch (tc.name) {
          case 'add_node':
            return `Added a **${tc.result.emoji} ${tc.result.label}** node`;
          case 'connect_nodes':
            return `Connected the nodes together`;
          case 'update_node':
            return `Updated the node configuration`;
          case 'delete_node':
            return `Removed the node`;
          case 'run_workflow':
            return `Started running the workflow`;
          default:
            return `Performed ${tc.name}`;
        }
      });
      
      textContent = actions.join('\n\n') + '\n\n[sparkle] Your workflow is taking shape! Want me to make any changes or shall we test it?';
    }

    return {
      response: textContent,
      toolCalls,
      nodeIdMap,
      buttons: toolCalls.some((tc: any) => tc.name === 'add_node')
        ? [
            { label: '[>] Run Workflow', action: 'Run the workflow to test it' },
            { label: '[pencil] Make Changes', action: 'What changes can you make to this workflow?' },
          ]
        : undefined,
    };
}

// Simulated response for demo mode (no API key)
function simulateResponse(message: string, nodes: any[], edges: any[]) {
  const lowerMsg = message.toLowerCase();

  // Detect intent and build appropriate workflow
  if (lowerMsg.includes('joke') && lowerMsg.includes('email')) {
    return buildJokeEmailWorkflow(nodes);
  } else if (lowerMsg.includes('news') && lowerMsg.includes('email')) {
    return buildNewsSummaryWorkflow(nodes);
  } else if (lowerMsg.includes('twitter') || lowerMsg.includes('post') || lowerMsg.includes('social')) {
    return buildSocialPostWorkflow(nodes);
  } else if (lowerMsg.includes('monitor') || lowerMsg.includes('watch')) {
    return buildWebMonitorWorkflow(nodes);
  } else if (lowerMsg.includes('script') || lowerMsg.includes('video pipeline') || lowerMsg.includes('fal.ai') || lowerMsg.includes('shots')) {
    return buildScriptToVideoWorkflow(nodes);
  } else if (lowerMsg.includes('run') || lowerMsg.includes('test') || lowerMsg.includes('execute')) {
    return simulateRun(nodes);
  } else if (lowerMsg.includes('change') || lowerMsg.includes('modify') || lowerMsg.includes('edit')) {
    return {
      response: "Sure! What would you like to change? I can:\n\n- [refresh] **Modify** any node's settings\n- [+] **Add** new steps to the workflow\n- [trash] **Remove** steps you don't need\n- [link] **Reconnect** the flow differently\n\nJust tell me what you'd like to adjust!",
      toolCalls: [],
    };
  } else {
    // Generic response - build a simple workflow
    return buildGenericWorkflow(message, nodes);
  }
}

function buildJokeEmailWorkflow(existingNodes: any[]) {
  const baseY = 80;
  const taskList = [
    { id: 'task_1', title: 'Set up a daily schedule trigger' },
    { id: 'task_2', title: 'Add an AI node to generate jokes' },
    { id: 'task_3', title: 'Add email delivery step' },
    { id: 'task_4', title: 'Connect all the steps together' },
    { id: 'task_5', title: 'Name your workflow' },
  ];
  const toolCalls = [
    {
      id: 'tc_1',
      name: 'add_node',
      input: { type: 'schedule_trigger', config: { schedule: 'every day at 8am', cron: '0 8 * * *' } },
      result: {
        nodeId: `node_${Date.now()}_1`,
        type: 'schedule_trigger',
        label: 'Schedule',
        emoji: '[clock]',
        config: { schedule: 'every day at 8am', cron: '0 8 * * *' },
        position: { x: 80, y: 150 },
      },
      status: 'done',
    },
    {
      id: 'tc_2',
      name: 'add_node',
      input: { type: 'claude_chat', config: { prompt: 'Tell me a funny, family-friendly joke. Be creative and surprising!', model: 'claude-sonnet-4-6' } },
      result: {
        nodeId: `node_${Date.now()}_2`,
        type: 'claude_chat',
        label: 'Claude AI',
        emoji: '[brain]',
        config: { prompt: 'Tell me a funny, family-friendly joke. Be creative and surprising!', model: 'claude-sonnet-4-6' },
        position: { x: 240, y: 150 },
      },
      status: 'done',
    },
    {
      id: 'tc_3',
      name: 'add_node',
      input: { type: 'send_email', config: { subject: '[joke] Your Daily Joke', to: 'you@example.com' } },
      result: {
        nodeId: `node_${Date.now()}_3`,
        type: 'send_email',
        label: 'Send Email',
        emoji: '[email]',
        config: { subject: '[joke] Your Daily Joke', to: 'you@example.com' },
        position: { x: 400, y: 150 },
      },
      status: 'done',
    },
    {
      id: 'tc_4',
      name: 'connect_nodes',
      input: { from_node_id: `node_${Date.now()}_1`, to_node_id: `node_${Date.now()}_2` },
      result: { success: true },
      status: 'done',
    },
    {
      id: 'tc_5',
      name: 'connect_nodes',
      input: { from_node_id: `node_${Date.now()}_2`, to_node_id: `node_${Date.now()}_3` },
      result: { success: true },
      status: 'done',
    },
  ];

  return {
    response: `Great choice! [smile] Here's what I'm building for you:\n\n1. [clock] **Schedule Trigger** — Fires every morning at 8am\n2. [brain] **Claude AI** — Generates a fresh, funny joke\n3. [email] **Send Email** — Delivers the joke to your inbox\n\nI've set it all up and connected the steps! The workflow is called **[joke] Daily Joke Machine**.\n\nWant me to run a test? You'll see a joke appear in your email right away!`,
    toolCalls,
    taskList,
    workflowName: '[joke] Daily Joke Machine',
    workflowEmoji: '[joke]',
    buttons: [
      { label: '[>] Run Test', action: 'Run the workflow to test it' },
      { label: '[pencil] Change Email', action: 'Change the email address for the joke workflow' },
    ],
  };
}

function buildNewsSummaryWorkflow(existingNodes: any[]) {
  const baseY = 80;
  const now = Date.now();
  const toolCalls = [
    {
      id: 'tc_1', name: 'add_node',
      input: { type: 'schedule_trigger', config: { schedule: 'every day at 7am' } },
      result: { nodeId: `node_${now}_1`, type: 'schedule_trigger', label: 'Schedule', emoji: '[clock]', config: { schedule: 'every day at 7am' }, position: { x: 80, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_2', name: 'add_node',
      input: { type: 'web_search', config: { query: 'top news today' } },
      result: { nodeId: `node_${now}_2`, type: 'web_search', label: 'Web Search', emoji: '[search]', config: { query: 'top news today' }, position: { x: 240, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_3', name: 'add_node',
      input: { type: 'claude_chat', config: { prompt: 'Summarize these news articles into a brief, easy-to-read email newsletter' } },
      result: { nodeId: `node_${now}_3`, type: 'claude_chat', label: 'Claude AI', emoji: '[brain]', config: { prompt: 'Summarize these news articles into a brief, easy-to-read newsletter' }, position: { x: 400, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_4', name: 'add_node',
      input: { type: 'send_email', config: { subject: '[news] Your Daily News Summary', to: 'you@example.com' } },
      result: { nodeId: `node_${now}_4`, type: 'send_email', label: 'Send Email', emoji: '[email]', config: { subject: '[news] Your Daily News Summary', to: 'you@example.com' }, position: { x: 560, y: 150 } },
      status: 'done',
    },
  ];

  return {
    response: `[news] Building your daily news agent! Here's the plan:\n\n1. [clock] **Schedule** — Every morning at 7am\n2. [search] **Web Search** — Finds today's top news\n3. [brain] **Claude AI** — Writes a clean, readable summary\n4. [email] **Send Email** — Delivers it to your inbox\n\nYour **[news] Morning Briefing Bot** is ready! Want to test it?`,
    toolCalls,
    workflowName: '[news] Morning Briefing Bot',
    workflowEmoji: '[news]',
    buttons: [
      { label: '[>] Run Test', action: 'Run the workflow to test it' },
      { label: '[bird] Also post to Twitter', action: 'Add a step that posts the summary to Twitter too' },
    ],
  };
}

function buildSocialPostWorkflow(existingNodes: any[]) {
  const baseY = 80;
  const now = Date.now();
  const toolCalls = [
    {
      id: 'tc_1', name: 'add_node',
      input: { type: 'schedule_trigger', config: { schedule: 'every day at 9am' } },
      result: { nodeId: `node_${now}_1`, type: 'schedule_trigger', label: 'Schedule', emoji: '[clock]', config: { schedule: 'every day at 9am' }, position: { x: 80, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_2', name: 'add_node',
      input: { type: 'claude_chat', config: { prompt: 'Generate an inspiring motivational quote with a relevant emoji. Keep it under 280 characters.' } },
      result: { nodeId: `node_${now}_2`, type: 'claude_chat', label: 'Claude AI', emoji: '[brain]', config: { prompt: 'Generate an inspiring motivational quote. Keep it under 280 characters.' }, position: { x: 240, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_3', name: 'add_node',
      input: { type: 'post_x', config: {} },
      result: { nodeId: `node_${now}_3`, type: 'post_x', label: 'Post to X', emoji: '[bird]', config: {}, position: { x: 400, y: 150 } },
      status: 'done',
    },
  ];

  return {
    response: `[bird] Here's your social media agent:\n\n1. [clock] **Schedule** — Every morning at 9am\n2. [brain] **Claude AI** — Generates a motivational quote\n3. [bird] **Post to X** — Publishes it on Twitter/X\n\nI named it **[sparkle] Daily Inspiration Bot**!\n\n[warn] To post to X, you'll need to connect your Twitter account. Want me to help with that?`,
    toolCalls,
    workflowName: '[sparkle] Daily Inspiration Bot',
    workflowEmoji: '[sparkle]',
    buttons: [
      { label: '[key] Connect Twitter', action: 'How do I connect my Twitter account?' },
      { label: '[>] Run Test', action: 'Run the workflow to test it' },
    ],
  };
}

function buildWebMonitorWorkflow(existingNodes: any[]) {
  const baseY = 80;
  const now = Date.now();
  const toolCalls = [
    {
      id: 'tc_1', name: 'add_node',
      input: { type: 'schedule_trigger', config: { schedule: 'every hour' } },
      result: { nodeId: `node_${now}_1`, type: 'schedule_trigger', label: 'Schedule', emoji: '[clock]', config: { schedule: 'every hour' }, position: { x: 80, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_2', name: 'add_node',
      input: { type: 'web_scraper', config: { url: 'https://example.com' } },
      result: { nodeId: `node_${now}_2`, type: 'web_scraper', label: 'Web Scraper', emoji: '[spider]', config: { url: 'https://example.com' }, position: { x: 240, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_3', name: 'add_node',
      input: { type: 'if_else', config: { condition: 'content has changed since last check' } },
      result: { nodeId: `node_${now}_3`, type: 'if_else', label: 'If/Else', emoji: '[branch]', config: { condition: 'content has changed' }, position: { x: 400, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_4', name: 'add_node',
      input: { type: 'send_telegram', config: { message: '[alert] Website changed! Check it out.' } },
      result: { nodeId: `node_${now}_4`, type: 'send_telegram', label: 'Send Telegram', emoji: '[send]', config: { message: '[alert] Website changed!' }, position: { x: 560, y: 150 } },
      status: 'done',
    },
  ];

  return {
    response: `[search] Building your web monitor:\n\n1. [clock] **Schedule** — Checks every hour\n2. [spider] **Web Scraper** — Fetches the page content\n3. [branch] **If/Else** — Checks if anything changed\n4. [send] **Send Telegram** — Alerts you if there's a change\n\nYour **[search] Web Watchdog** is ready! What URL should I monitor?`,
    toolCalls,
    workflowName: '[search] Web Watchdog',
    workflowEmoji: '[search]',
    buttons: [
      { label: '[link] Set URL', action: 'Set the URL to monitor to https://example.com/pricing' },
      { label: '[>] Run Test', action: 'Run a test of the web monitor' },
    ],
  };
}

function simulateRun(nodes: any[]) {
  return {
    response: `[>] **Running your workflow!**\n\nWatch the canvas — you'll see each node light up as it executes. Check the **Inspector** panel on the right to see the live timeline, API calls, and data flowing between nodes.\n\n${nodes.length === 0 ? "[warn] Hmm, the canvas is empty! Tell me what you'd like to build first." : "[video] Execution started! Each node will turn green as it completes."}`,
    toolCalls: nodes.length > 0 ? [{ id: 'tc_run', name: 'run_workflow', input: { test_mode: true }, result: { success: true }, status: 'done' }] : [],
    buttons: nodes.length > 0 ? [
      { label: '[chart] View Results', action: 'Show me the results of the workflow run' },
    ] : [
      { label: '[joke] Daily joke by email', action: 'Send me a daily joke by email every morning at 8am' },
    ],
  };
}

function buildScriptToVideoWorkflow(existingNodes: any[]) {
  const baseY = 80;
  const now = Date.now();
  const taskList = [
    { id: 'task_1', title: 'Parse your script into scenes & shots' },
    { id: 'task_2', title: 'Generate element references for consistency' },
    { id: 'task_3', title: 'Set up photo generation pipeline' },
    { id: 'task_4', title: 'Set up video generation pipeline' },
    { id: 'task_5', title: 'Set up voiceover generation' },
    { id: 'task_6', title: 'Connect orchestrator to run everything' },
    { id: 'task_7', title: 'Add final video compiler to merge all shots' },
    { id: 'task_8', title: 'Name your project' },
  ];
  const toolCalls = [
    {
      id: 'tc_1', name: 'add_node',
      input: { type: 'script_parser', config: { format: 'auto' } },
      result: { nodeId: `node_${now}_1`, type: 'script_parser', label: 'Script Parser', emoji: '[scroll]', config: { format: 'auto' }, position: { x: 80, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_2', name: 'add_node',
      input: { type: 'element_reference', config: { model: 'flux-pro' } },
      result: { nodeId: `node_${now}_2`, type: 'element_reference', label: 'Element Reference', emoji: '[masks]', config: { model: 'flux-pro' }, position: { x: 240, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_3', name: 'add_node',
      input: { type: 'photo_generator', config: { model: 'flux-pro', width: 1920, height: 1080 } },
      result: { nodeId: `node_${now}_3`, type: 'photo_generator', label: 'Photo Generator', emoji: '[photo]', config: { model: 'flux-pro', width: 1920, height: 1080 }, position: { x: 400, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_4', name: 'add_node',
      input: { type: 'video_generator', config: { model: 'kling', duration: 4 } },
      result: { nodeId: `node_${now}_4`, type: 'video_generator', label: 'Video Generator', emoji: '[video]', config: { model: 'kling', duration: 4 }, position: { x: 560, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_5', name: 'add_node',
      input: { type: 'voiceover_generator', config: { model: 'elevenlabs', voice: 'adam' } },
      result: { nodeId: `node_${now}_5`, type: 'voiceover_generator', label: 'Voiceover Generator', emoji: '[voice]', config: { model: 'elevenlabs', voice: 'adam' }, position: { x: 720, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_6', name: 'add_node',
      input: { type: 'project_orchestrator', config: { projectName: 'My Video Project', photoModel: 'flux-pro', videoModel: 'kling', voiceModel: 'elevenlabs' } },
      result: { nodeId: `node_${now}_6`, type: 'project_orchestrator', label: 'Project Orchestrator', emoji: '[target]', config: { projectName: 'My Video Project', photoModel: 'flux-pro', videoModel: 'kling', voiceModel: 'elevenlabs' }, position: { x: 880, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_6b', name: 'add_node',
      input: { type: 'final_video_compiler', config: { transition: 'fade', outputResolution: '1920x1080', outputFormat: 'mp4', addCaptions: 'no', mode: 'cloudinary' } },
      result: { nodeId: `node_${now}_7`, type: 'final_video_compiler', label: 'Final Video Compiler', emoji: '[film]', config: { transition: 'fade', outputResolution: '1920x1080', outputFormat: 'mp4', addCaptions: 'no', mode: 'cloudinary' }, position: { x: 1040, y: 150 } },
      status: 'done',
    },
    // Connect all nodes
    { id: 'tc_7', name: 'connect_nodes', input: { from_node_id: `node_${now}_1`, to_node_id: `node_${now}_2` }, result: { success: true }, status: 'done' },
    { id: 'tc_8', name: 'connect_nodes', input: { from_node_id: `node_${now}_2`, to_node_id: `node_${now}_3` }, result: { success: true }, status: 'done' },
    { id: 'tc_9', name: 'connect_nodes', input: { from_node_id: `node_${now}_3`, to_node_id: `node_${now}_4` }, result: { success: true }, status: 'done' },
    { id: 'tc_10', name: 'connect_nodes', input: { from_node_id: `node_${now}_4`, to_node_id: `node_${now}_5` }, result: { success: true }, status: 'done' },
    { id: 'tc_11', name: 'connect_nodes', input: { from_node_id: `node_${now}_5`, to_node_id: `node_${now}_6` }, result: { success: true }, status: 'done' },
    { id: 'tc_12', name: 'connect_nodes', input: { from_node_id: `node_${now}_6`, to_node_id: `node_${now}_7` }, result: { success: true }, status: 'done' },
  ];

  return {
    response: `[video] **Building your Script-to-Video Pipeline!**\n\nHere's what I've set up:\n\n1. [scroll] **Script Parser** — Parses your script into scenes & shots, detects @Element tags\n2. [masks] **Element Reference** — Generates consistent character/location reference images via fal.ai\n3. [photo] **Photo Generator** — Creates a still photo for each shot (Flux Pro)\n4. [video] **Video Generator** — Turns each photo into a video clip (Kling)\n5. [voice] **Voiceover Generator** — Generates narration audio (ElevenLabs)\n6. [target] **Project Orchestrator** — Runs everything in order, saves to Cloudinary\n7. [film] **Final Video Compiler** — Merges all shots into one video with fade transitions, syncs voiceovers, and uploads the final MP4\n\nAll assets will be organized in Cloudinary folders by scene/shot. The compiler uses Cloudinary's splice API for fast, free merging — or can switch to FFmpeg for advanced edits.\n\n**To get started:**\n- Paste your script into the Script Parser node\n- Or upload a .txt file\n- The orchestrator + compiler will handle everything else!\n\n**Estimated cost:** Depends on shot count (~$0.50/shot for photo+video+voice, compilation is free via Cloudinary)\n\n[warn] You'll need **fal.ai** and **Cloudinary** API keys configured. Want me to help with that?`,
    toolCalls,
    taskList,
    workflowName: '[video] Script to Video Pipeline',
    workflowEmoji: '[video]',
    buttons: [
      { label: 'Paste Script', action: 'I want to paste my script now' },
      { label: '[key] Add Credentials', action: 'How do I add my fal.ai and Cloudinary API keys?' },
      { label: '[gear] Change Models', action: 'What other models can I use for photo/video/voice generation?' },
    ],
  };
}

function buildGenericWorkflow(message: string, existingNodes: any[]) {
  const now = Date.now();
  const toolCalls = [
    {
      id: 'tc_1', name: 'add_node',
      input: { type: 'manual_trigger', config: {} },
      result: { nodeId: `node_${now}_1`, type: 'manual_trigger', label: 'Manual Trigger', emoji: '[click]', config: {}, position: { x: 80, y: 150 } },
      status: 'done',
    },
    {
      id: 'tc_2', name: 'add_node',
      input: { type: 'claude_chat', config: { prompt: message } },
      result: { nodeId: `node_${now}_2`, type: 'claude_chat', label: 'Claude AI', emoji: '[brain]', config: { prompt: message }, position: { x: 240, y: 150 } },
      status: 'done',
    },
  ];

  return {
    response: `I've started building your workflow! [rocket]\n\n1. [click] **Manual Trigger** — You'll click to start it\n2. [brain] **Claude AI** — Will process your request\n\nThis is a starting point. Tell me more about what you want this agent to do, and I'll add more steps!\n\nFor example:\n- Where should the result go? (email, Twitter, file, etc.)\n- Should it run on a schedule or manually?\n- Do you need any data from the web?`,
    toolCalls,
    workflowName: '[bot] My Agent',
    workflowEmoji: '[bot]',
  };
}
