import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/projects — real workflow list from Supabase
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('workflows')
    .select('id, name, emoji, status, nodes, edges, run_count, last_run_at, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows: data || [] });
}

// PATCH /api/projects — rename a workflow
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { workflowId, name } = body;

  if (!workflowId || !name?.trim()) {
    return NextResponse.json({ error: 'workflowId and name required' }, { status: 400 });
  }

  const trimmed = name.trim().slice(0, 60);

  const { data, error } = await supabase
    .from('workflows')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', workflowId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow: data });
}

// DELETE /api/projects — delete a workflow and its assets
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
  }

  // Delete assets first
  await supabase.from('assets').delete().eq('workflow_id', workflowId);
  // Delete the workflow
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
