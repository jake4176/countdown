// 의존성 없는 정적 사이트 "빌드" = 배포 가능 여부 검증.
// 번들 단계가 없으므로, 배포 전에 깨진 내부 링크·필수 파일·자산 참조를 확인한다.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.cwd();
const IGNORE = new Set(['.git', 'node_modules', 'docs', '.claude', 'scripts', 'tests']);

function walk(dir, ext) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}
const rel = f => f.replace(root, '').replace(/\\/g, '/') || '/';
const errors = [];

// 1) 필수 파일
const required = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', 'favicon.svg', 'styles.css', 'app.js', 'core.js', 'onboard.js', 'locales.js', 'i18n.js', 'page.js', 'amplitude.js'];
for (const f of required) if (!existsSync(join(root, f))) errors.push(`필수 파일 없음: ${f}`);

// 2) 내부 링크·자산 참조 검사
const htmls = walk(root, '.html');
const attrRe = /(?:href|src)="([^"]+)"/g;
for (const f of htmls) {
  const html = readFileSync(f, 'utf8');
  let m;
  while ((m = attrRe.exec(html))) {
    let url = m[1];
    if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) continue;
    if (/^[a-z]+:/i.test(url) || url.startsWith('//')) continue; // absolute / protocol-relative
    if (/['"+]/.test(url)) continue; // skip JS string fragments accidentally matched in <script>
    // GitHub Pages project prefix, root-absolute, or site-relative.
    if (url.startsWith('/countdown/')) url = url.slice('/countdown/'.length);
    else if (url.startsWith('/')) url = url.slice(1);
    url = url.split('#')[0].split('?')[0];
    if (!url || url.startsWith('.')) continue;
    let fsPath = join(root, url);
    if (url.endsWith('/')) fsPath = join(fsPath, 'index.html');
    else if (!extname(url)) fsPath = join(fsPath, 'index.html');
    if (!existsSync(fsPath)) errors.push(`${rel(f)} → 깨진 링크 /${url}`);
  }
}

// 3) sitemap.xml의 모든 URL 경로가 실제로 존재하는지
const sm = readFileSync(join(root, 'sitemap.xml'), 'utf8');
for (const loc of [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1].trim())) {
  let path;
  try { path = new URL(loc).pathname; } catch { errors.push(`sitemap.xml → 잘못된 URL ${loc}`); continue; }
  if (path.startsWith('/countdown/')) path = path.slice('/countdown'.length);
  else if (path === '/countdown') path = '/';
  let fsPath = join(root, path);
  if (path.endsWith('/')) fsPath = join(fsPath, 'index.html');
  else if (!extname(path)) fsPath = join(fsPath, 'index.html');
  if (!existsSync(fsPath)) errors.push(`sitemap.xml → 없는 경로 ${path}`);
}

if (errors.length) {
  console.error(`✗ build 검증 실패 — ${errors.length}건`);
  [...new Set(errors)].forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✓ build 검증 통과 — 필수 파일·내부 링크·사이트맵 정상 (${htmls.length}개 HTML)`);
console.log('  정적 사이트이므로 번들링이 필요 없습니다. 루트의 파일을 그대로 배포하세요.');
