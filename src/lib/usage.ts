/**
 * Daily free allowance — server-side ledger.
 *
 * Kept in a JSON file the app owns (not in Supabase), because users can edit their own
 * `executions` rows through RLS and would be able to reset their spend.
 * Single Node process → an in-memory copy guarded per user is enough.
 */

import { readFileSync } from 'node:fs';
import { mkdir, writeFile, statfs } from 'node:fs/promises';
import path from 'node:path';
import { MEDIA_DIR } from './local-storage';

const LEDGER_FILE = process.env.USAGE_FILE || '/var/lib/agentflow/usage.json';
export const DAILY_LIMIT_USD = Number(process.env.DAILY_LIMIT_USD || 10);
// The day resets at local midnight for this UTC offset (Bangladesh = +6)
const RESET_OFFSET_H = Number(process.env.DAILY_RESET_UTC_OFFSET_HOURS || 6);
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const MIN_FREE_DISK_GB = Number(process.env.MIN_FREE_DISK_GB || 3);

type Day = { day: string; spent: number; reserved: Record<string, number> };
type Ledger = Record<string, Day>;

const g = globalThis as unknown as { __agentflowLedger?: Ledger };
function ledger(): Ledger {
  if (!g.__agentflowLedger) {
    try { g.__agentflowLedger = JSON.parse(readFileSync(LEDGER_FILE, 'utf8')); }
    catch { g.__agentflowLedger = {}; }
    // No run survives a restart, so reservations from a previous process are stale
    for (const d of Object.values(g.__agentflowLedger!)) d.reserved = {};
  }
  return g.__agentflowLedger!;
}

let saving = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(ledger());
  saving = saving.then(async () => {
    await mkdir(path.dirname(LEDGER_FILE), { recursive: true });
    await writeFile(LEDGER_FILE, snapshot);
  }).catch(err => console.error('[usage] could not save ledger:', err));
}

export function today(): string {
  return new Date(Date.now() + RESET_OFFSET_H * 3600_000).toISOString().slice(0, 10);
}

/** Next reset time as an ISO string (local midnight for RESET_OFFSET_H). */
export function nextReset(): string {
  const local = new Date(Date.now() + RESET_OFFSET_H * 3600_000);
  local.setUTCHours(24, 0, 0, 0);
  return new Date(local.getTime() - RESET_OFFSET_H * 3600_000).toISOString();
}

function dayFor(userId: string): Day {
  const all = ledger();
  const d = all[userId];
  if (!d || d.day !== today()) {
    // New day: keep reservations of runs still in flight, drop yesterday's spend
    all[userId] = { day: today(), spent: 0, reserved: d?.reserved || {} };
  }
  return all[userId];
}

export function isOwner(email?: string | null): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase());
}

export interface UsageInfo {
  unlimited: boolean;
  limit: number;
  used: number;       // finished spend + money reserved by running runs
  remaining: number;
  resetsAt: string;
}

export function getUsage(userId: string, email?: string | null): UsageInfo {
  const d = dayFor(userId);
  const used = d.spent + Object.values(d.reserved).reduce((a, b) => a + b, 0);
  const unlimited = isOwner(email);
  return {
    unlimited,
    limit: DAILY_LIMIT_USD,
    used: round(used),
    remaining: unlimited ? Infinity : Math.max(0, round(DAILY_LIMIT_USD - used)),
    resetsAt: nextReset(),
  };
}

/**
 * Reserve the estimated cost before a run starts. Returns the budget the run may spend,
 * or null when the run would go over today's allowance.
 */
export function reserve(userId: string, email: string | null | undefined, runId: string, estimate: number): number | null {
  const usage = getUsage(userId, email);
  if (usage.unlimited) {
    dayFor(userId).reserved[runId] = estimate;
    persist();
    return Infinity;
  }
  if (estimate > usage.remaining) return null;
  dayFor(userId).reserved[runId] = estimate;
  persist();
  return usage.remaining; // the run may use what is left, the engine stops it at this ceiling
}

/**
 * How much this run may spend in total right now: today's limit minus finished spend and
 * minus what OTHER runs still hold. Re-checked before every paid node, so parallel runs
 * can't add up past the limit.
 */
export function allowanceFor(userId: string, email: string | null | undefined, runId: string): number {
  if (isOwner(email)) return Infinity;
  const d = dayFor(userId);
  const others = Object.entries(d.reserved).filter(([id]) => id !== runId).reduce((a, [, v]) => a + v, 0);
  return Math.max(0, DAILY_LIMIT_USD - d.spent - others);
}

/** Replace the reservation with what the run really cost. */
export function settle(userId: string, runId: string, actualCost: number) {
  const d = dayFor(userId);
  delete d.reserved[runId];
  d.spent = round(d.spent + Math.max(0, actualCost || 0));
  persist();
}

function round(n: number) { return Math.round(n * 1000) / 1000; }

// ─── Disk guard ──────────────────────────────────────────────────────
// The VPS also runs other production services, so a full disk would take them down too.
export async function diskStatus(): Promise<{ freeGb: number; totalGb: number; ok: boolean; minFreeGb: number }> {
  try {
    await mkdir(MEDIA_DIR, { recursive: true });
    const s = await statfs(MEDIA_DIR);
    const freeGb = (s.bavail * s.bsize) / 1024 ** 3;
    const totalGb = (s.blocks * s.bsize) / 1024 ** 3;
    return { freeGb: Math.round(freeGb * 10) / 10, totalGb: Math.round(totalGb), ok: freeGb >= MIN_FREE_DISK_GB, minFreeGb: MIN_FREE_DISK_GB };
  } catch {
    return { freeGb: NaN, totalGb: NaN, ok: true, minFreeGb: MIN_FREE_DISK_GB };
  }
}
