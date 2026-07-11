import { breakdownRemaining, encodeEvent, decodeEvent } from './core.js';
import { t, SUPPORTED_LANGS } from './locales.js';

const STORAGE_KEY = 'countdown.event';
const LANG_KEY = 'countdown.lang';

const state = { event: null, lang: 'en', timer: null };

// ---------- i18n ----------
function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const base = (navigator.language || 'en').toLowerCase().split('-')[0];
  return SUPPORTED_LANGS.includes(base) ? base : 'en';
}

function applyLang(lang) {
  state.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, lang);
  });
  populateLangSelect();
  renderEventTime();
}

function populateLangSelect() {
  const sel = document.getElementById('langSelect');
  sel.innerHTML = '';
  SUPPORTED_LANGS.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code.toUpperCase();
    if (code === state.lang) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ---------- event state ----------
function loadEvent() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get('e');
  if (encoded) {
    const ev = decodeEvent(encoded);
    if (ev) return ev;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function saveEvent(ev) {
  state.event = ev;
  if (ev) localStorage.setItem(STORAGE_KEY, JSON.stringify(ev));
  else localStorage.removeItem(STORAGE_KEY);
}

// ---------- rendering ----------
function show(viewId) {
  ['emptyState', 'countdownView', 'expiredView'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
}

function renderEventTime() {
  if (!state.event) return;
  const target = new Date(state.event.targetISO);
  const el = document.getElementById('eventTime');
  el.textContent = isNaN(target)
    ? ''
    : new Intl.DateTimeFormat(state.lang, { dateStyle: 'full', timeStyle: 'short' }).format(target);
}

function setVal(id, n, animate) {
  const el = document.getElementById(id);
  const text = String(n).padStart(2, '0');
  if (el.textContent !== text) {
    el.textContent = text;
    if (animate) {
      el.classList.remove('tick');
      void el.offsetWidth; // reflow to restart animation
      el.classList.add('tick');
    }
  }
}

function tick() {
  if (!state.event) return;
  const remaining = new Date(state.event.targetISO).getTime() - Date.now();
  if (remaining <= 0) {
    stopTimer();
    show('expiredView');
    return;
  }
  const { days, hours, minutes, seconds } = breakdownRemaining(remaining);
  setVal('days', days);
  setVal('hours', hours);
  setVal('minutes', minutes);
  setVal('seconds', seconds, true);
}

function startTimer() {
  stopTimer();
  tick();
  state.timer = setInterval(tick, 1000);
}
function stopTimer() {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
}

// ---------- modal ----------
function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openModal() {
  const nameInput = document.getElementById('inputName');
  const dateInput = document.getElementById('inputDate');
  nameInput.value = state.event?.name || '';
  dateInput.value = toLocalInputValue(new Date(Date.now() + 86400000)); // 내일 같은 시각
  document.getElementById('modal').classList.remove('hidden');
  nameInput.focus();
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function saveFromModal() {
  const name = document.getElementById('inputName').value.trim();
  const dateVal = document.getElementById('inputDate').value;
  if (!name || !dateVal) return;
  // datetime-local 값은 현지 시간 → Date 생성자로 현지 해석 → ISO(UTC) 저장
  const targetISO = new Date(dateVal).toISOString();
  saveEvent({ name, targetISO });
  closeModal();
  document.getElementById('eventName').textContent = name;
  renderEventTime();
  show('countdownView');
  startTimer();
}

// ---------- share ----------
let toastTimer;
function showToast() {
  const el = document.getElementById('toast');
  el.textContent = t('shareCopied', state.lang);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function share() {
  if (!state.event) return;
  const url = `${location.origin}${location.pathname}?e=${encodeEvent(state.event)}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(showToast).catch(() => prompt('Copy this link:', url));
  } else {
    prompt('Copy this link:', url);
  }
}

// ---------- init ----------
function init() {
  state.lang = detectLang();
  applyLang(state.lang);

  state.event = loadEvent();

  document.getElementById('langSelect').addEventListener('change', e => applyLang(e.target.value));
  document.getElementById('setBtn').addEventListener('click', openModal);
  document.getElementById('emptySetBtn').addEventListener('click', openModal);
  document.getElementById('expiredSetBtn').addEventListener('click', openModal);
  document.getElementById('shareBtn').addEventListener('click', share);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveFromModal);
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  if (state.event) {
    document.getElementById('eventName').textContent = state.event.name;
    renderEventTime();
    const remaining = new Date(state.event.targetISO).getTime() - Date.now();
    if (remaining <= 0) show('expiredView');
    else { show('countdownView'); startTimer(); }
  } else {
    show('emptyState');
  }
}

init();
