// First-visit coachmarks for the homepage timer.
const KEY = 'ft.onboarded';

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

const STEPS = [
  {
    target: '#presetGrid',
    title: 'Pick a preset',
    body: 'Choose Pomodoro, Study, or Deep Work — or set your own time.',
  },
  {
    target: '#startBtn',
    title: 'Tap Start',
    body: 'Begin your focus session. Space also starts or pauses.',
  },
];

let step = 0;
let root = null;
let highlightEl = null;
let onKey = null;

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
  const s = STEPS[step];
  if (!s) { markOnboarded(); return; }
  placeHighlight(s.target);
  const isLast = step >= STEPS.length - 1;
  root.hidden = false;
  root.innerHTML = `
    <div class="coach-backdrop" data-coach-dismiss></div>
    <div class="coach-card" role="dialog" aria-modal="true" aria-labelledby="coachTitle" aria-describedby="coachBody">
      <p class="coach-step">Tip ${step + 1} of ${STEPS.length}</p>
      <h2 id="coachTitle">${s.title}</h2>
      <p id="coachBody">${s.body}</p>
      <div class="coach-actions">
        <button type="button" class="btn btn-ghost" data-coach-skip>Skip</button>
        <button type="button" class="btn btn-primary" data-coach-next>${isLast ? 'Got it' : 'Next'}</button>
      </div>
    </div>
  `;
  const nextBtn = root.querySelector('[data-coach-next]');
  if (nextBtn) nextBtn.focus();
}

function next() {
  step += 1;
  if (step >= STEPS.length) markOnboarded();
  else renderStep();
}

export function startOnboarding() {
  if (isOnboarded()) return;
  root = document.getElementById('coachRoot');
  if (!root) return;
  step = 0;
  renderStep();

  root.onclick = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-coach-skip]') || t.closest('[data-coach-dismiss]')) {
      markOnboarded();
      return;
    }
    if (t.closest('[data-coach-next]')) next();
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
  resetOnboarding();
  startOnboarding();
}
