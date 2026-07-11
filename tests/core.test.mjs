import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakdownRemaining, encodeEvent, decodeEvent } from '../core.js';

test('breakdownRemaining splits ms into d/h/m/s', () => {
  // 1d 2h 3m 4s
  assert.deepEqual(breakdownRemaining(93784000), { days: 1, hours: 2, minutes: 3, seconds: 4 });
});

test('breakdownRemaining floors partial seconds', () => {
  assert.deepEqual(breakdownRemaining(1500), { days: 0, hours: 0, minutes: 0, seconds: 1 });
});

test('breakdownRemaining clamps negative to zero', () => {
  assert.deepEqual(breakdownRemaining(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('encode/decode round-trip with ASCII name', () => {
  const ev = { name: 'New Year', targetISO: '2026-01-01T00:00:00.000Z' };
  assert.deepEqual(decodeEvent(encodeEvent(ev)), ev);
});

test('encode/decode round-trip with Korean name', () => {
  const ev = { name: '새해 첫 출근', targetISO: '2026-01-05T00:00:00.000Z' };
  assert.deepEqual(decodeEvent(encodeEvent(ev)), ev);
});

test('decodeEvent returns null for invalid base64', () => {
  assert.equal(decodeEvent('not-valid-base64!!'), null);
});

test('decodeEvent returns null for empty string', () => {
  assert.equal(decodeEvent(''), null);
});

test('decodeEvent returns null for JSON missing required fields', () => {
  const bad = btoa(encodeURIComponent(JSON.stringify({ name: 'x' })));
  assert.equal(decodeEvent(bad), null);
});
