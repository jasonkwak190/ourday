'use client';
import { useState, useEffect } from 'react';
import { Copy, Check, Eye, Save, X, ExternalLink } from 'lucide-react';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';
import KakaoShareButton from '@/components/KakaoShareButton';

const TEMPLATES = [
  { key: 'minimal', label: '미니멀',  icon: 'diamond', desc: '깔끔하고 모던한 스타일' },
  { key: 'classic', label: '클래식',  icon: 'ring',    desc: '우아하고 격식있는 스타일' },
  { key: 'floral',  label: '플라워',  icon: 'floret',  desc: '로맨틱하고 따뜻한 스타일' },
];

const FIELDS = [
  { section: '신랑·신부', icon: 'rings', fields: [
    { key: 'groom_name',    label: '신랑 이름',   placeholder: '홍길동' },
    { key: 'bride_name',    label: '신부 이름',   placeholder: '김영희' },
  ]},
  { section: '날짜·시간', icon: 'calendar', fields: [
    { key: 'wedding_date',  label: '결혼 날짜',   type: 'date' },
    { key: 'wedding_time',  label: '시간',        placeholder: '오후 1시 30분' },
  ]},
  { section: '예식장', icon: 'venue', fields: [
    { key: 'venue_name',    label: '예식장 이름', placeholder: '○○ 웨딩홀' },
    { key: 'venue_address', label: '주소',        placeholder: '서울시 강남구 ...' },
    { key: 'venue_map_url', label: '지도 링크',   placeholder: 'https://map.kakao.com/...' },
  ]},
  { section: '계좌번호', icon: 'wallet', fields: [
    { key: 'account_groom', label: '신랑측 계좌', placeholder: '은행명 000-0000-0000 홍길동' },
    { key: 'account_bride', label: '신부측 계좌', placeholder: '은행명 000-0000-0000 김영희' },
  ]},
  { section: '초대 메시지', icon: 'invite', fields: [
    { key: 'message', label: '메시지', type: 'textarea',
      placeholder: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.' },
  ]},
];

// ─── 미리보기 모달 ────────────────────────────────────────────────────
function PreviewModal({ form, onClose, onSave, saving }) {
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'var(--toss-card)',
          borderBottom: '1px solid var(--toss-border)',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--toss-text-primary)', margin: 0 }}>
            미리보기
          </p>
          <p style={{ fontSize: 12, color: 'var(--toss-text-tertiary)', margin: '2px 0 0' }}>
            저장 전 실제 화면이에요
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              height: 36, padding: '0 16px', borderRadius: 10, border: 'none',
              backgroundColor: 'var(--toss-blue)', color: 'white',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={14} />
            {saving ? '저장 중...' : '저장하기'}
          </button>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid var(--toss-border)',
              backgroundColor: 'var(--toss-bg)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="var(--toss-text-secondary)" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--ivory-2)' }}>
        <div style={{ maxWidth: 390, margin: '20px auto', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
          <InvitationRenderer
            inv={form}
            copied={false}
            copyUrl={() => {}}
            showAccount={showAccount}
            setShowAccount={setShowAccount}
          />
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function InvitationTab({ coupleId }) {
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [inv,          setInv]          = useState(null);
  const [form,         setForm]         = useState({
    template: 'minimal',
    groom_name: '', bride_name: '',
    wedding_date: '', wedding_time: '',
    venue_name: '', venue_address: '', venue_map_url: '',
    account_groom: '', account_bride: '',
    message: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.',
    cover_image_url: '',
  });
  const [accountNames, setAccountNames] = useState({ groom: '', bride: '' });

  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const shareUrl = inv ? `${origin}/i/${inv.slug}` : '';

  useEffect(() => {
    if (!coupleId) return;

    const init = async () => {
      const [membersRes, coupleRes, existingRes] = await Promise.all([
        supabase.from('users').select('name, role').eq('couple_id', coupleId),
        supabase.from('couples').select('wedding_date').eq('id', coupleId).single(),
        supabase.from('invitations').select('*').eq('couple_id', coupleId)
          .order('created_at', { ascending: false }).limit(1).single(),
      ]);

      const members   = membersRes.data || [];
      const groomName = members.find(m => m.role === 'groom')?.name || '';
      const brideName = members.find(m => m.role === 'bride')?.name  || '';
      const existing  = existingRes.data;

      setAccountNames({ groom: groomName, bride: brideName });

      if (existing) {
        setInv(existing);
        setForm({
          template:        existing.template        || 'minimal',
          groom_name:      groomName || existing.groom_name    || '',
          bride_name:      brideName || existing.bride_name    || '',
          wedding_date:    existing.wedding_date  || coupleRes.data?.wedding_date || '',
          wedding_time:    existing.wedding_time  || '',
          venue_name:      existing.venue_name    || '',
          venue_address:   existing.venue_address || '',
          venue_map_url:   existing.venue_map_url || '',
          account_groom:   existing.account_groom || '',
          account_bride:   existing.account_bride || '',
          message:         existing.message       || '',
          cover_image_url: existing.cover_image_url || '',
        });
      } else {
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
  }, [coupleId]);

  async function save() {
    if (!coupleId) return;
    setSaving(true);

    const slug = coupleId.replace(/-/g, '').slice(0, 12);
    const payload = {
      ...form,
      wedding_date: form.wedding_date || null,
      couple_id: coupleId,
      slug,
      updated_at: new Date().toISOString(),
    };

    let savedData = null;
    if (inv) {
      const { data, error } = await supabase
        .from('invitations').update(payload).eq('id', inv.id).select().single();
      if (error) console.error('[invitation] update error:', error.message);
      else savedData = data;
    } else {
      const { data, error } = await supabase
        .from('invitations').insert(payload).select().single();
      if (error) console.error('[invitation] insert error:', error.message);
      else savedData = data;
    }

    if (savedData) setInv(savedData);
    setSaving(false);
    setSaved(true);
    setShowPreview(false);
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
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      {showPreview && (
        <PreviewModal
          form={form}
          onClose={() => setShowPreview(false)}
          onSave={save}
          saving={saving}
        />
      )}

      {/* 상단 열람 횟수 */}
      {inv && (
        <div className="flex justify-end mb-3">
          <span className="text-xs px-2 py-1 rounded-full tabular-nums"
            style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-tertiary)' }}>
            👁 {inv.view_count}회 열람
          </span>
        </div>
      )}

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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <Icon name={t.icon} size={20} color={form.template === t.key ? 'var(--champagne)' : 'var(--ink-3)'} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: form.template === t.key ? 'var(--toss-blue)' : 'var(--toss-text-primary)' }}>
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
      {FIELDS.map(({ section, icon, fields }) => (
        <div key={section} className="card mb-4">
          <p className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--toss-text-primary)' }}>
            <Icon name={icon} size={15} color="var(--champagne)" />
            {section}
          </p>
          <div className="flex flex-col gap-3">
            {fields.map(({ key, label, type, placeholder }) => {
              const accountVal = key === 'groom_name' ? accountNames.groom
                               : key === 'bride_name' ? accountNames.bride
                               : null;
              const isNameChanged = accountVal && form[key] !== accountVal;

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--toss-text-secondary)' }}>
                      {label}
                    </label>
                    {accountVal && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--toss-blue-light)', color: 'var(--toss-blue)' }}>
                          계정: {accountVal}
                        </span>
                        {isNameChanged && (
                          <button
                            onClick={() => update(key, accountVal)}
                            className="text-xs"
                            style={{ color: 'var(--toss-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            되돌리기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
              );
            })}
          </div>
        </div>
      ))}

      {/* 카카오톡 공유 썸네일 사진 */}
      <div className="card mb-4">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--toss-text-primary)' }}>
          <span className="flex items-center gap-1.5">
            <Icon name="camera" size={15} color="var(--champagne)" />
            공유 썸네일 사진
          </span>
          <span className="text-xs font-normal" style={{ color: 'var(--toss-text-tertiary)' }}>(선택)</span>
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--toss-text-tertiary)', lineHeight: 1.6 }}>
          카카오톡 등 링크 공유 시 미리보기 이미지로 쓰여요.{'\n'}
          사진 URL을 붙여넣으세요 (Google Drive 공개 링크, imgur 등)
        </p>
        <input
          type="url"
          value={form.cover_image_url}
          onChange={e => update('cover_image_url', e.target.value)}
          placeholder="https://i.imgur.com/example.jpg"
          className="input-field"
        />
        {form.cover_image_url && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ aspectRatio: '1.9/1', backgroundColor: 'var(--toss-bg)' }}>
            <img
              src={form.cover_image_url}
              alt="썸네일 미리보기"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      {/* 미리보기 + 저장 버튼 */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={() => setShowPreview(true)}
          className="btn-outline flex items-center justify-center gap-2"
          style={{ flex: 1, height: 56 }}
        >
          <Eye size={18} />
          미리보기
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="btn-rose flex items-center justify-center gap-2"
          style={{ flex: 2, height: 56 }}
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saving ? '저장 중...' : saved ? '저장됐어요!' : '저장하기'}
        </button>
      </div>

      {/* 공유 영역 */}
      {inv && (
        <div className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>공유하기</p>
          <p className="text-xs mb-3 px-3 py-2 rounded-xl tabular-nums"
            style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-secondary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {shareUrl}
          </p>
          <div className="flex gap-2 mb-2">
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
              <ExternalLink size={16} />
              실제 청첩장
            </button>
          </div>
          <KakaoShareButton
            url={shareUrl}
            title={`💍 ${form.groom_name || '신랑'} & ${form.bride_name || '신부'} 결혼합니다`}
            description={form.wedding_date ? `${form.wedding_date.replace(/-/g, '.')} · ${form.venue_name || ''}` : '청첩장을 확인해주세요'}
            imageUrl={form.cover_image_url || ''}
            style={{ width: '100%', height: 48 }}
          />
        </div>
      )}
    </>
  );
}
