'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, ChevronRight } from 'lucide-react';
import { searchPlaces, geocodeAddress, loadDaumPostcode, loadKakaoMaps } from '@/lib/kakaoMaps';

/**
 * 예식장 검색 — 모달 UX (주소 검색과 일관됨)
 *
 *  · 트리거 버튼 클릭 → 모달 열림
 *  · 모달: 키워드 입력 → 카카오 Places 결과 dropdown
 *  · 결과 없거나 SDK 실패 → "주소로 검색" 다음 우편번호 fallback
 *  · 직접 입력 그대로 사용 옵션
 *
 * SDK 로드 실패 시 명확한 안내 + 주소 검색만으로 진행 가능
 */
export default function VenueSearch({
  value,
  onChange,
  onClear,
  triggerLabel = '예식장 이름 또는 주소 검색',
  modalTitle = '예식장 검색',
}) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const [postcodeMode, setPostcodeMode] = useState(false);
  const debounceRef = useRef(null);
  const postcodeRef = useRef(null);
  const inputRef    = useRef(null);

  // 모달 열릴 때 입력 포커스 + SDK 미리 로드
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    // SDK 백그라운드 preload — 첫 검색 지연 줄임
    loadKakaoMaps().catch((e) => {
      console.warn('[VenueSearch] Kakao SDK preload failed:', e.message);
      setSdkError(e.message);
    });
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await searchPlaces(query.trim(), { size: 10 });
        setResults(list);
        setSdkError(null);
      } catch (e) {
        console.error('[VenueSearch] search failed:', e.message);
        setSdkError(e.message);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  function close() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setPostcodeMode(false);
    if (postcodeRef.current) postcodeRef.current.innerHTML = '';
  }

  /** 검색 결과 선택 */
  async function selectPlace(p) {
    const lat = parseFloat(p.y);
    const lng = parseFloat(p.x);
    const fullAddress = p.road_address_name || p.address_name;

    // sido/sigungu 보강
    let region = {};
    try {
      if (window.kakao?.maps?.services) {
        region = await new Promise((resolve) => {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(fullAddress, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result[0]) {
              const ad = result[0].address || result[0].road_address || {};
              resolve({
                sido:    ad.region_1depth_name || null,
                sigungu: ad.region_2depth_name || null,
                bname:   ad.region_3depth_name || null,
                zonecode: result[0].road_address?.zone_no || null,
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
    close();
  }

  /** 다음 우편번호 fallback */
  async function openPostcodeMode() {
    setPostcodeMode(true);
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
          close();
        },
        width: '100%', height: '100%',
      }).embed(postcodeRef.current, { autoClose: false });
    } catch {
      setPostcodeMode(false);
    }
  }

  /** 직접 입력 그대로 사용 */
  function useAsIs() {
    if (!query.trim()) return;
    onChange({
      venue_name: query.trim(),
      road_address: null, jibun_address: null,
      sido: null, sigungu: null, bname: null, zonecode: null,
      lat: null, lng: null, phone: null, place_url: null,
    });
    close();
  }

  // ── selected venue 카드 ──────────────────────────────────────
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
            <button
              onClick={onClear}
              style={{
                marginTop: 8,
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
    );
  }

  // ── 트리거 버튼 ──────────────────────────────────────────────
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderRadius: 16,
          backgroundColor: 'var(--paper)',
          border: '1px dashed var(--rule-strong)',
          cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, textAlign: 'left',
        }}
      >
        <Search size={16} color="var(--ink-3)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{triggerLabel}</span>
      </button>

      {/* 모달 — 풀스크린 시트 */}
      {open && (
        <div
          role="dialog" aria-label="예식장 검색"
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
              height: postcodeMode ? 'min(80dvh, 600px)' : 'min(85dvh, 720px)',
              backgroundColor: 'var(--ivory)',
              borderRadius: '20px 20px 0 0',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderBottom: '1px solid var(--rule)',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                {postcodeMode ? '주소 검색' : modalTitle}
              </p>
              <button onClick={close} aria-label="닫기"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-3)' }}>
                <X size={20} />
              </button>
            </div>

            {/* 본문: 다음 우편번호 모드 vs 키워드 검색 모드 */}
            {postcodeMode ? (
              <div ref={postcodeRef} style={{ flex: 1, overflow: 'hidden' }} />
            ) : (
              <>
                {/* 검색 input */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="예: 라페스타 강남, 아이파크웨딩"
                      className="input-field"
                      style={{ paddingLeft: 44, paddingRight: 12 }}
                    />
                    <Search size={16} color="var(--ink-3)"
                      style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* 결과 리스트 */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {searching && (
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: 24 }}>
                      검색 중…
                    </p>
                  )}

                  {!searching && results.length > 0 && (
                    <div>
                      {results.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectPlace(p)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '14px 18px',
                            backgroundColor: 'transparent', border: 'none',
                            borderBottom: '1px solid var(--rule)',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <MapPin size={14} color="var(--champagne)" style={{ flexShrink: 0, marginTop: 3 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>
                              {p.place_name}
                            </p>
                            <p style={{
                              fontSize: 12, color: 'var(--ink-3)', margin: '3px 0 0',
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
                      ))}
                    </div>
                  )}

                  {/* 결과 없음 또는 SDK 에러 */}
                  {!searching && query.trim().length >= 2 && results.length === 0 && (
                    <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                      {sdkError ? (
                        <>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--toss-red)', margin: '0 0 6px' }}>
                            지도 API 연결 실패
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 16px', lineHeight: 1.6 }}>
                            카카오 디벨로퍼스에서 도메인 등록을 확인하거나
                            <br />아래에서 주소로 직접 입력해주세요.
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' }}>
                          &lsquo;<strong>{query.trim()}</strong>&rsquo; 검색 결과가 없어요
                        </p>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                        <button
                          onClick={openPostcodeMode}
                          style={{
                            background: 'var(--ink)', border: 'none',
                            borderRadius: 999, padding: '10px 18px',
                            fontSize: 13, fontWeight: 600, color: 'var(--ivory)',
                            cursor: 'pointer',
                          }}
                        >
                          주소로 직접 검색하기
                        </button>
                        <button
                          onClick={useAsIs}
                          style={{
                            background: 'none', border: 'none',
                            fontSize: 12, color: 'var(--ink-3)',
                            cursor: 'pointer', padding: '4px 0',
                            textDecoration: 'underline',
                          }}
                        >
                          &lsquo;{query.trim()}&rsquo; 그대로 사용 (주소 없음)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 초기 안내 */}
                  {!searching && query.trim().length < 2 && (
                    <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.6 }}>
                        예식장 이름이나 동네 이름으로 검색해보세요.
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0, lineHeight: 1.7 }}>
                        예) 그랜드인터컨티넨탈<br />
                        예) 라페스타 강남<br />
                        예) 강남구청
                      </p>
                    </div>
                  )}
                </div>

                {/* 하단 fallback 버튼 */}
                <div style={{
                  padding: '10px 16px', borderTop: '1px solid var(--rule)',
                  display: 'flex', justifyContent: 'center',
                }}>
                  <button
                    onClick={openPostcodeMode}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline',
                    }}
                  >
                    주소(우편번호)로 찾기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
