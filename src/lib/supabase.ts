import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Database types (matches Supabase schema)
export interface DbWorkflow {
  id: string;
  user_id?: string;
  name: string;
  emoji: string;
  nodes: any; // JSON
  edges: any; // JSON
  created_at: string;
  updated_at: string;
}

export interface DbChatMessage {
  id: string;
  workflow_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any; // JSON
  buttons?: any; // JSON
  video_url?: string;
  video_label?: string;
  created_at: string;
}

export interface DbExecution {
  id: string;
  workflow_id: string;
  status: 'running' | 'success' | 'error';
  started_at: string;
  completed_at?: string;
  events?: any; // JSON
  cost?: number;
}

export interface DbCredential {
  id: string;
  user_id?: string;
  service: string;
  label: string;
  encrypted_data?: string;
  created_at: string;
}

export interface DbAsset {
  id: string;
  project_id: string;
  type: 'photo' | 'video' | 'audio' | 'other';
  cloudinary_public_id: string;
  cloudinary_url: string;
  thumbnail_url: string;
  filename: string;
  scene?: string;
  shot?: string;
  prompt?: string;
  model?: string;
  cost?: number;
  duration_seconds?: number;
  file_size?: number;
  width?: number;
  height?: number;
  tags?: string[];
  starred: boolean;
  status: 'ready' | 'processing' | 'failed';
  created_at: string;
}

// ─── Helper functions ────────────────────────────────────────

export async function getWorkflows() {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as DbWorkflow[];
}

export async function getWorkflow(id: string) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as DbWorkflow;
}

export async function saveWorkflow(workflow: Partial<DbWorkflow> & { id: string }) {
  const { data, error } = await supabase
    .from('workflows')
    .upsert({
      ...workflow,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbWorkflow;
}

export async function deleteWorkflow(id: string) {
  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getChatMessages(workflowId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as DbChatMessage[];
}

export async function saveChatMessage(message: Omit<DbChatMessage, 'created_at'>) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  return data as DbChatMessage;
}

export async function getExecutions(workflowId: string) {
  const { data, error } = await supabase
    .from('executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data as DbExecution[];
}

export async function getAssets(projectId?: string) {
  let query = supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data as DbAsset[];
}
