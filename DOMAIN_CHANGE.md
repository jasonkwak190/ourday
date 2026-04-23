# DOMAIN_CHANGE.md — 도메인 변경 시 체크리스트

> 현재 도메인: `https://ourday-rust.vercel.app`
> 이 파일을 열었다면 위 도메인을 새 도메인으로 교체해야 한다.

---

## 왜 이 파일이 필요한가

앱이 도메인을 직접 참조하는 곳이 코드, 네이티브 설정, 외부 서비스 콘솔에 걸쳐 분산되어 있다.
하나라도 빠지면 OAuth 로그인 실패, 딥링크 불작동, OG 태그 깨짐 등이 발생한다.

---

## 📁 코드 파일 (직접 수정)

### 1. `capacitor.config.ts` ⭐ 가장 중요
```ts
server: {
  url: 'https://ourday-rust.vercel.app',  // ← 새 도메인으로 교체
}
```
수정 후 반드시 실행:
```bash
npx cap sync android
npx cap sync ios   # iOS도 배포할 경우
```

---

### 2. `android/app/src/main/AndroidManifest.xml`
```xml
<data
    android:scheme="https"
    android:host="ourday-rust.vercel.app"   <!-- ← 새 도메인으로 교체 (호스트만, https:// 제외) -->
    android:pathPrefix="/auth/callback" />
```

---

### 3. `app/i/[slug]/layout.js`
```js
// 38번째 줄
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ourday-rust.vercel.app';
//                                                    ↑ 환경변수 우선, fallback도 교체
```
> **권장**: `NEXT_PUBLIC_SITE_URL` 환경변수를 세팅하면 코드를 건드릴 필요 없음 → 아래 환경변수 섹션 참조

---

### 4. `public/.well-known/assetlinks.json`
도메인이 바뀌면 이 파일을 **새 도메인에서도 서빙**해야 한다.
파일 내용 자체는 변경 불필요 (내용은 앱 패키지명 + SHA-256).
단, 새 도메인의 `/.well-known/assetlinks.json`에 배포 확인 필요:
```
https://새도메인/.well-known/assetlinks.json
```

---

## 🔧 환경변수 (`.env.local` + Vercel Dashboard)

| 변수 | 현재 값 | 비고 |
|------|---------|------|
| `NEXT_PUBLIC_SITE_URL` | (미설정 — 코드 fallback 사용) | **새 도메인으로 추가 권장** |

`.env.local` 예시:
```
NEXT_PUBLIC_SITE_URL=https://새도메인.com
```

Vercel Dashboard → Settings > Environment Variables → `NEXT_PUBLIC_SITE_URL` 추가 후 Redeploy.

---

## 🌐 외부 서비스 콘솔 (각 대시보드에서 수동 변경)

### A. Supabase Dashboard
**경로**: Authentication → URL Configuration

| 항목 | 현재 값 | 변경 방법 |
|------|---------|-----------|
| **Site URL** | `https://ourday-rust.vercel.app` | 새 도메인으로 교체 |
| **Redirect URLs** (1) | `https://ourday-rust.vercel.app/auth/callback` | 새 도메인 버전 추가 (기존 삭제 or 교체) |
| **Redirect URLs** (2) | `https://ourday-rust.vercel.app/reset-password/confirm` | 새 도메인 버전 추가 |

> Site URL이 틀리면 OAuth 로그인 후 리다이렉트 실패.
> Redirect URLs가 틀리면 Google/카카오 로그인 후 `redirect_uri_mismatch` 에러.

---

### B. Google Cloud Console (Google OAuth)
**경로**: API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID

| 항목 | 변경 내용 |
|------|-----------|
| 승인된 JavaScript 출처 | `https://새도메인.com` 추가 |
| 승인된 리디렉션 URI | Supabase 콜백 URL은 변경 없음 (`*.supabase.co/auth/v1/callback`) |

> Supabase를 OAuth 중간 레이어로 쓰므로 Google OAuth redirect는 Supabase 도메인 고정.
> 단, Supabase Dashboard의 Site URL은 바꿔야 한다 (위 A 참조).

---

### C. Kakao Developers Console (카카오 OAuth)
**경로**: developers.kakao.com → 앱 → 플랫폼

| 항목 | 변경 내용 |
|------|-----------|
| Web 플랫폼 사이트 도메인 | `https://새도메인.com` 추가 또는 교체 |
| Redirect URI | Supabase 콜백 URL은 변경 없음 (`*.supabase.co/auth/v1/callback`) |

---

### D. Google Play Console (Android App Links)
**경로**: Play Console → 앱 → 앱 링크 (또는 App Links 검증 재실행)

도메인이 변경되면:
1. 새 도메인에 `assetlinks.json` 배포 확인
2. Play Console에서 App Links 재검증 실행
3. SHA-256 지문은 동일하므로 파일 내용은 그대로 사용 가능

---

## ✅ 변경 후 검증 순서

```
1. npm run build              # 빌드 에러 없음 확인
2. npx cap sync android       # Capacitor 동기화
3. 브라우저에서 새 도메인 접속 → 로그인 정상 확인
4. Google 로그인 → 대시보드 정상 도달 확인
5. 카카오 로그인 → 대시보드 정상 도달 확인
6. 비밀번호 재설정 이메일 수신 → confirm 링크 정상 작동 확인
7. Android 앱 실행 → OAuth 로그인 → App Link 리다이렉트 확인
8. https://새도메인/.well-known/assetlinks.json 접근 확인
```

---

## 📋 빠른 참조 — 현재 도메인이 박혀있는 곳 요약

| 위치 | 파일/콘솔 | 종류 |
|------|-----------|------|
| Capacitor WebView URL | `capacitor.config.ts` line 10 | 코드 |
| Android App Link 호스트 | `android/app/src/main/AndroidManifest.xml` line 36 | 코드 |
| OG 태그 baseUrl fallback | `app/i/[slug]/layout.js` line 38 | 코드 |
| App Links 검증 파일 서빙 | `public/.well-known/assetlinks.json` (내용 변경 불필요, 서빙 위치만 확인) | 인프라 |
| Supabase Site URL | Supabase Dashboard > Auth > URL Configuration | 외부 서비스 |
| Supabase Redirect URLs | Supabase Dashboard > Auth > URL Configuration | 외부 서비스 |
| 카카오 웹 도메인 | developers.kakao.com > 플랫폼 | 외부 서비스 |
| Play Console App Links | Google Play Console | 외부 서비스 |
| `NEXT_PUBLIC_SITE_URL` env | `.env.local` + Vercel Dashboard | 환경변수 |

---

## 💡 커스텀 도메인 연결 (Vercel)

Vercel 프로젝트에 커스텀 도메인을 연결하면 `ourday-rust.vercel.app`은 자동 리디렉트로 유지됨.
그래도 위 목록의 값들은 새 도메인으로 업데이트해야 한다 (OAuth redirect는 정확한 URL 매칭 필요).

1. Vercel Dashboard → 프로젝트 → Domains → Add Domain
2. DNS 레코드 설정 (A 레코드 또는 CNAME)
3. SSL 인증서 자동 발급 확인
4. 위 체크리스트 전체 실행
