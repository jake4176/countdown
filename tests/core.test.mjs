import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakdownTime, formatTime, parseDuration, pomodoroNextPhase, pomodoroDuration, pomodoroAdvanceState, POMODORO,
  PRESETS, validateDuration, MIN_DURATION, MAX_DURATION, dateKey, addSession, last7Days, humanizeSeconds,
  weekdayOf, daySummary, dailySeries, labelBreakdown, distractionByWeekday, totals, goalProgress, computeStreak,
  DEFAULT_GOAL, NO_LABEL } from '../core.js';

test('breakdownTime splits seconds into h/m/s', () => {
  assert.deepEqual(breakdownTime(3661), { h: 1, m: 1, s: 1 });
  assert.deepEqual(breakdownTime(65), { h: 0, m: 1, s: 5 });
  assert.deepEqual(breakdownTime(0), { h: 0, m: 0, s: 0 });
  assert.deepEqual(breakdownTime(-10), { h: 0, m: 0, s: 0 });
});

test('formatTime MM:SS under an hour', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(599), '09:59');
});

test('formatTime HH:MM:SS at/over an hour', () => {
  assert.equal(formatTime(3600), '01:00:00');
  assert.equal(formatTime(3661), '01:01:01');
});

test('parseDuration combines minutes and seconds', () => {
  assert.equal(parseDuration(25, 0), 1500);
  assert.equal(parseDuration(1, 30), 90);
  assert.equal(parseDuration('', ''), 0);
  assert.equal(parseDuration(-5, -10), 0);
});

test('POMODORO config has expected durations', () => {
  assert.equal(POMODORO.work, 25 * 60);
  assert.equal(POMODORO.shortBreak, 5 * 60);
  assert.equal(POMODORO.longBreak, 15 * 60);
  assert.equal(POMODORO.longBreakEvery, 4);
});

test('pomodoroDuration returns seconds per phase', () => {
  assert.equal(pomodoroDuration('work'), 25 * 60);
  assert.equal(pomodoroDuration('short-break'), 5 * 60);
  assert.equal(pomodoroDuration('long-break'), 15 * 60);
});

test('pomodoroNextPhase: work -> short break until 4th work', () => {
  assert.equal(pomodoroNextPhase('work', 1), 'short-break');
  assert.equal(pomodoroNextPhase('work', 2), 'short-break');
  assert.equal(pomodoroNextPhase('work', 3), 'short-break');
  assert.equal(pomodoroNextPhase('work', 4), 'long-break');
  assert.equal(pomodoroNextPhase('work', 8), 'long-break');
});

test('pomodoroNextPhase: any break -> work', () => {
  assert.equal(pomodoroNextPhase('short-break', 1), 'work');
  assert.equal(pomodoroNextPhase('long-break', 4), 'work');
});

test('pomodoroAdvanceState walks a full work/break cycle with count reset', () => {
  assert.deepEqual(pomodoroAdvanceState('work', 0), { phase: 'short-break', workCount: 1, duration: 5 * 60 });
  assert.deepEqual(pomodoroAdvanceState('short-break', 1), { phase: 'work', workCount: 1, duration: 25 * 60 });
  assert.deepEqual(pomodoroAdvanceState('work', 1), { phase: 'short-break', workCount: 2, duration: 5 * 60 });
  assert.deepEqual(pomodoroAdvanceState('work', 2), { phase: 'short-break', workCount: 3, duration: 5 * 60 });
  assert.deepEqual(pomodoroAdvanceState('work', 3), { phase: 'long-break', workCount: 4, duration: 15 * 60 });
  assert.deepEqual(pomodoroAdvanceState('long-break', 4), { phase: 'work', workCount: 0, duration: 25 * 60 });
});

test('PRESETS holds the 6 quick timers with expected minutes', () => {
  assert.equal(PRESETS.length, 6);
  const byId = Object.fromEntries(PRESETS.map(p => [p.id, p.min]));
  assert.deepEqual(byId, { pomodoro: 25, shortBreak: 5, longBreak: 15, quick: 10, study: 30, deepWork: 60 });
  PRESETS.forEach(p => assert.ok(p.kind === 'focus' || p.kind === 'break', `${p.id} kind`));
});

test('validateDuration clamps to the 1s..24h window', () => {
  assert.equal(validateDuration(1500), 1500);
  assert.equal(validateDuration(MIN_DURATION), 1);
  assert.equal(validateDuration(MAX_DURATION), 24 * 60 * 60);
  assert.equal(validateDuration(0), null);
  assert.equal(validateDuration(-5), null);
  assert.equal(validateDuration(MAX_DURATION + 1), null);
  assert.equal(validateDuration('abc'), null);
  assert.equal(validateDuration(90.9), 90);
});

test('dateKey formats local YYYY-MM-DD and is stable', () => {
  const ms = new Date(2026, 6, 12, 9, 30, 0).getTime(); // 2026-07-12 local
  assert.equal(dateKey(ms), '2026-07-12');
  assert.equal(dateKey(ms), dateKey(ms));
});

test('addSession accumulates without mutating the input', () => {
  const base = {};
  const a = addSession(base, '2026-07-12', 1500);
  assert.deepEqual(base, {});
  assert.deepEqual(a['2026-07-12'], { sessions: 1, seconds: 1500 });
  const b = addSession(a, '2026-07-12', 600);
  assert.deepEqual(b['2026-07-12'], { sessions: 2, seconds: 2100 });
});

