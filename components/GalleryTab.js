'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { QrCode, Copy, Check, Image as ImageIcon, Trash2, RefreshCw, Download, MonitorPlay, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import EmptyState from '@/components/EmptyState';
import QRCodeSVG from 'react-qr-code';

export default function GalleryTab() {
  const qrRef = useRef(null);

  const [loading,    setLoading]    = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [event,      setEvent]      = useState(null);
  const [photos,     setPhotos]     = useState([]);
  const [copied,     setCopied]     = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // 모달 상태: photo + 애니메이션 분리
  const [modalPhoto,   setModalPhoto]   = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  // ── 모달 열기/닫기 ─────────────────────────────────────────────
  function openModal(photo) {
    setModalPhoto(photo);
    // 다음 프레임에서 visible → CSS transition 발동
    requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
  }

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setModalPhoto(null), 220); // transition 끝난 후 언마운트
  }, []);

  // 이전/다음 사진 이동
  const currentIndex = useMemo(
    () => modalPhoto ? photos.findIndex(p => p.id === modalPhoto.id) : -1,
    [modalPhoto, photos]
  );
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < photos.length - 1;

  function goPrev() { if (canPrev) openModal(photos[currentIndex - 1]); }
  function goNext() { if (canNext) openModal(photos[currentIndex + 1]); }

  // 키보드 단축키
  useEffect(() => {
    if (!modalPhoto) return;
    function onKey(e) {
      if (e.key === 'Escape')     closeModal();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalPhoto, currentIndex, closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── QR 다운로드 ──────────────────────────────────────────────
  function downloadQR() {
    if (!qrRef.current || !event) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas  = document.createElement('canvas');
    const size    = 200;
    canvas.width  = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ourday-qr-${event.event_code}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }

  // ── 데이터 로드 ──────────────────────────────────────────────
  const loadGallery = useCallback(async (eventId) => {
    setRefreshing(true);
    const res  = await fetch(`/api/gallery?event_id=${eventId}`);
    const data = await res.json();
    if (data.photos) setPhotos(data.photos);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const res  = await fetch('/api/gallery', { method: 'POST' });
      const data = await res.json();
      if (data.event) {
        setEvent(data.event);
        await loadGallery(data.event.id);
      } else {
        setLoadFailed(true);
      }
      setLoading(false);
    };
    init();
  }, [loadGallery]);

  async function copyLink() {
    await copyToClipboard(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deletePhoto(photo) {
    if (!confirm('이 사진을 삭제할까요?')) return;
    setDeleting(photo.id);
    await fetch(`/api/gallery?photo_id=${photo.id}`, { method: 'DELETE' });
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setDeleting(null);
    if (modalPhoto?.id === photo.id) closeModal();
  }

  // ── 계산 ─────────────────────────────────────────────────────
  const guestUrl   = event ? `${origin}/guest/${event.event_code}` : '';
  const liveUrl    = event ? `${origin}/live/${event.event_code}` : '';
  const photoCount = photos.length;
  const maxPhotos  = event?.max_photos ?? 50;
  const pct        = Math.round((photoCount / maxPhotos) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* QR 카드 */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
            style={{ width: 40, height: 40, backgroundColor: 'var(--toss-blue-light)' }}>
            <QrCode size={20} color="var(--toss-blue)" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--toss-text-primary)' }}>하객 업로드 QR</p>
            <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
              QR 코드가 고정돼 있어요 — 프린트해서 테이블에 올려두세요
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center mb-4" ref={qrRef}>
          <div className="rounded-2xl p-4 mb-3"
            style={{ backgroundColor: 'white', border: '1px solid var(--toss-border)', display: 'inline-block' }}>
            {guestUrl ? (
              <QRCodeSVG value={guestUrl} size={180} fgColor="#191f28" bgColor="#ffffff" level="M"
                style={{ display: 'block', borderRadius: 4 }} />
            ) : (
              <div style={{ width: 180, height: 180, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: 'var(--toss-bg)', borderRadius: 4, padding: 12 }}>
                {loadFailed
                  ? <p className="text-xs font-bold" style={{ color: 'var(--toss-red)' }}>불러오기 실패</p>
                  : <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>QR 생성 중...</p>}
              </div>
            )}
          </div>
          {event && (
            <p className="text-xs px-3 py-1.5 rounded-xl tabular-nums"
              style={{ backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-tertiary)',
                wordBreak: 'break-all', textAlign: 'center', maxWidth: '100%' }}>
              고정 코드: {event.event_code}
            </p>
          )}
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={copyLink}
            className="flex items-center justify-center gap-1.5"
            style={{
              flex: 1, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
              backgroundColor: copied ? 'var(--toss-green-light)' : 'var(--toss-blue-light)',
              color: copied ? 'var(--toss-green)' : 'var(--toss-blue)',
              fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
            }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? '복사됨!' : '링크 복사'}
          </button>
          <button onClick={downloadQR} disabled={!guestUrl}
            className="flex items-center justify-center gap-1.5"
            style={{
              flex: 1, height: 44, borderRadius: 12, cursor: guestUrl ? 'pointer' : 'not-allowed',
              backgroundColor: 'var(--toss-bg)', color: 'var(--toss-text-secondary)',
              border: '1px solid var(--toss-border)', fontWeight: 600, fontSize: 13,
            }}>
            <Download size={15} />
            QR 저장
          </button>
        </div>

        <button onClick={() => window.open(liveUrl, '_blank')}
          className="flex items-center justify-center gap-2 w-full"
          style={{
            height: 40, borderRadius: 12, cursor: 'pointer',
            backgroundColor: 'transparent', border: 'none',
            color: 'var(--toss-text-tertiary)', fontWeight: 600, fontSize: 13,
          }}>
          <MonitorPlay size={15} />
          식장 라이브 슬라이드쇼 열기
        </button>
      </div>

      {/* 사진 현황 */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} color="var(--toss-blue)" />
            <span className="text-sm font-bold" style={{ color: 'var(--toss-text-primary)' }}>수집된 사진</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => event && loadGallery(event.id)} disabled={refreshing}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <RefreshCw size={16} color="var(--toss-text-tertiary)"
                style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--toss-blue)' }}>{photoCount}</span>
            <span className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>/ {maxPhotos}장</span>
          </div>
        </div>
        <div className="rounded-full mb-3 overflow-hidden" style={{ height: 6, backgroundColor: 'var(--toss-border)' }}>
          <div className="rounded-full transition-all"
            style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 100 ? 'var(--toss-red)' : 'var(--toss-blue)' }} />
        </div>
        {pct >= 80 && (
          <p className="text-xs" style={{ color: pct >= 100 ? 'var(--toss-red)' : 'var(--toss-yellow)' }}>
            {pct >= 100
              ? '무료 한도에 도달했어요. 프리미엄으로 업그레이드하면 무제한으로 받을 수 있어요.'
              : `한도가 가까워지고 있어요 (${maxPhotos - photoCount}장 남음)`}
          </p>
        )}
      </div>

      {/* 사진 그리드 */}
      {photoCount === 0 ? (
        <div className="card">
          <EmptyState icon={ImageIcon} title="아직 사진이 없어요"
            description="QR 코드를 공유하면 하객이 현장에서 바로 업로드할 수 있어요" />
        </div>
      ) : (
        <div className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>전체 사진</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {photos.map(photo => (
              <PhotoThumb key={photo.id} photo={photo} onClick={() => openModal(photo)} />
            ))}
          </div>
        </div>
      )}

      {/* 전체화면 모달 — 항상 마운트, opacity로 fade */}
      {modalPhoto && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column',
            backgroundColor: 'rgba(0,0,0,0.95)',
            opacity: modalVisible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}>
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between px-4 py-3"
            onClick={e => e.stopPropagation()}>
            <div>
              {modalPhoto.uploader_name && (
                <p className="text-sm font-medium" style={{ color: 'white' }}>{modalPhoto.uploader_name}</p>
              )}
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {photos.length > 1 && `${currentIndex + 1} / ${photos.length} · `}
                {new Date(modalPhoto.created_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => deletePhoto(modalPhoto)} disabled={deleting === modalPhoto.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                <Trash2 size={20} color={deleting === modalPhoto.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'} />
              </button>
              <button onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                <X size={22} color="rgba(255,255,255,0.8)" />
              </button>
            </div>
          </div>

          {/* 이미지 영역 */}
          <div className="flex-1 flex items-center justify-center px-4 relative"
            onClick={e => e.stopPropagation()}>
            {/* 이전 버튼 */}
            {canPrev && (
              <button onClick={goPrev}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}>
                <ChevronLeft size={22} color="white" />
              </button>
            )}

            {modalPhoto.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={modalPhoto.url}
                alt="하객 사진"
                style={{
                  maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12,
                  transition: 'opacity 0.15s ease',
                }}
              />
            )}

            {/* 다음 버튼 */}
            {canNext && (
              <button onClick={goNext}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}>
                <ChevronRight size={22} color="white" />
              </button>
            )}
          </div>

          {/* 하단 인디케이터 */}
          {photos.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-6 pt-3" onClick={e => e.stopPropagation()}>
              {photos.map((_, i) => (
                <div key={i}
                  onClick={() => openModal(photos[i])}
                  style={{
                    width: i === currentIndex ? 16 : 6, height: 6,
                    borderRadius: 3,
                    backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.2s ease', cursor: 'pointer',
                  }} />
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .photo-skeleton {
          background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
          background-size: 200px 100%;
          animation: shimmer 1.2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

/* ── 사진 썸네일 (메모이제이션 + lazy load + skeleton) ─────────── */
import { memo } from 'react';

const PhotoThumb = memo(function PhotoThumb({ photo, onClick }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
        backgroundColor: 'var(--toss-bg)', cursor: 'pointer', position: 'relative',
      }}>
      {/* 로드 전 skeleton */}
      {!loaded && (
        <div className="photo-skeleton" style={{ position: 'absolute', inset: 0 }} />
      )}
      {photo.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt="하객 사진"
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {photo.uploader_name && loaded && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
        }}>
          <p style={{ color: 'white', fontSize: 10, fontWeight: 500 }}>{photo.uploader_name}</p>
        </div>
      )}
    </div>
  );
});
