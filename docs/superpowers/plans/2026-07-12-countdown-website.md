# 글로벌 카운트다운 웹사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 직접 설정하는 다국어·시간대 자동 글로벌 카운트다운 정적 웹사이트를 빌드한다.

**Architecture:** 빌드 단계 없는 정적 사이트. 순수 로직(시간 계산·공유 인코딩·i18n)은 ES 모듈로 분리해 Node 내장 테스트 러너로 검증하고, DOM/상태 오케스트레이션은 `app.js`가 담당한다. 이벤트는 절대 UTC 시각으로 저장해 전 세계 어디서나 동일하게 카운트다운되며, URL 쿼리로 공유할 수 있다.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES modules), Node `node:test` (테스트), zero-dep `serve.mjs` (로컬 개발 서버)

## Global Constraints

- 빌드 단계 없음. 외부 런타임 의존성 없음 (npm 패키지 설치 불필요).
- ES 모듈 사용 (`<script type="module">`, `import`/`export`).
- 디자인: 미니멀 다크 + 글로우. 강조색 `#7c5cff`, 배경 `#0a0a0f`. CSS 변수로 토큰 관리.
- 지원 언어: KO, EN, ES, JA, ZH. 폴백 EN.
- 시간대: 입력 현지 시간 → UTC ISO 저장. 남은 시간은 `targetUTC - nowUTC`.
- 반응형 중단점 `768px`.
- Node 18+ 환경에서 `npm test` 실행 가능.

---

## File Structure

```
countdown/
├── package.json          # type:module, test/dev 스크립트
├── serve.mjs             # zero-dep 정적 서버 (ES 모듈 로딩용)
├── .gitignore
├── index.html            # 마크업 + data-i18n 매핑
├── styles.css            # 다크/글로우 디자인, 반응형
├── core.js               # 순수 로직: breakdownRemaining, encode/decodeEvent (Node 테스트 대상)
├── locales.js            # 순수 로직: translations, t, SUPPORTED_LANGS (Node 테스트 대상)
├── app.js                # 브라우저: DOM, 상태, 카운트다운 루프, 공유, 언어 토글
├── tests/
│   ├── smoke.test.mjs    # 테스트 파이프라인 검증
│   ├── core.test.mjs     # core.js 테스트
│   └── locales.test.mjs  # locales.js 테스트
└── docs/superpowers/...
```

---

### Task 0: 프로젝트 셋업

**Files:**
- Create: `package.json`, `.gitignore`, `serve.mjs`, `tests/smoke.test.mjs`
- Initialize: git 저장소

**Interfaces:**
- Produces: `npm test` (Node 테스트 러너), `npm run dev` (정적 서버 :3000)

- [ ] **Step 1: git 저장소 초기화**

Run: `git init`
Expected: `Initialized empty Git repository in ...`

(이후 커밋 시 `user.name`/`user.email` 미설정 에러가 나면 `git config user.name "이름"` / `git config user.email "이메일"` 로 전역 설정.)

- [ ] **Step 2: `.gitignore` 작성**

Create `G:\내 드라이브\code\countdown\.gitignore`:
```
node_modules/
.DS_Store
*.log
.vscode/
```

- [ ] **Step 3: `package.json` 작성**

Create `G:\내 드라이브\code\countdown\package.json`:
```json
{
  "name": "countdown",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "dev": "node serve.mjs"
  }
}
```

- [ ] **Step 4: `serve.mjs` 작성 (zero-dep 정적 서버)**

Create `G:\내 드라이브\code\countdown\serve.mjs`:
```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const PORT = 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  try {
    const data = await readFile('.' + url);
    res.writeHead(200, { 'Content-Type': TYPES[extname(url)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Countdown dev server: http://localhost:${PORT}`);
});
```

- [ ] **Step 5: 스모크 테스트 작성**

Create `G:\내 드라이브\code\countdown\tests\smoke.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 6: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: `✔ test runner works` / `tests 1`, `pass 1`

