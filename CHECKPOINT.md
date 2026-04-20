# CHECKPOINT.md — Ourday 개발 현황

> 마지막 업데이트: 2026-04-20

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

---

## 📱 앱 배포 현황

### Capacitor 설정 완료 (2026-04-20)
- `capacitor.config.ts`: appId `com.ourday.app`, server.url = Vercel
- Android 플랫폼 추가 완료 (`android/`)
- iOS 플랫폼 추가 완료 (`ios/`)
- **구조**: 웹(Vercel) + Android + iOS 모두 동일 코드베이스

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

## 🔴 남은 작업

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| Android Studio 설치 | 🔴 즉시 | 에뮬레이터 테스트 필요 |
| Google Play 개발자 계정 등록 | 🟡 나중에 | $25 일회성 |
| 앱 아이콘 교체 | 🟡 출시 전 | 현재 기본 Capacitor 아이콘 |
| 스플래시 스크린 디자인 | 🟡 출시 전 | 현재 기본값 |
| Google OAuth Supabase 설정 | 🟡 | Supabase → Auth → Providers |
| 카카오 OAuth Supabase 설정 | 🟡 | developers.kakao.com |

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
