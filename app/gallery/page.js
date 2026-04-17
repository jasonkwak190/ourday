'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Copy, Check, Image as ImageIcon, Users, Trash2, RefreshCw, Download, MonitorPlay } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function GalleryPage() {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [loading,    setLoading]    = useState(true);
  const [event,      setEvent]      = useState(null);
  const [photos,     setPhotos]     = useState([]);
  const [copied,     setCopied]     = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [qrDataUrl,  setQrDataUrl]  = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // QR 코드 생성 (로컬, 외부 API 불필요)
  const generateQR = useCallback(async (url) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#191f28', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR 생성 실패:', err);
    }
  }, []);

  const loadGallery = useCallback(async (eventId) => {
    setRefreshing(true);
    const res  = await fetch(`/api/gallery?event_id=${eventId}`);
    const data = await res.json();
    if (data.photos) setPhotos(data.photos);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const res  = await fetch('/api/gallery', { method: 'POST' });
      const data = await res.json();
      if (data.event) {
        setEvent(data.event);
        await loadGallery(data.event.id);
      }
      setLoading(false);
    };
    init();
  }, [router, loadGallery]);

  // event_code 확정되면 QR 생성
  useEffect(() => {
    if (!event?.event_code || !origin) return;
    const guestUrl = `${origin}/guest/${event.event_code}`;
    generateQR(guestUrl);
  }, [event, origin, generateQR]);

  const guestUrl = event ? `${origin}/guest/${event.event_code}` : '';
  const liveUrl  = event ? `${origin}/live/${event.event_code}`  : '';

  async function copyLink() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // QR 이미지 다운로드
  function downloadQR() {
    if (!qrDataUrl || !event) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `ourday-qr-${event.event_code}.png`;
    a.click();
  }

  async function deletePhoto(photo) {
    if (!confirm('이 사진을 삭제할까요?')) return;
    setDeleting(photo.id);
    await fetch(`/api/gallery?photo_id=${photo.id}`, { method: 'DELETE' });
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setDeleting(null);
    if (selected?.id === photo.id) setSelected(null);
  }

  const photoCount = photos.length;
  const maxPhotos  = event?.max_photos ?? 50;
  const pct        = Math.round((photoCount / maxPhotos) * 100);

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--toss-text-secondary)' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <h1 className="text-xl font-semibold mb-4" style={{ color: 'var(--toss-text-primary)' }}>
        📷 하객 사진 갤러리
      </h1>

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

        {/* QR 이미지 */}
        <div className="flex flex-col items-center mb-4">
          <div className="rounded-2xl p-4 mb-3"
            style={{ backgroundColor: 'white', border: '1px solid var(--toss-border)', display: 'inline-block' }}>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR 코드" width={180} height={180}
                style={{ display: 'block', borderRadius: 4 }} ref={canvasRef} />
            ) : (
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--toss-bg)', borderRadius: 4 }}>
                <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>QR 생성 중...</p>
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

        {/* 버튼 3개 */}
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
          <button onClick={downloadQR} disabled={!qrDataUrl}
            className="flex items-center justify-center gap-1.5"
            style={{
              flex: 1, height: 44, borderRadius: 12, cursor: qrDataUrl ? 'pointer' : 'not-allowed',
              backgroundColor: 'var(--toss-bg)',
              color: 'var(--toss-text-secondary)',
              border: '1px solid var(--toss-border)', fontWeight: 600, fontSize: 13,
            }}>
            <Download size={15} />
            QR 저장
          </button>
        </div>

        {/* 슬라이드쇼는 보조 버튼으로 분리 */}
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
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--toss-blue)' }}>
              {photoCount}
            </span>
            <span className="text-sm" style={{ color: 'var(--toss-text-tertiary)' }}>/ {maxPhotos}장</span>
          </div>
        </div>

        <div className="rounded-full mb-3 overflow-hidden" style={{ height: 6, backgroundColor: 'var(--toss-border)' }}>
          <div className="rounded-full transition-all"
            style={{ height: '100%', width: `${pct}%`,
              backgroundColor: pct >= 100 ? 'var(--toss-red)' : 'var(--toss-blue)' }} />
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
        <div className="card text-center" style={{ padding: '40px 24px' }}>
          <div className="flex items-center justify-center mx-auto mb-3 rounded-2xl"
            style={{ width: 56, height: 56, backgroundColor: 'var(--toss-bg)' }}>
            <Users size={24} color="var(--toss-text-tertiary)" />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--toss-text-primary)' }}>아직 사진이 없어요</p>
          <p className="text-xs" style={{ color: 'var(--toss-text-tertiary)' }}>
            QR 코드를 공유하면 하객이 바로 업로드할 수 있어요
          </p>
        </div>
      ) : (
        <div className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--toss-text-primary)' }}>전체 사진</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {photos.map(photo => (
              <div key={photo.id} className="relative"
                style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                  backgroundColor: 'var(--toss-bg)', cursor: 'pointer' }}
                onClick={() => setSelected(photo)}>
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="하객 사진"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon size={20} color="var(--toss-text-tertiary)" />
                  </div>
                )}
                {photo.uploader_name && (
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                    style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                    <p style={{ color: 'white', fontSize: 10, fontWeight: 500 }}>{photo.uploader_name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체화면 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setSelected(null)}>
          <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
            <div>
              {selected.uploader_name && (
                <p className="text-sm font-medium" style={{ color: 'white' }}>{selected.uploader_name}</p>
              )}
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {new Date(selected.created_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button onClick={() => deletePhoto(selected)} disabled={deleting === selected.id}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <Trash2 size={20} color={deleting === selected.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            {selected.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.url} alt="하객 사진"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }}
                onClick={e => e.stopPropagation()} />
            )}
          </div>
        </div>
      )}

      <BottomNav active="gallery" />
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
