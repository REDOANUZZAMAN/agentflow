/**
 * Runs in progress, so a Stop request can reach the run that is executing.
 * Lives on globalThis so every route handler in this process sees the same map.
 */

type Run = { controller: AbortController; userId: string };

const g = globalThis as unknown as { __agentflowRuns?: Map<string, Run> };
const runs = (g.__agentflowRuns ??= new Map());

export function registerRun(runId: string, userId: string): AbortController {
  const controller = new AbortController();
  runs.set(runId, { controller, userId });
  return controller;
}

export function finishRun(runId: string) {
  runs.delete(runId);
}

/** Stop a run. Only the user who started it may stop it. */
export function cancelRun(runId: string, userId: string): boolean {
  const run = runs.get(runId);
  if (!run || run.userId !== userId) return false;
  run.controller.abort(new Error('Stopped by user'));
  return true;
}
