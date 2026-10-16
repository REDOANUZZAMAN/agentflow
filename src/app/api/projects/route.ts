import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase-server';
import { rm } from 'node:fs/promises';
import { resolveMediaPath } from '@/lib/local-storage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/projects — real workflow list from Supabase
export async function GET() {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const userId = user.id;

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
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

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
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow: data });
}

// DELETE /api/projects — delete a workflow, its asset rows and its media files on disk
export async function DELETE(req: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from('workflows').select('id').eq('id', workflowId).eq('user_id', user.id).maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Delete assets first
  await supabase.from('assets').delete().eq('workflow_id', workflowId).eq('user_id', user.id);
  // Delete the workflow
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId).eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // All of a workflow's runs are stored under wf/<workflowId>/ (see mediaRoot in execution-engine)
  const folder = resolveMediaPath(`wf/${workflowId}`);
  if (folder && /^[0-9a-f-]{36}$/i.test(workflowId)) {
    await rm(folder, { recursive: true, force: true }).catch(err => console.warn('Could not delete media for', workflowId, err));
  }

  return NextResponse.json({ success: true });
}
