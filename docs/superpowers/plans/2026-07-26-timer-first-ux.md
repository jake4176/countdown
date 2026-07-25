# Timer-First UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Today's Focus easy for first-time users with an English timer-first homepage, light onboarding, and mobile polish.

**Architecture:** Keep zero-dependency static site. Homepage HTML/CSS restructure; `onboard.js` for coachmarks; `app.js` English chrome strings; fix manifest encoding.

**Tech Stack:** HTML, CSS, ES modules, Node built-in test runner.

## Global Constraints

- No new npm dependencies
- UI language for homepage + timer chrome: English
- Keep existing lavender/blue design tokens
- Content article bodies out of scope
- localStorage key for onboarding: `ft.onboarded`

---

## File map

| File | Responsibility |
|---|---|
| `index.html` | Timer-first layout, English chrome, FAQ EN |
| `styles.css` | Compact hero, touch targets, coachmarks, safe-area |
| `onboard.js` | Coachmark flow + `ft.onboarded` |
| `app.js` | English UI strings; wire onboard; Show tips again |
| `manifest.webmanifest` | Fix mojibake → English |
| `tests/core.test.mjs` | Unchanged unless pure helpers added |

---

### Task 1: Fix manifest + English preset/UI strings in app.js

- [ ] Rewrite `manifest.webmanifest` with English UTF-8 name/short_name/description
- [ ] Ensure `PRESET_NAMES` and user-visible strings in `app.js` are English (mode pill, notes, toasts, goal, distract)
- [ ] Run `npm test`

### Task 2: Timer-first homepage HTML (English)

- [ ] Restructure `index.html`: compact hero → timer → presets → rest
- [ ] English nav/footer/labels/FAQ/JSON-LD names on homepage
- [ ] Add empty mount for coachmark (`#coachRoot`) and Show tips again control

### Task 3: Mobile + coachmark CSS

- [ ] Touch targets, reduced hero padding, safe-area insets
- [ ] `.coach-backdrop`, `.coach-card`, `.coach-highlight` styles; reduced-motion

### Task 4: `onboard.js` + wire from `app.js`

- [ ] Implement 2-step coachmark; Skip/Got it/Esc/Start completes
- [ ] Import and start from `app.js`; Show tips again clears flag and restarts
- [ ] Run `npm test`, `npm run lint`, `npm run build`

### Task 5: Manual smoke

- [ ] `npm run dev` — first visit tips, Start clears, mobile width OK
