import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/supabase-server';
import { cancelRun } from '@/lib/run-registry';

// POST /api/execute/cancel — { executionId } → stops that run if it belongs to the caller
export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { executionId } = await req.json().catch(() => ({}));
  if (!executionId) return Response.json({ error: 'executionId required' }, { status: 400 });

  const stopped = cancelRun(String(executionId), user.id);
  return Response.json({ stopped }, { status: stopped ? 200 : 404 });
}
