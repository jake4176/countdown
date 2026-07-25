// Main timer + focus platform — Today's Focus
// Pure logic lives in core.js; this file owns DOM, timing, and storage.
import {
  formatTime, parseDuration, validateDuration, PRESETS,
  dateKey, humanizeSeconds, MAX_DURATION,
  daySummary, dailySeries, goalProgress, computeStreak, DEFAULT_GOAL,
} from './core.js';
import { startOnboarding, markOnboarded, showTipsAgain } from './onboard.js';

// ---------- storage keys ----------
const K = {
  duration: 'ft.duration',
  preset: 'ft.preset',
  sound: 'ft.sound',
  autostart: 'ft.autostart',
  stats: 'ft.stats',       // legacy aggregate (migration)
  sessions: 'ft.sessions', // session log array
  goal: 'ft.goal',         // { type:'sessions'|'minutes', target:number }
  running: 'ft.running',   // in-progress snapshot
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRESET_NAMES = { pomodoro: 'Pomodoro', shortBreak: 'Short Break', longBreak: 'Long Break', quick: 'Quick Task', study: 'Study', deepWork: 'Deep Work' };
const hz = (s) => humanizeSeconds(s, 'en');

const state = {
  status: 'idle',     // 'idle' | 'running' | 'paused' | 'completed'
  duration: 25 * 60,
  elapsed: 0,
  baseElapsed: 0,
  startedAt: 0,
  presetId: 'pomodoro',
  kind: 'focus',
  soundOn: true,
  autoStart: false,
  distractions: 0,    // 현재 세션에서 기록한 방해 수
  timer: null,
};

// ---------- 안전한 localStorage ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 무시 */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* 무시 */ } }

// ---------- 세션 로그 ----------
function loadSessions() {
  try { const a = JSON.parse(lsGet(K.sessions) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function saveSessions(list) {
  const cutoffKey = dateKey(Date.now() - 180 * 24 * 3600 * 1000); // 최근 180일 보관
  const pruned = list.filter(s => String(s.date) >= cutoffKey);
  lsSet(K.sessions, JSON.stringify(pruned));
}
// 레거시 ft.stats(일자별 집계)를 세션 로그로 1회 변환.
function migrateLegacyStats() {
  if (lsGet(K.sessions) !== null) return;
  let legacy = {};
  try { legacy = JSON.parse(lsGet(K.stats) || '{}') || {}; } catch { legacy = {}; }
  const out = [];
  for (const [date, d] of Object.entries(legacy)) {
    const n = Number(d && d.sessions) || 0;
    const per = n > 0 ? Math.round((Number(d.seconds) || 0) / n) : 0;
    const [y, m, dd] = date.split('-').map(Number);
    for (let i = 0; i < n; i++) {
      const start = new Date(y, (m || 1) - 1, dd || 1, 12, 0, 0).getTime() + i * 1000;
      out.push({ id: `${date}-${i}`, date, start, dur: per, label: '기록 이전', distractions: 0 });
    }
  }
  lsSet(K.sessions, JSON.stringify(out));
}

// ---------- 목표 ----------
function loadGoal() {
  try { const g = JSON.parse(lsGet(K.goal) || 'null'); return g && g.target ? g : { ...DEFAULT_GOAL }; }
  catch { return { ...DEFAULT_GOAL }; }
}
function saveGoal(g) { lsSet(K.goal, JSON.stringify(g)); }

// ---------- 오디오 ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function beep() {
  if (!state.soundOn || !audioCtx) return;
  const now = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    const t0 = now + i * 0.42;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.28, t0 + 0.04);
    gain.gain.linearRampToValueAtTime(0, t0 + 0.24);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + 0.3);
  }
}

// ---------- 타이머 코어 ----------
function currentElapsed() { return state.baseElapsed + (Date.now() - state.startedAt) / 1000; }

function currentLabel() {
  const el = document.getElementById('sessionLabel');
  return el ? el.value.trim().slice(0, 40) : '';
}

function persistRunning() {
  lsSet(K.running, JSON.stringify({
    duration: state.duration, baseElapsed: state.baseElapsed, startedAt: state.startedAt,
    presetId: state.presetId, kind: state.kind, distractions: state.distractions, label: currentLabel(),
  }));
}

