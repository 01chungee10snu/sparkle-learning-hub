# Default village numeric keypad — 2026-10-12

Ported only numericQuestion and numeric keypad CSS from the matching v06 public portals. Numeric submit cleanup runs on every question/feedback transition. Default coarse-pointer entry uses readonly/inputmode=none; optional OS keyboard, 0–9, backspace, clear, signed integers, fullwidth normalization and range validation remain identical. Existing submit bridge, scoring, IRT, rewards, storage keys and Unity binaries unchanged. Updated UI/CSS cache versions and removed the default page 400px minimum height for landscape.

## Verification performed this run
- npm run check: PASS (existing core/IRT/reward/numeric/village/garden regression suite).
- node scripts/check-bebsu-village.mjs: PASS (25-question ordering, persisted round restore, Taehee 160 / Sehee 60 bonus, duplicate prevention, sibling separation).
- node scripts/check-kma-live-v06.mjs: PASS (45 games, 4153 IRT entries, 675 original questions, 1350 image references, storage isolation).
- scripts/check-default-keypad-dom.mjs with jsdom: PASS, all 3 portals × touch/desktop; numeric input, zero, delete, clear, bounds, duplicate submit, negative/fullwidth input, optional editable field, Enter, footer cleanup, cancel.

## Explicit limits
Browser-rendered touch/rotation and live Unity integration were NOT executed in this run: no Chromium executable available and browser download failed. The browser regression script now covers the default village and practice landscape, actual viewport resizing preserving input, on-screen submit bounds and duplicate submission; these assertions remain unexecuted. DOM tests do not validate layout or the Samsung IME. Physical Samsung Galaxy testing: NOT performed. Previous 2026-10-10 browser/Unity results are historical evidence only.

Run browser checks with PLAYWRIGHT_MODULE / CHROME_PATH and MAGIC_GALAXY_ORIGIN as needed. DOM check accepts JSDOM_MODULE. No real learner records used or modified during tests.
