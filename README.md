# 오늘의 집중 (FocusTimer)

집중할 시간과 쉴 시간을 간단하게 관리하는 무료 웹 집중 타이머 + 집중법·시간관리 콘텐츠 사이트.
**빌드 도구·외부 패키지 없이** 순수 HTML/CSS/ES 모듈로 동작합니다. (이 저장소 경로 특성상 `npm install`이 불안정하여 의도적으로 의존성 0으로 구성했습니다.)

## 주요 기능

**집중 타이머**
- 6개 프리셋(포모도로 25분 · 짧은 휴식 5분 · 긴 휴식 15분 · 빠른 작업 10분 · 공부 30분 · 딥워크 60분) + 사용자 지정(1초~24시간, 입력값 검증)
- 시작 / 일시정지 / 이어서 시작 / 초기화 / +1분, 원형 진행률, 현재 모드(집중·휴식) 표시
- **탭 제목에 남은 시간 표시**, 종료 시 알림음(Web Audio, 오디오 파일 없음) · 알림음 켜기·끄기
- **브라우저 알림** — 사용자가 버튼을 누른 경우에만 권한 요청, 탭이 백그라운드일 때 종료 알림
- **백그라운드 정확도** — 실제 종료 시각(Date.now) 기준으로 남은 시간 재계산, **새로고침 시 진행 중 타이머 복구**
- 종료 후 다음 타이머(휴식↔집중) 제안, 자동 시작(기본 꺼짐)
- **키보드 단축키** — `Space` 시작/일시정지, `R` 초기화, `D` 방해 기록

**집중 플랫폼 (세션 추적 · 습관)**
- **세션 라벨** — 시작 전 "무엇에 집중하는지" 라벨을 달고, 완료 세션을 라벨·시간과 함께 기록
- **방해 요소 트래커** — 집중 중 `방해 기록`(또는 `D`)으로 인터럽트를 세고, 세션·요일별 패턴 분석
- **일일 목표 + 스트릭** — 하루 목표(세션 수 또는 분) 설정, 진행 막대, 연속 달성일(오늘 미완이어도 어제까지 이어지면 유지)
- **오늘의 집중 통계** — 완료 세션 · 누적 시간 · 방해 횟수 · 스트릭, 최근 7일 막대그래프, 최근 세션 목록
- **인사이트 대시보드 `/dashboard/`** — 14일 추세, 라벨별 집중 시간, 요일별 방해 패턴, 세션 히스토리, 전체 누적, **JSON 내보내기**
- 날짜가 바뀌면 오늘 기록 자동 리셋, 기록 초기화(확인창)

**공통**
- 접근성 — aria-label, `role="timer"` aria-live, 키보드 사용, 색+문구 이중 상태 표시, 본문 텍스트 명암비 AA(≥4.5:1), `prefers-reduced-motion` 지원
- 모든 기록은 **브라우저 localStorage에만** 저장(서버 전송 없음). 세션 로그는 최근 180일 보관.

### 데이터 모델(localStorage)

| 키 | 내용 |
|---|---|
| `ft.sessions` | 완료 집중 세션 배열 `{ id, date, start, dur, label, distractions }` — 모든 통계·대시보드의 원천 |
| `ft.goal` | 일일 목표 `{ type, target }` (type: `sessions` 또는 `minutes`) |
| `ft.preset` · `ft.duration` · `ft.sound` · `ft.autostart` | 타이머 설정 |
| `ft.running` | 진행 중 스냅샷(새로고침 복구용) |

> 기존 버전의 `ft.stats`(일자별 집계)는 첫 실행 시 `ft.sessions`로 1회 자동 변환됩니다.

## 실행

```bash
npm run dev     # 개발 서버 → http://localhost:3001 (사용 중이면 자동으로 다음 포트)
npm test        # 순수 로직 자동화 테스트 (Node 내장 러너, 의존성 없음)
npm run lint    # JS 문법 + HTML(title/description/h1/lang)·금지표현 검사
npm run build   # 배포 검증(필수 파일·내부 링크·사이트맵). 정적 사이트라 번들 없음
```

> ES 모듈과 클린 URL(`/pomodoro/` 등)을 사용하므로 로컬 확인 시 `npm run dev`가 필요합니다.
> `index.html`을 파일로 직접 열면 모듈 로드와 디렉터리 경로가 동작하지 않습니다.

## 페이지 구성 (17개)

| 경로 | 내용 |
|---|---|
| `/` | 메인 타이머 + 세션 추적 + 통계 + 사용법 + 비교표 + 콘텐츠 + FAQ |
| `/dashboard/` | 집중 인사이트 대시보드(추세·라벨·방해 패턴·히스토리·내보내기) |
| `/pomodoro/` `/study-timer/` `/deep-work/` `/break-guide/` | 집중법·타이머 활용 가이드 |
| `/productivity/` | 집중·시간관리 글 목록(허브) |
| `/productivity/pomodoro-method/` `/productivity/how-to-focus/` `/productivity/study-routine/` `/productivity/deep-work-routine/` | 실전 가이드 글 |
| `/about/` `/contact/` | 소개 · 문의(mailto) |
| `/privacy/` `/terms/` `/disclaimer/` | 개인정보처리방침 · 이용약관 · 면책 안내 |
| `/sitemap/` | HTML 사이트맵 |

