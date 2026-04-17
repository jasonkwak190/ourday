'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Eye, Save, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const TEMPLATES = [
  { key: 'minimal', label: '미니멀',  emoji: '🤍', desc: '깔끔하고 모던한 스타일' },
  { key: 'classic', label: '클래식',  emoji: '🕊️', desc: '우아하고 격식있는 스타일' },
  { key: 'floral',  label: '플라워',  emoji: '🌸', desc: '로맨틱하고 따뜻한 스타일' },
];

const FIELDS = [
  { section: '👫 신랑·신부', fields: [
    { key: 'groom_name',    label: '신랑 이름',   placeholder: '홍길동' },
    { key: 'bride_name',    label: '신부 이름',   placeholder: '김영희' },
  ]},
  { section: '📅 날짜·시간', fields: [
    { key: 'wedding_date',  label: '결혼 날짜',   type: 'date' },
    { key: 'wedding_time',  label: '시간',        placeholder: '오후 1시 30분' },
  ]},
  { section: '📍 예식장', fields: [
    { key: 'venue_name',    label: '예식장 이름', placeholder: '○○ 웨딩홀' },
    { key: 'venue_address', label: '주소',        placeholder: '서울시 강남구 ...' },
    { key: 'venue_map_url', label: '지도 링크',   placeholder: 'https://map.kakao.com/...' },
  ]},
  { section: '💳 계좌번호', fields: [
    { key: 'account_groom', label: '신랑측 계좌', placeholder: '은행명 000-0000-0000 홍길동' },
    { key: 'account_bride', label: '신부측 계좌', placeholder: '은행명 000-0000-0000 김영희' },
  ]},
  { section: '💌 초대 메시지', fields: [
    { key: 'message', label: '메시지', type: 'textarea',
      placeholder: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.' },
  ]},
];

export default function InvitationPage() {
  const router  = useRouter();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [inv,      setInv]      = useState(null);    // DB record
  const [form,     setForm]     = useState({
    template: 'minimal',
    groom_name: '', bride_name: '',
    wedding_date: '', wedding_time: '',
    venue_name: '', venue_address: '', venue_map_url: '',
    account_groom: '', account_bride: '',
    message: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.',
  });
  const [coupleId, setCoupleId] = useState(null);

  const origin  = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = inv ? `${origin}/i/${inv.slug}` : '';

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: userData } = await supabase
        .from('users').select('couple_id').eq('id', session.user.id).single();
      if (!userData?.couple_id) { setLoading(false); return; }

      setCoupleId(userData.couple_id);

      // 커플 멤버 이름 조회 (신랑/신부 자동 매핑)
      const [membersRes, coupleRes, existingRes] = await Promise.all([
        supabase.from('users').select('name, role').eq('couple_id', userData.couple_id),
        supabase.from('couples').select('wedding_date').eq('id', userData.couple_id).single(),
        supabase.from('invitations').select('*').eq('couple_id', userData.couple_id)
          .order('created_at', { ascending: false }).limit(1).single(),
      ]);

      const members   = membersRes.data || [];
      const groomName = members.find(m => m.role === 'groom')?.name || '';
      const brideName = members.find(m => m.role === 'bride')?.name  || '';
      const existing  = existingRes.data;

      if (existing) {
        setInv(existing);
        setForm({
          template:      existing.template      || 'minimal',
          // 이름이 비어있으면 users 테이블에서 자동 매핑
          groom_name:    existing.groom_name    || groomName,
          bride_name:    existing.bride_name    || brideName,
          wedding_date:  existing.wedding_date  || coupleRes.data?.wedding_date || '',
          wedding_time:  existing.wedding_time  || '',
          venue_name:    existing.venue_name    || '',
          venue_address: existing.venue_address || '',
          venue_map_url: existing.venue_map_url || '',
          account_groom: existing.account_groom || '',
          account_bride: existing.account_bride || '',
          message:       existing.message       || '',
        });
      } else {
        // 신규 — users & couples 테이블로 자동 pre-fill
        setForm(f => ({
          ...f,
          groom_name:   groomName,
          bride_name:   brideName,
          wedding_date: coupleRes.data?.wedding_date || '',
        }));
      }
      setLoading(false);
    };
    init();
  }, [router]);

  async function save() {
    if (!coupleId) return;
    setSaving(true);
    const payload = { ...form, couple_id: coupleId, updated_at: new Date().toISOString() };

    if (inv) {
      const { data } = await supabase
        .from('invitations').update(payload).eq('id', inv.id).select().single();
      if (data) setInv(data);
    } else {
      const { data } = await supabase
        .from('invitations').insert(payload).select().single();
      if (data) setInv(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--toss-text-primary)' }}>
          💌 모바일 청첩장
        </h1>
        {inv && (
          <span className="text-xs px-2 py-1 rounded-full tabular-nums"
            style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-tertiary)' }}>
            👁 {inv.view_count}회 열람
          </span>
        )}
      </div>

      {/* 템플릿 선택 */}
      <div className="card mb-4">
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>템플릿</p>
        <div className="flex gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => update('template', t.key)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 16, cursor: 'pointer',
                border: `2px solid ${form.template === t.key ? 'var(--toss-blue)' : 'var(--toss-border)'}`,
                backgroundColor: form.template === t.key ? 'var(--toss-blue-light)' : 'var(--toss-bg)',
                transition: 'all 0.15s',
              }}>
              <p style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</p>
              <p style={{ fontSize: 12, fontWeight: 700,
                color: form.template === t.key ? 'var(--toss-blue)' : 'var(--toss-text-primary)' }}>
                {t.label}
              </p>
              <p style={{ fontSize: 10, color: 'var(--toss-text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      {FIELDS.map(({ section, fields }) => (
        <div key={section} className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>{section}</p>
          <div className="flex flex-col gap-3">
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold mb-1 block"
                  style={{ color: 'var(--toss-text-secondary)' }}>
                  {label}
                </label>
                {type === 'textarea' ? (
                  <textarea
                    value={form[key]}
                    onChange={e => update(key, e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="input-field"
                    style={{ resize: 'none', lineHeight: 1.6 }}
                  />
                ) : (
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={e => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="input-field"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 저장 버튼 */}
      <button
        onClick={save}
        disabled={saving}
        className="btn-rose mb-3 flex items-center justify-center gap-2"
        style={{ width: '100%', height: 56 }}>
        {saved ? <Check size={18} /> : <Save size={18} />}
        {saving ? '저장 중...' : saved ? '저장됐어요!' : '저장하기'}
      </button>

      {/* 공유 영역 */}
      {inv && (
        <div className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>공유하기</p>
          <p className="text-xs mb-3 px-3 py-2 rounded-xl tabular-nums"
            style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-secondary)',
              wordBreak: 'break-all', lineHeight: 1.6 }}>
            {shareUrl}
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2"
              style={{
                flex: 1, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
                backgroundColor: copied ? 'var(--toss-green-light)' : 'var(--toss-blue-light)',
                color: copied ? 'var(--toss-green)' : 'var(--toss-blue)',
                fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
              }}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '복사됐어요!' : '링크 복사'}
            </button>
            <button
              onClick={() => window.open(shareUrl, '_blank')}
              className="flex items-center justify-center gap-2"
              style={{
                flex: 1, height: 48, borderRadius: 12, cursor: 'pointer',
                border: '1px solid var(--toss-border)',
                backgroundColor: 'var(--toss-bg)',
                color: 'var(--toss-text-secondary)',
                fontWeight: 700, fontSize: 14,
              }}>
              <Eye size={16} />
              미리보기
            </button>
          </div>
        </div>
      )}

      <BottomNav active="invitation" />
    </div>
  );
}