- [ ] **Step 7: 커밋**

```bash
git add .
git commit -m "chore: project scaffold with node test runner and dev server"
```

---

### Task 1: core.js — 시간 분해 + 공유 인코딩 (순수 로직)

**Files:**
- Create: `core.js`
- Test: `tests/core.test.mjs`

**Interfaces:**
- Produces:
  - `breakdownRemaining(ms: number) → { days: number, hours: number, minutes: number, seconds: number }` (음수 입력은 0으로 클램프)
  - `encodeEvent(event: { name: string, targetISO: string }) → string` (URL 안전 Base64)
  - `decodeEvent(str: string) → { name: string, targetISO: string } | null` (실패 시 null)

- [ ] **Step 1: 실패하는 테스트 작성**

Create `G:\내 드라이브\code\countdown\tests\core.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakdownRemaining, encodeEvent, decodeEvent } from '../core.js';

test('breakdownRemaining splits ms into d/h/m/s', () => {
  // 1d 2h 3m 4s
  assert.deepEqual(breakdownRemaining(93784000), { days: 1, hours: 2, minutes: 3, seconds: 4 });
});

test('breakdownRemaining floors partial seconds', () => {
  assert.deepEqual(breakdownRemaining(1500), { days: 0, hours: 0, minutes: 0, seconds: 1 });
});

test('breakdownRemaining clamps negative to zero', () => {
  assert.deepEqual(breakdownRemaining(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('encode/decode round-trip with ASCII name', () => {
  const ev = { name: 'New Year', targetISO: '2026-01-01T00:00:00.000Z' };
  assert.deepEqual(decodeEvent(encodeEvent(ev)), ev);
});

test('encode/decode round-trip with Korean name', () => {
  const ev = { name: '새해 첫 출근', targetISO: '2026-01-05T00:00:00.000Z' };
  assert.deepEqual(decodeEvent(encodeEvent(ev)), ev);
});

test('decodeEvent returns null for invalid base64', () => {
  assert.equal(decodeEvent('not-valid-base64!!'), null);
});

test('decodeEvent returns null for empty string', () => {
  assert.equal(decodeEvent(''), null);
});

test('decodeEvent returns null for JSON missing required fields', () => {
  const bad = btoa(encodeURIComponent(JSON.stringify({ name: 'x' })));
  assert.equal(decodeEvent(bad), null);
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../core.js'`

- [ ] **Step 3: 구현**

Create `G:\내 드라이브\code\countdown\core.js`:
```js
// 순수 로직: 시간 분해 + 공유 인코딩. DOM/브라우저 전역에 의존하지 않는다.

export function breakdownRemaining(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function encodeEvent(event) {
  // 유니코드(한글 등)를 안전하게 위해 먼저 encodeURIComponent 후 Base64.
  const json = JSON.stringify(event);
  return btoa(encodeURIComponent(json));
}

export function decodeEvent(str) {
  if (!str) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(atob(str)));
    if (!obj || typeof obj.name !== 'string' || typeof obj.targetISO !== 'string') return null;
    return { name: obj.name, targetISO: obj.targetISO };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: core 테스트 8개 + smoke 1개 모두 `pass`

- [ ] **Step 5: 커밋**

```bash
git add core.js tests/core.test.mjs
git commit -m "feat: add pure countdown core (time breakdown + share codec)"
```

---

### Task 2: locales.js — 다국어 i18n (순수 로직)

**Files:**
- Create: `locales.js`
- Test: `tests/locales.test.mjs`

**Interfaces:**
- Produces:
  - `translations: Record<lang, Record<key, string>>` (lang ∈ ko/en/es/ja/zh)
  - `SUPPORTED_LANGS: string[]` = `['ko','en','es','ja','zh']`
  - `t(key: string, lang: string) → string` (알 수 없는 lang/key는 EN→key 순 폴백)

- [ ] **Step 1: 실패하는 테스트 작성**

Create `G:\내 드라이브\code\countdown\tests\locales.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations, t, SUPPORTED_LANGS } from '../locales.js';