test('last7Days returns 7 oldest-to-today entries, zero-filled', () => {
  const todayMs = new Date(2026, 6, 12, 12, 0, 0).getTime();
  const stats = addSession({}, '2026-07-12', 1500);
  const week = last7Days(stats, todayMs);
  assert.equal(week.length, 7);
  assert.equal(week[6].key, '2026-07-12');
  assert.equal(week[6].sessions, 1);
  assert.equal(week[0].key, '2026-07-06');
  assert.equal(week[0].sessions, 0);
});

test('humanizeSeconds renders Korean hours/minutes', () => {
  assert.equal(humanizeSeconds(0), '0분');
  assert.equal(humanizeSeconds(1500), '25분');
  assert.equal(humanizeSeconds(3600), '1시간');
  assert.equal(humanizeSeconds(3900), '1시간 5분');
});

test('humanizeSeconds renders English when lang is en', () => {
  assert.equal(humanizeSeconds(0, 'en'), '0 min');
  assert.equal(humanizeSeconds(1500, 'en'), '25 min');
  assert.equal(humanizeSeconds(3600, 'en'), '1h');
  assert.equal(humanizeSeconds(3900, 'en'), '1h 5m');
});

// ---------- 세션 로그 집계 ----------
const S = (date, dur, label, distractions = 0, start = 0) => ({ id: `${date}-${start}`, date, dur, label, distractions, start });

test('weekdayOf uses local parsing (no UTC day shift)', () => {
  assert.equal(weekdayOf('2026-07-12'), 0); // 일요일
  assert.equal(weekdayOf('2026-07-13'), 1); // 월요일
});

test('daySummary sums sessions, seconds, distractions for a date', () => {
  const log = [S('2026-07-12', 1500, '수학', 2), S('2026-07-12', 600, '영어', 1), S('2026-07-11', 1500, '수학', 0)];
  assert.deepEqual(daySummary(log, '2026-07-12'), { sessions: 2, seconds: 2100, distractions: 3 });
  assert.deepEqual(daySummary(log, '2026-07-10'), { sessions: 0, seconds: 0, distractions: 0 });
});

test('dailySeries returns n oldest-to-today entries', () => {
  const todayMs = new Date(2026, 6, 12, 12).getTime();
  const log = [S('2026-07-12', 1500, '수학', 1)];
  const series = dailySeries(log, todayMs, 7);
  assert.equal(series.length, 7);
  assert.equal(series[6].key, '2026-07-12');
  assert.equal(series[6].sessions, 1);
  assert.equal(series[0].sessions, 0);
});

test('labelBreakdown groups by label sorted by seconds desc; blanks become NO_LABEL', () => {
  const log = [S('2026-07-12', 1500, '수학'), S('2026-07-12', 600, '영어'), S('2026-07-12', 1200, '수학'), S('2026-07-12', 300, '  ')];
  const b = labelBreakdown(log);
  assert.equal(b[0].label, '수학');
  assert.equal(b[0].seconds, 2700);
  assert.equal(b[0].sessions, 2);
  assert.ok(b.some(x => x.label === NO_LABEL));
});

test('distractionByWeekday buckets by local weekday', () => {
  const arr = distractionByWeekday([S('2026-07-12', 1500, 'x', 3), S('2026-07-13', 1500, 'y', 1)]);
  assert.equal(arr[0].distractions, 3); // 일
  assert.equal(arr[1].distractions, 1); // 월
});

test('totals accumulates the whole log', () => {
  assert.deepEqual(totals([S('a', 100, 'x', 1), S('b', 200, 'y', 2)]), { sessions: 2, seconds: 300, distractions: 3 });
});

test('goalProgress for sessions and minutes goals', () => {
  const p = goalProgress({ sessions: 3, seconds: 0, distractions: 0 }, { type: 'sessions', target: 4 });
  assert.deepEqual({ current: p.current, target: p.target, met: p.met }, { current: 3, target: 4, met: false });
  const m = goalProgress({ sessions: 2, seconds: 3600, distractions: 0 }, { type: 'minutes', target: 50 });
  assert.equal(m.current, 60);
  assert.equal(m.met, true);
});

test('computeStreak counts consecutive goal-met days, tolerating an unfinished today', () => {
  const goal = { type: 'sessions', target: 1 };
  const today = new Date(2026, 6, 13, 10).getTime(); // 월
  // 오늘(13) 1세션, 어제(12) 1세션 → 2
  let log = [S('2026-07-13', 1500, 'x'), S('2026-07-12', 1500, 'x')];
  assert.equal(computeStreak(log, today, goal), 2);
  // 오늘 미달, 어제·그제 달성 → 어제 기준 2 유지
  log = [S('2026-07-12', 1500, 'x'), S('2026-07-11', 1500, 'x')];
  assert.equal(computeStreak(log, today, goal), 2);
  // 오늘·어제 모두 미달 → 0
  assert.equal(computeStreak([S('2026-07-10', 1500, 'x')], today, goal), 0);
  // 기록 없음 → 0
  assert.equal(computeStreak([], today, goal), 0);
});
