'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * Q-009 lazy loading + Q-010 onError fallback 통합 이미지 컴포넌트.
 *
 * - loading="lazy" 기본
 * - 로드 실패 시 회색 박스 + ImageOff 아이콘 (다른 사진 레이아웃 보존)
 * - 일반 <img>와 동일한 props 받음 (style, className, alt 등)
 */
export default function SafeImage({ src, alt = '', className, style, ...rest }) {
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--paper)',
          color: 'var(--ink-4)',
        }}
        aria-label={alt || '이미지 로드 실패'}
      >
        <ImageOff size={20} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
