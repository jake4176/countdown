// First-visit coachmarks for the homepage timer.
import { t } from './locales.js';
import { getLang } from './i18n.js';

const KEY = 'ft.onboarded';

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

function steps() {
  const lang = getLang();
  return [
    { target: '#presetGrid', title: t('tip1Title', lang), body: t('tip1Body', lang) },
    { target: '#startBtn', title: t('tip2Title', lang), body: t('tip2Body', lang) },
  ];
}

let step = 0;
let root = null;
let highlightEl = null;
let onKey = null;
let active = false;

export function isOnboarded() {
  return lsGet(KEY) === '1';
}

export function markOnboarded() {
  lsSet(KEY, '1');
  teardown();
}

export function resetOnboarding() {
  lsDel(KEY);
}

function teardown() {
  active = false;
  if (onKey) {
    document.removeEventListener('keydown', onKey);
    onKey = null;
  }
  if (highlightEl) {
    highlightEl.classList.remove('coach-highlight');
    highlightEl = null;
  }
  if (root) {
    root.innerHTML = '';
    root.hidden = true;
  }
}

function placeHighlight(sel) {
  if (highlightEl) highlightEl.classList.remove('coach-highlight');
  highlightEl = document.querySelector(sel);
  if (highlightEl) {
    highlightEl.classList.add('coach-highlight');
    highlightEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderStep() {
  if (!root) return;
  const list = steps();
  const s = list[step];
  const lang = getLang();
  if (!s) { markOnboarded(); return; }
  placeHighlight(s.target);
  const isLast = step >= list.length - 1;
  root.hidden = false;
  root.innerHTML = `
    <div class="coach-backdrop" data-coach-dismiss></div>
    <div class="coach-card" role="dialog" aria-modal="true" aria-labelledby="coachTitle" aria-describedby="coachBody">
      <p class="coach-step">${t('tipStep', lang, { n: step + 1, total: list.length })}</p>
      <h2 id="coachTitle">${s.title}</h2>
      <p id="coachBody">${s.body}</p>
      <div class="coach-actions">
        <button type="button" class="btn btn-ghost" data-coach-skip>${t('tipSkip', lang)}</button>
        <button type="button" class="btn btn-primary" data-coach-next>${isLast ? t('tipGotIt', lang) : t('tipNext', lang)}</button>
      </div>
    </div>
  `;
  const nextBtn = root.querySelector('[data-coach-next]');
  if (nextBtn) nextBtn.focus();
}

function next() {
  step += 1;
  if (step >= steps().length) markOnboarded();
  else renderStep();
}

export function startOnboarding(force = false) {
  if (!force && isOnboarded()) return;
  teardown();
  root = document.getElementById('coachRoot');
  if (!root) return;
  if (force) resetOnboarding();
  step = 0;
  active = true;
  renderStep();

  root.onclick = (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.closest('[data-coach-skip]') || el.closest('[data-coach-dismiss]')) {
      markOnboarded();
      return;
    }
    if (el.closest('[data-coach-next]')) next();
  };

  onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      markOnboarded();
    }
  };
  document.addEventListener('keydown', onKey);
}

export function showTipsAgain() {
  startOnboarding(true);
}

/** Re-render open tips after language change. */
export function refreshOnboardingCopy() {
  if (active && root && !root.hidden) renderStep();
}
