# Timer-First UX Design (English)

**Date:** 2026-07-26  
**Product:** Today's Focus (`countdown` / FocusTimer)  
**Goal:** Make the site easy for many first-time visitors — onboarding, mobile, and timer UX first.

## Decisions

| Topic | Choice |
|---|---|
| Primary goal | Easy first-run UX (not SEO/AdSense this pass) |
| UI language | **English** for chrome + homepage + timer |
| Approach | Timer-first homepage + light coachmarks + mobile polish |
| Visual system | Keep existing lavender/blue theme; no full redesign |
| Content articles | Stay as-is this pass (mostly Korean). Nav/footer/homepage/timer → English |

## 1. Homepage layout

1. Header brand: **Today's Focus**. Nav (EN): Home, Timer (`#timer`), Guides (`/productivity/`), About.
2. Collapse hero: remove English marketing spam / audience lines already mixed in; one short line only — *Start a focus session in one tap.*
3. Timer panel is the first-viewport centerpiece (ring + Start / +1 min / Reset).
4. Preset grid immediately under the timer.
5. Stats, feature grid, compare table, ad slot, posts, FAQ move below.
6. Homepage FAQ + JSON-LD FAQ answers → English (keep WebApplication schema; update `name` to Today's Focus).

## 2. First-visit onboarding

1. Show only when `localStorage.ft.onboarded` is missing.
2. Two coachmark steps (not a full-screen wizard):
   - Step 1: *Pick a preset* (highlight `#presetGrid`)
   - Step 2: *Tap Start* (highlight `#startBtn`)
3. Controls: Skip / Next / Got it. Esc dismisses and marks onboarded.
4. Pressing Start marks onboarded immediately.
5. Optional small control: *Show tips again* near timer options (clears `ft.onboarded`).
6. A11y: `role="dialog"`, `aria-modal="true"`, focus move to dialog; respect `prefers-reduced-motion`.

## 3. Mobile & timer UX

1. Touch targets ≥ 44px for Start / Pause / Reset / presets / nav toggle.
2. On narrow viewports: reduce hero padding; timer ring stays large; sticky compact action bar optional only if Start scrolls off — prefer keeping Start in first viewport so sticky is unnecessary.
3. `env(safe-area-inset-*)` on header/footer.
4. Preset labels English via `PRESET_NAMES` in `app.js` (already partly English).
5. Mode pill / display notes / toasts / goal labels on homepage → English.
6. Fix `manifest.webmanifest` mojibake → English name/short_name/description.

## 4. Shared chrome (this pass)

Update homepage header/footer to English. Other pages keep their current header/footer unless a shared include exists (they are duplicated HTML today) — **minimum:** homepage + `site.js` aria strings if any. Follow-up task (out of scope): English chrome on all pages.

## 5. Out of scope

- Real domain / Search Console / GA / AdSense
- Translating all productivity articles
- PWA install campaign / service worker
- Backend / accounts

## 6. Testing

- Manual: first visit coachmarks → Start → tips gone; refresh no tips; Show tips again works.
- Manual: 375px width — timer usable without horizontal scroll; buttons tappable.
- `npm test` still passes (core logic unchanged except any pure helpers if added).
- `npm run lint` / `npm run build` pass.

## 7. Architecture notes

- New small module `onboard.js` imported from `app.js` (coachmark DOM + localStorage). Keep `core.js` free of DOM.
- Styles for `.coach` / `.home-compact` live in `styles.css`.
- No new npm dependencies.
