import { requireUser } from '@/lib/supabase-server';
import { getUsage, diskStatus } from '@/lib/usage';

// GET /api/usage — today's free allowance; disk space is shown to the owner only
export async function GET() {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const usage = getUsage(user.id, user.email);
  const body: Record<string, unknown> = { ...usage, remaining: usage.unlimited ? null : usage.remaining };
  if (usage.unlimited) body.disk = await diskStatus();
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
