'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, Copy, Check, Heart, Send, Gift } from 'lucide-react';
import KakaoShareButton from '@/components/KakaoShareButton';
import Icon from '@/components/Icon';

// ─── 날짜 포매터 ────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ─── 계좌번호 행 ─────────────────────────────────────────────────────
function AccountRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const number = value.replace(/[^0-9\-]/g, '').trim() || value;
    await navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--ivory)' }}>
      <div>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, margin: '2px 0 0' }}>{value}</p>
      </div>
      <button onClick={copy} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--rule)', backgroundColor: copied ? 'var(--sage-wash)' : 'var(--ivory-2)', color: copied ? 'var(--sage)' : 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

// ─── 공통 하단 버튼 ──────────────────────────────────────────────────
export function BottomActions({ inv, copied, copyUrl, showAccount, setShowAccount, accentColor = '#B89968' }) {
  return (
    <div style={{ padding: '0 24px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {inv.venue_map_url && (
        <a href={inv.venue_map_url} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 15, backgroundColor: accentColor, color: 'white' }}>
          <MapPin size={18} />
          지도 보기
        </a>
      )}
      {(inv.account_groom || inv.account_bride) && (
        <button
          onClick={() => setShowAccount(v => !v)}
          style={{ height: 52, borderRadius: 14, border: `1.5px solid ${accentColor}`, backgroundColor: 'transparent', color: accentColor, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Gift size={17} />
          마음 전하기 {showAccount ? '▲' : '▼'}
        </button>
      )}
      {showAccount && (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--rule)' }}>
          {inv.account_groom && <AccountRow label="신랑측" value={inv.account_groom} />}
          {inv.account_bride && <AccountRow label="신부측" value={inv.account_bride} />}
        </div>
      )}
      <button
        onClick={copyUrl}
        style={{ height: 52, borderRadius: 14, border: '1px solid var(--rule)', backgroundColor: 'var(--ivory-2)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {copied ? <Check size={18} color="var(--sage)" /> : <Copy size={18} />}
        {copied ? '복사됐어요!' : '청첩장 링크 복사'}
      </button>
      <KakaoShareButton
        title={`💍 ${inv.groom_name || '신랑'} & ${inv.bride_name || '신부'} 결혼합니다`}
        description={inv.wedding_date ? `${inv.wedding_date.replace(/-/g, '.')} · ${inv.venue_name || ''}` : '청첩장을 확인해주세요'}
        imageUrl={inv.cover_image_url || ''}
        style={{ height: 52, width: '100%', borderRadius: 14, fontSize: 15 }}
      />
    </div>
  );
}

const FONT = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";

// ═══════════════════════════════════════════════════════
// 1. 미니멀
// ═══════════════════════════════════════════════════════
export function MinimalTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#ffffff', fontFamily: FONT, maxWidth: 430, margin: '0 auto' }}>
      <div style={{ padding: '64px 32px 48px', textAlign: 'center', borderBottom: '1px solid #f2f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ height: 1, flex: 1, backgroundColor: '#e5e8eb' }} />
          <Heart size={16} color="#c9d1d9" fill="#c9d1d9" />
          <div style={{ height: 1, flex: 1, backgroundColor: '#e5e8eb' }} />
        </div>
        <p style={{ fontSize: 13, letterSpacing: '0.15em', color: '#8b95a1', marginBottom: 20, textTransform: 'uppercase' }}>
          Wedding Invitation
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>{inv.groom_name || '신랑'}</p>
            <p style={{ fontSize: 12, color: '#8b95a1', margin: '4px 0 0' }}>신랑</p>
          </div>
          <p style={{ fontSize: 24, color: '#c9d1d9', margin: '0 4px' }}>&</p>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#191f28', margin: 0 }}>{inv.bride_name || '신부'}</p>
            <p style={{ fontSize: 12, color: '#8b95a1', margin: '4px 0 0' }}>신부</p>
          </div>
        </div>
        {inv.wedding_date && <p style={{ fontSize: 15, color: '#4e5968', fontWeight: 500, margin: 0 }}>{formatDate(inv.wedding_date)}</p>}
        {inv.wedding_time && (
          <p style={{ fontSize: 14, color: '#8b95a1', margin: '6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Clock size={13} /> {inv.wedding_time}
          </p>
        )}
      </div>
      {inv.message && (
        <div style={{ padding: '40px 32px', textAlign: 'center', borderBottom: '1px solid #f2f4f6' }}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#4e5968', whiteSpace: 'pre-line', wordBreak: 'keep-all', margin: 0 }}>{inv.message}</p>
        </div>
      )}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ padding: '32px', borderBottom: '1px solid #f2f4f6' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', color: '#8b95a1', marginBottom: 12, textTransform: 'uppercase' }}>Location</p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#191f28', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && (
            <p style={{ fontSize: 13, color: '#8b95a1', margin: 0, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {inv.venue_address}
            </p>
          )}
        </div>
      )}
      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#191f28" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 2. 클래식
// ═══════════════════════════════════════════════════════
export function ClassicTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#fdf8f0', fontFamily: FONT, maxWidth: 430, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '56px 32px 40px' }}>
        <p style={{ fontSize: 28, letterSpacing: '0.08em', marginBottom: 8 }}>✦ ✦ ✦</p>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', color: '#9a8068', marginBottom: 32, textTransform: 'uppercase' }}>
          Marriage Invitation
        </p>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#3d2b1f', margin: '0 0 4px', letterSpacing: '0.05em' }}>
            {inv.groom_name || '신랑'} · {inv.bride_name || '신부'}
          </p>
          <div style={{ height: 1, backgroundColor: '#c9a882', margin: '16px 32px' }} />
        </div>
        {inv.wedding_date && <p style={{ fontSize: 16, color: '#5c3d2e', fontWeight: 600, margin: 0 }}>{formatDate(inv.wedding_date)}</p>}
        {inv.wedding_time && <p style={{ fontSize: 14, color: '#9a8068', margin: '6px 0 0' }}>{inv.wedding_time}</p>}
      </div>
      {inv.message && (
        <div style={{ margin: '0 24px 24px', padding: '28px 24px', backgroundColor: 'rgba(201,168,130,0.12)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(201,168,130,0.3)' }}>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#5c3d2e', whiteSpace: 'pre-line', wordBreak: 'keep-all', margin: 0 }}>{inv.message}</p>
        </div>
      )}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ margin: '0 24px 24px', padding: '24px', backgroundColor: 'white', borderRadius: 16, border: '1px solid #e8ddd0' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.15em', color: '#9a8068', marginBottom: 10, textTransform: 'uppercase' }}>예 식 장</p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#3d2b1f', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && <p style={{ fontSize: 13, color: '#9a8068', margin: 0 }}>{inv.venue_address}</p>}
        </div>
      )}
      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#7a5c40" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 3. 플라워
// ═══════════════════════════════════════════════════════
export function FloralTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  return (
    <div style={{ minHeight: '100dvh', fontFamily: FONT, maxWidth: 430, margin: '0 auto', background: 'linear-gradient(160deg, #fff5f7 0%, #fff9f5 50%, #f5f0ff 100%)' }}>
      <div style={{ textAlign: 'center', padding: '56px 32px 32px' }}>
        <div style={{ fontSize: 40, marginBottom: 4, lineHeight: 1, display: 'flex', justifyContent: 'center' }}>
          <Icon name="floret" size={40} color="#d4879a" />
        </div>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: '#d4879a', marginBottom: 28, textTransform: 'uppercase' }}>With Love</p>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 99, padding: '12px 28px', boxShadow: '0 4px 20px rgba(212,135,154,0.15)', marginBottom: 20 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3d1a25', margin: 0 }}>{inv.groom_name || '신랑'}</p>
            <Heart size={14} color="#d4879a" fill="#d4879a" />
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3d1a25', margin: 0 }}>{inv.bride_name || '신부'}</p>
          </div>
        </div>
        {inv.wedding_date && <p style={{ fontSize: 15, color: '#6b3549', fontWeight: 600, margin: '0 0 6px' }}>{formatDate(inv.wedding_date)}</p>}
        {inv.wedding_time && <p style={{ fontSize: 14, color: '#d4879a', margin: 0 }}>{inv.wedding_time}</p>}
      </div>
      {inv.message && (
        <div style={{ margin: '0 20px 20px', padding: '28px 24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,240,245,0.9))', borderRadius: 20, textAlign: 'center', boxShadow: '0 2px 16px rgba(212,135,154,0.1)', border: '1px solid rgba(212,135,154,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="floret" size={13} color="#d4879a" />
            <Icon name="floret" size={13} color="#d4879a" />
            <Icon name="floret" size={13} color="#d4879a" />
          </div>
          <p style={{ fontSize: 15, lineHeight: 2, color: '#6b3549', whiteSpace: 'pre-line', wordBreak: 'keep-all', margin: 0 }}>{inv.message}</p>
        </div>
      )}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ margin: '0 20px 20px', padding: '24px', backgroundColor: 'white', borderRadius: 20, boxShadow: '0 2px 16px rgba(212,135,154,0.1)', border: '1px solid rgba(212,135,154,0.15)' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', color: '#d4879a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} color="#d4879a" />예 식 장
          </p>
          {inv.venue_name && <p style={{ fontSize: 17, fontWeight: 700, color: '#3d1a25', margin: '0 0 6px' }}>{inv.venue_name}</p>}
          {inv.venue_address && <p style={{ fontSize: 13, color: '#9c7080', margin: 0 }}>{inv.venue_address}</p>}
        </div>
      )}
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Icon name="floret" size={16} color="#d4879a" />
          <Heart size={14} color="#d4879a" fill="#d4879a" />
          <Icon name="floret" size={16} color="#d4879a" />
        </div>
      </div>
      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#c4617a" />
    </div>
  );
}