const KEYS = ['days','hours','minutes','seconds','setEvent','share','eventName','selectDateTime','save','cancel','expiredTitle','expiredMessage','shareCopied','noEventPrompt'];

test('SUPPORTED_LANGS contains the 5 languages', () => {
  assert.deepEqual(SUPPORTED_LANGS, ['ko','en','es','ja','zh']);
});

test('every supported lang has every key', () => {
  SUPPORTED_LANGS.forEach(lang => {
    KEYS.forEach(key => {
      assert.equal(typeof translations[lang][key], 'string', `${lang}.${key} missing`);
    });
  });
});

test('t returns translation for known lang', () => {
  assert.equal(t('days', 'ko'), '일');
  assert.equal(t('days', 'en'), 'Days');
});

test('t falls back to en for unknown lang', () => {
  assert.equal(t('days', 'xx'), 'Days');
});

test('t falls back to key for missing key', () => {
  assert.equal(t('nonexistent', 'ko'), 'nonexistent');
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../locales.js'`

- [ ] **Step 3: 구현**

Create `G:\내 드라이브\code\countdown\locales.js`:
```js
// 다국어 문자열 + 헬퍼. DOM/브라우저 전역에 의존하지 않는다.

export const SUPPORTED_LANGS = ['ko', 'en', 'es', 'ja', 'zh'];

export const translations = {
  ko: {
    days: '일', hours: '시', minutes: '분', seconds: '초',
    setEvent: '이벤트 설정', share: '공유',
    eventName: '이벤트 이름', selectDateTime: '날짜 및 시간',
    save: '저장', cancel: '취소',
    expiredTitle: '시간이 되었습니다!', expiredMessage: '설정하신 이벤트 시간에 도달했습니다.',
    shareCopied: '공유 링크가 복사되었습니다',
    noEventPrompt: '시작하려면 이벤트를 설정하세요',
  },
  en: {
    days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds',
    setEvent: 'Set Event', share: 'Share',
    eventName: 'Event name', selectDateTime: 'Date & time',
    save: 'Save', cancel: 'Cancel',
    expiredTitle: 'Time is up!', expiredMessage: 'The event time has been reached.',
    shareCopied: 'Share link copied to clipboard',
    noEventPrompt: 'Set an event to get started',
  },
  es: {
    days: 'Días', hours: 'Horas', minutes: 'Minutos', seconds: 'Segundos',
    setEvent: 'Configurar evento', share: 'Compartir',
    eventName: 'Nombre del evento', selectDateTime: 'Fecha y hora',
    save: 'Guardar', cancel: 'Cancelar',
    expiredTitle: '¡Se acabó el tiempo!', expiredMessage: 'Se ha alcanzado la hora del evento.',
    shareCopied: 'Enlace de compartir copiado',
    noEventPrompt: 'Configura un evento para empezar',
  },
  ja: {
    days: '日', hours: '時間', minutes: '分', seconds: '秒',
    setEvent: 'イベントを設定', share: '共有',
    eventName: 'イベント名', selectDateTime: '日時',
    save: '保存', cancel: 'キャンセル',
    expiredTitle: '時間になりました！', expiredMessage: '設定したイベント時刻に到達しました。',
    shareCopied: '共有リンクをコピーしました',
    noEventPrompt: 'イベントを設定して開始',
  },
  zh: {
    days: '天', hours: '时', minutes: '分', seconds: '秒',
    setEvent: '设置事件', share: '分享',
    eventName: '事件名称', selectDateTime: '日期和时间',
    save: '保存', cancel: '取消',
    expiredTitle: '时间到了！', expiredMessage: '已到达您设置的事件时间。',
    shareCopied: '分享链接已复制',
    noEventPrompt: '设置一个事件即可开始',
  },
};

export function t(key, lang) {
  const dict = translations[lang] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `npm test`
Expected: 모든 테스트 `pass`

- [ ] **Step 5: 커밋**

```bash
git add locales.js tests/locales.test.mjs
git commit -m "feat: add i18n locales for 5 languages with en fallback"
```

---

### Task 3: index.html + styles.css — 레이아웃 및 디자인

**Files:**
- Create: `index.html`, `styles.css`

**Interfaces:**
- Consumes: (없음 — 정적 마크업/스타일)
- Produces: `app.js`가 참조할 DOM ID들 — `langSelect`, `emptyState`, `emptySetBtn`, `countdownView`, `eventName`, `eventTime`, `days`, `hours`, `minutes`, `seconds`, `setBtn`, `shareBtn`, `expiredView`, `expiredSetBtn`, `modal`, `inputName`, `inputDate`, `cancelBtn`, `saveBtn`, `toast`. `data-i18n` 속성으로 i18n 키 매핑.

- [ ] **Step 1: `index.html` 작성**

Create `G:\내 드라이브\code\countdown\index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CountDown</title>
  <meta name="description" content="A simple, beautiful global countdown timer.">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="bg-glow" aria-hidden="true"></div>

  <header class="topbar">
    <div class="logo">⏳ CountDown</div>
    <select id="langSelect" class="lang-select" aria-label="Language"></select>
  </header>

  <main class="container">
    <div id="emptyState" class="center-state">
      <p class="muted" data-i18n="noEventPrompt">Set an event to get started</p>
      <button id="emptySetBtn" class="btn btn-primary" data-i18n="setEvent">Set Event</button>
    </div>

    <div id="countdownView" class="countdown-view hidden">
      <h1 id="eventName" class="event-name">—</h1>
      <p id="eventTime" class="event-time muted">—</p>
      <div class="countdown">
        <div class="time-unit">
          <span class="time-value" id="days">00</span>
          <span class="time-label" data-i18n="days">Days</span>
        </div>
        <div class="time-unit">
          <span class="time-value" id="hours">00</span>
          <span class="time-label" data-i18n="hours">Hours</span>
        </div>
        <div class="time-unit">
          <span class="time-value" id="minutes">00</span>
          <span class="time-label" data-i18n="minutes">Minutes</span>
        </div>
        <div class="time-unit">
          <span class="time-value" id="seconds">00</span>
          <span class="time-label" data-i18n="seconds">Seconds</span>
        </div>
      </div>
      <div class="actions">
        <button id="setBtn" class="btn" data-i18n="setEvent">Set Event</button>
        <button id="shareBtn" class="btn" data-i18n="share">Share</button>
      </div>
    </div>

    <div id="expiredView" class="center-state hidden">
      <h1 class="event-name" data-i18n="expiredTitle">Time is up!</h1>
      <p class="muted" data-i18n="expiredMessage">The event time has been reached.</p>
      <button id="expiredSetBtn" class="btn btn-primary" data-i18n="setEvent">Set Event</button>
    </div>
  </main>

  <div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-card">
      <h2 id="modalTitle" class="modal-title" data-i18n="setEvent">Set Event</h2>
      <label class="field">
        <span data-i18n="eventName">Event name</span>
        <input type="text" id="inputName" maxlength="60" autocomplete="off">
      </label>
      <label class="field">
        <span data-i18n="selectDateTime">Date &amp; time</span>
        <input type="datetime-local" id="inputDate">
      </label>
      <div class="modal-actions">
        <button id="cancelBtn" class="btn" data-i18n="cancel">Cancel</button>
        <button id="saveBtn" class="btn btn-primary" data-i18n="save">Save</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast hidden"></div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `styles.css` 작성**

Create `G:\내 드라이브\code\countdown\styles.css`:
```css
:root {
  --bg: #0a0a0f;
  --bg-glow: rgba(124, 92, 255, 0.15);
  --primary: #7c5cff;
  --primary-hover: #8d6dff;
  --primary-glow: rgba(124, 92, 255, 0.45);
  --text: #f5f5f7;
  --text-muted: rgba(245, 245, 247, 0.5);
  --card-bg: rgba(255, 255, 255, 0.04);
  --card-border: rgba(255, 255, 255, 0.08);
  --radius: 16px;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.bg-glow {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 40%, var(--bg-glow), transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.topbar {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
}
.logo { font-weight: 600; font-size: 1.1rem; letter-spacing: 0.02em; }

.lang-select {
  background: var(--card-bg);
  color: var(--text);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font: inherit;
  cursor: pointer;
}

.container {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1.25rem;
}

.center-state { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.countdown-view { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }

.event-name { font-size: clamp(1.5rem, 5vw, 2.5rem); font-weight: 600; letter-spacing: -0.01em; }
.event-time { font-size: 0.95rem; }
.muted { color: var(--text-muted); }

.countdown { display: flex; gap: 1rem; margin: 0.5rem 0; }

.time-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 1.25rem 1rem;
  min-width: 92px;
  box-shadow: 0 0 24px var(--primary-glow), inset 0 0 12px rgba(124, 92, 255, 0.06);
}
.time-value {
  font-size: clamp(2rem, 8vw, 3.5rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px var(--primary-glow);
  line-height: 1;
}
.time-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}
.time-value.tick { animation: tick 0.4s ease; }
@keyframes tick {
  0% { opacity: 0.3; transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}

.actions { display: flex; gap: 0.75rem; }

.btn {
  background: var(--card-bg);
  color: var(--text);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 0.7rem 1.4rem;
  font: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.1s;
}
.btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.18); }
.btn:active { transform: scale(0.97); }
.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 20px var(--primary-glow);
}
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 1.5rem;
}
.modal-card {
  background: #14141c;
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 0 40px var(--primary-glow);
}
.modal-title { font-size: 1.1rem; font-weight: 600; }
.field { display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
.field span { font-size: 0.85rem; color: var(--text-muted); }
.field input {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  font: inherit;
}
.field input:focus { outline: none; border-color: var(--primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #14141c;
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 0.7rem 1.2rem;
  font-size: 0.9rem;
  z-index: 20;
  box-shadow: 0 0 20px var(--primary-glow);
  transition: opacity 0.3s;
}
.toast.hidden { opacity: 0; pointer-events: none; }

.hidden { display: none !important; }

@media (max-width: 768px) {
  .topbar { padding: 1rem; }
  .countdown { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; width: 100%; max-width: 360px; }
  .time-unit { min-width: 0; padding: 0.9rem 0.5rem; }
  .actions { width: 100%; max-width: 360px; flex-direction: column; }
  .btn { width: 100%; }
}
```

- [ ] **Step 3: 레이아웃 수동 검증**

Run: `npm run dev` (백그라운드로 실행 후 브라우저에서 `http://localhost:3000` 열기)
Expected:
- 빈 상태 화면에 "Set an event to get started" + "Set Event" 버튼 표시
- 다크 배경 + 중앙 보라 글로우 시각적 확인
- 개발자 도구 모바일 뷰포트(예: 375px)에서 카운트다운 자리가 2열 그리드로 바뀌는지 확인 (빈 상태라 카운트다운은 안 보이지만, CSS 로드·콘솔 에러 없음 확인)

- [ ] **Step 4: 커밋**

```bash
git add index.html styles.css
git commit -m "feat: add countdown layout and minimal dark+glow styles"
```

---

### Task 4: app.js — 상태·카운트다운·공유·i18n 연결

**Files:**
- Create: `app.js`

**Interfaces:**
- Consumes: `breakdownRemaining`, `encodeEvent`, `decodeEvent` from `core.js`; `translations`, `t`, `SUPPORTED_LANGS` from `locales.js`
- Produces: 실행 가능한 카운트다운 웹앱

- [ ] **Step 1: 구현**

Create `G:\내 드라이브\code\countdown\app.js`:
```js
import { breakdownRemaining, encodeEvent, decodeEvent } from './core.js';
import { t, SUPPORTED_LANGS } from './locales.js';

const STORAGE_KEY = 'countdown.event';
const LANG_KEY = 'countdown.lang';

const state = { event: null, lang: 'en', timer: null };

// ---------- i18n ----------
function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const base = (navigator.language || 'en').toLowerCase().split('-')[0];
  return SUPPORTED_LANGS.includes(base) ? base : 'en';
}

function applyLang(lang) {
  state.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, lang);
  });
  populateLangSelect();
  renderEventTime();
}

function populateLangSelect() {
  const sel = document.getElementById('langSelect');
  sel.innerHTML = '';
  SUPPORTED_LANGS.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code.toUpperCase();
    if (code === state.lang) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ---------- event state ----------
function loadEvent() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get('e');
  if (encoded) {
    const ev = decodeEvent(encoded);
    if (ev) return ev;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function saveEvent(ev) {
  state.event = ev;
  if (ev) localStorage.setItem(STORAGE_KEY, JSON.stringify(ev));
  else localStorage.removeItem(STORAGE_KEY);
}

// ---------- rendering ----------
function show(viewId) {
  ['emptyState', 'countdownView', 'expiredView'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

function renderEventTime() {
  if (!state.event) return;
  const target = new Date(state.event.targetISO);
  const el = document.getElementById('eventTime');
  el.textContent = isNaN(target)
    ? ''
    : new Intl.DateTimeFormat(state.lang, { dateStyle: 'full', timeStyle: 'short' }).format(target);
}

function setVal(id, n, animate) {
  const el = document.getElementById(id);
  const text = String(n).padStart(2, '0');
  if (el.textContent !== text) {
    el.textContent = text;
    if (animate) {
      el.classList.remove('tick');
      void el.offsetWidth; // reflow to restart animation
      el.classList.add('tick');
    }
  }
}

function tick() {
  if (!state.event) return;
  const remaining = new Date(state.event.targetISO).getTime() - Date.now();
  if (remaining <= 0) {
    stopTimer();
    show('expiredView');
    return;
  }
  const { days, hours, minutes, seconds } = breakdownRemaining(remaining);
  setVal('days', days);
  setVal('hours', hours);
  setVal('minutes', minutes);
  setVal('seconds', seconds, true);
}

function startTimer() {
  stopTimer();
  tick();
  state.timer = setInterval(tick, 1000);
}
function stopTimer() {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
}

// ---------- modal ----------
function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openModal() {
  const nameInput = document.getElementById('inputName');
  const dateInput = document.getElementById('inputDate');
  nameInput.value = state.event?.name || '';
  dateInput.value = toLocalInputValue(new Date(Date.now() + 86400000)); // 내일 같은 시각
  document.getElementById('modal').classList.remove('hidden');
  nameInput.focus();
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function saveFromModal() {
  const name = document.getElementById('inputName').value.trim();
  const dateVal = document.getElementById('inputDate').value;
  if (!name || !dateVal) return;
  // datetime-local 값은 현지 시간 → Date 생성자로 현지 해석 → ISO(UTC) 저장
  const targetISO = new Date(dateVal).toISOString();
  saveEvent({ name, targetISO });
  closeModal();
  document.getElementById('eventName').textContent = name;
  renderEventTime();
  show('countdownView');
  startTimer();
}

// ---------- share ----------
let toastTimer;
function showToast() {
  const el = document.getElementById('toast');
  el.textContent = t('shareCopied', state.lang);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function share() {
  if (!state.event) return;
  const url = `${location.origin}${location.pathname}?e=${encodeEvent(state.event)}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(showToast).catch(() => prompt('Copy this link:', url));
  } else {
    prompt('Copy this link:', url);
  }
}

