import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pomodoroPlan, sessionsPlan, daysNeeded, buildSchedule, clockLabel, parseClock, timeUntil, projectEstimate } from '../calc.js';

test('pomodoroPlan: 100분이면 4뽀모, 긴 휴식 없음', () => {
  assert.deepEqual(pomodoroPlan(100), { pomodoros: 4, shortBreaks: 3, longBreaks: 0, focusMin: 100, breakMin: 15, totalMin: 115 });
});
test('pomodoroPlan: 200분이면 8뽀모, 긴 휴식 1회', () => {
  const r = pomodoroPlan(200);
  assert.equal(r.pomodoros, 8);
  assert.equal(r.longBreaks, 1);
  assert.equal(r.shortBreaks, 6);
  assert.equal(r.breakMin, 6 * 5 + 1 * 15);
  assert.equal(r.totalMin, 200 + 45);
});
test('pomodoroPlan: 부분 뽀모는 올림, 0이하는 0', () => {
  assert.equal(pomodoroPlan(30).pomodoros, 2);
  assert.equal(pomodoroPlan(25).pomodoros, 1);
  assert.deepEqual(pomodoroPlan(0), { pomodoros: 0, shortBreaks: 0, longBreaks: 0, focusMin: 0, breakMin: 0, totalMin: 0 });
});
test('pomodoroPlan: 커스텀 길이 반영', () => {
  const r = pomodoroPlan(90, { work: 30, shortBreak: 10 });
  assert.equal(r.pomodoros, 3);
  assert.equal(r.focusMin, 90);
  assert.equal(r.breakMin, 20);
});

test('sessionsPlan: 세션 수·휴식 포함 총 시간', () => {
  assert.deepEqual(sessionsPlan(90, 30, 5), { sessions: 3, focusMin: 90, breakMin: 10, totalMin: 100 });
  assert.equal(sessionsPlan(100, 30, 5).sessions, 4);
  assert.deepEqual(sessionsPlan(0, 30, 5), { sessions: 0, focusMin: 0, breakMin: 0, totalMin: 0 });
});

test('daysNeeded: 총/일 올림', () => {
  assert.equal(daysNeeded(600, 120), 5);
  assert.equal(daysNeeded(630, 120), 6);
  assert.equal(daysNeeded(100, 0), 0);
});

test('buildSchedule: 3세션 30분 + 5분 휴식', () => {
  const { blocks, endMin } = buildSchedule(9 * 60, 3, 30, 5);
  assert.equal(blocks.length, 5); // focus,break,focus,break,focus
  assert.equal(blocks[0].start, 540);
  assert.equal(blocks[0].end, 570);
  assert.equal(blocks[1].type, 'break');
  assert.equal(endMin, 9 * 60 + 30 * 3 + 5 * 2);
});
test('buildSchedule: 긴 휴식 옵션', () => {
  const { blocks } = buildSchedule(0, 5, 25, 5, { longEvery: 4, longBreakMin: 15 });
  const longs = blocks.filter(b => b.type === 'break' && b.long);
  assert.equal(longs.length, 1); // 4번째 뒤 긴 휴식
});

test('clockLabel: 자정 기준 분 → HH:MM, 다음날 표기', () => {
  assert.equal(clockLabel(9 * 60), '09:00');
  assert.equal(clockLabel(13 * 60 + 5), '13:05');
  assert.equal(clockLabel(25 * 60), '01:00 (+1d)');
});
test('parseClock: HH:MM 파싱, 잘못된 값 null', () => {
  assert.equal(parseClock('09:30'), 570);
  assert.equal(parseClock('24:00'), null);
  assert.equal(parseClock('abc'), null);
});

test('timeUntil: 남은/지난 시간 계산', () => {
  const now = 0;
  const oneDay = 24 * 3600 * 1000;
  const r = timeUntil(oneDay + 2 * 3600 * 1000 + 3 * 60 * 1000, now);
  assert.deepEqual({ d: r.days, h: r.hours, m: r.minutes, past: r.past }, { d: 1, h: 2, m: 3, past: false });
  assert.equal(timeUntil(-1000, 0).past, true);
});

test('projectEstimate: 작업일수·주수', () => {
  assert.deepEqual(projectEstimate(40, 8, 5), { workDays: 5, weeks: 1, perWeek: 5 });
  assert.deepEqual(projectEstimate(50, 8, 5), { workDays: 7, weeks: 2, perWeek: 5 });
  assert.equal(projectEstimate(0, 8, 5).workDays, 0);
  assert.equal(projectEstimate(40, 8, 9).perWeek, 7); // 주당 일수 클램프
});