function start() {
  if (state.duration <= 0 || state.status === 'running') return;
  ensureAudio();
  if (state.status === 'completed' || state.elapsed >= state.duration) { state.elapsed = 0; state.distractions = 0; }
  state.status = 'running';
  state.baseElapsed = state.elapsed;
  state.startedAt = Date.now();
  state.timer = setInterval(tick, 200);
  persistRunning();
  render();
}
function pause() {
  if (state.status !== 'running') return;
  clearInterval(state.timer); state.timer = null;
  state.elapsed = currentElapsed();
  state.status = 'paused';
  lsDel(K.running);
  render();
}
function reset() {
  clearInterval(state.timer); state.timer = null;
  state.status = 'idle';
  state.elapsed = 0; state.baseElapsed = 0; state.distractions = 0;
  lsDel(K.running);
  render();
}
function addMinute() {
  state.duration = Math.min(MAX_DURATION, state.duration + 60);
  if (state.status === 'completed') { state.status = 'idle'; state.elapsed = 0; }
  if (state.status === 'running') persistRunning();
  lsSet(K.duration, String(state.duration));
  render();
}
function logDistraction() {
  if (state.status !== 'running' && state.status !== 'paused') return;
  state.distractions += 1;
  if (state.status === 'running') persistRunning();
  render();
}
function tick() {
  state.elapsed = currentElapsed();
  if (state.elapsed >= state.duration) { state.elapsed = state.duration; complete(); return; }
  render();
}
function complete() {
  clearInterval(state.timer); state.timer = null;
  state.status = 'completed';
  lsDel(K.running);
  recordSession();
  beep(); notify(); render(); suggestNext();
}

// 완료된 집중 세션을 로그에 기록(휴식은 제외).
function recordSession() {
  if (state.kind !== 'focus') return;
  const start = state.startedAt || (Date.now() - state.duration * 1000);
  const sessions = loadSessions();
  sessions.push({
    id: `${Date.now()}-${Math.round(state.duration)}`,
    date: dateKey(Date.now()),
    start,
    dur: Math.round(state.duration),
    label: currentLabel(),
    distractions: state.distractions || 0,
  });
  saveSessions(sessions);
  renderStats();
}

// ---------- 프리셋 / 사용자 지정 ----------
function applyPreset(preset) {
  if (state.status === 'running') return;
  state.presetId = preset.id; state.kind = preset.kind; state.duration = preset.min * 60;
  state.elapsed = 0; state.baseElapsed = 0; state.status = 'idle'; state.distractions = 0;
  lsSet(K.duration, String(state.duration)); lsSet(K.preset, preset.id);
  clearCustomError(); render();
}
function applyCustom() {
  if (state.status === 'running') return;
  const min = document.getElementById('inputMin').value;
  const sec = document.getElementById('inputSec').value;
  if (min === '' && sec === '') return;
  const total = validateDuration(parseDuration(min, sec));
  if (total === null) { showCustomError('Enter a time between 1 second and 24 hours.'); return; }
  clearCustomError();
  state.presetId = 'custom'; state.kind = 'focus'; state.duration = total;
  state.elapsed = 0; state.baseElapsed = 0; state.status = 'idle'; state.distractions = 0;
  lsSet(K.duration, String(total)); lsSet(K.preset, 'custom'); render();
}
function showCustomError(msg) { const el = document.getElementById('customError'); if (el) { el.textContent = msg; el.hidden = false; } }
function clearCustomError() { const el = document.getElementById('customError'); if (el) { el.textContent = ''; el.hidden = true; } }

// ---------- 브라우저 알림 ----------
function refreshNotifyButton() {
  const btn = document.getElementById('notifyBtn');
  if (!btn) return;
  if (!('Notification' in window)) { btn.hidden = true; return; }
  if (Notification.permission === 'granted') { btn.hidden = true; return; }
  btn.hidden = false;
  btn.textContent = Notification.permission === 'denied' ? 'Notifications blocked' : 'Enable notifications';
  btn.disabled = Notification.permission === 'denied';
}
function requestNotify() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(() => { refreshNotifyButton(); showToast('Notification preference updated.'); });
}
function notify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try {
    new Notification("Today's Focus", {
      body: state.kind === 'focus' ? 'Focus block done. Take a short break?' : 'Break over. Ready to focus again?',
    });
  } catch { /* ignore */ }
}

