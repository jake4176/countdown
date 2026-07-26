// Make root-absolute URLs work under GitHub Pages project path (/countdown/).
// 1) Insert <base> bootstrap that picks /countdown/ vs /
// 2) Strip leading "/" from internal href/src so <base> applies
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const IGNORE = new Set(['.git', 'node_modules', 'docs', '.claude', 'scripts', 'tests']);

const OLD_BOOTSTRAP_RE = /<script>\s*\(function \(\) \{\s*var base = \/\^\\\/countdown[\s\S]*?<\/script>\s*/;

const BASE_BOOTSTRAP = `<script>
(function () {
  var base = /^\\/countdown(\\/|$)/.test(location.pathname) ? '/countdown/' : '/';
  var el = document.createElement('base');
  el.href = base;
  document.head.insertBefore(el, document.currentScript);
})();
</script>
`;

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function stripRootAbsolute(html) {
  return html.replace(/\b(href|src)="\/(?!\/)/g, '$1="');
}

function ensureBootstrap(html) {
  html = html.replace(OLD_BOOTSTRAP_RE, '');
  if (html.includes("document.createElement('base')")) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${BASE_BOOTSTRAP}`);
  }
  return BASE_BOOTSTRAP + html;
}

let n = 0;
for (const f of walk(root)) {
  const before = readFileSync(f, 'utf8');
  let after = ensureBootstrap(before);
  after = stripRootAbsolute(after);
  if (after !== before) {
    writeFileSync(f, after, 'utf8');
    n++;
  }
}
console.log(`✓ patched ${n} HTML files for GitHub Pages base path`);
