# CHECKPOINT.md — Ourday 개발 현황

> 마지막 업데이트: 2026-04-27

---

## ✅ 완성된 페이지 / 기능

### 코어 플로우
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 랜딩 | `/` | ✅ 실제 커플 수 표시 |
| 회원가입 | `/signup` | ✅ OAuth + 이메일 |
| 로그인 | `/login` | ✅ OAuth + 이메일 |
| OAuth 콜백 | `/auth/callback` | ✅ Google·카카오 신규/기존 유저 분기 |
| 프로필 설정 | `/setup-profile` | ✅ OAuth 신규 유저 이름·역할 수집 |
| 커플 연동 | `/connect` | ✅ 초대코드 발급·입력 |
| 기본 정보 설정 | `/setup` | ✅ 결혼일·장소·이름 |
| 대시보드 | `/dashboard` | ✅ D-day, 진행률, 이번달 할일 |

### 결혼 준비 도구
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 타임라인 체크리스트 | `/timeline` | ✅ 월별 탭 + 캘린더 뷰 통합 |
| 예산 관리 | `/budget` | ✅ 항목 CRUD, 도넛 차트 |
| 하객 관리 | `/guests` | ✅ CRUD, 축의금 통계, 사진 탭, RSVP |
| 업체 관리 | `/vendors` | ✅ 계약 현황, 잔금 일정 |
| 의사결정 | `/decisions` | ✅ 신랑/신부 의견 + 최종 결정 |
| 예식 가이드 | `/guide` | ✅ 정적 정보 |
| 설정 | `/settings` | ✅ 프로필·초대코드·로그아웃 |

### 신규 기능
| 페이지 | 경로 | 상태 |
|--------|------|------|
| 하객 사진 갤러리 | `/guests` 사진 탭 | ✅ QR 생성, 다운로드, 슬라이드쇼 |
| 하객 업로드 | `/guest/[code]` | ✅ QR 스캔 후 사진 업로드 |
| 라이브 슬라이드쇼 | `/live/[code]` | ✅ 식장 대형화면용 자동 슬라이드 |
| 모바일 청첩장 편집 | `/invitation` | ✅ 3가지 템플릿, 미리보기 모달 |
| 모바일 청첩장 공개 | `/i/[slug]` | ✅ OG태그, 방명록, 조회수 |
| 정보 공유 노트 | `/notes` | ✅ 말풍선 UI, Realtime, 검색 |
| 참석 확인(RSVP) | `/rsvp/[id]` | ✅ 공개 폼, 자동 집계 |

### 앱 / 네이티브
| 항목 | 상태 |
|------|------|
| Capacitor Android | ✅ Android Studio로 빌드·실행 |
| Capacitor iOS | ✅ Xcode로 빌드·실행 (Mac 필요) |
| 뒤로가기 버튼 (Android) | ✅ 히스토리 있으면 뒤로, 없으면 홈 |
| 앱 아이콘 | ✅ 두 겹치는 링 디자인 (커플 상징) |
| 스플래시 스크린 | ✅ 2160×2160 블루 그라디언트 |
| Safe-area (노치·홈바) | ✅ env(safe-area-inset-*) 전체 적용 |

### API Routes
| 경로 | 기능 |
|------|------|
| `/api/gallery` | 커플 photo_event CRUD + signed URL |
| `/api/guest/upload` | 하객 사진 업로드 |
| `/api/live` | 슬라이드쇼용 사진 조회 |
| `/api/guestbook` | 청첩장 방명록 CRUD |
| `/api/rsvp` | 참석 확인 조회·제출 |
| `/api/stats` | 커플 수 공개 통계 |

---

## 🐛 에러 히스토리

### ERR-001 ~ ERR-010 (이전 세션 기록)
> 상세 내역은 git log 참조

### ERR-011 · qrcode Canvas API Vercel 미지원
- **증상**: QR "생성 중..." 무한 대기
- **해결**: `react-qr-code` (순수 SVG) 로 교체

### ERR-012 · SUPABASE_SERVICE_ROLE_KEY 미설정 ✅ 해결
- **증상**: gallery API 500 오류
- **해결**: Vercel 환경변수 추가 완료

### ERR-013 · Next.js 16 params Promise
- **증상**: `params.code` 동기 접근 에러
- **해결**: `use(params)` 로 unwrap

### ERR-014 · middleware → proxy 이름 변경 경고
- **증상**: Next.js 16.2 빌드 경고
- **해결**: `middleware.js` → `proxy.js`, 함수명 `proxy`로 변경

### ERR-015 · force-dynamic + Capacitor 정적 빌드 충돌
- **증상**: `MOBILE_BUILD=true` 시 API 라우트 빌드 실패
- **해결**: 클라이언트 페이지에서 `force-dynamic` 제거, API 라우트에만 유지.
  Capacitor는 `server.url`로 Vercel을 직접 로드 → 정적 빌드 불필요

