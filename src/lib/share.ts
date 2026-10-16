import { createHmac, timingSafeEqual } from 'node:crypto';

// Share links are <executionId>.<signature>. Only the server can sign, so links can't be
// guessed for other runs. Changing SHARE_SECRET turns off every existing link.
function secret(): string {
  const s = process.env.SHARE_SECRET;
  if (!s || s.length < 16) throw new Error('SHARE_SECRET is not set');
  return s;
}

function sign(executionId: string): string {
  return createHmac('sha256', secret()).update(`share:${executionId}`).digest('base64url').slice(0, 22);
}

export function makeShareToken(executionId: string): string {
  return `${executionId}.${sign(executionId)}`;
}

/** Returns the executionId when the token is genuine, otherwise null. */
export function readShareToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  let expected: Buffer;
  try { expected = Buffer.from(sign(id)); } catch { return null; }
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}
