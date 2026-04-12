const token = 'sbp_e352aabac61b193467b9592befa297ee43d44222';
const ref = 'outlngxqtjxatdjdusom';
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function query(sql, label) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  console.log(`\n=== ${label} (${r.status}) ===`);
  console.log(text);
}

(async () => {
  await query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='workflows' ORDER BY ordinal_position;", 'Workflow columns');
  
  await query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='workflows';", 'Workflow policies');
})();
