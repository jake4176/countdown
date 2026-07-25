// calc.js — 계산기용 순수 로직. DOM/브라우저 전역에 의존하지 않으며 테스트 대상이다.

// 집중 시간(분)을 채우는 데 필요한 포모도로 수와 휴식·총 소요 시간을 계산.
export function pomodoroPlan(focusMinutes, opts = {}) {
  const work = opts.work > 0 ? opts.work : 25;
  const shortBreak = opts.shortBreak >= 0 ? opts.shortBreak : 5;
  const longBreak = opts.longBreak >= 0 ? opts.longBreak : 15;
  const longEvery = opts.longEvery > 0 ? opts.longEvery : 4;
  const focus = Math.floor(Number(focusMinutes) || 0);
  if (focus <= 0) return { pomodoros: 0, shortBreaks: 0, longBreaks: 0, focusMin: 0, breakMin: 0, totalMin: 0 };
  const n = Math.ceil(focus / work);
  const betweenBreaks = n - 1; // 마지막 뒤에는 휴식 없음
  const longBreaks = Math.floor(betweenBreaks / longEvery);
  const shortBreaks = betweenBreaks - longBreaks;
  const focusMin = n * work;
  const breakMin = shortBreaks * shortBreak + longBreaks * longBreak;
  return { pomodoros: n, shortBreaks, longBreaks, focusMin, breakMin, totalMin: focusMin + breakMin };
}

// 총 학습 시간(분)을 세션 길이로 나눠 세션 수·휴식 포함 총 소요 시간을 계산.
export function sessionsPlan(totalMinutes, sessionMin, breakMin) {
  const total = Math.floor(Number(totalMinutes) || 0);
  const s = Math.floor(Number(sessionMin) || 0);
  const b = Math.max(0, Math.floor(Number(breakMin) || 0));
  if (total <= 0 || s <= 0) return { sessions: 0, focusMin: 0, breakMin: 0, totalMin: 0 };
  const sessions = Math.ceil(total / s);
  const focusMin = sessions * s;
  const breakTotal = (sessions - 1) * b;
  return { sessions, focusMin, breakMin: breakTotal, totalMin: focusMin + breakTotal };
}

// 총 시간(분)을 하루 가용 시간(분)으로 나눈 소요 일수.
export function daysNeeded(totalMinutes, dailyMinutes) {
  const total = Math.floor(Number(totalMinutes) || 0);
  const daily = Math.floor(Number(dailyMinutes) || 0);
  if (total <= 0 || daily <= 0) return 0;
  return Math.ceil(total / daily);
}

// 작업 세션 스케줄. 시작 시각(자정 기준 분)부터 세션·휴식 블록을 나열.
export function buildSchedule(startMin, sessions, sessionMin, breakMin, opts = {}) {
  const longEvery = opts.longEvery > 0 ? opts.longEvery : 0;
  const longBreakMin = opts.longBreakMin >= 0 ? opts.longBreakMin : 0;
  const n = Math.floor(Number(sessions) || 0);
  const sLen = Math.floor(Number(sessionMin) || 0);
  const bLen = Math.max(0, Math.floor(Number(breakMin) || 0));
  const blocks = [];
  let t = Math.floor(Number(startMin) || 0);
  if (n <= 0 || sLen <= 0) return { blocks, endMin: t };
  for (let s = 1; s <= n; s++) {
    blocks.push({ type: 'focus', idx: s, start: t, end: t + sLen });
    t += sLen;
    if (s < n) {
      const isLong = longEvery > 0 && s % longEvery === 0;
      const len = isLong ? longBreakMin : bLen;
      if (len > 0) { blocks.push({ type: 'break', long: isLong, start: t, end: t + len }); t += len; }
    }
  }
  return { blocks, endMin: t };
}

// 자정 기준 분 → 'HH:MM' (+Nd for 다음 날). 순수·테스트 가능.
export function clockLabel(min) {
  const m = Math.floor(Number(min) || 0);
  const dayOffset = Math.floor(m / 1440);
  const within = ((m % 1440) + 1440) % 1440;
  const hh = String(Math.floor(within / 60)).padStart(2, '0');
  const mm = String(within % 60).padStart(2, '0');
  return dayOffset > 0 ? `${hh}:${mm} (+${dayOffset}d)` : `${hh}:${mm}`;
}

// 'HH:MM' → 자정 기준 분. 잘못된 값은 null.
export function parseClock(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

// 목표 시각까지 남은 시간. past=이미 지남.
export function timeUntil(targetMs, nowMs) {
  const diff = Number(targetMs) - Number(nowMs);
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const totalSec = Math.floor(abs / 1000);
  return {
    past,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalDays: Math.ceil(abs / 86400000),
  };
}

// 프로젝트 소요 추정: 총 시간(h), 하루 작업 시간(h), 주당 작업일 → 작업일수·주수.
export function projectEstimate(totalHours, hoursPerDay, daysPerWeek) {
  const total = Number(totalHours) || 0;
  const perDay = Number(hoursPerDay) || 0;
  const perWeek = Math.min(7, Math.max(1, Math.floor(Number(daysPerWeek) || 5)));
  if (total <= 0 || perDay <= 0) return { workDays: 0, weeks: 0, perWeek };
  const workDays = Math.ceil(total / perDay);
  const weeks = Math.ceil(workDays / perWeek);
  return { workDays, weeks, perWeek };
}
