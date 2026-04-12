import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/assets — real data from Supabase
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get('workflowId');
  const executionId = searchParams.get('executionId');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '100');

  let query = supabase.from('assets').select('*').order('created_at', { ascending: false }).limit(limit);

  if (workflowId) query = query.eq('workflow_id', workflowId);
  if (executionId) query = query.eq('execution_id', executionId);
  if (type && type !== 'all') query = query.eq('type', type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data || [], total: (data || []).length });
}

// POST /api/assets — create a new asset
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase.from('assets').insert({
    workflow_id: body.workflow_id || null,
    execution_id: body.execution_id || null,
    user_id: body.user_id,
    type: body.type || 'photo',
    cloudinary_public_id: body.cloudinary_public_id,
    cloudinary_url: body.cloudinary_url,
    thumbnail_url: body.thumbnail_url,
    filename: body.filename,
    scene: body.scene,
    shot: body.shot,
    prompt: body.prompt,
    negative_prompt: body.negative_prompt,
    model: body.model,
    cost: body.cost,
    duration_seconds: body.duration_seconds,
    file_size: body.file_size,
    width: body.width,
    height: body.height,
    tags: body.tags || [],
    starred: false,
    status: 'ready',
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
