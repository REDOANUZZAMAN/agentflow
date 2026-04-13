const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) { console.error('Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF env vars'); process.exit(1); }
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function run(sql, label) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    const text = await r.text();
    console.log(label + ': ' + r.status + (r.ok ? ' OK' : ' FAIL: ' + text.slice(0, 150)));
  } catch(e) { console.log(label + ': ERR ' + e.message); }
}

(async () => {
  // Policies - drop then create (IF NOT EXISTS not supported for policies)
  const policies = [
    ["DROP POLICY IF EXISTS p_sel ON public.profiles; CREATE POLICY p_sel ON public.profiles FOR SELECT USING (auth.uid() = id);", 'pol prof sel'],
    ["DROP POLICY IF EXISTS p_upd ON public.profiles; CREATE POLICY p_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);", 'pol prof upd'],
    ["DROP POLICY IF EXISTS w_sel ON public.workflows; CREATE POLICY w_sel ON public.workflows FOR SELECT USING (auth.uid() = user_id);", 'pol wf sel'],
    ["DROP POLICY IF EXISTS w_ins ON public.workflows; CREATE POLICY w_ins ON public.workflows FOR INSERT WITH CHECK (auth.uid() = user_id);", 'pol wf ins'],
    ["DROP POLICY IF EXISTS w_upd ON public.workflows; CREATE POLICY w_upd ON public.workflows FOR UPDATE USING (auth.uid() = user_id);", 'pol wf upd'],
    ["DROP POLICY IF EXISTS w_del ON public.workflows; CREATE POLICY w_del ON public.workflows FOR DELETE USING (auth.uid() = user_id);", 'pol wf del'],
    ["DROP POLICY IF EXISTS e_sel ON public.executions; CREATE POLICY e_sel ON public.executions FOR SELECT USING (auth.uid() = user_id);", 'pol exec sel'],
    ["DROP POLICY IF EXISTS e_ins ON public.executions; CREATE POLICY e_ins ON public.executions FOR INSERT WITH CHECK (auth.uid() = user_id);", 'pol exec ins'],
    ["DROP POLICY IF EXISTS c_sel ON public.chat_messages; CREATE POLICY c_sel ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);", 'pol chat sel'],
    ["DROP POLICY IF EXISTS c_ins ON public.chat_messages; CREATE POLICY c_ins ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);", 'pol chat ins'],
    ["DROP POLICY IF EXISTS pr_all ON public.projects; CREATE POLICY pr_all ON public.projects FOR ALL USING (auth.uid() = user_id);", 'pol proj all'],
  ];

  for (const [sql, label] of policies) {
    await run(sql, label);
  }

  // Handle new user trigger  
  await run(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', ''), COALESCE(new.raw_user_meta_data->>'avatar_url', ''));
  RETURN new;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
  `, 'trigger fn');

  await run('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;', 'drop trigger');
  await run('CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();', 'create trigger');

  // Indexes
  await run('CREATE INDEX IF NOT EXISTS idx_wf_uid ON public.workflows(user_id);', 'idx wf');
  await run('CREATE INDEX IF NOT EXISTS idx_exec_uid ON public.executions(user_id);', 'idx exec');

  console.log('All done!');
})();
