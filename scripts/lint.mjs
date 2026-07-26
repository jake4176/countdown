// 의존성 없는 정적 사이트 린터.
// - 모든 JS/MJS 문법 검사(node --check)
// - 모든 HTML: lang, 고유 title, meta description, <h1> 정확히 1개, </html> 닫힘
// - 금지 표현·미치환 템플릿 토큰 검사
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const IGNORE = new Set(['.git', 'node_modules', 'docs', '.claude', 'scripts']);
const BANNED = ['무조건 효과가 있습니다', '집중력을 완벽하게 높여줍니다', '최고의 생산성 도구', '인생을 바꾸는 타이머', '광고를 눌러', '광고를 클릭'];

function walk(dir, exts) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, exts));
    else if (exts.includes(extname(e.name))) out.push(p);
  }
  return out;
}

const errors = [];
const rel = f => f.replace(root, '').replace(/\\/g, '/') || '/';

// 1) JS 문법
for (const f of walk(root, ['.js', '.mjs'])) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { errors.push(`${rel(f)}: 문법 오류\n${String(e.stderr || e.message).trim()}`); }
}

// 2) HTML 검사
const titles = new Map(), descs = new Map();
for (const f of walk(root, ['.html'])) {
  const r = rel(f);
  // Google Search Console 소유권 확인 파일은 일반 페이지 규칙에서 제외
  if (/^\/google[a-f0-9]+\.html$/i.test(r)) continue;
  const h = readFileSync(f, 'utf8');
  if (!/<html[^>]*\blang=/.test(h)) errors.push(`${r}: <html>에 lang 속성 없음`);
  const title = (h.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
  if (!title || !title.trim()) errors.push(`${r}: <title> 없음`);
  else titles.set(title, (titles.get(title) || []).concat(r));
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!desc || !desc.trim()) errors.push(`${r}: meta description 없음`);
  else descs.set(desc, (descs.get(desc) || []).concat(r));
  const h1 = (h.match(/<h1[ >]/g) || []).length;
  const bilingual = /data-lang\s*=\s*["']ko["']/.test(h) && /data-lang\s*=\s*["']en["']/.test(h);
  if (bilingual) {
    if (h1 < 1 || h1 > 2) errors.push(`${r}: 이중언어 페이지 <h1>가 ${h1}개 (언어당 1개, 최대 2개)`);
  } else if (h1 !== 1) {
    errors.push(`${r}: <h1>가 ${h1}개 (정확히 1개여야 함)`);
  }
  if (!/<\/html>\s*$/.test(h.trim())) errors.push(`${r}: </html>로 끝나지 않음`);
  if (/\{\{[a-zA-Z]/.test(h)) errors.push(`${r}: 미치환 템플릿 토큰({{...}}) 발견`);
  for (const b of BANNED) if (h.includes(b)) errors.push(`${r}: 금지 표현 "${b}"`);
}
// 404는 noindex라 title 중복 허용 대상에서 제외하지 않음(모두 고유해야 함)
for (const [t, v] of titles) if (v.length > 1) errors.push(`중복 title "${t}": ${v.join(', ')}`);
for (const [, v] of descs) if (v.length > 1) errors.push(`중복 description: ${v.join(', ')}`);

if (errors.length) {
  console.error(`✗ lint 실패 — ${errors.length}건`);
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('✓ lint 통과 — JS 문법, HTML title/description/h1/lang, 금지표현 모두 정상');
