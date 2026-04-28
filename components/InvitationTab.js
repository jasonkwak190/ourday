'use client';
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Eye, Save, X, ExternalLink, Plus, Camera, Loader } from 'lucide-react';
import Icon from '@/components/Icon';
import { supabase } from '@/lib/supabase';
import { InvitationRenderer } from '@/components/InvitationTemplates';
import KakaoShareButton from '@/components/KakaoShareButton';

const TEMPLATES = [
  { key: 'editorial', label: 'Ourday',  icon: 'diamond', desc: '잉크·샴페인 에디토리얼' },
  { key: 'minimal',   label: '미니멀',  icon: 'diamond', desc: '깔끔하고 모던한 스타일' },
  { key: 'classic',   label: '클래식',  icon: 'ring',    desc: '우아하고 격식있는 스타일' },
  { key: 'floral',    label: '플라워',  icon: 'floret',  desc: '로맨틱하고 따뜻한 스타일' },
];

// required: true → 항상 표시, 삭제 불가
// required: false → 섹션 추가/제거 가능
const SECTIONS = [
  {
    key: 'names', label: '신랑·신부', icon: 'rings', required: true,
    fields: [
      { key: 'groom_name', label: '신랑 이름', placeholder: '홍길동' },
      { key: 'bride_name', label: '신부 이름', placeholder: '김영희' },
    ],
  },
  {
    key: 'datetime', label: '날짜·시간', icon: 'calendar', required: true,
    fields: [
      { key: 'wedding_date', label: '결혼 날짜', type: 'date' },
      { key: 'wedding_time', label: '시간', placeholder: '오후 1시 30분' },
    ],
  },
  {
    key: 'venue', label: '예식장', icon: 'venue', required: false,
    fields: [
      { key: 'venue_name',    label: '예식장 이름', placeholder: '○○ 웨딩홀' },
      { key: 'venue_address', label: '주소',        placeholder: '서울시 강남구 ...' },
      { key: 'venue_map_url', label: '지도 링크',   placeholder: 'https://map.kakao.com/...' },
    ],
  },
  {
    key: 'message', label: '초대 메시지', icon: 'invite', required: false,
    fields: [
      { key: 'message', label: '메시지', type: 'textarea',
        placeholder: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.' },
    ],
  },
  {
    key: 'account', label: '계좌번호', icon: 'wallet', required: false,
    fields: [
      { key: 'account_groom', label: '신랑측 계좌', placeholder: '은행명 000-0000-0000 홍길동' },
      { key: 'account_bride', label: '신부측 계좌', placeholder: '은행명 000-0000-0000 김영희' },
    ],
  },
  {
    key: 'parents', label: '혼주 성함', icon: 'rings', required: false,
    fields: [
      { key: 'groom_father', label: '신랑 아버지', placeholder: '홍○○' },
      { key: 'groom_mother', label: '신랑 어머니', placeholder: '김○○' },
      { key: 'bride_father', label: '신부 아버지', placeholder: '이○○' },
      { key: 'bride_mother', label: '신부 어머니', placeholder: '박○○' },
    ],
  },
  {
    key: 'notice', label: '교통편·공지', icon: 'venue', required: false,
    fields: [
      { key: 'notice', label: '교통편 및 주차 안내', type: 'textarea',
        placeholder: '• 지하철 2호선 강남역 3번 출구 도보 5분\n• 주차: 건물 지하 2층 (2시간 무료)\n• 전세버스: 오전 11시 ○○역 출발' },
    ],
  },
  {
    key: 'photos', label: '사진 슬라이드', icon: 'camera', required: false,
    fields: [],
  },
  {
    key: 'cover', label: '커버 사진', icon: 'camera', required: false,
    fields: [
      { key: 'cover_image_url', label: '사진 URL', type: 'url',
        placeholder: 'https://i.imgur.com/example.jpg' },
    ],
  },
];

// 섹션이 "활성화됐다고 볼 수 있는" 기본값 계산 (기존 데이터 기반)
function inferEnabledSections(existing) {
  return SECTIONS
    .filter(s => s.required || (existing && (
      s.fields.some(f => existing[f.key]) ||
      (s.key === 'photos' && Array.isArray(existing.photos) && existing.photos.length > 0)
    )))
    .map(s => s.key);
}

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
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [saveError,        setSaveError]        = useState('');
  const [isDirty,          setIsDirty]          = useState(false);
  const [copied,           setCopied]           = useState(false);
  const [showPreview,      setShowPreview]      = useState(false);
  const [inv,              setInv]              = useState(null);
  const [uploadingCover,   setUploadingCover]   = useState(false);
  const [coverError,       setCoverError]       = useState('');
  const [uploadingPhoto,   setUploadingPhoto]   = useState(false);
  const [photoError,       setPhotoError]       = useState('');
  const coverInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const [enabledSections,  setEnabledSections]  = useState(
    SECTIONS.filter(s => s.required).map(s => s.key)
  );
  const [form, setForm] = useState({
    template: 'editorial',
    groom_name: '', bride_name: '',
    groom_father: '', groom_mother: '', bride_father: '', bride_mother: '',
    wedding_date: '', wedding_time: '',
    venue_name: '', venue_address: '', venue_map_url: '',
    account_groom: '', account_bride: '',
    message: '두 사람이 사랑으로 하나 되는 날,\n함께해 주시면 감사하겠습니다.',
    notice: '',
    cover_image_url: '',
    photos: [],
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
        const loaded = {
          template:        existing.template        || 'editorial',
          groom_name:      groomName || existing.groom_name    || '',
          bride_name:      brideName || existing.bride_name    || '',
          groom_father:    existing.groom_father || '',
          groom_mother:    existing.groom_mother || '',
          bride_father:    existing.bride_father || '',
          bride_mother:    existing.bride_mother || '',
          wedding_date:    existing.wedding_date  || coupleRes.data?.wedding_date || '',
          wedding_time:    existing.wedding_time  || '',
          venue_name:      existing.venue_name    || '',
          venue_address:   existing.venue_address || '',
          venue_map_url:   existing.venue_map_url || '',
          account_groom:   existing.account_groom || '',
          account_bride:   existing.account_bride || '',
          message:         existing.message       || '',
          notice:          existing.notice        || '',
          cover_image_url: existing.cover_image_url || '',
          photos:          Array.isArray(existing.photos) ? existing.photos : [],
        };
        setForm(loaded);
        setEnabledSections(inferEnabledSections(loaded));
      } else {
        const defaults = {
          groom_name:   groomName,
          bride_name:   brideName,
          wedding_date: coupleRes.data?.wedding_date || '',
        };
        setForm(f => ({ ...f, ...defaults }));
        // 신규: 필수 + 예식장 + 메시지 기본 활성화
        setEnabledSections(['names', 'datetime', 'venue', 'message']);
      }
      setLoading(false);
    };
    init();
  }, [coupleId]);

  async function save() {
    if (!coupleId) return;
    setSaving(true);
    setSaveError('');

    const slug = coupleId.replace(/-/g, '').slice(0, 12);
    const payload = {
      ...form,
      wedding_date: form.wedding_date || null,
      couple_id: coupleId,
      slug,
      updated_at: new Date().toISOString(),
    };

    let savedData = null;
    let saveErr = null;
    if (inv) {
      const { data, error } = await supabase
        .from('invitations').update(payload).eq('id', inv.id).select().single();
      if (error) { console.error('[invitation] update error:', error.message); saveErr = error; }
      else savedData = data;
    } else {
      const { data, error } = await supabase
        .from('invitations').insert(payload).select().single();
      if (error) { console.error('[invitation] insert error:', error.message); saveErr = error; }
      else savedData = data;
    }

    setSaving(false);

    // 저장 실패 — 사용자에게 명확히 알림 (가짜 성공 표시 방지)
    if (saveErr || !savedData) {
      setSaveError('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.');
      return;
    }

    setInv(savedData);
    setSaved(true);
    setIsDirty(false);
    setShowPreview(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
    setCoverError('');
    setUploadingCover(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('couple_id', coupleId);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res  = await fetch('/api/invitation/cover', { method: 'POST', body: fd, signal: ctrl.signal });
      const json = await res.json();
      if (!res.ok) { setCoverError(json.error || '업로드 실패'); }
      else { update('cover_image_url', json.url); }
    } catch (err) {
      if (err.name === 'AbortError') setCoverError('네트워크가 느려요. 다시 시도해주세요.');
      else setCoverError('업로드 중 오류가 발생했어요.');
    } finally {
      clearTimeout(timer);
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  }

  // 저장 안 한 변경사항 있을 때 페이지 이탈 경고
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 섹션 추가
  function addSection(key) {
    setEnabledSections(prev => [...prev, key]);
  }

  // 섹션 제거 + 필드 초기화
  function removeSection(key) {
    const section = SECTIONS.find(s => s.key === key);
    if (!section || section.required) return;
    if (key === 'photos') {
      setForm(prev => ({ ...prev, photos: [] }));
    } else {
      const cleared = {};
      section.fields.forEach(f => { cleared[f.key] = ''; });
      setForm(prev => ({ ...prev, ...cleared }));
    }
    setEnabledSections(prev => prev.filter(k => k !== key));
  }

  // 사진 슬라이드 업로드
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !coupleId) return;
    if (form.photos.length >= 10) return;
    setPhotoError('');
    setUploadingPhoto(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('couple_id', coupleId);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res  = await fetch('/api/invitation/photo', { method: 'POST', body: fd, signal: ctrl.signal });
      const json = await res.json();
      if (!res.ok) setPhotoError(json.error || '업로드 실패');
      else { setForm(f => ({ ...f, photos: [...f.photos, json.url] })); setIsDirty(true); }
    } catch (err) {
      if (err.name === 'AbortError') setPhotoError('네트워크가 느려요. 다시 시도해주세요.');
      else setPhotoError('업로드 중 오류가 발생했어요.');
    } finally {
      clearTimeout(timer);
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  function removePhoto(index) {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    setIsDirty(true);
  }

  // 비활성 선택 섹션 목록
  const disabledSections = SECTIONS.filter(s => !s.required && !enabledSections.includes(s.key));

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

      {/* 열람 횟수 */}
      {inv && (
        <div className="flex justify-end mb-3">
          <span className="text-xs px-2 py-1 rounded-full tabular-nums"
            style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-tertiary)' }}>
            <span className="flex items-center gap-1"><Eye size={12} /> {inv.view_count}회 열람</span>
          </span>
        </div>
      )}

      {/* 템플릿 선택 */}
      <div className="card mb-4">
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>템플릿</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => update('template', t.key)}
              style={{
                flexShrink: 0, width: 88, padding: '12px 8px', borderRadius: 16, cursor: 'pointer',
                border: `2px solid ${form.template === t.key ? 'var(--champagne)' : 'var(--toss-border)'}`,
                backgroundColor: form.template === t.key ? 'var(--paper)' : 'var(--toss-bg)',
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <Icon name={t.icon} size={20} color={form.template === t.key ? 'var(--champagne)' : 'var(--ink-3)'} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: form.template === t.key ? 'var(--champagne)' : 'var(--toss-text-primary)' }}>
                {t.label}
              </p>
              <p style={{ fontSize: 10, color: 'var(--toss-text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── 활성 섹션 폼 ── */}
      {SECTIONS.filter(s => enabledSections.includes(s.key)).map(section => (
        <div key={section.key} className="card mb-3">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--toss-text-primary)' }}>
              <Icon name={section.icon} size={15} color="var(--champagne)" />
              {section.label}
            </p>
            {!section.required && (
              <button
                onClick={() => removeSection(section.key)}
                style={{
                  width: 24, height: 24, borderRadius: 8,
                  border: '1px solid var(--toss-border)',
                  backgroundColor: 'var(--toss-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={12} color="var(--toss-text-tertiary)" />
              </button>
            )}
          </div>

          {/* 사진 슬라이드 UI */}
          {section.key === 'photos' ? (
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {form.photos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden' }}>
                    <img src={url} alt={`사진 ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={11} color="white" />
                    </button>
                    <div style={{
                      position: 'absolute', bottom: 4, left: 0, right: 0,
                      textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.7)',
                    }}>
                      {i + 1} / {form.photos.length}
                    </div>
                  </div>
                ))}
                {form.photos.length < 10 && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    style={{
                      aspectRatio: '3/4', borderRadius: 10,
                      border: '2px dashed var(--toss-border)',
                      backgroundColor: 'var(--toss-bg)',
                      cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {uploadingPhoto
                      ? <Loader size={20} color="var(--champagne)" style={{ animation: 'spin 1s linear infinite' }} />
                      : <Plus size={22} color="var(--toss-text-tertiary)" />
                    }
                    <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', margin: 0 }}>
                      {uploadingPhoto ? '업로드 중' : '추가'}
                    </p>
                  </button>
                )}
              </div>
              {photoError && <p style={{ fontSize: 12, color: 'var(--toss-red)', marginTop: 6 }}>{photoError}</p>}
              <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
                최대 10장 · jpg/png/webp · 10MB 이하 · 좌우로 넘겨볼 수 있어요
              </p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : section.key === 'cover' ? (
            <div>
              {/* hidden file input */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,.heic,.jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />

              {form.cover_image_url ? (
                /* 이미지 있을 때 */
                <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '3/2' }}>
                  <img
                    src={form.cover_image_url}
                    alt="커버 사진"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* 오버레이 버튼 */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    padding: '12px 14px',
                  }}>
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 20,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, color: '#191f28',
                      }}
                    >
                      <Camera size={14} />
                      사진 변경
                    </button>
                    <button
                      onClick={() => update('cover_image_url', '')}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={14} color="#191f28" />
                    </button>
                  </div>
                  {uploadingCover && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Loader size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                  )}
                </div>
              ) : (
                /* 이미지 없을 때: 업로드 영역 */
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  style={{
                    width: '100%', aspectRatio: '3/2',
                    border: '2px dashed var(--toss-border)',
                    borderRadius: 16, backgroundColor: 'var(--toss-bg)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {uploadingCover ? (
                    <>
                      <Loader size={28} color="var(--champagne)" style={{ animation: 'spin 1s linear infinite' }} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <p style={{ fontSize: 13, color: 'var(--toss-text-tertiary)', margin: 0 }}>업로드 중...</p>
                    </>
                  ) : (
                    <>
                      <Camera size={28} color="var(--toss-text-tertiary)" />
                      <p style={{ fontSize: 13, color: 'var(--toss-text-secondary)', margin: 0, fontWeight: 600 }}>
                        갤러리에서 사진 선택
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', margin: 0 }}>
                        jpg · png · webp · 최대 10MB
                      </p>
                    </>
                  )}
                </button>
              )}
              {coverError && (
                <p style={{ fontSize: 12, color: 'var(--toss-red)', marginTop: 6 }}>{coverError}</p>
              )}
              <p style={{ fontSize: 11, color: 'var(--toss-text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
                카카오톡 공유 시 미리보기 이미지로 사용돼요
              </p>
            </div>
          ) : (
          /* 일반 필드들 */
          <div className="flex flex-col gap-3">
            {section.fields.map(({ key, label, type, placeholder }) => {
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
                      onChange={e => {
                        update(key, e.target.value);
                        // auto-resize
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder={placeholder}
                      rows={3}
                      className="input-field"
                      style={{ resize: 'none', lineHeight: 1.6, overflow: 'hidden', minHeight: 80 }}
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
          )}
        </div>
      ))}

      {/* ── 섹션 추가 ── */}
      {disabledSections.length > 0 && (
        <div className="mb-4" style={{ padding: '16px 0 4px' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--toss-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} />
            섹션 추가
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {disabledSections.map(s => (
              <button
                key={s.key}
                onClick={() => addSection(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 20,
                  border: '1.5px dashed var(--toss-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--toss-text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon name={s.icon} size={13} color="var(--champagne)" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 저장 에러 — 결혼식 직전 변경 손실 방지 */}
      {saveError && (
        <div className="mb-3 px-4 py-3 rounded-2xl flex items-start gap-2"
          style={{ backgroundColor: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--toss-red)', margin: 0 }}>
            {saveError}
          </p>
        </div>
      )}

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
