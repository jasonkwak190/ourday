/**
 * Kakao Maps SDK lazy loader
 *
 * 페이지 진입 시 SDK 로드하지 않고, 지도가 실제로 필요할 때만 로드.
 * (LCP·번들 사이즈 영향 없음)
 *
 * 환경변수: NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY
 *  카카오 디벨로퍼스 → 앱 → 플랫폼 → Web → JavaScript 키
 *  (어드민 키와 다름. 어드민 키는 절대 클라이언트에 노출 금지)
 */

let kakaoPromise = null;
let postcodePromise = null;

const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
const POSTCODE_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/** 카카오 지도 SDK + services(Geocoder/Places) 로드 */
export function loadKakaoMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (kakaoPromise) return kakaoPromise;

  // 카카오 JavaScript 키 (지도 + 공유 + 로그인 공용)
  // NEXT_PUBLIC_KAKAO_APP_KEY를 우선, 없으면 KAKAO_JAVASCRIPT_KEY fallback
  const key = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  if (!key) {
    return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_APP_KEY 미설정'));
  }

  kakaoPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao);
      return;
    }

    const script = document.createElement('script');
    script.src = `${SDK_URL}?appkey=${key}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => {
      kakaoPromise = null;
      reject(new Error('Kakao Maps SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return kakaoPromise;
}

/** 다음 우편번호 서비스 로드 (한국 주소 검색 — JavaScript 키 불필요) */
export function loadDaumPostcode() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (postcodePromise) return postcodePromise;

  postcodePromise = new Promise((resolve, reject) => {
    if (window.daum?.Postcode) {
      resolve(window.daum);
      return;
    }
    const script = document.createElement('script');
    script.src = POSTCODE_URL;
    script.async = true;
    script.onload = () => resolve(window.daum);
    script.onerror = () => {
      postcodePromise = null;
      reject(new Error('다음 우편번호 SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return postcodePromise;
}

/**
 * 도로명·지번 주소를 카카오 Geocoder로 위경도 변환
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodeAddress(address) {
  if (!address) return null;
  const kakao = await loadKakaoMaps();
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 카카오 Places — 키워드(상호명·장소명)로 검색
 * 예: "라페스타 강남", "아이파크 웨딩"
 *
 * 1순위: 서버 사이드 REST API 프록시 (/api/places/search)
 *   · 도메인 화이트리스트 영향 없음, 키 secret 보호
 * 2순위: 클라이언트 JS SDK fallback
 *   · REST 키 미설정·서버 에러 시 사용
 *
 * @param {string} keyword
 * @param {{ size?: number }} [opts]
 * @returns {Promise<Array<{
 *   id: string, place_name: string,
 *   road_address_name: string, address_name: string,
 *   category_name: string, phone: string, place_url: string,
 *   x: string, y: string,
 * }>>}
 */
export async function searchPlaces(keyword, { size = 10 } = {}) {
  if (!keyword || keyword.trim().length < 2) return [];

  // 1순위: REST API 프록시 (서버 사이드)
  try {
    const res = await fetch(
      `/api/places/search?q=${encodeURIComponent(keyword)}&size=${size}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      // documents가 배열로 정상 반환되면 그대로 사용 (빈 배열도 정상 결과로 인정)
      if (Array.isArray(data.documents)) {
        return data.documents;
      }
    }
    // 500(키 미설정) 등은 fallback으로 진행
  } catch (e) {
    console.warn('[searchPlaces] REST API 실패, JS SDK fallback:', e.message);
  }

  // 2순위: JS SDK fallback
  const kakao = await loadKakaoMaps();
  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places();
    places.keywordSearch(
      keyword,
      (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(result || []);
        } else {
          resolve([]);
        }
      },
      { size }
    );
  });
}
