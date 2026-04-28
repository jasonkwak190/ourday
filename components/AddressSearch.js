'use client';
import { useState, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { loadDaumPostcode, geocodeAddress } from '@/lib/kakaoMaps';

/**
 * 한국 표준 주소 검색 컴포넌트 (embed 모드)
 *
 * Daum Postcode iframe 임베드 (popup 차단 이슈 회피, 모바일 친화적)
 * + Kakao Geocoder 위경도 변환.
 */
export default function AddressSearch({ value, onChange, onClear, placeholder = '주소 검색하기' }) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const embedRef = useRef(null);

  async function open() {
    setError('');
    setLoading(true);
    setEmbedOpen(true);
    try {
      const daum = await loadDaumPostcode();
      // 컨테이너 DOM이 마운트될 시간 확보
      await new Promise((r) => requestAnimationFrame(r));
      if (!embedRef.current) { setLoading(false); return; }
      embedRef.current.innerHTML = '';

      new daum.Postcode({
        async oncomplete(data) {
          const roadAddress  = data.roadAddress  || '';
          const jibunAddress = data.jibunAddress || data.autoJibunAddress || '';
          const fullAddress  = roadAddress || jibunAddress;

          let coords = null;
          try { coords = await geocodeAddress(fullAddress); }
          catch { /* Kakao SDK 실패 시 위경도 없이 저장 */ }

          onChange({
            road_address:  roadAddress || null,
            jibun_address: jibunAddress || null,
            sido:          data.sido || null,
            sigungu:       data.sigungu || null,
            bname:         data.bname || null,
            building_name: data.buildingName || null,
            zonecode:      data.zonecode || null,
            lat:           coords?.lat ?? null,
            lng:           coords?.lng ?? null,
          });
          close();
        },
        width: '100%',
        height: '100%',
      }).embed(embedRef.current, { autoClose: false });
      setLoading(false);
    } catch (e) {
      setError('주소 검색을 불러올 수 없어요. 잠시 후 다시 시도해주세요.');
      console.error('[AddressSearch]', e.message);
      setEmbedOpen(false);
      setLoading(false);
    }
  }

  function close() {
    setEmbedOpen(false);
    setLoading(false);
    if (embedRef.current) embedRef.current.innerHTML = '';
  }

  const displayAddress = value
    ? [value.road_address || value.jibun_address, value.building_name].filter(Boolean).join(' ')
    : '';

  return (
    <>
      {/* 카드: 주소가 있으면 정보, 없으면 검색 버튼 */}
      {value && displayAddress ? (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '14px 16px', borderRadius: 16,
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--rule)',
          }}
        >
          <MapPin size={16} color="var(--champagne)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
              {displayAddress}
            </p>
            {value.jibun_address && value.road_address && value.jibun_address !== value.road_address && (
              <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0' }}>
                지번 · {value.jibun_address}
              </p>
            )}
            {value.zonecode && (
              <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', fontFamily: 'monospace' }}>
                {value.zonecode}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={open}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--champagne-2)', padding: 0,
                }}
              >
                주소 변경
              </button>
              {onClear && (
                <button
                  onClick={onClear}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, color: 'var(--ink-3)',
                    padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}
                  aria-label="주소 삭제"
                >
                  <X size={11} /> 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={open}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px', borderRadius: 16,
              backgroundColor: 'var(--paper)',
              border: '1px dashed var(--rule-strong)',
              cursor: loading ? 'wait' : 'pointer',
              color: 'var(--ink-3)',
              fontSize: 14,
              textAlign: 'left',
            }}
          >
            <Search size={16} color="var(--ink-3)" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{loading ? '주소 검색 여는 중…' : placeholder}</span>
          </button>
          {error && (
            <p style={{ fontSize: 12, color: 'var(--toss-red)', marginTop: 6 }}>{error}</p>
          )}
        </div>
      )}

      {/* 임베드 모달 — 풀스크린 시트 */}
      {embedOpen && (
        <div
          role="dialog"
          aria-label="주소 검색"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(26,22,19,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430,
              height: 'min(80dvh, 600px)',
              backgroundColor: 'var(--ivory)',
              borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--rule)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                주소 검색
              </p>
              <button
                onClick={close}
                aria-label="닫기"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-3)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div ref={embedRef} style={{ flex: 1, overflow: 'hidden' }} />
            {loading && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 8 }}>
                불러오는 중…
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
