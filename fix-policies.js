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
  // Chat messages policies
  const chatPolicies = [
    "DROP POLICY IF EXISTS cm_sel ON public.chat_messages; CREATE POLICY cm_sel ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS cm_ins ON public.chat_messages; CREATE POLICY cm_ins ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS cm_all ON public.chat_messages; CREATE POLICY cm_all ON public.chat_messages FOR ALL USING (true);",
  ];
  
  // Executions policies
  const execPolicies = [
    "DROP POLICY IF EXISTS ex_sel ON public.executions; CREATE POLICY ex_sel ON public.executions FOR SELECT USING (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS ex_ins ON public.executions; CREATE POLICY ex_ins ON public.executions FOR INSERT WITH CHECK (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS ex_all ON public.executions; CREATE POLICY ex_all ON public.executions FOR ALL USING (true);",
  ];
  
  // Credentials policies
  const credPolicies = [
    "DROP POLICY IF EXISTS cr_sel ON public.credentials; CREATE POLICY cr_sel ON public.credentials FOR SELECT USING (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS cr_ins ON public.credentials; CREATE POLICY cr_ins ON public.credentials FOR INSERT WITH CHECK (auth.uid() = user_id);",
    "DROP POLICY IF EXISTS cr_all ON public.credentials; CREATE POLICY cr_all ON public.credentials FOR ALL USING (auth.uid() = user_id);",
  ];
  
  for (const sql of [...chatPolicies, ...execPolicies, ...credPolicies]) {
    await run(sql, sql.match(/CREATE POLICY (\w+)/)?.[1] || 'policy');
  }
  
  console.log('\nDone!');
})();
