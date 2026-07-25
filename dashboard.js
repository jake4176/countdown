// 인사이트 대시보드 — ft.sessions 로그를 읽어 파생 지표를 시각화.
// 순수 집계는 core.js에 위임하고, 여기서는 DOM 렌더링만 담당한다.
import {
  dateKey, humanizeSeconds, daySummary, dailySeries, labelBreakdown,
  distractionByWeekday, totals, goalProgress, computeStreak, DEFAULT_GOAL, NO_LABEL,
} from './core.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function loadSessions() {
  try { const a = JSON.parse(lsGet('ft.sessions') || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}
function loadGoal() {
  try { const g = JSON.parse(lsGet('ft.goal') || 'null'); return g && g.target ? g : { ...DEFAULT_GOAL }; }
  catch { return { ...DEFAULT_GOAL }; }
}
function setText(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function weekdayLabel(key) { const [y, m, d] = key.split('-').map(Number); return WEEKDAYS[new Date(y, m - 1, d).getDay()]; }

function render() {
  const sessions = loadSessions();
  const now = Date.now();
  const empty = document.getElementById('dEmpty');
  const content = document.getElementById('dContent');

  if (!sessions.length) {
    if (empty) empty.hidden = false;
    if (content) content.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;
  if (content) content.hidden = false;

  // 개요 타일
  const today = daySummary(sessions, dateKey(now));
  const all = totals(sessions);
  const goal = loadGoal();
  const gp = goalProgress(today, goal);
  const streak = computeStreak(sessions, now, goal);
  setText('dTodaySessions', `${today.sessions}회`);
  setText('dTodayTime', humanizeSeconds(today.seconds));
  setText('dTodayDistract', `${today.distractions}회`);
  setText('dStreak', `${streak}일`);
  setText('dTotalSessions', `${all.sessions}회`);
  setText('dTotalTime', humanizeSeconds(all.seconds));

  // 오늘 목표
  const unit = gp.type === 'minutes' ? '분' : '회';
  setText('dGoalText', `${gp.current} / ${gp.target}${unit}${gp.met ? ' · 달성 🎉' : ''}`);
  const gbar = document.getElementById('dGoalBar');
  if (gbar) { gbar.style.width = `${Math.round(gp.ratio * 100)}%`; gbar.classList.toggle('done', gp.met); }

  // 14일 추세
  const trend = document.getElementById('dTrend');
  if (trend) {
    const days = dailySeries(sessions, now, 14);
    const max = Math.max(1, ...days.map(d => d.seconds));
    const todayKey = dateKey(now);
    trend.innerHTML = days.map(d => {
      const mins = Math.round(d.seconds / 60);
      const h = d.seconds > 0 ? Math.max(6, Math.round((d.seconds / max) * 100)) : 2;
      return `<div class="bar-col"><span class="bar-val">${mins > 0 ? mins : ''}</span>` +
        `<div class="bar${d.key === todayKey ? ' today' : ''}" style="height:${h}%" title="${d.key} · ${d.sessions}회 · ${humanizeSeconds(d.seconds)}"></div>` +
        `<span class="bar-label">${weekdayLabel(d.key)}</span></div>`;
    }).join('');
  }

  // 라벨별 집중 시간 (상위 8)
  const labelsEl = document.getElementById('dLabels');
  if (labelsEl) {
    const rows = labelBreakdown(sessions).slice(0, 8);
    const max = Math.max(1, ...rows.map(r => r.seconds));
    labelsEl.innerHTML = rows.map(r =>
      `<div class="hbar-row"><span class="hbar-label" title="${escapeHtml(r.label)}">${escapeHtml(r.label)}</span>` +
      `<span class="hbar-track"><span class="hbar-fill" style="width:${Math.max(3, Math.round(r.seconds / max * 100))}%"></span></span>` +
      `<span class="hbar-val">${humanizeSeconds(r.seconds)}</span></div>`
    ).join('');
  }

  // 요일별 방해
  const wdEl = document.getElementById('dWeekday');
  if (wdEl) {
    const wd = distractionByWeekday(sessions);
    const max = Math.max(1, ...wd.map(x => x.distractions));
    wdEl.innerHTML = wd.map((x, i) =>
      `<div class="hbar-row"><span class="hbar-label">${WEEKDAYS[i]}요일</span>` +
      `<span class="hbar-track"><span class="hbar-fill warn" style="width:${x.distractions > 0 ? Math.max(3, Math.round(x.distractions / max * 100)) : 0}%"></span></span>` +
      `<span class="hbar-val">${x.distractions}회 / ${x.sessions}세션</span></div>`
    ).join('');
  }

  // 세션 히스토리 (최근 20)
  const hist = document.getElementById('dHistoryBody');
  if (hist) {
    const rows = sessions.slice(-20).reverse();
    hist.innerHTML = rows.map(s => {
      const t = new Date(s.start);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      const lbl = (s.label && s.label.trim()) || NO_LABEL;
      return `<tr><th scope="row">${s.date} ${hh}:${mm}</th><td>${escapeHtml(lbl)}</td>` +
        `<td class="num">${humanizeSeconds(s.dur)}</td><td class="num">${s.distractions || 0}</td></tr>`;
    }).join('');
  }
}

function exportData() {
  const payload = { exportedAt: new Date().toISOString(), goal: loadGoal(), sessions: loadSessions() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `focus-sessions-${dateKey(Date.now())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function resetData() {
  if (!window.confirm('모든 집중 기록(세션 로그)을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
  try { localStorage.setItem('ft.sessions', '[]'); localStorage.removeItem('ft.stats'); } catch { /* 무시 */ }
  render();
}

function init() {
  const ex = document.getElementById('dExport');
  const rs = document.getElementById('dReset');
  if (ex) ex.addEventListener('click', exportData);
  if (rs) rs.addEventListener('click', resetData);
  render();
}
init();
