// calculators.js — 계산기 페이지 DOM 연결. 순수 계산은 calc.js에 위임.
// 각 계산기는 루트 요소가 있을 때만 동작하므로, 한 파일로 모든 계산기 페이지를 커버한다.
import {
  pomodoroPlan, sessionsPlan, daysNeeded, buildSchedule, clockLabel, parseClock, timeUntil, projectEstimate,
} from './calc.js';
import { humanizeSeconds } from './core.js';

const $ = id => document.getElementById(id);
const num = id => { const el = $(id); const v = parseInt(el && el.value, 10); return Number.isFinite(v) ? v : 0; };
const hm = m => humanizeSeconds(Math.max(0, Math.round(m)) * 60);
function tiles(list) {
  return '<div class="stats-grid">' + list.map(t =>
    `<div class="stat-tile"><b>${t.v}</b><span>${t.l}</span></div>`).join('') + '</div>';
}
function bindInputs(ids, fn) {
  ids.forEach(id => { const el = $(id); if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); } });
  fn();
}

// ---------- 1. 포모도로 계산기 ----------
function initPomodoro() {
  if (!$('calc-pomodoro')) return;
  const render = () => {
    const focus = num('pc-hours') * 60 + num('pc-minutes');
    const r = pomodoroPlan(focus, { work: num('pc-work') || 25, shortBreak: num('pc-break') >= 0 ? num('pc-break') : 5 });
    if (r.pomodoros === 0) { $('pc-result').innerHTML = '<p class="calc-hint">집중할 시간을 입력하면 필요한 포모도로 수가 계산됩니다.</p>'; return; }
    $('pc-result').innerHTML = tiles([
      { v: `${r.pomodoros}회`, l: '필요한 포모도로' },
      { v: `${r.shortBreaks + r.longBreaks}회`, l: `휴식 (짧게 ${r.shortBreaks} · 길게 ${r.longBreaks})` },
      { v: hm(r.totalMin), l: '휴식 포함 총 소요' },
    ]) + `<p class="calc-note">집중 ${hm(r.focusMin)} + 휴식 ${hm(r.breakMin)} 기준입니다. 4회마다 긴 휴식을 포함합니다.</p>`;
  };
  bindInputs(['pc-hours', 'pc-minutes', 'pc-work', 'pc-break'], render);
}

// ---------- 2. 공부 시간 계산기 ----------
function initStudy() {
  if (!$('calc-study')) return;
  const render = () => {
    const total = num('sc-hours') * 60 + num('sc-minutes');
    const r = sessionsPlan(total, num('sc-session') || 30, num('sc-break') >= 0 ? num('sc-break') : 5);
    if (r.sessions === 0) { $('sc-result').innerHTML = '<p class="calc-hint">공부할 총 시간을 입력하면 세션 수가 계산됩니다.</p>'; return; }
    const dailyMin = num('sc-daily') * 60;
    const days = daysNeeded(total, dailyMin);
    const list = [
      { v: `${r.sessions}회`, l: `공부 세션 (${num('sc-session') || 30}분)` },
      { v: hm(r.totalMin), l: '휴식 포함 총 소요' },
    ];
    if (days > 0) list.push({ v: `${days}일`, l: `하루 ${num('sc-daily')}시간 기준` });
    $('sc-result').innerHTML = tiles(list);
  };
  bindInputs(['sc-hours', 'sc-minutes', 'sc-session', 'sc-break', 'sc-daily'], render);
}

// ---------- 3. 작업 세션 플래너 ----------
function initWorkSession() {
  if (!$('calc-worksession')) return;
  const render = () => {
    const start = parseClock($('wc-start').value) ?? 9 * 60;
    const sessions = num('wc-sessions') || 0;
    const sLen = num('wc-session') || 0;
    const bLen = num('wc-break') >= 0 ? num('wc-break') : 0;
    const longEvery = num('wc-longevery') || 0;
    const { blocks, endMin } = buildSchedule(start, sessions, sLen, bLen, { longEvery, longBreakMin: num('wc-longbreak') || 0 });
    if (!blocks.length) { $('wc-result').innerHTML = '<p class="calc-hint">세션 수와 길이를 입력하면 일정표가 만들어집니다.</p>'; return; }
    const rows = blocks.map(b => {
      const label = b.type === 'focus' ? `집중 ${b.idx}` : (b.long ? '긴 휴식' : '휴식');
      return `<tr><th scope="row">${clockLabel(b.start)}–${clockLabel(b.end)}</th><td>${label}</td><td class="num">${b.end - b.start}분</td></tr>`;
    }).join('');
    const focusCount = blocks.filter(b => b.type === 'focus').length;
    $('wc-result').innerHTML =
      tiles([
        { v: `${focusCount}회`, l: '집중 세션' },
        { v: clockLabel(endMin), l: '종료 시각' },
        { v: hm(endMin - start), l: '총 소요' },
      ]) +
      '<div class="table-scroll" style="margin-top:1rem"><table class="compare"><caption>세션 일정표</caption>' +
      '<thead><tr><th scope="col">시간</th><th scope="col">구간</th><th scope="col" class="num">길이</th></tr></thead>' +
      `<tbody>${rows}</tbody></table></div>`;
  };
  bindInputs(['wc-start', 'wc-sessions', 'wc-session', 'wc-break', 'wc-longevery', 'wc-longbreak'], render);
}