// ---------- init ----------
function init() {
  state.lang = detectLang();
  applyLang(state.lang);

  state.event = loadEvent();

  document.getElementById('langSelect').addEventListener('change', e => applyLang(e.target.value));
  document.getElementById('setBtn').addEventListener('click', openModal);
  document.getElementById('emptySetBtn').addEventListener('click', openModal);
  document.getElementById('expiredSetBtn').addEventListener('click', openModal);
  document.getElementById('shareBtn').addEventListener('click', share);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveFromModal);
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  if (state.event) {
    document.getElementById('eventName').textContent = state.event.name;
    renderEventTime();
    const remaining = new Date(state.event.targetISO).getTime() - Date.now();
    if (remaining <= 0) show('expiredView');
    else { show('countdownView'); startTimer(); }
  } else {
    show('emptyState');
  }
}

init();
```

- [ ] **Step 2: 전체 동작 수동 검증**

Run: `npm run dev` → `http://localhost:3000` 에서 확인:
1. 빈 상태 → "Set Event" 클릭 → 모달 열림
2. 이름 입력(예: "새해 첫 출근") + 내일 날짜/시간 선택 → 저장 → 카운트다운 표시, 초 단위 갱신(틱 애니메이션)
3. 새로고침 → 이벤트 유지됨(localStorage)
4. 언어 선택 변경(KO/EN/ES/JA/ZH) → 모든 라벨·날짜 포맷 즉시 전환
5. "Share" 클릭 → 토스트 "공유 링크 복사됨" 표시, 클립보드에 `?e=...` URL 복사됨
6. 복사한 URL을 시크릿 창(또는 다른 브라우저)에서 열기 → 동일 카운트다운 표시(localStorage 비어 있어도 URL에서 로드)
7. 과거 날짜로 이벤트 설정 → 즉시 "시간이 되었습니다!" 만료 화면
8. 모바일 뷰포트(375px) → 카운트다운 2×2 그리드, 버튼 풀폭, 깨짐 없음

