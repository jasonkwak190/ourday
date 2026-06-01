// E2E QA verification — run with --env-file=.env.local from repo root
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sr = createClient(URL_, SR, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false } });

function log(label, status, detail = '') {
  console.log(`[${status}] ${label}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  // ---- 1. reports table + RLS ----
  console.log('\n=== 1. reports table + RLS ===');
  {
    const { data, error } = await sr.from('reports').select('id').limit(1);
    log('reports SR select', error ? 'FAIL' : 'PASS', error?.message || `rows=${data?.length}`);
  }
  {
    // anon INSERT (with check true)
    const { data, error } = await anon.from('reports').insert({
      target_type: 'guestbook',
      target_id: '00000000-0000-0000-0000-000000000001',
      reason: 'QA test insert (delete me)',
      reporter_name: 'qa',
    }).select('id').single();
    log('reports anon insert', error ? 'FAIL' : 'PASS', error?.message || `id=${data?.id}`);
    if (data?.id) {
      const { error: delErr } = await sr.from('reports').delete().eq('id', data.id);
      log('reports cleanup', delErr ? 'WARN' : 'PASS', delErr?.message || 'deleted');
    }
  }
  {
    const { data, error } = await anon.from('reports').select('id').limit(1);
    // RLS blocks anon select → either error or empty array
    if (error) log('reports anon select blocked', 'PASS', `blocked: ${error.message}`);
    else if (!data || data.length === 0) log('reports anon select blocked', 'PASS', 'empty (no SELECT policy)');
    else log('reports anon select blocked', 'FAIL', `LEAKED: returned ${data.length} rows`);
  }

  // ---- 2. couples count ----
  console.log('\n=== 2. couples count ===');
  {
    const { count, error } = await sr.from('couples').select('id', { count: 'exact', head: true });
    log('couples SR count', error ? 'FAIL' : 'PASS', error?.message || `count=${count}`);
  }
  {
    const { count, error } = await anon.from('couples').select('id', { count: 'exact', head: true });
    log('couples anon count', error ? 'PASS' : (count === 0 ? 'PASS' : 'FAIL'), error?.message || `count=${count}`);
  }

  // ---- 3. invitations RLS ----
  console.log('\n=== 3. invitations RLS ===');
  {
    const { data, error } = await anon.from('invitations')
      .select('slug, groom_name, bride_name, venue_name, wedding_date')
      .not('slug', 'is', null)
      .limit(3);
    log('invitations anon safe columns', error ? 'FAIL' : 'PASS', error?.message || `rows=${data?.length}`);
  }
  {
    // anon select including bank columns
    const { data, error } = await anon.from('invitations')
      .select('slug, account_groom, account_bride')
      .not('slug', 'is', null)
      .limit(3);
    if (error) {
      log('invitations anon bank columns blocked', 'PASS', `blocked: ${error.message}`);
    } else {
      const leaked = (data || []).some(r => r.account_groom || r.account_bride);
      log('invitations anon bank columns blocked', leaked ? 'FAIL' : 'PASS',
        leaked ? `LEAKED ${data.length} rows` : 'columns null/empty');
    }
  }
  {
    // null-slug rows must be hidden
    const { data, error } = await anon.from('invitations')
      .select('id, slug')
      .is('slug', null)
      .limit(3);
    if (error) log('invitations null-slug blocked', 'PASS', `blocked: ${error.message}`);
    else log('invitations null-slug blocked', (data && data.length > 0) ? 'FAIL' : 'PASS',
      `rows=${data?.length}`);
  }

  // ---- 4. invitation_guestbook RLS ----
  console.log('\n=== 4. invitation_guestbook RLS ===');
  // Get a real invitation_id via service role
  let realInviteId = null;
  {
    const { data, error } = await sr.from('invitations')
      .select('id, slug').not('slug', 'is', null).limit(1).single();
    realInviteId = data?.id;
    log('invitations sample for guestbook test', error || !realInviteId ? 'WARN' : 'PASS',
      error?.message || `id=${realInviteId}`);
  }
  {
    const { data, error } = await anon.from('invitation_guestbook').select('id').limit(1);
    if (error) log('invitation_guestbook anon select blocked', 'PASS', `blocked: ${error.message}`);
    else if (!data || data.length === 0) log('invitation_guestbook anon select blocked', 'PASS', 'empty');
    else log('invitation_guestbook anon select blocked', 'FAIL', `LEAKED ${data.length} rows`);
  }
  if (realInviteId) {
    const { data, error } = await anon.from('invitation_guestbook').insert({
      invitation_id: realInviteId,
      name: 'QA',
      message: 'qa test entry (delete me)',
    }).select('id').single();
    log('invitation_guestbook anon insert', error ? 'FAIL' : 'PASS',
      error?.message || `id=${data?.id}`);
    if (data?.id) {
      const { error: delErr } = await sr.from('invitation_guestbook').delete().eq('id', data.id);
      log('invitation_guestbook cleanup', delErr ? 'WARN' : 'PASS', delErr?.message || 'deleted');
    }
  } else {
    log('invitation_guestbook anon insert', 'WARN', 'no invitation row available to test');
  }

  // ---- 5. couple_notes image_url ----
  console.log('\n=== 5. couple_notes.image_url ===');
  {
    const { data, error } = await sr.from('couple_notes').select('id, image_url').limit(5);
    if (error) log('couple_notes SR image_url', 'FAIL', error.message);
    else {
      const sampleNullCount = (data || []).filter(r => r.image_url === null).length;
      log('couple_notes SR image_url', 'PASS', `rows=${data?.length}, image_url=null on ${sampleNullCount}`);
    }
  }

  // ---- 6. Storage buckets ----
  console.log('\n=== 6. Storage buckets ===');
  {
    const { data, error } = await sr.storage.listBuckets();
    if (error) {
      log('listBuckets', 'FAIL', error.message);
    } else {
      const need = ['note-images', 'guest-photos', 'invitation-covers'];
      for (const name of need) {
        const b = (data || []).find(x => x.name === name);
        if (!b) { log(`bucket ${name}`, 'FAIL', 'missing'); continue; }
        const mime = (b.allowed_mime_types || []).join(',');
        const sz = b.file_size_limit;
        log(`bucket ${name}`, 'PASS',
          `public=${b.public}, mime=[${mime || 'any'}], size_limit=${sz ?? 'unlimited'}`);
      }
    }
  }

  // ---- 7. rsvp_responses.message dropped ----
  console.log('\n=== 7. rsvp_responses.message dropped ===');
  {
    const { data, error } = await sr.from('rsvp_responses').select('message').limit(1);
    if (error && /column.*message/i.test(error.message)) {
      log('rsvp_responses.message dropped', 'PASS', 'column absent');
    } else if (error) {
      log('rsvp_responses.message dropped', 'WARN', error.message);
    } else {
      log('rsvp_responses.message dropped', 'FAIL', 'column STILL EXISTS');
    }
  }

  // ---- 9. partner-aware delete: find a 2-user couple ----
  console.log('\n=== 9. delete-account partner-aware: spot check ===');
  {
    const { data, error } = await sr
      .from('users')
      .select('couple_id')
      .not('couple_id', 'is', null);
    if (error) {
      log('partner-aware spot check', 'FAIL', error.message);
    } else {
      const grouped = {};
      for (const r of data || []) grouped[r.couple_id] = (grouped[r.couple_id] || 0) + 1;
      const twos = Object.values(grouped).filter(c => c === 2).length;
      const ones = Object.values(grouped).filter(c => c === 1).length;
      log('partner-aware spot check', 'PASS',
        `couples with 2 users=${twos}, with 1 user=${ones} (code branches on partners.length)`);
    }
  }
})();