// ---------- 4. 시험 카운트다운 ----------
let examTimer = null;
function initExam() {
  if (!$('calc-exam')) return;
  const dateEl = $('ec-date'), timeEl = $('ec-time');
  try {
    const sd = localStorage.getItem('ft.examDate'); if (sd && dateEl) dateEl.value = sd;
    const st = localStorage.getItem('ft.examTime'); if (st && timeEl) timeEl.value = st;
  } catch { /* 무시 */ }

  const render = () => {
    const dateStr = dateEl.value;
    const timeStr = timeEl.value || '09:00';
    if (!dateStr) { $('ec-result').innerHTML = '<p class="calc-hint">시험 날짜를 선택하면 남은 시간이 실시간으로 표시됩니다.</p>'; return; }
    try { localStorage.setItem('ft.examDate', dateStr); localStorage.setItem('ft.examTime', timeStr); } catch { /* 무시 */ }
    const target = new Date(`${dateStr}T${timeStr}:00`).getTime();
    if (!Number.isFinite(target)) { $('ec-result').innerHTML = '<p class="calc-hint">날짜 형식을 확인해 주세요.</p>'; return; }
    const t = timeUntil(target, Date.now());
    if (t.past) {
      $('ec-result').innerHTML = tiles([{ v: '완료', l: '시험일이 지났습니다' }]) + '<p class="calc-note">수고하셨어요. 새로운 목표 날짜를 설정해 보세요.</p>';
      return;
    }
    const daily = num('ec-daily');
    const list = [
      { v: `${t.days}일`, l: '남은 날짜' },
      { v: `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`, l: '오늘 남은 시간' },
    ];
    if (daily > 0) list.push({ v: `${t.days * daily}회`, l: `하루 ${daily}세션 시 남은 세션` });
    $('ec-result').innerHTML = tiles(list) + `<p class="calc-note">목표: ${dateStr} ${timeStr}. 남은 시간을 세션으로 나눠 계획해 보세요.</p>`;
  };

  ['ec-date', 'ec-time', 'ec-daily'].forEach(id => { const el = $(id); if (el) { el.addEventListener('input', render); el.addEventListener('change', render); } });
  render();
  if (examTimer) clearInterval(examTimer);
  examTimer = setInterval(render, 1000);
}

// ---------- 5. 프로젝트 시간 계산기 ----------
function initProject() {
  if (!$('calc-project')) return;
  const render = () => {
    const total = num('prc-hours');
    const perDay = num('prc-perday');
    const perWeek = num('prc-perweek') || 5;
    const r = projectEstimate(total, perDay, perWeek);
    if (r.workDays === 0) { $('prc-result').innerHTML = '<p class="calc-hint">전체 시간과 하루 작업 시간을 입력하면 완료 시점을 추정합니다.</p>'; return; }
    // 완료 예상일: 오늘부터 주당 perWeek일 작업 가정하여 달력일 환산
    const fullWeeks = Math.floor(r.workDays / r.perWeek);
    const remDays = r.workDays % r.perWeek;
    const calendarDays = fullWeeks * 7 + remDays;
    const finish = new Date(Date.now() + calendarDays * 86400000);
    const pad = n => String(n).padStart(2, '0');
    const finishStr = `${finish.getFullYear()}-${pad(finish.getMonth() + 1)}-${pad(finish.getDate())}`;
    $('prc-result').innerHTML = tiles([
      { v: `${r.workDays}일`, l: `작업일 (하루 ${perDay}시간)` },
      { v: `${r.weeks}주`, l: `주당 ${r.perWeek}일 기준` },
      { v: finishStr, l: '완료 예상일(대략)' },
    ]) + '<p class="calc-note">완료 예상일은 주말·휴일을 단순 반영한 대략치입니다.</p>';
  };
  bindInputs(['prc-hours', 'prc-perday', 'prc-perweek'], render);
}

initPomodoro();
initStudy();
initWorkSession();
initExam();
initProject();