// ─── 방명록 ─────────────────────────────────────────────────────────
// guestName / onGuestNameChange: 부모(청첩장 공개 페이지)에서 이름을 공유할 때 사용
// 미제공 시 내부 상태로 동작 (하위 호환)
export function Guestbook({ invitationId, accentColor = '#3182f6', guestName, onGuestNameChange }) {
  const [entries, setEntries]   = useState([]);
  const [localName, setLocalName] = useState('');
  const [message, setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  // 이름 상태: 부모 제어 우선, 없으면 로컬
  const name    = guestName    !== undefined ? guestName    : localName;
  const setName = onGuestNameChange !== undefined
    ? onGuestNameChange
    : setLocalName;

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/guestbook?invitation_id=${invitationId}`);
      if (!res.ok) return;
      const { data } = await res.json();
      setEntries(data || []);
    };
    load();
  }, [invitationId]);

  async function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('이름을 입력해주세요.'); return; }
    if (!message.trim()) { setError('메시지를 입력해주세요.'); return; }
    setSubmitting(true);
    const res = await fetch('/api/guestbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitation_id: invitationId, name: name.trim(), message: message.trim() }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError('전송에 실패했어요. 잠시 후 다시 시도해주세요.'); return; }
    setEntries(prev => [json.data, ...prev]);
    setName('');
    setMessage('');
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return '방금';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  return (
    <div style={{ padding: '0 24px 48px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: '#f2f4f6' }} />
        <p style={{ fontSize: 12, letterSpacing: '0.1em', color: '#b0b8c1' }}>축하 메시지</p>
        <div style={{ flex: 1, height: 1, backgroundColor: '#f2f4f6' }} />
      </div>

      {/* 입력 폼 */}
      <div style={{
        backgroundColor: '#f8f9fa', borderRadius: 16,
        padding: '16px', marginBottom: 16,
      }}>
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          style={{
            width: '100%', height: 44, borderRadius: 10,
            border: '1.5px solid #e5e8eb', padding: '0 14px',
            fontSize: 14, color: '#191f28', outline: 'none',
            marginBottom: 8, boxSizing: 'border-box',
            fontFamily: FONT, backgroundColor: 'white',
          }}
        />
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="신랑신부에게 축하 메시지를 남겨주세요 💌"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
            rows={3}
            style={{
              width: '100%', borderRadius: 10,
              border: '1.5px solid #e5e8eb', padding: '12px 14px',
              fontSize: 14, color: '#191f28', outline: 'none',
              resize: 'none', lineHeight: 1.6, boxSizing: 'border-box',
              fontFamily: FONT, backgroundColor: 'white',
            }}
          />
          <p style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: '#c9d1d9' }}>
            {message.length}/200
          </p>
        </div>
        {error && <p style={{ fontSize: 12, color: '#ff4d4f', marginTop: 6 }}>{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', height: 44, borderRadius: 10, border: 'none',
            backgroundColor: done ? '#27b97c' : submitting ? '#c9d1d9' : accentColor,
            color: 'white', fontWeight: 700, fontSize: 14,
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6, fontFamily: FONT,
            transition: 'background-color 0.2s',
          }}
        >
          {done ? <><Icon name="check" size={14} color="currentColor" /> 전달됐어요!</> : submitting ? '전송 중...' : <><Send size={14} />메시지 남기기</>}
        </button>
      </div>

      {/* 메시지 목록 */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              backgroundColor: 'white', borderRadius: 14,
              padding: '14px 16px', border: '1px solid #f2f4f6',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#191f28', margin: 0 }}>{entry.name}</p>
                <p style={{ fontSize: 11, color: '#b0b8c1', margin: 0 }}>{timeAgo(entry.created_at)}</p>
              </div>
              <p style={{ fontSize: 14, color: '#4e5968', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {entry.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 4. Ourday 에디토리얼
// ═══════════════════════════════════════════════════════
export function EditorialTemplate({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  const SERIF_EN = "'Cormorant Garamond', serif";
  const SERIF_KO = "'Noto Serif KR', serif";

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#FAF8F5', fontFamily: FONT, maxWidth: 430, margin: '0 auto' }}>

      {/* ── 커버 이미지 ── */}
      {inv.cover_image_url && (
        <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
          <img
            src={inv.cover_image_url}
            alt="wedding"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
          {/* 이미지 위 그라디언트 오버레이 */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(26,22,19,0.5) 100%)' }} />
        </div>
      )}

      {/* ── 히어로 ── */}
      <div style={{ padding: inv.cover_image_url ? '48px 32px 48px' : '72px 32px 48px', textAlign: 'center' }}>

        {/* 소형 O·D 모노그램 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 32 }}>
          <span style={{ fontFamily: SERIF_EN, fontSize: 24, fontWeight: 500, color: '#1A1613', lineHeight: 1 }}>O</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#C9A96E', display: 'inline-block' }} />
          <span style={{ fontFamily: SERIF_EN, fontSize: 24, fontWeight: 500, color: '#1A1613', lineHeight: 1 }}>D</span>
        </div>

        {/* 키커 */}
        <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 11, color: '#b0935a', letterSpacing: '0.16em', marginBottom: 28, margin: '0 0 28px' }}>
          · Wedding Invitation ·
        </p>

        {/* 이름 */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: SERIF_KO, fontSize: 30, fontWeight: 500, color: '#1A1613', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            {inv.groom_name || '신랑'}
          </p>
          <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 22, color: '#C9A96E', margin: '10px 0', letterSpacing: '0.06em' }}>
            &amp;
          </p>
          <p style={{ fontFamily: SERIF_KO, fontSize: 30, fontWeight: 500, color: '#1A1613', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            {inv.bride_name || '신부'}
          </p>
        </div>

        {/* 샴페인 플러리시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0' }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#C9A96E', opacity: 0.25 }} />
          <span style={{ fontFamily: SERIF_EN, fontSize: 12, color: '#C9A96E', opacity: 0.5, lineHeight: 1 }}>◆</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#C9A96E', opacity: 0.25 }} />
        </div>

        {/* 날짜 */}
        {inv.wedding_date && (
          <p style={{ fontFamily: SERIF_KO, fontSize: 16, fontWeight: 500, color: '#3d3530', margin: '0 0 6px' }}>
            {formatDate(inv.wedding_date)}
          </p>
        )}
        {inv.wedding_time && (
          <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 13, color: '#b0935a', margin: 0, letterSpacing: '0.04em' }}>
            {inv.wedding_time}
          </p>
        )}
      </div>

      {/* ── 메시지 ── */}
      {inv.message && (
        <div style={{ margin: '0 24px 28px', padding: '28px 24px', backgroundColor: '#F5F0E8', borderRadius: 4, textAlign: 'center', border: '1px solid rgba(201,169,110,0.22)' }}>
          <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 10, color: '#b0935a', letterSpacing: '0.12em', margin: '0 0 16px' }}>· message ·</p>
          <p style={{ fontFamily: SERIF_KO, fontSize: 14.5, lineHeight: 2.1, color: '#3d3530', whiteSpace: 'pre-line', wordBreak: 'keep-all', margin: 0 }}>
            {inv.message}
          </p>
        </div>
      )}

      {/* ── 예식장 ── */}
      {(inv.venue_name || inv.venue_address) && (
        <div style={{ margin: '0 24px 28px', padding: '24px', backgroundColor: 'white', borderRadius: 4, border: '1px solid rgba(201,169,110,0.28)' }}>
          <p style={{ fontFamily: SERIF_EN, fontStyle: 'italic', fontSize: 10, color: '#b0935a', letterSpacing: '0.12em', margin: '0 0 12px' }}>· venue ·</p>
          {inv.venue_name && (
            <p style={{ fontFamily: SERIF_KO, fontSize: 17, fontWeight: 500, color: '#1A1613', margin: '0 0 6px' }}>{inv.venue_name}</p>
          )}
          {inv.venue_address && (
            <p style={{ fontFamily: SERIF_EN, fontSize: 12, color: '#b0935a', margin: 0, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {inv.venue_address}
            </p>
          )}
        </div>
      )}

      <BottomActions inv={inv} copied={copied} copyUrl={copyUrl} showAccount={showAccount} setShowAccount={setShowAccount} accentColor="#C9A96E" />
    </div>
  );
}

// ─── 템플릿 라우터 ────────────────────────────────────────────────────
// 템플릿만 렌더링. 방명록·RSVP는 페이지에서 직접 처리.
export function InvitationRenderer({ inv, copied, copyUrl, showAccount, setShowAccount }) {
  const props = { inv, copied, copyUrl, showAccount, setShowAccount };

  if (inv.template === 'classic')   return <ClassicTemplate  {...props} />;
  if (inv.template === 'floral')    return <FloralTemplate   {...props} />;
  if (inv.template === 'editorial') return <EditorialTemplate {...props} />;
  return <MinimalTemplate {...props} />;
}