## 파일 구조

```
index.html            메인 타이머 페이지
styles.css            디자인 시스템(라벤더·블루 라이트 테마) — 전 페이지 공유
core.js               순수 로직: 시간 포맷·검증·프리셋·세션 로그 집계·목표·스트릭 (테스트 대상)
app.js                메인 타이머 + 세션/방해/목표 엔진(DOM·타이밍·저장)
dashboard.js          /dashboard/ 인사이트 렌더링(세션 로그 → 추세·라벨·방해 패턴)
site.js               공통 동작: 모바일 메뉴 · 푸터 연도 · GA 조건부 로드
config.js             사이트 설정(도메인·GA ID) — 배포 전 편집
locales.js            (레거시) 다국어 문자열 — 테스트 유지용, 현재 페이지에서는 미사용
serve.mjs             의존성 없는 개발용 정적 서버(클린 URL·404 지원)
robots.txt sitemap.xml manifest.webmanifest favicon.svg 404.html
tests/                core.js · locales.js 자동화 테스트
<각 경로>/index.html   콘텐츠·정책 페이지
```

## 배포

빌드 단계가 없습니다. 저장소 루트의 모든 파일을 정적 호스트(GitHub Pages, Netlify, Vercel, Cloudflare Pages 등)에 그대로 올리면 됩니다. 디렉터리 기반 클린 URL이므로 대부분의 정적 호스트에서 `/pomodoro/` 형태가 그대로 동작합니다.

### 배포 전 반드시 바꿔야 할 항목

1. **도메인 치환** — 현재 자리표시자 도메인은 `focus-timer.example` 입니다. 아래 파일 전체에서 `focus-timer.example`(및 `https://jake4176.github.io/countdown`)을 실제 도메인으로 일괄 치환하세요.
   - 모든 `index.html`의 `canonical` / `og:url` / JSON-LD
   - `robots.txt`, `sitemap.xml`
2. **`config.js`** — `siteUrl`을 실제 도메인으로 설정(선택), 분석을 쓸 경우 `gaId` 설정.
3. **문의 이메일** — `/contact/`의 `contact@focus-timer.example`을 실제 수신 주소로 변경.
4. **OG 이미지** — `og-image.png`(1200×630 권장)를 루트에 추가하면 소셜 공유 미리보기가 표시됩니다. (없어도 페이지는 정상 동작)
5. **favicon** — `favicon.svg`가 있습니다. PNG/ICO가 필요하면 추가하세요.

> ⚠️ 이 사이트는 애드센스 **승인을 보장하지 않습니다.** 아래 준비는 심사를 받기 위한 구조일 뿐입니다.

## 애드센스 준비 (광고 코드는 아직 넣지 않았습니다)

재사용 가능한 **광고 자리(placeholder)** 만 배치했습니다. 개발 중에는 "광고 영역" 표시만 보이며, 타이머 조작이나 본문을 가리지 않습니다. 광고 자리 위치:

- 메인 페이지: 프리셋 소개 아래 1곳
- 정보성 글: 본문 중간 1곳, 글 하단 1곳

승인 후 실제 코드를 넣는 방법:

1. AdSense에서 발급받은 **게시자 ID**로 `ads.txt`를 루트에 만드세요. (예: `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0` — **본인 실제 pub ID로 교체**. 임의의 ID를 넣지 마세요.)
2. `<head>`에 AdSense 스크립트를 추가하거나, 각 `.ad-slot .ad-inner` 자리표시자를 광고 단위 코드로 교체하세요.
3. **자동 광고**를 쓰려면 승인 후 본인 계정의 자동 광고 스니펫을 `<head>`에 직접 추가하세요. (레이아웃 이동을 줄이려면 `.ad-slot`이 이미 높이를 확보하고 있습니다.)

광고를 실제로 게재할 때는 콘텐츠 대비 광고 비중이 과하지 않도록 유지하세요.

## 분석 도구(Google Analytics)

`config.js`의 `gaId`에 측정 ID(`G-XXXXXXXXXX`)를 넣으면 `site.js`가 GA를 로드합니다. 값이 없으면 로드되지 않습니다.
분석 도구나 광고 쿠키를 실제로 켜면 **개인정보처리방침(`/privacy/`)에 쿠키·제3자 데이터 수집 내용을 반영**해야 합니다. (해당 페이지에 "도입 시" 조항을 이미 준비해 두었습니다.)

## 환경 변수와의 대응

정적 사이트라 Next.js의 `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_GA_ID` 환경 변수 대신 `config.js`를 사용합니다.
- `NEXT_PUBLIC_SITE_URL` → `config.js`의 `siteUrl` + 위 "도메인 치환"
- `NEXT_PUBLIC_GA_ID` → `config.js`의 `gaId`

## 보안·성능 메모

- 토큰·API 키·비밀번호를 코드에 넣지 않았습니다.
- `localStorage`는 클라이언트에서만 접근하며 예외를 안전하게 처리합니다(프라이빗 모드 대응).
- 사용자 지정 시간은 1초~24시간으로 검증합니다.
- 광고 자리 높이를 CSS로 미리 확보해 레이아웃 이동(CLS)을 줄였습니다.
- 외부 라이브러리·폰트 요청이 없어 로딩이 빠르고 가로 스크롤이 발생하지 않도록 처리했습니다.
