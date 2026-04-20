'use client';

import { useState, useEffect, use } from 'react';
import { Heart, Check } from 'lucide-react';

const FONT = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export default function RSVPPage({ params }) {
  const { id: coupleId } = use(params);

  const [info, setInfo]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  const [name, setName]           = useState('');
  const [attending, setAttending] = useState(null);
  const [mealCount, setMealCount] = useState(1);
  const [phone, setPhone]         = useState('');
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/rsvp?couple_id=${coupleId}`);
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const data = await res.json();
      setInfo(data);
      setLoading(false);
    };
    load();
  }, [coupleId]);

  async function handleSubmit() {
    setError('');
    if (!name.trim()) { setError('성함을 입력해주세요.'); return; }
    if (attending === null) { setError('참석 여부를 선택해주세요.'); return; }

    setSubmitting(true);
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couple_id: coupleId,
        name: name.trim(),
        attending,
        meal_count: attending ? mealCount : 0,
        phone: phone.trim() || null,
        message: message.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setError('전송에 실패했어요. 잠시 후 다시 시도해주세요.'); return; }
    setDone(true);
  }

  // ── 로딩 ──
  if (loading) {
    return (
      <div style={centered}>
        <Heart size={28} color="#e8b4b8" fill="#e8b4b8" style={{ animation: 'pulse 1.2s infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  // ── 없음 ──
  if (notFound) {
    return (
      <div style={centered}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>💌</p>
        <p style={{ fontSize: 16, color: '#4e5968', fontWeight: 600 }}>잘못된 링크예요</p>
        <p style={{ fontSize: 13, color: '#b0b8c1', marginTop: 6 }}>청첩장에서 받은 링크를 다시 확인해주세요</p>
      </div>
    );
  }

  // ── 제출 완료 ──
  if (done) {
    return (
      <div style={centered}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          backgroundColor: attending ? '#eaf4ff' : '#f2f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          {attending
            ? <Check size={36} color="#3182f6" strokeWidth={2.5} />
            : <span style={{ fontSize: 32 }}>🙏</span>
          }
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#191f28', marginBottom: 8 }}>
          {attending ? '참석 확인 완료! 🎉' : '전달 완료'}
        </p>
        <p style={{ fontSize: 14, color: '#8b95a1', textAlign: 'center', lineHeight: 1.8 }}>
          {attending
            ? `${name}님의 참석을 기다릴게요.\n소중한 자리에 함께해주셔서 감사해요 ♥`
            : `${name}님의 답변을 잘 받았어요.\n다음에 좋은 자리에서 뵙겠습니다 😊`
          }
        </p>
      </div>
    );
  }

  const groomName = info?.groom_name || '신랑';
  const brideName = info?.bride_name || '신부';

  return (
    <div style={{
      minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
      backgroundColor: '#f8f9fa', padding: '0 0 48px',
      fontFamily: FONT,
    }}>
      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(160deg, #fff5f7 0%, #ffffff 100%)',
        padding: '48px 28px 32px',
        textAlign: 'center',
        borderBottom: '1px solid #f2f4f6',
      }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: '#d4879a', marginBottom: 16, textTransform: 'uppercase' }}>
          Wedding Invitation
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          backgroundColor: 'white', borderRadius: 99,
          padding: '12px 24px',
          boxShadow: '0 2px 16px rgba(212,135,154,0.12)',
          marginBottom: 20,
        }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#191f28', margin: 0 }}>{groomName}</p>
          <Heart size={14} color="#d4879a" fill="#d4879a" />
          <p style={{ fontSize: 20, fontWeight: 700, color: '#191f28', margin: 0 }}>{brideName}</p>
        </div>
        {info?.wedding_date && (
          <p style={{ fontSize: 14, color: '#6b3549', fontWeight: 600, margin: 0 }}>
            {formatDate(info.wedding_date)}
          </p>
        )}
        {info?.wedding_time && (
          <p style={{ fontSize: 13, color: '#d4879a', margin: '4px 0 0' }}>{info.wedding_time}</p>
        )}
        {info?.venue_name && (
          <p style={{ fontSize: 13, color: '#8b95a1', margin: '8px 0 0' }}>
            📍 {info.venue_name}
            {info.venue_address ? ` · ${info.venue_address}` : ''}
          </p>
        )}
        <div style={{
          marginTop: 20, padding: '12px 20px',
          backgroundColor: 'rgba(212,135,154,0.08)',
          borderRadius: 12,
          fontSize: 13, color: '#6b3549', lineHeight: 1.6,
        }}>
          참석 여부를 알려주시면<br />자리를 미리 준비할 수 있어요 🙏
        </div>
      </div>

      {/* 폼 */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 성함 */}
        <Section title="성함">
          <input
            type="text"
            placeholder="홍길동"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            style={inputStyle}
          />
        </Section>

        {/* 참석 여부 */}
        <Section title="참석 여부">
          <div style={{ display: 'flex', gap: 10 }}>
            <AttendBtn
              selected={attending === true}
              onClick={() => setAttending(true)}
              emoji="🎉"
              label="참석할게요"
              color="#3182f6"
              bg="#eaf4ff"
            />
            <AttendBtn
              selected={attending === false}
              onClick={() => setAttending(false)}
              emoji="🙏"
              label="참석이 어려워요"
              color="#8b95a1"
              bg="#f2f4f6"
            />
          </div>
        </Section>

        {/* 식사 인원 (참석할 경우만) */}
        {attending === true && (
          <Section title="참석 인원 (식사 수)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setMealCount(c => Math.max(1, c - 1))}
                style={counterBtnStyle('#f2f4f6', '#191f28')}
              >−</button>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#191f28', minWidth: 32, textAlign: 'center' }}>
                {mealCount}
              </span>
              <button
                onClick={() => setMealCount(c => c + 1)}
                style={counterBtnStyle('#eaf4ff', '#3182f6')}
              >+</button>
              <span style={{ fontSize: 13, color: '#8b95a1' }}>명</span>
            </div>
          </Section>
        )}

        {/* 연락처 */}
        <Section title="연락처 (선택)">
          <input
            type="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={15}
            style={inputStyle}
          />
        </Section>

        {/* 축하 메시지 */}
        <Section title="신랑신부에게 한마디 (선택)">
          <textarea
            placeholder="축하 메시지를 남겨주세요"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
            rows={3}
            style={{
              ...inputStyle,
              height: 'auto',
              resize: 'none',
              padding: '14px 16px',
              lineHeight: 1.6,
            }}
          />
        </Section>

        {error && (
          <p style={{ fontSize: 13, color: '#ff4d4f', textAlign: 'center' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            height: 56, borderRadius: 16, border: 'none',
            backgroundColor: submitting ? '#c9d1d9' : '#3182f6',
            color: 'white', fontSize: 16, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            transition: 'background-color 0.2s',
          }}
        >
          {submitting ? '전송 중...' : '💌 참석 여부 전달하기'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: 20,
      padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#191f28', marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

function AttendBtn({ selected, onClick, emoji, label, color, bg }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 76, borderRadius: 16, border: `2px solid ${selected ? color : '#e5e8eb'}`,
        backgroundColor: selected ? bg : '#f8f9fa',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: selected ? color : '#8b95a1' }}>{label}</span>
    </button>
  );
}

const inputStyle = {
  width: '100%', height: 48, borderRadius: 12,
  border: '1.5px solid #e5e8eb', padding: '0 16px',
  fontSize: 15, color: '#191f28', outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
};

const counterBtnStyle = (bg, color) => ({
  width: 40, height: 40, borderRadius: 12,
  backgroundColor: bg, color, border: 'none',
  fontSize: 20, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
});

const centered = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
  padding: 24, textAlign: 'center',
};
