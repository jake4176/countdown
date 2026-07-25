import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations, t, SUPPORTED_LANGS } from '../locales.js';

const KEYS = Object.keys(translations.en);

test('SUPPORTED_LANGS is ko and en', () => {
  assert.deepEqual(SUPPORTED_LANGS, ['ko', 'en']);
});

test('every supported lang has every key', () => {
  SUPPORTED_LANGS.forEach(lang => {
    KEYS.forEach(key => {
      assert.equal(typeof translations[lang][key], 'string', `${lang}.${key} missing`);
    });
  });
});

test('ko and en have the same key set', () => {
  assert.deepEqual(Object.keys(translations.ko).sort(), Object.keys(translations.en).sort());
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

test('t interpolates variables', () => {
  assert.equal(t('tipStep', 'en', { n: 1, total: 2 }), 'Tip 1 of 2');
  assert.equal(t('tipStep', 'ko', { n: 1, total: 2 }), '팁 1 / 2');
});