### ERR-016 · Android 에뮬레이터 ERR_NAME_NOT_RESOLVED
- **증상**: 에뮬레이터 첫 실행 시 DNS 실패
- **해결**: Android Studio → Build > Clean Project 후 재실행

---

## 📱 앱 배포 현황

### Capacitor 설정 완료 (2026-04-20)
- `capacitor.config.ts`: appId `com.ourday.app`, server.url = Vercel
- Android 플랫폼 추가 완료 (`android/`)
- iOS 플랫폼 추가 완료 (`ios/`)
- **구조**: 웹(Vercel) + Android + iOS 모두 동일 코드베이스
- **업데이트**: `git push` → Vercel 자동 배포 → 앱 자동 반영 (재빌드 불필요)

### Android 빌드 방법
```bash
npm run cap:android   # Android Studio로 열기
# Android Studio ▶ 버튼 → 에뮬레이터/기기 선택 → 실행
```

### iOS 빌드 방법
```bash
npm run cap:ios       # Xcode로 열기
# Xcode ▶ 버튼 → 시뮬레이터/기기 선택 → 실행
```

### 업데이트 방법
```bash
git push              # Vercel 자동 배포 → 웹+앱 동시 반영
npx cap sync          # 네이티브 플러그인 변경 시에만 필요
```

---

## 🛠️ 2026-04-27 작업 내역

### 코드 최적화
- `lib/useCouple.js` 공통 훅 생성 — 10개 페이지 세션 보일러플레이트 제거
- dashboard/timeline/budget/decisions/guests/notes `useCouple` 적용
- `select('*')` → 명시적 컬럼 리스트로 교체 (불필요 데이터 전송 감소)
- dashboard N+1 쿼리 개선 (guestbook 비동기 분리)
- timeline `filterItems/doneCount` useMemo 적용
- notes 링크 프리뷰 캐시 무제한 Map → LRU(50개) 교체

### 보안 강화
- CSP 헤더 추가 (script/style/font/connect/img/frame-src 명시)
- Sentry 설치 — `@sentry/nextjs@10.50.0` (client/server/edge 분리)
- `app/error.js` + `app/global-error.js` 에러 바운더리
- guestbook GET rate limit 추가 (60req/min)
- `app/api/invitation/cover` + `photo` 소유권 검증 추가

### 버그 수정
- dashboard `couples` select에 존재하지 않는 `groom_name/bride_name` 포함 → 제거
- SUPABASE.md 누락 컬럼 3개 추가 (`venue_tour_checked`, `due_date`, `onboarding_dismissed`)
- 청첩장 커버 날짜 timezone 버그 수정
- 정보 공유란 "신랑 신랑" 중복 레이블 버그 수정
- 링크 미리보기 썸네일 referrerPolicy 누락 수정

### OAuth
- Google OAuth 가입 시 `users` 테이블 stub 생성 DB 트리거 추가

---

## 🔴 남은 작업

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| **Sentry DSN 등록** | 🔴 출시 전 | sentry.io 프로젝트 → NEXT_PUBLIC_SENTRY_DSN |
| **입력값 서버 검증** | 🔴 출시 전 | API Route 길이·타입 체크 |
| **번들 사이즈 분석** | 🟠 | bundle-analyzer 측정 |
| **Lighthouse 측정** | 🟠 | LCP/CLS/INP 프로덕션 기준 |
| **a11y 점검** | 🟠 | aria-label, 색상 대비율 WCAG AA |
| Google Play 개발자 계정 등록 | 🔴 출시 전 | $25 일회성 |
| App Store 개발자 계정 등록 | 🔴 출시 전 | $99/년 |
| Google OAuth Supabase 설정 | 🟡 | Supabase → Auth → Providers |
| 카카오 OAuth Supabase 설정 | 🟡 | developers.kakao.com |
| 푸시 알림 | 🟢 다음 | D-day·할일 리마인더 |
| 오프라인 지원 | 🟢 다음 | Service Worker 캐시 |
| `rsvp_responses.message` DROP | 🟢 | Supabase 대시보드 수동 |

---

## DB 테이블 현황

| 테이블 | 용도 | RLS |
|--------|------|-----|
| `couples` | 커플 기본 정보 | ✅ |
| `users` | 프로필, role(groom/bride) | ✅ |
| `checklist_items` | 타임라인 항목 | ✅ |
| `budget_items` | 예산 항목 | ✅ |
| `decisions` | 의사결정 | ✅ |
| `guests` | 하객 목록 + 축의금 | ✅ |
| `vendors` | 업체 목록 | ✅ |
| `invitations` | 모바일 청첩장 | ✅ |
| `couple_notes` | 정보 공유 노트 | ✅ |
| `photo_events` | 하객 사진 이벤트 | ✅ |
| `guest_photos` | 하객 업로드 사진 메타 | ✅ |
| `guestbook_entries` | 청첩장 방명록 | ✅ |
| `rsvp_responses` | 참석 확인 응답 | ✅ |

## Storage Buckets
| 버킷 | 용도 |
|------|------|
| `guest-photos` | 하객 업로드 사진 (private, signed URL) |
