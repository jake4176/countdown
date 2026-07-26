// Bundle @amplitude/unified for static hosting (GitHub Pages has no node_modules).
// Prefer a local install; fall back to a temp install path used on Google Drive.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const outfile = join(root, 'amplitude.js');
const entry = `
import * as amplitude from '@amplitude/unified';

if (typeof window !== 'undefined' && !window.__AMPLITUDE_INITIALIZED__) {
  window.__AMPLITUDE_INITIALIZED__ = true;
  amplitude.initAll('e2b4a86a6c690859b132f3553990a7f2', {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
}

export { amplitude };
`;

let cwd = root;
if (!existsSync(join(root, 'node_modules', '@amplitude', 'unified'))) {
  cwd = mkdtempSync(join(tmpdir(), 'countdown-amp-'));
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2));
  const install = spawnSync('npm', ['install', '@amplitude/unified@^1.1.27'], { cwd, stdio: 'inherit', shell: true });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

const entryFile = join(cwd, 'amplitude-entry.js');
writeFileSync(entryFile, entry, 'utf8');
const build = spawnSync(
  'npx',
  ['--yes', 'esbuild', entryFile, '--bundle', '--format=esm', '--platform=browser', '--outfile=' + outfile, '--minify'],
  { cwd, stdio: 'inherit', shell: true }
);
if (build.status !== 0) process.exit(build.status ?? 1);
console.log('✓ wrote amplitude.js');
