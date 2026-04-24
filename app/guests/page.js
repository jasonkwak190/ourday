'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { copyToClipboard } from '@/lib/clipboard';
import BottomNav from '@/components/BottomNav';
import { Copy, Check, UserPlus, ClipboardList, UserCheck, BookOpen, Pencil, Trash2 } from 'lucide-react';
import Icon from '@/components/Icon';
import EmptyState from '@/components/EmptyState';
import InvitationTab from '@/components/InvitationTab';

const RELATIONS = ['가족', '친척', '친구', '직장', '지인', '기타'];
const EMPTY_FORM = { name: '', side: 'groom', relation: '친구', meal_count: 1, phone: '', memo: '' };
const SIDE_LABEL = { groom: '신랑측', bride: '신부측' };
const SIDE_COLOR = { groom: 'var(--rose)', bride: 'var(--purple)' };

export default function GuestsPage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(true);
  const [coupleId, setCoupleId]   = useState(null);
  const [guests, setGuests]       = useState([]);
  const [rsvpList, setRsvpList]   = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);

  // 탭: 'list' | 'rsvp' | 'invite'
  const [tab, setTab]             = useState('list');
  const [filter, setFilter]       = useState('all');

  // 추가/수정 폼
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [menuId, setMenuId]       = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState(EMPTY_FORM);

  // 축의금 인라인 편집
  const [giftEditId, setGiftEditId] = useState(null);
  const [giftInput, setGiftInput]   = useState('');

  // RSVP
  const [rsvpCopied, setRsvpCopied] = useState(false);
  const [addingRsvpId, setAddingRsvpId] = useState(null); // RSVP → 명단 추가 중

  // 방명록
  const [guestbook, setGuestbook] = useState([]);
  const [invitationId, setInvitationId] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: user } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();
      if (!user?.couple_id) { router.push('/setup'); return; }

      const cId = user.couple_id;
      setCoupleId(cId);

      const [guestRes, budgetRes, rsvpRes, invRes] = await Promise.all([
        supabase.from('guests').select('*').eq('couple_id', cId).order('created_at'),
        supabase.from('budget_items').select('actual_amount').eq('couple_id', cId),
        supabase.from('rsvp_responses').select('*').eq('couple_id', cId).order('created_at', { ascending: false }),
        supabase.from('invitations').select('id').eq('couple_id', cId).maybeSingle(),
      ]);

      setGuests(guestRes.data || []);
      setBudgetItems(budgetRes.data || []);
      setRsvpList(rsvpRes.data || []);

      const invId = invRes.data?.id || null;
      setInvitationId(invId);
      if (invId) {
        const { data: gbData } = await supabase
          .from('invitation_guestbook')
          .select('id, name, message, created_at')
          .eq('invitation_id', invId)
          .order('created_at', { ascending: false })
          .limit(50);
        setGuestbook(gbData || []);
      }

      setLoading(false);
    };
    load();
  }, [router]);

  // Realtime — guests
  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`guests-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `couple_id=eq.${coupleId}` }, (p) => {
        if (p.eventType === 'INSERT')
          setGuests(prev => prev.find(g => g.id === p.new.id) ? prev : [...prev, p.new]);
        else if (p.eventType === 'UPDATE')
          setGuests(prev => prev.map(g => g.id === p.new.id ? p.new : g));
        else if (p.eventType === 'DELETE')
          setGuests(prev => prev.filter(g => g.id !== p.old.id));
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, [coupleId]);

  // ── 하객 추가 ──
  async function handleAdd() {
    setError('');
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    const { data, error: e } = await supabase.from('guests').insert({
      couple_id: coupleId,
      name: form.name.trim(), side: form.side, relation: form.relation,
      meal_count: Number(form.meal_count) || 1,
      phone: form.phone.trim() || null, memo: form.memo.trim() || null,
    }).select().single();
    if (e) { setError('추가에 실패했어요.'); setSaving(false); return; }
    setGuests(prev => [...prev, data]);
    setForm(EMPTY_FORM); setShowForm(false); setSaving(false);
  }

  // ── 하객 수정 ──
  function startEdit(guest) {
    setEditingId(guest.id);
    setEditForm({ name: guest.name, side: guest.side, relation: guest.relation || '친구',
      meal_count: guest.meal_count ?? 1, phone: guest.phone || '', memo: guest.memo || '' });
    setMenuId(null);
  }
  async function handleEdit() {
    setError('');
    if (!editForm.name.trim()) { setError('이름을 입력해주세요.'); return; }
    setSaving(true);
    const updates = { name: editForm.name.trim(), side: editForm.side, relation: editForm.relation,
      meal_count: Number(editForm.meal_count) || 1, phone: editForm.phone.trim() || null, memo: editForm.memo.trim() || null };
    const { error: e } = await supabase.from('guests').update(updates).eq('id', editingId);
    if (!e) setGuests(prev => prev.map(g => g.id === editingId ? { ...g, ...updates } : g));
    setEditingId(null); setSaving(false);
  }

  // ── 하객 삭제 ──
  async function deleteGuest(id) {
    const prev = guests;
    setGuests(g => g.filter(g => g.id !== id)); // optimistic update
    setMenuId(null);
    const { error: e } = await supabase.from('guests').delete().eq('id', id);
    if (e) {
      setGuests(prev); // 롤백
      setError('삭제에 실패했어요. 다시 시도해주세요.');
    }
  }

  // ── 축의금 저장 ──
  async function saveGiftAmount(guestId) {
    const val = parseInt(giftInput, 10);
    if (isNaN(val) || val < 0) { setGiftEditId(null); return; }
    await supabase.from('guests').update({ gift_amount: val }).eq('id', guestId);
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, gift_amount: val } : g));
    setGiftEditId(null);
  }

  // ── RSVP 응답을 명단에 추가 ──
  async function addRsvpToGuests(rsvp) {
    // 이름 중복 체크
    const duplicate = guests.find(g => g.name.trim() === rsvp.name.trim());
    if (duplicate) {
      alert(`'${rsvp.name}'은 이미 명단에 있어요.\n중복 추가는 되지 않아요.`);
      return;
    }
    setAddingRsvpId(rsvp.id);
    const { data, error: e } = await supabase.from('guests').insert({
      couple_id: coupleId,
      name: rsvp.name,
      side: rsvp.side || 'groom',
      relation: '지인',
      meal_count: rsvp.meal_count || 1,
      phone: rsvp.phone || null,
      memo: 'RSVP 응답',
    }).select().single();
    if (!e && data) setGuests(prev => [...prev, data]);
    setAddingRsvpId(null);
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--stone)' }}>불러오는 중...</p>
      </div>
    );
  }

  // ── 집계 ──
  const groomGuests  = guests.filter(g => g.side === 'groom');
  const brideGuests  = guests.filter(g => g.side === 'bride');
  const totalMeals   = guests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const groomMeals   = groomGuests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const brideMeals   = brideGuests.reduce((s, g) => s + (g.meal_count || 1), 0);
  const totalGift    = guests.reduce((s, g) => s + (g.gift_amount || 0), 0);
  const totalSpent   = budgetItems.reduce((s, b) => s + (b.actual_amount || 0), 0);

  const filtered = filter === 'all' ? guests : filter === 'groom' ? groomGuests : brideGuests;

  // RSVP → 명단 매핑 (이름 기준)
  const guestNames = new Set(guests.map(g => g.name));
  const rsvpAttending = rsvpList.filter(r => r.attending);
  const unmappedRsvp  = rsvpAttending.filter(r => !guestNames.has(r.name));

  // 각 하객의 RSVP 응답 (이름 기준 매핑)
  const rsvpByName = new Map(rsvpList.map(r => [r.name, r]));

  return (
    <div className="page-wrapper" onClick={() => { setMenuId(null); setGiftEditId(null); }}>
      <h1 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
        <Icon name="guests" size={22} color="var(--ink)" />
        하객 관리
      </h1>

      {/* 요약 카드 */}
      <div className="card mb-4">
        <div className="flex justify-around py-1">
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-xl font-bold" style={{ color: 'var(--rose)' }}>{groomGuests.length}명</p>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신랑측</p>
          </div>
          <div style={{ width: 1, backgroundColor: 'var(--beige)' }} />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-xl font-bold" style={{ color: 'var(--purple)' }}>{brideGuests.length}명</p>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신부측</p>
          </div>
          <div style={{ width: 1, backgroundColor: 'var(--beige)' }} />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{guests.length}명</p>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>총 하객</p>
          </div>
          <div style={{ width: 1, backgroundColor: 'var(--beige)' }} />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--toss-green)' }}>{totalGift.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>축의금(만)</p>
          </div>
        </div>
        <div className="mt-3 pt-3 flex justify-around text-center" style={{ borderTop: '1px solid var(--beige)' }}>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>총 식사</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{totalMeals}식</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신랑측</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--rose)' }}>{groomMeals}식</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--stone)' }}>신부측</p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--purple)' }}>{brideMeals}식</p>
          </div>
          {totalSpent > 0 && (
            <div>
              <p className="text-xs" style={{ color: 'var(--stone)' }}>손익</p>
              <p className="text-base font-semibold mt-0.5 tabular-nums"
                style={{ color: totalGift >= totalSpent ? 'var(--toss-green)' : 'var(--toss-red)' }}>
                {totalGift >= totalSpent ? '+' : ''}{(totalGift - totalSpent).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 탭 — 3개 */}
      <div className="flex mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--beige)' }}>
        {[
          { key: 'list',   label: '명단',   icon: 'guests' },
          { key: 'rsvp',   label: `참석확인${unmappedRsvp.length > 0 ? ` (${unmappedRsvp.length})` : ''}`, icon: 'check' },
          { key: 'invite', label: '청첩장', icon: 'invite' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1"
            style={{
              background: tab === t.key ? 'white' : 'none',
              color: tab === t.key ? 'var(--rose)' : 'var(--stone)',
              border: 'none', cursor: 'pointer', borderRadius: '1rem', margin: '4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            <Icon name={t.icon} size={14} color="currentColor" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 명단 탭 ── */}
      {tab === 'list' && (
        <>
          {/* 측 필터 */}
          <div className="flex gap-2 mb-3">
            {[{ key: 'all', label: '전체' }, { key: 'groom', label: '신랑측' }, { key: 'bride', label: '신부측' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{
                  backgroundColor: filter === f.key ? 'var(--rose-light)' : 'var(--beige)',
                  color: filter === f.key ? 'var(--rose)' : 'var(--stone)',
                  border: `1.5px solid ${filter === f.key ? 'var(--rose)' : 'transparent'}`,
                }}>
                {f.label} {f.key === 'all' ? guests.length : f.key === 'groom' ? groomGuests.length : brideGuests.length}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {filtered.length === 0 ? (
              <div className="card">
                <EmptyState icon={UserPlus}
                  title={filter === 'all' ? '아직 등록된 하객이 없어요' : `${SIDE_LABEL[filter]} 하객이 없어요`}
                  description={filter === 'all' ? '신랑·신부측 하객을 등록하고 축의금을 관리해보세요' : undefined}
                  action={filter === 'all' ? { label: '하객 추가하기', onClick: () => setShowForm(true) } : undefined}
                />
              </div>
            ) : filtered.map(guest => {
              const isEditing   = editingId === guest.id;
              const isMenuOpen  = menuId === guest.id;
              const isGiftEdit  = giftEditId === guest.id;
              const rsvp        = rsvpByName.get(guest.name);

              if (isEditing) return (
                <div key={guest.id} className="card flex flex-col gap-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>하객 수정</p>
                  <div className="flex gap-2">
                    {['groom', 'bride'].map(s => (
                      <button key={s} onClick={() => setEditForm(f => ({ ...f, side: s }))}
                        className="flex-1 py-2 rounded-xl text-sm font-medium"
                        style={{ backgroundColor: editForm.side === s ? 'var(--rose-light)' : 'var(--beige)',
                          color: editForm.side === s ? 'var(--rose)' : 'var(--stone)',
                          border: `1.5px solid ${editForm.side === s ? 'var(--rose)' : 'transparent'}` }}>
                        {SIDE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <input className="input-field" placeholder="이름" value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    {RELATIONS.map(r => (
                      <button key={r} onClick={() => setEditForm(f => ({ ...f, relation: r }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ backgroundColor: editForm.relation === r ? 'var(--rose-light)' : 'var(--beige)',
                          color: editForm.relation === r ? 'var(--rose)' : 'var(--stone)',
                          border: `1.5px solid ${editForm.relation === r ? 'var(--rose)' : 'transparent'}` }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>식사 수</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditForm(f => ({ ...f, meal_count: Math.max(1, Number(f.meal_count) - 1) }))}
                          className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--beige)', color: 'var(--ink)', border: 'none', cursor: 'pointer' }}>−</button>
                        <span className="text-base font-semibold w-6 text-center" style={{ color: 'var(--ink)' }}>{editForm.meal_count}</span>
                        <button onClick={() => setEditForm(f => ({ ...f, meal_count: Number(f.meal_count) + 1 }))}
                          className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)', border: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                    <input className="input-field flex-1" placeholder="연락처 (선택)" value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <input className="input-field" placeholder="메모 (선택)" value={editForm.memo}
                    onChange={e => setEditForm(f => ({ ...f, memo: e.target.value }))} />
                  {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}
                  <div className="flex gap-2">
                    <button className="btn-outline flex-1" onClick={() => { setEditingId(null); setError(''); }}>취소</button>
                    <button className="btn-rose flex-1" onClick={handleEdit} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
                  </div>
                </div>
              );

              return (
                <div key={guest.id} className="card relative" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start gap-3">
                    {/* 측 컬러 바 */}
                    <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: SIDE_COLOR[guest.side] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{guest.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: guest.side === 'groom' ? 'var(--rose-light)' : 'var(--purple-light)',
                            color: SIDE_COLOR[guest.side] }}>
                          {SIDE_LABEL[guest.side]}
                        </span>
                        {/* RSVP 상태 뱃지 */}
                        {rsvp && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: rsvp.attending ? 'var(--sage-wash)' : 'var(--ivory-2)',
                              color: rsvp.attending ? 'var(--sage)' : 'var(--stone)' }}>
                            {rsvp.attending ? '참석' : '불참'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                        {guest.relation} · 식사 {guest.meal_count || 1}식
                        {guest.phone && ` · ${guest.phone}`}
                      </p>
                      {guest.memo && guest.memo !== 'RSVP 자동 등록' && guest.memo !== 'RSVP 응답' && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--stone-light)' }}>{guest.memo}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* 축의금 인라인 */}
                      <div onClick={e => e.stopPropagation()}>
                        {isGiftEdit ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="input-field text-sm py-1 px-2 text-right tabular-nums"
                              style={{ width: 72 }}
                              type="number" placeholder="0" value={giftInput}
                              onChange={e => setGiftInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveGiftAmount(guest.id)}
                              autoFocus
                            />
                            <span className="text-xs" style={{ color: 'var(--stone)' }}>만</span>
                            <button onClick={() => saveGiftAmount(guest.id)}
                              className="text-xs font-medium"
                              style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              저장
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGiftEditId(guest.id); setGiftInput(String(guest.gift_amount ?? '')); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
                            {guest.gift_amount != null ? (
                              <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--toss-green)' }}>
                                {guest.gift_amount.toLocaleString()}만
                              </p>
                            ) : (
                              <Icon name="gift" size={14} color="var(--stone-light)" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* 더보기 메뉴 */}
                      <button onClick={e => { e.stopPropagation(); setMenuId(isMenuOpen ? null : guest.id); }}
                        className="text-lg" style={{ color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
                        ···
                      </button>
                    </div>
                  </div>

                  {isMenuOpen && (
                    <div className="absolute right-4 z-10 rounded-xl shadow-lg overflow-hidden"
                      style={{ top: '100%', backgroundColor: 'white', border: '1.5px solid var(--stone-light)', minWidth: 110 }}
                      onClick={e => e.stopPropagation()}>
                      <button className="w-full text-left px-4 py-3 text-sm font-medium"
                        style={{ color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => startEdit(guest)}>
                        <span className="flex items-center gap-2"><Pencil size={14} />수정</span>
                      </button>
                      <div style={{ height: 1, backgroundColor: 'var(--beige)' }} />
                      <button className="w-full text-left px-4 py-3 text-sm font-medium"
                        style={{ color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => deleteGuest(guest.id)}>
                        <span className="flex items-center gap-2"><Trash2 size={14} />삭제</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 추가 폼 */}
          {showForm ? (
            <div className="card flex flex-col gap-3 mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>하객 추가</p>
              <div className="flex gap-2">
                {['groom', 'bride'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: form.side === s ? 'var(--rose-light)' : 'var(--beige)',
                      color: form.side === s ? 'var(--rose)' : 'var(--stone)',
                      border: `1.5px solid ${form.side === s ? 'var(--rose)' : 'transparent'}` }}>
                    {SIDE_LABEL[s]}
                  </button>
                ))}
              </div>
              <input className="input-field" placeholder="이름" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="flex flex-wrap gap-2">
                {RELATIONS.map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, relation: r }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{ backgroundColor: form.relation === r ? 'var(--rose-light)' : 'var(--beige)',
                      color: form.relation === r ? 'var(--rose)' : 'var(--stone)',
                      border: `1.5px solid ${form.relation === r ? 'var(--rose)' : 'transparent'}` }}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-xs mb-1" style={{ color: 'var(--stone)' }}>식사 수</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setForm(f => ({ ...f, meal_count: Math.max(1, Number(f.meal_count) - 1) }))}
                      className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--beige)', color: 'var(--ink)', border: 'none', cursor: 'pointer' }}>−</button>
                    <span className="text-base font-semibold w-6 text-center" style={{ color: 'var(--ink)' }}>{form.meal_count}</span>
                    <button onClick={() => setForm(f => ({ ...f, meal_count: Number(f.meal_count) + 1 }))}
                      className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)', border: 'none', cursor: 'pointer' }}>+</button>
                  </div>
                </div>
                <input className="input-field flex-1" placeholder="연락처 (선택)" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <input className="input-field" placeholder="메모 (선택)" value={form.memo}
                onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />
              {error && <p className="text-xs" style={{ color: 'var(--rose)' }}>{error}</p>}
              <div className="flex gap-2">
                <button className="btn-outline flex-1" onClick={() => { setShowForm(false); setError(''); setForm(EMPTY_FORM); }}>취소</button>
                <button className="btn-rose flex-1" onClick={handleAdd} disabled={saving}>{saving ? '추가 중...' : '추가'}</button>
              </div>
            </div>
          ) : (
            <button className="btn-outline w-full mb-4" onClick={() => setShowForm(true)}>+ 하객 추가</button>
          )}
        </>
      )}

      {/* ── 참석확인 탭 ── */}
      {tab === 'rsvp' && (
        <>
          {/* RSVP 링크 공유 */}
          <div className="card mb-4">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>참석 확인 링크</p>
            <p className="text-xs mb-3" style={{ color: 'var(--stone)', lineHeight: 1.6 }}>
              링크를 하객에게 보내면 신랑/신부측 선택 + 참석 여부를 직접 입력해요.<br/>
              응답하면 명단에 자동 등록돼요.
            </p>
            <button
              onClick={async () => {
                await copyToClipboard(`${window.location.origin}/rsvp/${coupleId}`);
                setRsvpCopied(true);
                setTimeout(() => setRsvpCopied(false), 2000);
              }}
              style={{
                width: '100%', height: 48, borderRadius: 12,
                border: '1.5px solid var(--toss-blue)',
                backgroundColor: rsvpCopied ? 'var(--toss-blue-light)' : 'transparent',
                color: 'var(--toss-blue)', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {rsvpCopied ? <><Check size={16} />복사됐어요!</> : <><Copy size={16} />참석 확인 링크 복사</>}
            </button>
          </div>

          {/* 미매핑 응답 — 명단 추가 필요 */}
          {unmappedRsvp.length > 0 && (
            <div className="card mb-4" style={{ border: '1.5px solid var(--toss-blue-light)', backgroundColor: 'var(--toss-blue-light)' }}>
              <p className="text-sm font-bold mb-2" style={{ color: 'var(--toss-blue)' }}>
                명단에 없는 참석자 {unmappedRsvp.length}명
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--toss-text-secondary)' }}>
                RSVP로 참석 응답했지만 명단에 없어요. 추가하세요.
              </p>
              <div className="flex flex-col gap-2">
                {unmappedRsvp.map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{r.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
                        {r.side ? SIDE_LABEL[r.side] : '측 미지정'} · 식사 {r.meal_count || 1}식
                        {r.phone ? ` · ${r.phone}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => addRsvpToGuests(r)}
                      disabled={addingRsvpId === r.id}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'var(--toss-blue)', color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <UserCheck size={12} />
                      {addingRsvpId === r.id ? '추가 중...' : '명단 추가'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 전체 응답 목록 */}
          {rsvpList.length === 0 ? (
            <div className="card">
              <EmptyState icon={ClipboardList}
                title="아직 참석 확인 답변이 없어요"
                description="위 링크를 하객에게 공유하면 답변이 여기에 모여요"
                compact />
            </div>
          ) : (
            <>
              {/* 통계 */}
              <div className="card mb-3">
                <div className="flex justify-around py-1">
                  {[
                    { label: '참석', value: rsvpList.filter(r => r.attending).length, color: 'var(--toss-blue)' },
                    { label: '불참', value: rsvpList.filter(r => !r.attending).length, color: 'var(--stone)' },
                    { label: '총 식사', value: rsvpList.filter(r => r.attending).reduce((s, r) => s + (r.meal_count || 1), 0), color: 'var(--ink)' },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center gap-0.5">
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs" style={{ color: 'var(--stone)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                {rsvpList.map(r => {
                  const inList = guestNames.has(r.name);
                  return (
                    <div key={r.id} className="card flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
                        style={{ backgroundColor: r.attending ? 'var(--sage-wash)' : 'var(--ivory-2)' }}>
                        {r.attending
                          ? <Icon name="check" size={16} color="var(--sage)" />
                          : <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>✕</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{r.name}</p>
                          {r.side && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: r.side === 'groom' ? 'var(--rose-light)' : 'var(--purple-light)',
                                color: SIDE_COLOR[r.side] }}>
                              {SIDE_LABEL[r.side]}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: r.attending ? 'var(--sage-wash)' : 'var(--ivory-2)',
                              color: r.attending ? 'var(--sage)' : 'var(--stone)' }}>
                            {r.attending ? `참석 · ${r.meal_count || 1}명` : '불참'}
                          </span>
                          {/* 명단 연결 상태 */}
                          <span className="text-xs" style={{ color: inList ? 'var(--sage)' : 'var(--stone-light)' }}>
                            {inList ? '명단 있음' : '—'}
                          </span>
                        </div>
                        {r.phone && <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>{r.phone}</p>}
                        {r.message && <p className="text-xs mt-1 italic" style={{ color: 'var(--stone)' }}>"{r.message}"</p>}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--stone-light)' }}>
                          {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── 방명록 섹션 (RSVP 탭 하단) ── */}
      {tab === 'rsvp' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} color="var(--rose)" />
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              방명록
              {guestbook.length > 0 && (
                <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--rose-light)', color: 'var(--rose)' }}>
                  {guestbook.length}
                </span>
              )}
            </p>
          </div>

          {!invitationId ? (
            <div className="card">
              <p className="text-sm text-center py-2" style={{ color: 'var(--stone)' }}>
                청첩장을 만들면 방명록이 생겨요
              </p>
              <button className="btn-outline w-full mt-2 text-sm"
                onClick={() => setTab('invite')}>
                청첩장 만들러 가기
              </button>
            </div>
          ) : guestbook.length === 0 ? (
            <div className="card">
              <p className="text-sm text-center py-2" style={{ color: 'var(--stone)' }}>
                아직 방명록 메시지가 없어요
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {guestbook.map(msg => (
                <div key={msg.id} className="card" style={{ padding: '14px 16px' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {msg.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--stone-light)' }}>
                      {new Date(msg.created_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--stone)', lineHeight: 1.6 }}>
                    "{msg.message}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 청첩장 탭 ── */}
      {tab === 'invite' && <InvitationTab coupleId={coupleId} />}

      <BottomNav active="guests" />
    </div>
  );
}
