import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = [
  'productivity/index.html',
  'productivity/pomodoro-method/index.html',
  'productivity/how-to-focus/index.html',
  'productivity/study-routine/index.html',
  'productivity/deep-work-routine/index.html',
  'productivity/remote-work/index.html',
  'productivity/adhd-friendly-focus/index.html',
  'productivity/focus-music/index.html',
  'productivity/burnout-prevention/index.html',
  'productivity/time-blocking/index.html',
  'productivity/habit-building/index.html',
  'productivity/goal-planning/index.html',
  'study-timer/index.html',
  'deep-work/index.html',
  'resources/index.html',
  'about/index.html',
  'pomodoro/index.html',
  'break-guide/index.html',
];

const scripts = `  <script src="/config.js"></script>
  <script src="/site.js" defer></script>
  <script type="module" src="/page.js"></script>
</body>`;

for (const f of files) {
  const p = join(root, f);
  let h = readFileSync(p, 'utf8');
  if (h.includes('src="/page.js"')) {
    console.log('ok', f);
    continue;
  }
  // Strip trailing script tags we manage, then append the trio.
  h = h.replace(/\s*<script[^>]*src="\/(?:config|site|page)\.js"[^>]*><\/script>/g, '');
  if (!h.includes('</body>')) {
    console.warn('no body', f);
    continue;
  }
  h = h.replace('</body>', `\n${scripts}\n`);
  writeFileSync(p, h);
  console.log('added', f);
}
