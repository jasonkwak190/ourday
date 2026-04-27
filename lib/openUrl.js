/**
 * Capacitor-aware external URL opener
 *
 * - Capacitor(Android/iOS): @capacitor/browser 로 기기 기본 브라우저에서 열기
 * - 웹(브라우저): window.open 으로 새 탭 열기
 */
export async function openExternalUrl(url) {
  try {
    if (
      typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.()
    ) {
      // webpackIgnore/turbopackIgnore: 빌드 타임 번들링 제외 (런타임 전용)
      const { Browser } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@capacitor/browser');
      await Browser.open({ url });
      return;
    }
  } catch {
    // Capacitor import 실패 시 브라우저 fallback
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
