'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, ChevronRight } from 'lucide-react';
import { searchPlaces, geocodeAddress, loadDaumPostcode } from '@/lib/kakaoMaps';

/**
 * 예식장 검색 — 카카오 Places (상호명) + 다음 우편번호 fallback
 *
 * UX:
 *  1) 사용자가 "라페스타", "아이파크웨딩" 등 키워드 입력
 *  2) 300ms 디바운스 후 카카오 Places.keywordSearch
 *  3) 결과 리스트 (최대 8개) — 클릭 시 모든 정보 자동 채움
 *  4) 결과 없거나 작은 웨딩홀이면 "주소로 검색" fallback (Daum Postcode)
 *  5) 직접 입력도 허용 — 입력값을 그대로 venue_name으로
 *
 * onChange 페이로드 (선택 시):
 *   { venue_name, road_address, jibun_address, sido, sigungu, bname, zonecode, lat, lng, phone }
 */
export default function VenueSearch({ value, onChange, onClear }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [error, setError]       = useState('');
  const debounceRef = useRef(null);
  const postcodeRef = useRef(null);

  // 입력 디바운스 + Places 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await searchPlaces(query.trim(), { size: 8 });
        setResults(list);
        setShowResults(true);
      } catch (e) {
        setError('검색에 실패했어요');
        console.error('[VenueSearch]', e.message);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /** 검색 결과 선택 */
  async function selectPlace(p) {
    // place 자체 정보로 일단 채움
    const lat = parseFloat(p.y);
    const lng = parseFloat(p.x);
    const fullAddress = p.road_address_name || p.address_name;

    // 표준화 정보(시도/시군구) 보강 위해 addressSearch 추가 호출 — 실패해도 OK
    let region = {};
    try {
      const kakao = window.kakao;
      if (kakao?.maps?.services) {
        region = await new Promise((resolve) => {
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.addressSearch(fullAddress, (result, status) => {
            if (status === kakao.maps.services.Status.OK && result[0]) {
              const r = result[0];
              const ad = r.address || r.road_address || {};
              resolve({
                sido:    ad.region_1depth_name || null,
                sigungu: ad.region_2depth_name || null,
                bname:   ad.region_3depth_name || null,
                zonecode: r.road_address?.zone_no || null,
              });
            } else { resolve({}); }
          });
        });
      }
    } catch { /* 보강 실패 무시 */ }

    onChange({
      venue_name:    p.place_name,
      road_address:  p.road_address_name || null,
      jibun_address: p.address_name || null,
      sido:          region.sido    || null,
      sigungu:       region.sigungu || null,
      bname:         region.bname   || null,
      zonecode:      region.zonecode || null,
      lat, lng,
      phone:         p.phone || null,
      place_url:     p.place_url || null,
    });

    setQuery('');
    setResults([]);
    setShowResults(false);
  }

  /** 다음 우편번호 fallback (검색 결과 없을 때) */
  async function openPostcodeFallback() {
    setError('');
    setPostcodeOpen(true);
    try {
      const daum = await loadDaumPostcode();
      await new Promise((r) => requestAnimationFrame(r));
      if (!postcodeRef.current) return;
      postcodeRef.current.innerHTML = '';
      new daum.Postcode({
        async oncomplete(data) {
          const roadAddress  = data.roadAddress  || '';
          const jibunAddress = data.jibunAddress || data.autoJibunAddress || '';
          const fullAddress  = roadAddress || jibunAddress;
          let coords = null;
          try { coords = await geocodeAddress(fullAddress); } catch {}
          onChange({
            // 직접 입력한 키워드를 venue_name으로 (없으면 빌딩명)
            venue_name:    query.trim() || data.buildingName || '',
            road_address:  roadAddress || null,
            jibun_address: jibunAddress || null,
            sido:          data.sido || null,
            sigungu:       data.sigungu || null,
            bname:         data.bname || null,
            zonecode:      data.zonecode || null,
            lat:           coords?.lat ?? null,
            lng:           coords?.lng ?? null,
            phone:         null,
            place_url:     null,
          });
          closePostcodeFallback();
        },
        width: '100%', height: '100%',
      }).embed(postcodeRef.current, { autoClose: false });
    } catch (e) {
      setError('주소 검색을 불러올 수 없어요. 잠시 후 다시 시도해주세요.');
      setPostcodeOpen(false);
    }
  }
  function closePostcodeFallback() {
    setPostcodeOpen(false);
    if (postcodeRef.current) postcodeRef.current.innerHTML = '';
  }

  /** 직접 입력 그대로 사용 (검색 안 하고 venue_name만) */
  function useAsIs() {
    if (!query.trim()) return;
    onChange({
      venue_name: query.trim(),
      road_address: null, jibun_address: null,
      sido: null, sigungu: null, bname: null, zonecode: null,
      lat: null, lng: null, phone: null, place_url: null,
    });
    setQuery('');
    setResults([]);
    setShowResults(false);
  }

  // ── 이미 선택된 venue가 있는 경우 ──────────────────────────
  if (value?.venue_name) {
    return (
      <div
        style={{
          padding: '14px 16px', borderRadius: 16,
          backgroundColor: 'var(--paper)', border: '1px solid var(--rule)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <MapPin size={16} color="var(--champagne)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>
              {value.venue_name}
            </p>
            {(value.road_address || value.jibun_address) && (
              <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0', lineHeight: 1.5 }}>
                {value.road_address || value.jibun_address}
              </p>
            )}
            {value.phone && (
              <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0' }}>
                ☎ {value.phone}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={onClear}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--ink-3)',
                  padding: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}
              >
                <X size={11} /> 다시 검색
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 검색 입력 + 결과 리스트 ────────────────────────────────
  return (
    <>
      <div style={{ position: 'relative' }}>
        {/* 검색 입력 */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="예식장 이름 또는 주소 (예: 라페스타 강남, 아이파크웨딩)"
            className="input-field"
            style={{ paddingLeft: 44, paddingRight: 12 }}
          />
          <Search
            size={16} color="var(--ink-3)"
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
        </div>

        {/* 결과 드롭다운 */}
        {showResults && (results.length > 0 || (!searching && query.trim().length >= 2)) && (
          <div
            style={{
              marginTop: 8, borderRadius: 12,
              backgroundColor: 'var(--paper-pure, white)',
              border: '1px solid var(--rule)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              maxHeight: 360, overflowY: 'auto',
            }}
          >
            {results.length > 0 ? (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPlace(p)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px',
                    backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <MapPin size={14} color="var(--champagne)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>
                      {p.place_name}
                    </p>
                    <p style={{
                      fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.road_address_name || p.address_name}
                    </p>
                    {p.category_name && (
                      <p style={{ fontSize: 10, color: 'var(--ink-4)', margin: '2px 0 0' }}>
                        {p.category_name.split(' > ').slice(-2).join(' · ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} color="var(--ink-4)" style={{ flexShrink: 0, marginTop: 4 }} />
                </button>
              ))
            ) : (
              // 검색했는데 결과 없음 — fallback 안내
              <div style={{ padding: '16px 14px' }}>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  &lsquo;<strong>{query.trim()}</strong>&rsquo; 검색 결과가 없어요.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={openPostcodeFallback}
                    style={{
                      background: 'none', border: '1px solid var(--rule-strong)',
                      borderRadius: 999, padding: '8px 14px',
                      fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
                      cursor: 'pointer',
                    }}
                  >
                    주소로 직접 검색하기 →
                  </button>
                  <button
                    onClick={useAsIs}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 12, color: 'var(--ink-3)',
                      cursor: 'pointer', padding: '4px 0',
                    }}
                  >
                    &lsquo;{query.trim()}&rsquo; 그대로 사용 (주소 없음)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {searching && (
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>검색 중…</p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: 'var(--toss-red)', marginTop: 6 }}>{error}</p>
        )}
      </div>

      {/* 다음 우편번호 fallback 모달 */}
      {postcodeOpen && (
        <div
          role="dialog" aria-label="주소 검색"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(26,22,19,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={closePostcodeFallback}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 430, height: 'min(80dvh, 600px)',
              backgroundColor: 'var(--ivory)', borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--rule)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>주소 검색</p>
              <button onClick={closePostcodeFallback} aria-label="닫기"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-3)' }}>
                <X size={20} />
              </button>
            </div>
            <div ref={postcodeRef} style={{ flex: 1, overflow: 'hidden' }} />
          </div>
        </div>
      )}
    </>
  );
}
