'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { Heart, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import Icon from '@/components/Icon';

const SLIDE_INTERVAL = 4000; // 4초

export default function LiveSlideshowPage({ params }) {
  const { code } = use(params);

  const [photos, setPhotos]     = useState([]);
  const [event, setEvent]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [current, setCurrent]   = useState(0);
  const [playing, setPlaying]   = useState(true);
  const [showUI, setShowUI]     = useState(true);

  // 사진 로드 (30초마다 자동 갱신)
  const loadPhotos = useCallback(async () => {
    try {
      const res  = await fetch(`/api/live?code=${code}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setEvent(data.event);
      setPhotos(data.photos || []);
    } catch {
      setError('불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadPhotos();
    const interval = setInterval(loadPhotos, 30_000);
    return () => clearInterval(interval);
  }, [loadPhotos]);

  // 자동 슬라이드
  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % photos.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(t);
  }, [playing, photos.length]);

  // UI 자동 숨김 (3초 후)
  useEffect(() => {
    if (!showUI) return;
    const t = setTimeout(() => setShowUI(false), 3000);
    return () => clearTimeout(t);
  }, [showUI]);

  function prev() { setCurrent(c => (c - 1 + photos.length) % photos.length); }
  function next() { setCurrent(c => (c + 1) % photos.length); }

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={fullscreenStyle('#0a0a0a')}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>불러오는 중...</p>
      </div>
    );
  }

  // ── 에러 ──────────────────────────────────────────────────
  if (error) {
    return (
      <div style={fullscreenStyle('#0a0a0a')}>
        <Icon name="paperclip" size={36} color="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }} />
        <p style={{ color: 'white', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>링크를 확인해주세요</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  // ── 사진 없음 ──────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div style={fullscreenStyle('#0a0a0a')}>
        <Icon name="camera" size={40} color="rgba(255,255,255,0.5)" style={{ marginBottom: 16 }} />
        <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {event?.title || '라이브 갤러리'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 1.7 }}>
          아직 사진이 없어요.<br />
          QR 코드로 사진을 업로드해주세요!
        </p>
        <div style={{ marginTop: 24, padding: '10px 20px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>30초마다 자동으로 새 사진을 불러와요</p>
        </div>
      </div>
    );
  }

  const photo = photos[current];

  return (
    <div
      style={{ ...fullscreenStyle('#000'), cursor: 'pointer', userSelect: 'none' }}
      onClick={() => setShowUI(v => !v)}>

      {/* 메인 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.id}
        src={photo.url}
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain',
          animation: 'fadeIn 0.6s ease',
        }}
      />

      {/* 상단 정보 바 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '20px 24px 40px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        opacity: showUI ? 1 : 0,
        transition: 'opacity 0.4s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>
            {event?.title || '라이브 갤러리'}
          </p>
          {photo.uploader_name && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0 0' }}>
              <Icon name="camera" size={12} color="rgba(255,255,255,0.6)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {photo.uploader_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '6px 14px' }}>
          <Heart size={14} color="white" fill="white" />
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
            {current + 1} / {photos.length}
          </span>
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '40px 24px 32px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        opacity: showUI ? 1 : 0,
        transition: 'opacity 0.4s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
      }}>
        {/* 이전 */}
        <button onClick={e => { e.stopPropagation(); prev(); }} style={ctrlBtn}>
          <ChevronLeft size={24} color="white" />
        </button>

        {/* 재생/정지 */}
        <button onClick={e => { e.stopPropagation(); setPlaying(v => !v); }} style={{ ...ctrlBtn, width: 56, height: 56 }}>
          {playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" />}
        </button>

        {/* 다음 */}
        <button onClick={e => { e.stopPropagation(); next(); }} style={ctrlBtn}>
          <ChevronRight size={24} color="white" />
        </button>
      </div>

      {/* 진행 바 (슬라이드 인디케이터) */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 90, left: 24, right: 24,
          display: 'flex', gap: 4,
          opacity: showUI ? 1 : 0, transition: 'opacity 0.4s',
        }}>
          {photos.map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              style={{
                flex: 1, height: 2, borderRadius: 99, cursor: 'pointer',
                backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.3)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        body { margin: 0; overflow: hidden; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

const fullscreenStyle = (bg) => ({
  position: 'fixed', inset: 0,
  backgroundColor: bg,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
});

const ctrlBtn = {
  width: 44, height: 44, borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.15)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(4px)',
};
