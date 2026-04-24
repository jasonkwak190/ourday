'use client';
import { useEffect, useRef } from 'react';

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;

/* 카카오 말풍선 SVG 아이콘 */
function KakaoIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.477 3 2 6.686 2 11.2c0 2.79 1.738 5.244 4.362 6.7l-1.11 4.162a.25.25 0 0 0 .362.277l4.874-3.22A11.8 11.8 0 0 0 12 19.4c5.523 0 10-3.686 10-8.2S17.523 3 12 3Z"
        fill="#191919"
      />
    </svg>
  );
}

/**
 * 카카오톡 공유 버튼
 *
 * Props
 *   url         – 공유할 청첩장 URL
 *   title       – 카카오 피드 제목 (예: "○○ & ○○ 결혼합니다")
 *   description – 부제 (예: "2026년 6월 14일 오후 2시")
 *   imageUrl    – OG 썸네일 이미지 URL (없으면 기본 이미지)
 *   style       – 버튼에 추가할 인라인 스타일
 */
export default function KakaoShareButton({ url, title, description, imageUrl, style }) {
  const sdkReady = useRef(false);

  useEffect(() => {
    if (!APP_KEY) return;

    function init() {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(APP_KEY);
      }
      sdkReady.current = true;
    }

    if (window.Kakao) {
      init();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  if (!APP_KEY) return null;

  function share() {
    if (!window.Kakao?.isInitialized()) {
      alert('카카오톡 공유를 준비 중이에요. 잠시 후 다시 시도해주세요.');
      return;
    }

    const shareUrl = url || window.location.href;

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title:       title       || '모바일 청첩장',
        description: description || '청첩장을 확인해주세요',
        imageUrl:    imageUrl    || `${window.location.origin}/og-default.png`,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: '청첩장 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  }

  return (
    <button
      onClick={share}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
        backgroundColor: '#FEE500',
        color:          '#191919',
        border:         'none',
        borderRadius:   12,
        fontWeight:     700,
        fontSize:       14,
        cursor:         'pointer',
        ...style,
      }}
    >
      <KakaoIcon size={18} />
      카카오톡 공유
    </button>
  );
}
