const token = 'sbp_e352aabac61b193467b9592befa297ee43d44222';
const ref = 'outlngxqtjxatdjdusom';
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function run(sql, label) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  console.log(`${label}: ${r.status} ${r.ok ? 'OK' : 'FAIL: ' + text.slice(0, 200)}`);
}

(async () => {
  // Add missing columns to workflows table
  await run("ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';", 'add status');
  await run("ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';", 'add description');
  await run("ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;", 'add is_template');
  await run("ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;", 'add last_run_at');
  await run("ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS run_count INT DEFAULT 0;", 'add run_count');
  
  // Create chat_messages table if missing
  await run(`CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL DEFAULT '',
    tool_calls JSONB,
    buttons JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
  );`, 'create chat_messages');
  
  await run("ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;", 'rls chat');
  
  // Create executions table if missing
  await run(`CREATE TABLE IF NOT EXISTS public.executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    events JSONB DEFAULT '[]'::jsonb,
    cost DECIMAL(10,6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  );`, 'create executions');
  
  await run("ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;", 'rls exec');
  
  // Create credentials table if missing
  await run(`CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service TEXT NOT NULL,
    label TEXT NOT NULL,
    encrypted_data TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );`, 'create credentials');
  
  await run("ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;", 'rls creds');
  
  console.log('\nDone!');
})();
