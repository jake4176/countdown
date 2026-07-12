import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakdownTime, formatTime, parseDuration } from '../core.js';

test('breakdownTime splits seconds into h/m/s', () => {
  assert.deepEqual(breakdownTime(3661), { h: 1, m: 1, s: 1 });
});

test('breakdownTime handles minutes only', () => {
  assert.deepEqual(breakdownTime(65), { h: 0, m: 1, s: 5 });
});

test('breakdownTime handles zero', () => {
  assert.deepEqual(breakdownTime(0), { h: 0, m: 0, s: 0 });
});

test('breakdownTime clamps negative to zero', () => {
  assert.deepEqual(breakdownTime(-10), { h: 0, m: 0, s: 0 });
});

test('formatTime MM:SS under an hour', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(90), '01:30');
  assert.equal(formatTime(599), '09:59');
});

test('formatTime HH:MM:SS at/over an hour', () => {
  assert.equal(formatTime(3600), '01:00:00');
  assert.equal(formatTime(3661), '01:01:01');
});

test('parseDuration combines minutes and seconds', () => {
  assert.equal(parseDuration(25, 0), 1500);
  assert.equal(parseDuration(1, 30), 90);
  assert.equal(parseDuration(0, 45), 45);
});

test('parseDuration treats invalid/empty as 0', () => {
  assert.equal(parseDuration('', ''), 0);
  assert.equal(parseDuration('abc', 'xyz'), 0);
  assert.equal(parseDuration(null, undefined), 0);
});

test('parseDuration clamps negatives to 0', () => {
  assert.equal(parseDuration(-5, -10), 0);
});
