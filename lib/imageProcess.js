'use client';

import imageCompression from 'browser-image-compression';

/**
 * Q-002 EXIF strip + Q-003 클라이언트 이미지 압축·리사이즈
 *
 * browser-image-compression는 Canvas 재인코딩 방식이라:
 *   - EXIF (GPS, 카메라 정보 등) 자동 제거 ✅
 *   - 지정 픽셀 폭에 맞춰 리사이즈
 *   - JPEG 품질 조절
 *
 * 일반 사진(8MB ~ 12MP) → 약 800KB~1.5MB로 감소.
 *
 * @param {File} file - 사용자 업로드 원본
 * @param {object} opts
 * @param {number} opts.maxSizeMB - 결과 최대 크기 (default 1.5MB)
 * @param {number} opts.maxWidthOrHeight - 최대 변/픽셀 (default 1920)
 * @returns {Promise<File>} 처리된 파일 (원본 이름 유지)
 */
export async function processImage(file, opts = {}) {
  const { maxSizeMB = 1.5, maxWidthOrHeight = 1920 } = opts;

  // GIF 등 애니메이션은 Canvas 처리 시 첫 프레임만 남으므로 그대로 통과
  if (file.type === 'image/gif') return file;

  try {
    return await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      // 기본은 JPEG으로 변환되는데, PNG는 PNG 유지
      fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      // EXIF 제거는 Canvas 재인코딩 시 자동
      preserveExif: false,
    });
  } catch (e) {
    // 압축 실패 시 원본 통과 (UX는 살리되 콘솔에 기록)
    console.warn('[imageProcess] 압축 실패, 원본 사용:', e?.message);
    return file;
  }
}
