import { formatTime, parseDuration } from './core.js';
import { t, SUPPORTED_LANGS } from './locales.js';

const MODE_KEY = 'timer.mode';
const DUR_KEY = 'timer.duration';
const LANG_KEY = 'timer.lang';

const state = {
  mode: 'countdown',     // 'countdown' | 'stopwatch'
  status: 'idle',        // 'idle' | 'running' | 'paused'
  duration: 25 * 60,     // 카운트다운 총 시간(초)
  elapsed: 0,            // 현재 실행에서 경과한 초
  baseElapsed: 0,        // 시작/재개 시점에 고정된 경과값
  startedAt: 0,          // 시작/재개 타임스탬프
  lang: 'en',
  timer: null,
};

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
  updateButtons();
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

// ---------- audio (Web Audio API, 파일 의존성 없음) ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function beep() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const t0 = now + i * 0.45;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.3, t0 + 0.05);
    gain.gain.linearRampToValueAtTime(0, t0 + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  }
}

// ---------- timer core ----------
function currentElapsed() {
  return state.baseElapsed + (Date.now() - state.startedAt) / 1000;
}

function start() {
  if (state.mode === 'countdown' && state.duration <= 0) return;
  if (state.status === 'running') return;
  ensureAudio();
  // 완료 상태에서 재시작 시 처음부터
  if (state.mode === 'countdown' && state.elapsed >= state.duration) {
    state.elapsed = 0;
    document.body.classList.remove('completed');
  }
  state.status = 'running';
  state.baseElapsed = state.elapsed;
  state.startedAt = Date.now();
  state.timer = setInterval(tick, 200);
  updateButtons();
}

function pause() {
  if (state.status !== 'running') return;
  state.status = 'paused';
  clearInterval(state.timer);
  state.timer = null;
  state.elapsed = currentElapsed();
  updateButtons();
}

function reset() {
  clearInterval(state.timer);
  state.timer = null;
  state.status = 'idle';
  state.elapsed = 0;
  state.baseElapsed = 0;
  document.body.classList.remove('completed');
  render();
  updateButtons();
}

function tick() {
  state.elapsed = currentElapsed();
  if (state.mode === 'countdown' && state.elapsed >= state.duration) {
    state.elapsed = state.duration;
    complete();
    return;
  }
  render();
}

function complete() {
  clearInterval(state.timer);
  state.timer = null;
  state.status = 'idle';
  render();
  beep();
  document.body.classList.add('completed');
  showToast(t('timesUp', state.lang));
  updateButtons();
}

function setDuration(sec) {
  if (state.mode !== 'countdown') return;
  if (state.status === 'running') return;
  state.duration = sec > 0 ? sec : 0;
  state.elapsed = 0;
  state.baseElapsed = 0;
  state.status = 'idle';
  document.body.classList.remove('completed');
  localStorage.setItem(DUR_KEY, String(state.duration));
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.min) * 60 === state.duration);
  });
  render();
  updateButtons();
}

function setMode(mode) {
  reset();
  state.mode = mode;
  document.getElementById('modeCountdown').classList.toggle('active', mode === 'countdown');
  document.getElementById('modeStopwatch').classList.toggle('active', mode === 'stopwatch');
  document.body.classList.toggle('stopwatch', mode === 'stopwatch');
  localStorage.setItem(MODE_KEY, mode);
  render();
  updateButtons();
}

// ---------- rendering ----------
function setRing(progress) {
  document.getElementById('ring').style.setProperty('--progress', Math.max(0, Math.min(1, progress)));
}

function render() {
  let displaySec;
  if (state.mode === 'countdown') {
    const remaining = Math.max(0, state.duration - state.elapsed);
    displaySec = Math.ceil(remaining);
    setRing(state.duration > 0 ? remaining / state.duration : 0);
  } else {
    displaySec = Math.floor(state.elapsed);
    setRing(1);
  }
  document.getElementById('display').textContent = formatTime(displaySec);
}

function updateButtons() {
  const btn = document.getElementById('startBtn');
  btn.textContent = state.status === 'running' ? t('pause', state.lang) : t('start', state.lang);
}

// ---------- toast ----------
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

// ---------- handlers ----------
function onStart() {
  ensureAudio();
  if (state.status === 'running') pause();
  else start();
}

function onPreset(e) {
  setDuration(Number(e.currentTarget.dataset.min) * 60);
}

function onCustomInput() {
  if (state.status !== 'idle') return;
  const m = document.getElementById('inputMin').value;
  const s = document.getElementById('inputSec').value;
  if (m === '' && s === '') return;
  setDuration(parseDuration(m, s));
}

function onKeydown(e) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
  if (e.code === 'Space') { e.preventDefault(); onStart(); }
  else if (e.key === 'r' || e.key === 'R') reset();
}

// ---------- init ----------
function init() {
  state.lang = detectLang();
  applyLang(state.lang);

  state.mode = localStorage.getItem(MODE_KEY) === 'stopwatch' ? 'stopwatch' : 'countdown';
  const savedDur = parseInt(localStorage.getItem(DUR_KEY), 10);
  if (savedDur > 0) state.duration = savedDur;

  document.getElementById('langSelect').addEventListener('change', e => applyLang(e.target.value));
  document.getElementById('startBtn').addEventListener('click', onStart);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('modeCountdown').addEventListener('click', () => setMode('countdown'));
  document.getElementById('modeStopwatch').addEventListener('click', () => setMode('stopwatch'));
  document.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', onPreset));
  document.getElementById('inputMin').addEventListener('input', onCustomInput);
  document.getElementById('inputSec').addEventListener('input', onCustomInput);
  document.addEventListener('keydown', onKeydown);

  document.getElementById('modeCountdown').classList.toggle('active', state.mode === 'countdown');
  document.getElementById('modeStopwatch').classList.toggle('active', state.mode === 'stopwatch');
  document.body.classList.toggle('stopwatch', state.mode === 'stopwatch');
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.min) * 60 === state.duration);
  });

  render();
  updateButtons();
}

init();
