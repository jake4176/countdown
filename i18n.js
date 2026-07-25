// Apply translations to [data-i18n*] nodes and manage the language toggle.
import { t, detectLang, SUPPORTED_LANGS } from './locales.js';

const KEY = 'ft.lang';
let lang = 'en';
const listeners = new Set();

function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

export function getLang() { return lang; }

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function fill(el, value) {
  if (el.dataset.i18nHtml === '1') el.innerHTML = value;
  else el.textContent = value;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) fill(el, t(key, lang));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key, lang));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key, lang));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key, lang));
  });

  document.documentElement.lang = lang;

  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    const key = titleEl.getAttribute('data-i18n');
    if (key) document.title = t(key, lang);
  }

  // Show only the active language for dual-language content blocks.
  root.querySelectorAll('[data-lang]').forEach((el) => {
    const blockLang = el.getAttribute('data-lang');
    el.hidden = blockLang !== lang;
  });

  const btn = document.getElementById('langToggle');
  if (btn) {
    const next = lang === 'ko' ? 'en' : 'ko';
    btn.textContent = next === 'en' ? t('langSwitchToEn', lang) : t('langSwitchToKo', lang);
    btn.setAttribute('aria-label', t('langAria', lang));
    btn.setAttribute('aria-pressed', 'true');
    btn.dataset.nextLang = next;
  }

  document.querySelectorAll('.brand-text').forEach((el) => {
    el.textContent = t('brand', lang);
  });
}

export function setLang(next) {
  if (!SUPPORTED_LANGS.includes(next) || next === lang) {
    applyI18n();
    return;
  }
  lang = next;
  lsSet(KEY, lang);
  applyI18n();
  listeners.forEach((fn) => { try { fn(lang); } catch { /* ignore */ } });
}

export function initI18n() {
  lang = detectLang();
  applyI18n();
  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = btn.dataset.nextLang === 'ko' ? 'ko' : 'en';
      setLang(next);
    });
  }
}

export { t };