// ---------- next timer suggestion ----------
function suggestNext() {
  const next = state.kind === 'focus'
    ? { preset: PRESETS.find(p => p.id === 'shortBreak'), label: 'Start 5-min break' }
    : { preset: PRESETS.find(p => p.id === 'pomodoro'), label: 'Start 25-min focus' };
  const msg = state.kind === 'focus' ? 'Nice work! Take a short break?' : 'Break done! Ready to focus?';
  showToast(msg, next.label, () => { applyPreset(next.preset); start(); });
  if (state.autoStart) { applyPreset(next.preset); start(); }
}

// ---------- 렌더링 ----------
function setRing(p) { const r = document.getElementById('ring'); if (r) r.style.setProperty('--progress', Math.max(0, Math.min(1, p))); }

function render() {
  const remaining = Math.max(0, state.duration - state.elapsed);
  const timeStr = formatTime(Math.ceil(remaining));
  document.getElementById('display').textContent = timeStr;
  setRing(state.duration > 0 ? remaining / state.duration : 0);

  const panel = document.getElementById('timerPanel');
  const pill = document.getElementById('modePill');
  const isBreak = state.kind === 'break';
  panel.classList.toggle('is-break', isBreak);
  const preset = PRESETS.find(p => p.id === state.presetId);
  const label = state.presetId === 'custom' ? 'Custom' : isBreak ? 'Break' : 'Focus';
  pill.textContent = (preset ? preset.icon + ' ' : '') + label;

  const note = document.getElementById('displayNote');
  if (state.status === 'completed') note.textContent = isBreak ? 'Break done · focus again' : 'Focus complete';
  else if (state.status === 'running') note.textContent = isBreak ? 'On break' : 'Focusing';
  else if (state.status === 'paused') note.textContent = 'Paused';
  else note.textContent = isBreak ? 'Break ready' : 'Ready to focus';

  const startBtn = document.getElementById('startBtn');
  startBtn.textContent = state.status === 'running' ? 'Pause'
    : state.status === 'paused' ? 'Resume'
    : state.status === 'completed' ? 'Restart' : 'Start';
  startBtn.setAttribute('aria-label', startBtn.textContent);

  document.querySelectorAll('.preset-card').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.preset === state.presetId)));
  panel.classList.toggle('is-completed', state.status === 'completed');

  // 방해 컨트롤: 집중 세션이 진행/일시정지 중일 때만 노출
  const dWrap = document.getElementById('distractWrap');
  if (dWrap) {
    const show = (state.status === 'running' || state.status === 'paused') && state.kind === 'focus';
    dWrap.hidden = !show;
    const c = document.getElementById('distractCount');
    if (c) c.textContent = String(state.distractions);
  }

  document.title = (state.status === 'running' || state.status === 'paused')
    ? `${timeStr} · Today's Focus` : "Today's Focus — Pomodoro & Productivity Timer";
}

