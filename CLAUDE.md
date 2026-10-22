# CLAUDE.md

## No code comments

No comments in any file (TS, Vue, CSS, SVG, `firestore.rules`, configs, workflows). Name things so code explains itself; non-obvious reasons, library quirks and values that must stay in sync go in this file. Only tool directives are allowed (`/// <reference>`, `// prettier-ignore`, `// eslint-disable...`, `// @ts-expect-error`).

## Project

Play-money online casino demo. Vue 3 (`<script setup>`) + TS + Vite, Vue Router, Pinia, VueFire, PrimeVue (styled, custom preset over Aura, no Tailwind). Firebase Auth, Firestore, Hosting; Functions code exists but the project (`sakura-ecasino`) is on Spark, so none are deployed. No Storage, no emulators (dev hits the live project), no test runner.

Commands: `npm run dev`, `npm run build` (vue-tsc + build), `npm run type-check`, `npm run lint`, `npm run format` (no semicolons, single quotes, 100 cols). `functions/` is a separate package (`npm run build`). `firebase deploy --only hosting|firestore:rules|functions` (build first).

GitHub Pages: `.github/workflows/deploy-pages.yml` publishes on push to `main` with `BASE_PATH=/sakura-ecasino/` and copies `index.html` to `404.html` for deep links. Files in `public/` must be referenced through `publicUrl()`, or they 404 there.

## Structure

`constants/` holds business rules (wallet.ts, vip.ts, gameTabs.ts), `data/` static content (games, promotions, legal, demoAccounts), `services/` Firestore/callable wrappers, `stores/` Pinia. Components never hold rules or data, and services/stores never import components. `firebase/functions.ts` is imported only where used.

## Routing

- Lobby tabs (`constants/gameTabs.ts`) are routes rendering `GamesView` with a `tab` prop. `GameTabs` re-syncs after each navigation because PrimeVue highlights a clicked tab even when the guard redirects.
- `/login` renders the lobby with `AuthModal` open. Closing it replaces to `safeRedirect(query.redirect)` if signed in, else `/`.
- `meta.requiresAuth` routes redirect to `/login?redirect=`. Signing out on a guarded page (any tab) sends to `/`; views read the user null-safely because it turns null one render before that redirect.
- `meta.requiresProfile` (unused now) and the wallet's Deposit/Withdraw (`WalletView` `openFlow`) send unverified players to `/account?completeProfile=1&redirect=` or `/account?verifying=1`. Admin verifies by setting `users/{uid}.verifiedAt`. AccountView watches the query, not `onMounted`, since the guard can redirect while already on `/account`. `?mode=` links use `router.replace`.
- Every `?redirect=` goes through `safeRedirect()`: same-site paths only, never `//host`, `/\host`, `/login`.
- Scroll is kept on query-only changes and lobby tab switches. `router.onError` reloads once on stale chunks (10 s sessionStorage guard).

## Money and security

- Clients never write `balance` freely: bets, payouts and withdrawals must be Cloud Functions running Admin SDK transactions that also append to `users/{uid}/transactions`. Only the QR deposit claim is client-written, checked by rules to the centavo.
- Keep equal across `src/constants/wallet.ts`, `functions/src/limits.ts`, `firestore.rules`: `MAX_BALANCE` ₱9,999,999,999.99, deposit ₱20–₱50,000, `DEPOSIT_WINDOW_MINUTES` 10, `RELOAD_BONUS_PERCENT` 30, turnover multipliers 1 / 10, methods `GCash`/`Maya`. Personal Details limits (rules `validDetails`, `PersonalDetailsDialog`, `EditNameDialog`): display name 20, names 60, email 254, addresses 250, occupation 100, betting cap ₱10,000,000, and the source-of-income list.
- Never credit past the cap (`capCredit()`).
- Reload Bonus: once per PH day, always `Math.round(amount * 30) / 100` (never `* 0.3`, float mismatch with the rules). Functions recompute it. Its history entry id is `{depositId}_bonus`.
- Turnover: 1× deposit + 10× bonus before withdrawing (`turnoverFor`, `turnoverAfterDeposit` starts a new cycle when nothing was left, `turnoverAfterBet` floors at 0). Withdraw rejects with `failed-precondition` while `turnoverRemaining > 0`.
- VIP level needs both `totalDeposit` and `totalBet` minimums; deposit/bet writes increment them in the same transaction.
- QR deposit flow (`services/wallet.ts`, each step checked by rules): `createDeposit` opens a pending tx + `pendingDepositId` in one batch → "I've paid" on `DepositPayView` sets `sentAmount == amount`, a dummy 8–16 char `reference` and `approvedAt` → wallet store's `claimDeposit` credits balance, bonus, `totalDeposit`, turnover in one transaction (arithmetic in the same order as the rules) → undecided after the window it's marked `expired` (server time; 3 s grace, 10 s retry). Admin may set `rejectedAt` → `failed`. A late approval still credits. The QR is the developer's real one, labelled donation-only; it never adds credits.
- Data model: `games` public read; `users/{uid}` owner read, owner writes only `displayName`, `bettingCap`, `consentedAt`, Personal Details and the QR steps; `favorites/{gameId}` id `^[a-z0-9-]{1,80}$`, body only `addedAt`; `transactions` owner read.
- Identity fields are write-once (`keepsIdentity`). `consentedAt == request.time`. Birthdate is a `'YYYY-MM-DD'` string, 21+ in PH time; rules' `validBirthdate` counts from the 1st plus days (29 Feb) and shifts 8 h; `maxBirthdate` matches.
- `fetchProfile` uses `serverTimestamps: 'estimate'`. Profile saves race a 10 s `withTimeout` (offline writes retry forever).
- Functions region `asia-southeast1` (client must match), max 10 instances.
- Don't add `X-Frame-Options`/`frame-ancestors`: Firebase Auth's `/__/auth/iframe` is on the same hosting.
- `v-html` only with hardcoded strings.

