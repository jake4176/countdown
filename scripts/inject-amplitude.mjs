import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const IGNORE = new Set(['.git', 'node_modules', 'docs', '.claude', 'scripts', 'tests']);

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

const tag = '  <script type="module" src="/countdown/amplitude.js"></script>\n';
let n = 0;
for (const f of walk(root)) {
  let html = readFileSync(f, 'utf8');
  if (html.includes('/countdown/amplitude.js')) continue;
  if (!html.includes('/countdown/config.js')) continue;
  const next = html.replace(
    /(<script src="\/countdown\/config\.js"><\/script>\s*)/,
    `$1${tag}`
  );
  if (next !== html) {
    writeFileSync(f, next, 'utf8');
    n++;
  }
}
console.log(`✓ injected amplitude.js into ${n} HTML files`);