function renderStats() {
  const sessions = loadSessions();
  const now = Date.now();
  const today = daySummary(sessions, dateKey(now));
  const goal = loadGoal();
  const gp = goalProgress(today, goal);
  const streak = computeStreak(sessions, now, goal);

  setText('statSessions', String(today.sessions));
  setText('statTime', hz(today.seconds));
  setText('statDistract', String(today.distractions));
  setText('statStreak', String(streak));
  setText('heroSessions', String(today.sessions));
  setText('heroTime', hz(today.seconds));
  setText('heroStreak', String(streak));

  const unit = gp.type === 'minutes' ? 'min' : 'sessions';
  setText('goalText', `${gp.current} / ${gp.target} ${unit}${gp.met ? ' · done' : ''}`);
  const bar = document.getElementById('goalBar');
  if (bar) { bar.style.width = `${Math.round(gp.ratio * 100)}%`; bar.classList.toggle('done', gp.met); }
  const gt = document.getElementById('goalType'); if (gt) gt.value = goal.type;
  const gi = document.getElementById('goalTarget'); if (gi && document.activeElement !== gi) gi.value = String(goal.target);

  // 최근 7일 차트
  const chart = document.getElementById('weekChart');
  if (chart) {
    const week = dailySeries(sessions, now, 7);
    const max = Math.max(1, ...week.map(d => d.seconds));
    const todayKey = dateKey(now);
    chart.innerHTML = '';
    week.forEach(d => {
      const col = document.createElement('div');
      col.className = 'bar-col';
      const mins = Math.round(d.seconds / 60);
      const wd = WEEKDAYS[new Date(d.key.split('-')[0], d.key.split('-')[1] - 1, d.key.split('-')[2]).getDay()];
      const h = Math.round((d.seconds / max) * 100);
      col.innerHTML =
        `<span class="bar-val">${mins > 0 ? mins : ''}</span>` +
        `<div class="bar${d.key === todayKey ? ' today' : ''}" style="height:${d.seconds > 0 ? Math.max(6, h) : 2}%"></div>` +
        `<span class="bar-label">${wd}</span>`;
      col.title = `${d.key} · ${d.sessions} sessions · ${hz(d.seconds)} · ${d.distractions} distractions`;
      chart.appendChild(col);
    });
  }

  const recent = document.getElementById('recentSessions');
  if (recent) {
    const last = sessions.slice(-5).reverse();
    if (!last.length) {
      recent.innerHTML = '<li class="recent-empty">No completed sessions yet. Start the timer above.</li>';
    } else {
      recent.innerHTML = last.map(s => {
        const t = new Date(s.start);
        const hh = String(t.getHours()).padStart(2, '0');
        const mm = String(t.getMinutes()).padStart(2, '0');
        const lbl = (s.label && s.label.trim()) || 'No label';
        const dis = s.distractions ? ` · ${s.distractions} distractions` : '';
        return `<li><span class="rs-label">${escapeHtml(lbl)}</span><span class="rs-meta">${s.date} ${hh}:${mm} · ${hz(s.dur)}${dis}</span></li>`;
      }).join('');
    }
  }
}
function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- 토스트 ----------
let toastTimer;
function showToast(msg, actionLabel, onAction) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg));
  if (actionLabel && onAction) {
    const b = document.createElement('button');
    b.className = 'toast-action'; b.type = 'button'; b.textContent = actionLabel;
    b.addEventListener('click', () => { hideToast(); onAction(); });
    el.appendChild(b);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 8000 : 3000);
}
function hideToast() { const el = document.getElementById('toast'); if (el) el.classList.remove('show'); }

// ---------- 데이터 초기화 ----------
function resetData() {
  if (!window.confirm('Clear all session history and stats? This cannot be undone.')) return;
  lsDel(K.stats); lsSet(K.sessions, '[]');
  renderStats();
  showToast('Focus history cleared.');
}

// ---------- handlers ----------
function onStart() {
  markOnboarded();
  ensureAudio();
  if (state.status === 'running') pause();
  else start();
}
function onKeydown(e) {
  const tag = (e.target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); onStart(); }
  else if (e.key === 'r' || e.key === 'R') reset();
  else if (e.key === 'd' || e.key === 'D') logDistraction();
}
function onVisibility() {
  if (state.status === 'running') {
    state.elapsed = currentElapsed();
    if (state.elapsed >= state.duration) { state.elapsed = state.duration; complete(); } else render();
  }
}

// ---------- 진행 중 타이머 복구 ----------
function restoreRunning() {
  let snap;
  try { snap = JSON.parse(lsGet(K.running) || 'null'); } catch { snap = null; }
  if (!snap || typeof snap.duration !== 'number') return false;
  state.duration = snap.duration;
  state.presetId = snap.presetId || 'custom';
  state.kind = snap.kind === 'break' ? 'break' : 'focus';
  state.distractions = Number(snap.distractions) || 0;
  const labelEl = document.getElementById('sessionLabel');
  if (labelEl && snap.label) labelEl.value = snap.label;
  const elapsedNow = snap.baseElapsed + (Date.now() - snap.startedAt) / 1000;
  if (elapsedNow >= snap.duration) {
    state.elapsed = snap.duration; state.baseElapsed = snap.duration; state.startedAt = snap.startedAt;
    state.status = 'completed';
    lsDel(K.running); recordSession(); render();
    showToast('Your timer finished while you were away.');
    return true;
  }
  state.baseElapsed = snap.baseElapsed; state.startedAt = snap.startedAt; state.elapsed = elapsedNow;
  state.status = 'running';
  state.timer = setInterval(tick, 200);
  render();
  return true;
}

