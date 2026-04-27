/**
 * Capacitor-aware clipboard helper
 *
 * - Capacitor(Android/iOS) 환경: @capacitor/clipboard 사용
 * - 웹(브라우저) 환경: navigator.clipboard 사용
 */
export async function copyToClipboard(text) {
  try {
    // Capacitor 환경 감지: window.Capacitor 존재 + native 플랫폼
    if (
      typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.()
    ) {
      // webpackIgnore/turbopackIgnore: 빌드 타임 번들링 제외 (런타임 전용)
      const { Clipboard } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@capacitor/clipboard');
      await Clipboard.write({ string: text });
      return;
    }
  } catch {
    // Capacitor import 실패 시 브라우저 fallback
  }
  await navigator.clipboard.writeText(text);
}