## Conventions

- `@/` imports only. `defineProps`/`defineModel`/`defineEmits` right after imports. Import PrimeVue components per file.
- Read Firestore/user through VueFire, not hand-written `onSnapshot`.
- Formatting via `utils/format.ts` (`formatMoney`, `formatAmount`, `formatPeso`, `formatCountdown`, `localMobile`, `maskMobile`); no `Intl.NumberFormat` in components. Balance display comes from `useBalance`.
- Every awaited Firestore/Auth call in a component shows a toast or inline error; background retries `console.warn`.
- Button links: `<Button :as="RouterLink" :to>` with `text-decoration: none`.
- Styling: `<style scoped>` with `--p-*` or `--app-*` tokens (light values under `:root:not(.app-dark)` in `main.css`), no hardcoded hex. Dark is default (`.app-dark` via `useTheme`). Accent: gold on dark, `#e0457f` on light.
- Don't add PrimeVue to the manual vendor chunks in `vite.config.ts`.

## Quirks

- Teleported overlays (Dialog, Drawer, Toast, Select, DatePicker) are styled in a second unscoped `<style>` block under the component's own class (`.sakura-auth`, `.sakura-edit-name`, ...). `VerifyCodeStep` stays scoped and reads `--auth-*` from `.sakura-auth`.
- PrimeVue Button paints amber on hover/active/disabled: custom buttons restate colors for those states. Disabled Checkbox hides the tick, so locked declarations override it.
- `InputNumber` updates the model and `:max` only on blur; live inputs use `@input`. The minimum still waits for blur.
- Birthdate DatePicker: past-cutoff cells disabled via `pt` (not `max-date`, which stops paging); opens on the year grid via internal `currentView`/`currentYear`/`currentMonth` (recheck on PrimeVue upgrade).
- `HeroCarousel` calls internal `navForward` to wrap forward; items pinned to viewport width.
- `AppToast` passes no-op mouse handlers so hover pauses the timer; offset override needs `!important`.
- On-screen keyboard: iOS/Android don't shrink the layout viewport. `useKeyboardInset` reads `visualViewport`; on phones `AuthModal` lifts and caps the sheet (the banner stays, reachable by scrolling up) and scrolls only `.p-dialog-content` to a hidden focused input. Never `scrollIntoView` there: it scrolls the locked page behind the modal. The OTP in `VerifyCodeStep` is one transparent input over six drawn boxes, not PrimeVue `InputOtp`, because moving focus per digit makes iOS scroll the sheet on every keystroke.
- Drawer logout on phones waits for `after-hide` before opening the dialog (focus return).
- VueFire keeps the last doc when the source becomes null (trust `pendingDeposit` only while its id equals `profile.pendingDepositId`) and mutates arrays in place (watch derived computeds).
- SVG gradient/mask/clip ids use `useId()`.
- Demo accounts (`data/demoAccounts.ts`) must match Firebase console's phone test numbers; Spark sends no SMS. For them `sendPhoneCode` sets `appVerificationDisabledForTesting` and recreates the verifier when the mode changes. Shared by all visitors.
- The invisible reCAPTCHA lives on `<body>` and is recreated after failures; its badge is hidden, so `AuthModal` must show the attribution text.
- `logo-sakura.png` is 1686 × 280 (`AppHeader` measures with it); light mode draws it as a navy mask.
- `useCountUp` jumps on the first value and while not `ready()` (`fromZero` opts in). `useDragScroll` swallows the click ending a drag.
- Wallet history needs the `(type, createdAt desc)` index; pages are cached and fall back to the live last-100 list if a query fails.