// ---------- 초기화 ----------
function buildPresetCards() {
  const grid = document.getElementById('presetGrid');
  if (!grid) return;
  grid.innerHTML = '';
  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'preset-card'; btn.dataset.preset = p.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Select ${PRESET_NAMES[p.id]} ${p.min} minute timer`);
    btn.innerHTML =
      `<span class="icon" aria-hidden="true">${p.icon}</span>` +
      `<span class="name">${PRESET_NAMES[p.id]}</span>` +
      `<span class="time">${p.min} min</span>` +
      `<span class="badge${p.kind === 'break' ? ' break' : ''}">${p.kind === 'break' ? 'Break' : 'Focus'}</span>`;
    btn.addEventListener('click', () => applyPreset(p));
    grid.appendChild(btn);
  });
}

function init() {
  state.soundOn = lsGet(K.sound) !== '0';
  state.autoStart = lsGet(K.autostart) === '1';
  migrateLegacyStats();

  buildPresetCards();

  const soundToggle = document.getElementById('soundToggle');
  const autoToggle = document.getElementById('autoStartToggle');
  if (soundToggle) { soundToggle.checked = state.soundOn; soundToggle.addEventListener('change', () => { state.soundOn = soundToggle.checked; lsSet(K.sound, state.soundOn ? '1' : '0'); if (state.soundOn) ensureAudio(); }); }
  if (autoToggle) { autoToggle.checked = state.autoStart; autoToggle.addEventListener('change', () => { state.autoStart = autoToggle.checked; lsSet(K.autostart, state.autoStart ? '1' : '0'); }); }

  document.getElementById('startBtn').addEventListener('click', onStart);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('addMinBtn').addEventListener('click', addMinute);
  document.getElementById('inputMin').addEventListener('input', applyCustom);
  document.getElementById('inputSec').addEventListener('input', applyCustom);
  const distractBtn = document.getElementById('distractBtn');
  if (distractBtn) distractBtn.addEventListener('click', logDistraction);
  const notifyBtn = document.getElementById('notifyBtn');
  if (notifyBtn) notifyBtn.addEventListener('click', requestNotify);
  const resetDataBtn = document.getElementById('resetDataBtn');
  if (resetDataBtn) resetDataBtn.addEventListener('click', resetData);
  const tipsAgainBtn = document.getElementById('tipsAgainBtn');
  if (tipsAgainBtn) tipsAgainBtn.addEventListener('click', showTipsAgain);

  const goalType = document.getElementById('goalType');
  const goalTarget = document.getElementById('goalTarget');
  const commitGoal = () => {
    const g = loadGoal();
    if (goalType) g.type = goalType.value === 'minutes' ? 'minutes' : 'sessions';
    if (goalTarget) { const n = parseInt(goalTarget.value, 10); g.target = Number.isFinite(n) && n > 0 ? Math.min(n, 999) : DEFAULT_GOAL.target; }
    saveGoal(g); renderStats();
  };
  if (goalType) goalType.addEventListener('change', commitGoal);
  if (goalTarget) goalTarget.addEventListener('change', commitGoal);

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibility);

  refreshNotifyButton();
  renderStats();

  if (!restoreRunning()) {
    const savedPreset = lsGet(K.preset);
    const preset = PRESETS.find(p => p.id === savedPreset);
    if (preset) { state.presetId = preset.id; state.kind = preset.kind; state.duration = preset.min * 60; }
    else {
      const savedDur = validateDuration(parseInt(lsGet(K.duration) || '', 10));
      if (savedDur) { state.duration = savedDur; state.presetId = savedPreset === 'custom' ? 'custom' : 'pomodoro'; }
    }
    render();
  }

  // Defer tips so the timer paints first.
  requestAnimationFrame(() => startOnboarding());
}

init();
