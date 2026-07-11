import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations, t, SUPPORTED_LANGS } from '../locales.js';

const KEYS = ['days','hours','minutes','seconds','setEvent','share','eventName','selectDateTime','save','cancel','expiredTitle','expiredMessage','shareCopied','noEventPrompt'];

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
  assert.equal(t('days', 'ko'), '일');
  assert.equal(t('days', 'en'), 'Days');
});

test('t falls back to en for unknown lang', () => {
  assert.equal(t('days', 'xx'), 'Days');
});

test('t falls back to key for missing key', () => {
  assert.equal(t('nonexistent', 'ko'), 'nonexistent');
});
