import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations, t, SUPPORTED_LANGS } from '../locales.js';

const KEYS = ['modeCountdown','modeStopwatch','start','pause','reset','minutes','seconds','customInput','timesUp'];

test('SUPPORTED_LANGS contains the 5 languages', () => {
  assert.deepEqual(SUPPORTED_LANGS, ['ko','en','es','ja','zh']);
});

test('every supported lang has every key', () => {
  SUPPORTED_LANGS.forEach(lang => {
    KEYS.forEach(key => {
      assert.equal(typeof translations[lang][key], 'string', `${lang}.${key} missing`);
    });
  });
});

test('t returns translation for known lang', () => {
  assert.equal(t('start', 'ko'), '시작');
  assert.equal(t('start', 'en'), 'Start');
});

test('t falls back to en for unknown lang', () => {
  assert.equal(t('start', 'xx'), 'Start');
});

test('t falls back to key for missing key', () => {
  assert.equal(t('nonexistent', 'ko'), 'nonexistent');
});