Expected: 위 8항 모두 정상 동작, 콘솔 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app.js
git commit -m "feat: wire countdown app (state, loop, share, i18n, modal)"
```

---

### Task 5: 최종 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 자동화 테스트 통과 확인**

Run: `npm test`
Expected: smoke + core(8) + locales(5) 모두 `pass`, `fail 0`

- [ ] **Step 2: 스펙 §9 체크리스트 전수 확인**

Run: `npm run dev` → `http://localhost:3000`에서 스펙의 7개 항목逐一 확인:
1. 이벤트 설정 → 카운트다운 정상, 초 단위 갱신
2. 새로고침 후 유지
3. 공유 링크 → 다른 창에서 동일 카운트다운
4. 언어 토글 → 문자열·날짜/숫자 포맷 전환
5. 모바일 레이아웃 깨짐 없음
6. 과거 날짜 → 종료 상태
7. 만료 시점 도달 → 축하/만료 메시지 전환

Expected: 7항 모두 충족

- [ ] **Step 3: README 작성 (선택) 및 최종 커밋**

Create `G:\내 드라이브\code\countdown\README.md`:
```markdown
# CountDown

다국어·시간대 자동 글로벌 카운트다운 정적 웹사이트.

## 실행
- 개발 서버: `npm run dev` → http://localhost:3000
- 테스트: `npm test`

## 배포
`index.html`, `styles.css`, `core.js`, `locales.js`, `app.js`를 정적 호스트(GitHub Pages, Netlify, Vercel)에 업로드. 빌드 불필요.
```

```bash
git add README.md
git commit -m "docs: add README"
```

- [ ] **Step 4: 작업 완료 처리**

완료된 기능 요약을 사용자에게 보고.
