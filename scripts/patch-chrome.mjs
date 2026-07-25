// Inject bilingual chrome (lang toggle + shared nav + page.js) into content pages.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const PAGES = [
  { file: 'productivity/index.html', current: 'productivity' },
  { file: 'productivity/pomodoro-method/index.html', current: 'productivity' },
  { file: 'productivity/how-to-focus/index.html', current: 'productivity' },
  { file: 'productivity/study-routine/index.html', current: 'productivity' },
  { file: 'productivity/deep-work-routine/index.html', current: 'productivity' },
  { file: 'productivity/remote-work/index.html', current: 'productivity' },
  { file: 'productivity/adhd-friendly-focus/index.html', current: 'productivity' },
  { file: 'productivity/focus-music/index.html', current: 'productivity' },
  { file: 'productivity/burnout-prevention/index.html', current: 'productivity' },
  { file: 'productivity/time-blocking/index.html', current: 'productivity' },
  { file: 'productivity/habit-building/index.html', current: 'productivity' },
  { file: 'productivity/goal-planning/index.html', current: 'productivity' },
  { file: 'study-timer/index.html', current: 'study' },
  { file: 'deep-work/index.html', current: 'deep' },
  { file: 'resources/index.html', current: 'resources' },
  { file: 'about/index.html', current: 'about' },
  { file: 'pomodoro/index.html', current: 'pomodoro' },
  { file: 'break-guide/index.html', current: 'break' },
];

function header(current) {
  const cur = (id) => (id === current ? ' aria-current="page"' : '');
  return `  <a href="#main" class="skip-link" data-i18n="skipToMain">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">◎</span><span class="brand-text">Today's Focus</span></a>
      <div class="header-actions">
        <button type="button" id="langToggle" class="lang-toggle" data-next-lang="ko" aria-label="Change language">한국어</button>
        <button class="nav-toggle" data-i18n-aria="openMenu" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">☰</button>
      </div>
      <nav id="primary-nav" class="nav" aria-label="Primary">
        <a href="/" data-i18n="navHome">Home</a>
        <a href="/pomodoro/" data-i18n="navFocusTimer"${cur('pomodoro')}>Focus Timer</a>
        <a href="/productivity/" data-i18n="navProductivity"${cur('productivity')}>Productivity</a>
        <a href="/study-timer/" data-i18n="navStudy"${cur('study')}>Study</a>
        <a href="/deep-work/" data-i18n="navDeepWork"${cur('deep')}>Deep Work</a>
        <a href="/resources/" data-i18n="navResources"${cur('resources')}>Resources</a>
        <a href="/about/" data-i18n="navAbout"${cur('about')}>About</a>
      </nav>
    </div>
  </header>`;
}

const HEADER_RE = /<a href="#main" class="skip-link">[\s\S]*?<\/header>/;
const BODY_END_RE = /(?:<script[^>]*src="\/(?:config|site|page)\.js"[^>]*><\/script>\s*)*<\/body>/i;

let n = 0;
for (const { file, current } of PAGES) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  if (!HEADER_RE.test(html)) {
    console.warn('skip (no header match):', file);
    continue;
  }
  html = html.replace(HEADER_RE, header(current));
  if (!html.includes('/page.js')) {
    html = html.replace(BODY_END_RE, `  <script src="/config.js"></script>
  <script src="/site.js" defer></script>
  <script type="module" src="/page.js"></script>
</body>`);
  }
  // Prefer UTF-8 brand mark consistency in viewport meta
  if (!html.includes('viewport-fit=cover') && html.includes('name="viewport"')) {
    html = html.replace(
      /content="width=device-width, initial-scale=1\.0"/,
      'content="width=device-width, initial-scale=1.0, viewport-fit=cover"',
    );
  }
  writeFileSync(path, html);
  n += 1;
  console.log('patched', file);
}
console.log(`done: ${n} pages`);
