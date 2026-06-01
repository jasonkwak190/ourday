// Probe policies + grants using service role pg_catalog queries
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sr = createClient(URL_, SR, { auth: { persistSession: false } });

// supabase-js doesn't expose pg_catalog directly; use REST via PostgREST? not possible for pg_*
// Instead, try the REST .rpc or a direct insert with service role to confirm column shapes
async function checkInsertableColumns() {
  // Insert reports as service role -- this should always work (service role bypasses RLS)
  const { data, error } = await sr.from('reports').insert({
    target_type: 'guestbook',
    target_id: '00000000-0000-0000-0000-000000000001',
    reason: 'service-role probe (delete me)',
    reporter_name: 'probe',
  }).select('id').single();
  console.log('SR reports insert:', error?.message || `OK id=${data?.id}`);
  if (data?.id) await sr.from('reports').delete().eq('id', data.id);

  // Check if a report row can SELECT with anon. (Should be 0.)
  const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } });

  // Try with explicit minimal payload but using the 'public' headers
  const resp = await fetch(`${URL_}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      target_type: 'guestbook',
      target_id: '00000000-0000-0000-0000-000000000001',
      reason: 'raw anon insert probe',
    }),
  });
  console.log('raw anon POST /rest/v1/reports →', resp.status, await resp.text());

  const resp2 = await fetch(`${URL_}/rest/v1/invitation_guestbook`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      invitation_id: 'c9ed9ffb-3dc2-4ab9-9c36-d4076d7c1988',
      name: 'probe',
      message: 'probe message',
    }),
  });
  console.log('raw anon POST /rest/v1/invitation_guestbook →', resp2.status, await resp2.text());
}

await checkInsertableColumns();