## Games

- `PlayView` lazy-loads game components, showing `GameLoader` at 0% until the game reports progress.
- UIs use the original's pixel grid: stage 1920 × 1080 design px (1cqw = 19.2 px), panels define `--p` = one screenshot px. Reel cells are 217.82 × 164.19 design px: the 5 rows are tighter than the board window (y 104–936), so `.reels` (top 10.141%, height 76.014%) is centred in it and `clip-path: inset(-0.673% 0)` clips at the window edge, not the cell grid (top-row rings and hourglasses poke above their cell). Keep in sync with `WinEffects`/`StrikeEffects` positions and `STRIKE_CANVAS.top`, `FX_BOARD_CLIP.y`/`STRIKE_CANVAS.clip.y` (0.2221 cells = the old frame clip). `reel/*.webp` are the original's static idle sprites (`S01`–`S11`, trimmed, drop shadow baked in), not crops from recordings; `REEL_ART` boxes and the grid were fitted by template-matching all 30 cells of an original screenshot registered to ours via the board (sub-px residuals), so swapping the art means refitting the boxes.
- Game UI sizes are stage-relative only (`cqw`, or `min(100vw, 100vh * 16 / 9)` outside a container), never mixed with `px`, so browser zoom keeps proportions. Thin rings are inset `box-shadow` (`--ring`), not `border`: Chrome rounds borders under 1 CSS px up to 1 px, which at 500% zoom paints 5 device px.
- Center the stage with margins, not `translate(-50%)` (half-pixel blur). The flash layer is a non-isolated twin box for `mix-blend-mode: screen`.
- Timings come from 48 fps recordings. Spin drops (`SPEEDS`): normal staggers columns left→right and rows bottom-first on the way out and in; quick/turbo move all columns together, and rows 2–4 of each column fall as one stack with rows 0–1 ~70 ms behind (`inRow` `[87, 70, 0, 0, 0]` is measured, not a typo). The new grid starts falling before the old one has drained, so the old grid stays rendered as a `leaving` layer. Every landing dips 12% and settles (`land`). Zeus animations are WebPs needing a fresh blob URL per play (revoke after use); `zeus-idle.webp` starts at frame 64.
- `useLoopingMusic` uses Web Audio for gapless loops; `blocked` until a `click` (not `pointerdown`).
- Win border and explosion are sprite sheets (`public/.../fx/border.webp`, `explode.webp`) lifted from the PHJOY recordings by subtracting the empty board, played additively (`lighter` + `plus-lighter`) on a canvas one half-cell larger than the reels, clipped to the board frame. One frame = one 47.97 fps video frame (`FX_FRAME_MS`), sized by `FX_SOURCE_CELL` (191.5 × 145.4 video px per cell). The border sheet was extracted against a per-frame board rebuilt with the symbol at its measured `win-pop` scale, so retuning that pop means re-extracting. The border sheet is played frame for frame: in the original every cell runs the same fixed sequence in sync (5-frame fade-in, a dim gap stepping clockwise along each side every 3 frames on a 26-frame cycle, 6-frame fade-out, lines ~10 px past the corners), so don't animate it procedurally. A cell skips its right/bottom side when that neighbour also wins, so shared edges aren't drawn twice. Timeline in `winFx.ts`; `win-pop` (symbol grows to 1.23 then snaps back) and `win-vanish` keyframes are measured, not eased. Quick plays at `fxRate` 2, turbo (0) skips it.
- Tumble refill (`dropColumn`, `TUMBLE_FRAMES`, measured from PHJOY kymographs): every symbol eases in over 1 frame then falls 1.686 frames per row, and dips with `land` on arrival; no symbol waits for its column to settle. Columns start 1 frame apart left→right; inside a column the survivors start bottom-up 2 frames apart, the first new symbol 0.8 frame after that slot, then new ones 2.4 frames apart. Each cell gets its own `--fall-delay`/`--fall-ms`/`--fall-ease` (a `linear()` built per distance), and strikes in a tumble land at that cell's `landsIn`. Cells that don't move get no `drop` class, so they don't dip.
- Multiplier strike (`StrikeEffects`, `STRIKE_FX`) is the 50x strike lifted from the Pragmatic Replay recording: 16 frames of a white `light` sheet plus the red and blue chroma of the glow as separate grey sheets, each multiplied by the tier's `boltGlow` and drawn additively. Purple maps them to pure red/blue, so it is the original pixel for pixel; other tiers put both on their measured hue at 0.631 (keeps glow energy equal). The bolt holds one shape per 4 frames (12 fps). Frames are anchored to the landing orb's centre and clipped at the stage top, matching the original (bolt starts at the viewport top for every row). `landFrame` 7.5 is the orb touching down; before `frontFrom` everything goes on the `back` canvas (between board and reels, so symbols and the falling orb cover it), after it the impact ellipse goes on the `front` canvas. The landed orb's area is blank in the sheets: the orb whitening is `.orb-flash`, a screen blend of `flashColor` masked by the orb art (fits `screen(orb, C)` per channel in the recording).
- Multiplier orbs: `reel/m*.webp` are the original's static `S12_0`–`S12_4` sprites (`info/m*.webp` stay for the paytable). Orb cells stack by tier (`z-index` = tier index + 1, from `tierVars`), so a higher multiplier covers an overlapping lower one. Each tier's `art` box and the diamond position were fitted to an original screenshot; wing tiers other than purple keep the old relative sizes. The label (`MultiplierLabel`) is the original's 4-layer `LabelMultipleLayers` recipe (pink copy dropped 3.6, blurred black + gradient rim 1.8, inner 1.2, gradient fill + 0.6 outline; font units at size 72) in the game's own label font (Go Noto Kurrent-Medium, `a4f86b3a…`) baked into `multGlyphs.ts`. Thicknesses are literal (outline = half the SVG stroke): a ×2 version looked neon and too bold, and the original's 0 stem / glyph height is 0.20, which only the literal values give. The gradient spans y −72.5…6.1 (measured, not the font's ascent/descent), the black shadow is drawn first (under the pink drop), filled and widened to a 4.2-unit outline around the pink drop only (so the rim hides it along the top) with a 0.9 blur at 0.85 (the diamond tier's `labelShadow` 0.6: the original 1000x has a lighter one) so a dark band hugs each glyph and its counters, the `x` is drawn at 0.9 of its glyph size (`GLYPH_SCALE`), and the squash is the prefab's pivot scale 0.864 / 0.96 = 0.9. em = 0.2494 × orb width (0.2506 on the diamond), centred at `label` of the orb box with negative margins (`--mult-em` is a % of the cell width, so the height must come from `aspect-ratio`, never a % height). Only the shadow is filtered: a filter over the whole label is rasterized and resampled at fractional offsets, which made it blurry and its edges rough. Arial Black looks close but is too heavy.
- Orb win animation is the original Spine 3.7 data (`gool_wild_multiplier_win_*`, `gaoo_1000_multiplier_win`) repacked by hand into `fx/mult-*.{json,webp}` (regions unrotated clockwise, padding restored) and played by `spineLite.ts` (regions, unweighted meshes, deform, bezier/stepped, normal + additive). `OrbWinEffects` draws normal slots on one canvas and additive ones on a `plus-lighter` canvas where later normal slots erase with `destination-out`, which equals Spine's blending. The static orb is hidden while it plays. Spine units → sprite px are 0.2505 (wings) / 0.5 (diamond) with the origin at `ORB_RIGS.origin` of the sprite (fitted, rms 10). The number rides `bone5` / `multiplier_number` until `release` (that bone's scale peak), then flies straight from there (no lift; the original never rises first); the next orb starts `COLLECT.gap` after that release, without waiting for the landing; an original screenshot mid-pulse matches `bone × bone5` at ~0.18 s. The `landing_*` / `_land` animations exist in the data but aren't wired.
- Max win is 15,000× bet (`MAX_WIN_X`): tumbles stop once it is reached, every multiplier is still collected, then the total is capped, the bar shows `MAX WIN` and counts to the cap, and a red `MAX WIN` row tops the win list. `FORCE_SPIN_WIN`/`FORCE_TEST_ORBS`/`FORCE_MAX_WIN` are test rigs (12 crowns + the test orbs always hit the cap); turn them off for real play.
- Win list rows (4 shown, `--row` 2.72cqw) were sampled from original screenshots: a 5-line double-gold band on top, no side borders, one gold-cream text gradient for every row. A row never wraps: `fitWinRow` measures it at full size and sets `--fit` to shrink its font (counts, icon and gaps are in `em` so they shrink too).
- Gates of Olympus uses its own ₱100,000 demo credit; wiring it to the wallet requires Cloud Functions.

## Content

- `data/legal.ts` says plainly it's a portfolio project (old casino copy is in git before `92ae0f2`). Promotions only describe real features, never cash prizes.
