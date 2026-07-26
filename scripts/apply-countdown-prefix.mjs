// Prefix all site-root URLs with /countdown for GitHub Pages project hosting.
// Also removes the dynamic <base> bootstrap (no longer needed).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const IGNORE = new Set(['.git', 'node_modules', 'docs', '.claude', 'scripts', 'tests']);
const PREFIX = '/countdown';
const CACHE = '20260726b';

const BOOTSTRAP_RE = /<script>\s*\(function \(\) \{\s*var base = \/\^\\\/countdown[\s\S]*?<\/script>\s*/;

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

function rewrite(html) {
  html = html.replace(BOOTSTRAP_RE, '');

  // Home links that became empty after stripping "/"
  html = html.replace(/\b(href|src)=""/g, `$1="${PREFIX}/"`);

  // Relative / root site URLs → /countdown/...
  html = html.replace(
    /\b(href|src)="(?!\/countdown\/?)(?!https?:|\/\/|#|mailto:|tel:)([^"]*)"/g,
    (_, attr, url) => {
      if (!url || url.startsWith('#')) return `${attr}="${url}"`;
      if (url === 'styles.css' || url.endsWith('/styles.css')) {
        return `${attr}="${PREFIX}/styles.css?v=${CACHE}"`;
      }
      return `${attr}="${PREFIX}/${url.replace(/^\//, '')}"`;
    }
  );

  return html;
}

let n = 0;
for (const f of walk(root)) {
  const before = readFileSync(f, 'utf8');
  const after = rewrite(before);
  if (after !== before) {
    writeFileSync(f, after, 'utf8');
    n++;
  }
}
console.log(`✓ prefixed ${n} HTML files with ${PREFIX}/`);
