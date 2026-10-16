import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase-server';
import { makeShareToken } from '@/lib/share';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// POST /api/share — { executionId } → public link to that run's final video (owner only)
export async function POST(req: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { executionId } = await req.json().catch(() => ({}));
  if (!executionId) return Response.json({ error: 'executionId required' }, { status: 400 });

  const { data: run } = await supabaseAdmin
    .from('executions').select('id').eq('id', executionId).eq('user_id', user.id).maybeSingle();
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });

  const base = (process.env.PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, '');
  return Response.json({ url: `${base}/share/${makeShareToken(run.id)}` });
}
