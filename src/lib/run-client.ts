'use client';

/**
 * Browser side of a workflow run: streams /api/execute, updates the canvas/inspector/terminal,
 * and posts the result (with the final video) to the chat. One run per tab at a time.
 */

import type { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Action } from './store';
import type { ChatMessage } from './types';

let current: { executionId?: string; controller: AbortController } | null = null;

export function isRunActive() {
  return !!current;
}

/** Stop the run in this tab — tells the server to cancel its fal.ai jobs, then drops the stream. */
export async function stopCurrentRun() {
  const run = current;
  if (!run) return;
  if (run.executionId) {
    await fetch('/api/execute/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionId: run.executionId }),
    }).catch(() => { /* aborting the stream below also stops it */ });
  }
  run.controller.abort();
}

export interface RunResult {
  executionId?: string;
  success: boolean;
  stopped?: 'cancelled' | 'budget';
  totalCost: number;
  assets: Array<{ type?: string; imageUrl?: string; videoUrl?: string; audioUrl?: string; thumbnailUrl?: string; elementName?: string }>;
  errors: string[];
}

export async function runWorkflow(opts: {
  nodes: any[];
  edges: any[];
  workflowId: string;
  workflowName: string;
  dispatch: Dispatch<Action>;
  addMessage: (m: ChatMessage) => void;
}): Promise<RunResult | null> {
  const { dispatch, addMessage } = opts;
  if (current) return null;

  const controller = new AbortController();
  current = { controller };

  let seq = 0;
  const uid = () => `${Date.now()}_${++seq}_${Math.random().toString(36).slice(2, 6)}`;
  const tlog = (level: any, message: string) =>
    dispatch({ type: 'ADD_TERMINAL_LOG', payload: { id: `tl_${uid()}`, timestamp: new Date(), level, message } });

  dispatch({ type: 'SET_RUNNING', payload: true });
  dispatch({ type: 'CLEAR_EXECUTION_EVENTS' });
  tlog('run', `> Executing workflow: "${opts.workflowName}" — ${opts.nodes.length} nodes`);

  let result: RunResult | null = null;
  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: opts.nodes, edges: opts.edges, workflowId: opts.workflowId }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const err = await response.json().catch(() => ({ error: 'Execution failed' }));
      tlog('fail', ` ${err.error || 'Execution failed'}`);
      addMessage({ id: uuidv4(), role: 'assistant', content: `**Couldn't run the workflow.** ${err.error || 'Execution failed'}`, timestamp: new Date() });
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); continue; }
        if (line === '') { currentEvent = ''; continue; }
        if (!line.startsWith('data: ') || !currentEvent) continue;
        let data: any;
        try { data = JSON.parse(line.slice(6)); } catch { continue; }

        if (currentEvent === 'status' && data.executionId) {
          current.executionId = data.executionId;
          if (data.estimate) tlog('run', `  Estimated cost: $${Number(data.estimate).toFixed(2)}`);
        } else if (currentEvent === 'execution') {
          const ts = new Date(data.timestamp || Date.now());
          const base = { timestamp: ts, nodeId: data.nodeId, nodeName: data.nodeName, data: data.data, duration: data.duration };
          if (data.type === 'node_start' && data.nodeId) {
            dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'running' } });
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_s`, type: 'node_start', ...base } });
            tlog('node', `[${data.nodeName}] starting`);
          } else if (data.type === 'node_end' && data.nodeId) {
            dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'success', output: data.data?.output } });
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_e`, type: 'node_end', ...base } });
            tlog('node', `[${data.nodeName}] done (${((data.duration || 0) / 1000).toFixed(1)}s)`);
          } else if (data.type === 'node_error' && data.nodeId) {
            dispatch({ type: 'SET_NODE_STATUS', payload: { id: data.nodeId, status: 'error' } });
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_err`, type: 'node_error', ...base } });
            tlog('fail', `[${data.nodeName}]  ${data.data?.error}`);
          } else if (data.type === 'log') {
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_log`, type: 'log', ...base } });
            tlog('node', data.data?.message || '');
          } else if (data.type === 'api_call') {
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_api`, type: 'api_call', ...base } });
            tlog('http', `→ ${data.data?.service} ${data.data?.model || ''}`);
          } else if (data.type === 'asset_created') {
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_asset`, type: 'asset_created', ...base } });
            tlog('store', ` ${data.data?.type}: ${data.data?.url}`);
          } else if (data.type === 'workflow_done') {
            dispatch({ type: 'ADD_EXECUTION_EVENT', payload: { id: `evt_${uid()}_done`, type: 'workflow_done', ...base } });
            tlog('run', ` Done! Cost: $${data.data?.totalCost}, ${data.data?.assetCount} assets`);
          }
        } else if (currentEvent === 'result') {
          result = data;
        } else if (currentEvent === 'error') {
          tlog('fail', data.message || 'Unknown error');
        }
        currentEvent = '';
      }
    }
  } catch (err: any) {
    if (controller.signal.aborted) tlog('fail', ' Stopped by you');
    else tlog('fail', ` ${err.message}`);
  } finally {
    current = null;
    dispatch({ type: 'SET_RUNNING', payload: false });
  }

  addMessage(result ? resultMessage(result) : {
    id: uuidv4(), role: 'assistant', timestamp: new Date(),
    content: controller.signal.aborted ? '**Run stopped.** Nothing more will be generated or charged for this run.' : '**The run ended unexpectedly.** Check the Terminal for details.',
  });
  return result;
}

function resultMessage(r: RunResult): ChatMessage {
  const assets = r.assets || [];
  const final = assets.find(a => a.type === 'final_video_compiler' && a.videoUrl);
  const images = assets.filter(a => a.imageUrl).length;
  const clips = assets.filter(a => a.videoUrl && a.type !== 'final_video_compiler').length;
  const audio = assets.filter(a => a.audioUrl).length;

  const title = r.stopped === 'cancelled' ? '**Run stopped.**'
    : r.stopped === 'budget' ? '**Stopped at your daily free limit.**'
    : r.success ? '**Workflow complete!**' : '**Workflow finished with errors.**';
  const parts = [images && `${images} image${images > 1 ? 's' : ''}`, clips && `${clips} clip${clips > 1 ? 's' : ''}`, audio && `${audio} voiceover${audio > 1 ? 's' : ''}`].filter(Boolean);
  let content = `${title}\n\n**Cost:** $${(r.totalCost || 0).toFixed(2)} · **Created:** ${parts.join(', ') || 'no files'}`;
  if (r.errors?.length) content += `\n\n**Problems:**\n${r.errors.map(e => `- ${e}`).join('\n')}`;
  if (!final && assets.length) content += `\n\nAll files are in the **History** tab and the Library.`;

  return {
    id: uuidv4(),
    role: 'assistant',
    content,
    timestamp: new Date(),
    videoUrl: final?.videoUrl,
    videoPoster: final?.thumbnailUrl,
    videoLabel: 'Final video',
    executionId: r.executionId,
    buttons: [{ label: 'Run Again', action: 'Run the workflow again' }, { label: 'Make Changes', action: 'What changes can you make?' }],
  };
}
