// Probe authenticated SELECT on invitation_guestbook
import { createClient } from '@supabase/supabase-js';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sr = createClient(URL_, SR, { auth: { persistSession: false } });

// Find the invitation_id and check whether authenticated test user can read guestbook
const c = createClient(URL_, ANON, { auth: { persistSession: false } });
const { data: signin, error } = await c.auth.signInWithPassword({
  email: 'test_groom_ourday@mailinator.com',
  password: 'Test1234!',
});
console.log('signin:', error?.message || `uid=${signin.user.id}`);

// Look up couple_id and invitation
const { data: userRow } = await c.from('users').select('couple_id').eq('id', signin.user.id).single();
console.log('couple_id:', userRow?.couple_id);

const { data: inv } = await c.from('invitations').select('id,slug').eq('couple_id', userRow.couple_id).maybeSingle();
console.log('invitation:', inv);

if (inv?.id) {
  const { data: gb, error: gbErr } = await c
    .from('invitation_guestbook')
    .select('id, name, message, created_at')
    .eq('invitation_id', inv.id)
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('authed guestbook select:', gbErr?.message || `rows=${gb?.length}`);
} else {
  // no invitation for test couple — try any invitation_id from SR
  const { data: anyInv } = await sr.from('invitations').select('id').limit(1).single();
  const { data: gb, error: gbErr } = await c
    .from('invitation_guestbook')
    .select('id')
    .eq('invitation_id', anyInv.id)
    .limit(1);
  console.log('authed cross-couple guestbook select:', gbErr?.message || `rows=${gb?.length}`);
}
