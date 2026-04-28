'use client';
import { useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { loadDaumPostcode, geocodeAddress } from '@/lib/kakaoMaps';

/**
 * 한국 표준 주소 검색 컴포넌트
 *
 * Daum Postcode (무료, 키 불필요) + Kakao Geocoder (위경도 변환).
 * 사용자가 검색·선택하면 onChange에 표준화된 객체 전달.
 *
 * @param {Object} props
 * @param {Object|null} props.value — { road_address, jibun_address, sido, sigungu, bname, building_name, zonecode, lat, lng }
 * @param {(addr: Object) => void} props.onChange
 * @param {() => void} [props.onClear]
 * @param {string} [props.placeholder]
 */
export default function AddressSearch({ value, onChange, onClear, placeholder = '주소 검색하기' }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  async function open() {
    setError('');
    setOpening(true);
    try {
      const daum = await loadDaumPostcode();
      new daum.Postcode({
        async oncomplete(data) {
          // 카카오/다음 표준 응답 → 우리 표준 형식
          const roadAddress  = data.roadAddress  || '';
          const jibunAddress = data.jibunAddress || data.autoJibunAddress || '';
          const fullAddress  = roadAddress || jibunAddress;

          // 위경도 변환 (실패해도 주소는 저장)
          let coords = null;
          try {
            coords = await geocodeAddress(fullAddress);
          } catch { /* Kakao SDK 실패 시 위경도 없이 저장 */ }

          onChange({
            road_address:  roadAddress || null,
            jibun_address: jibunAddress || null,
            sido:          data.sido || null,
            sigungu:       data.sigungu || null,
            bname:         data.bname || null, // 동/리
            building_name: data.buildingName || null,
            zonecode:      data.zonecode || null,
            lat:           coords?.lat ?? null,
            lng:           coords?.lng ?? null,
          });
          setOpening(false);
        },
        onclose() {
          setOpening(false);
        },
      }).open();
    } catch (e) {
      setError('주소 검색을 불러올 수 없어요. 잠시 후 다시 시도해주세요.');
      console.error('[AddressSearch]', e.message);
      setOpening(false);
    }
  }

  // 표시할 주소 (도로명 우선, 건물명 추가)
  const displayAddress = value
    ? [value.road_address || value.jibun_address, value.building_name].filter(Boolean).join(' ')
    : '';

  if (value && displayAddress) {
    return (
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
              disabled={opening}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'var(--champagne-2)',
                padding: 0,
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
    );
  }

  return (
    <div>
      <button
        onClick={open}
        disabled={opening}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderRadius: 16,
          backgroundColor: 'var(--paper)',
          border: '1px dashed var(--rule-strong)',
          cursor: opening ? 'wait' : 'pointer',
          color: 'var(--ink-3)',
          fontSize: 14,
          textAlign: 'left',
        }}
      >
        <Search size={16} color="var(--ink-3)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{opening ? '주소 검색 여는 중…' : placeholder}</span>
      </button>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--toss-red)', marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
