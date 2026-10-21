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
- UIs use the original's pixel grid: stage 1920 × 1080 design px (1cqw = 19.2 px), panels define `--p` = one screenshot px. Reel cells 191.5 × 145.6 (`REEL_ART`).
- Center the stage with margins, not `translate(-50%)` (half-pixel blur). The flash layer is a non-isolated twin box for `mix-blend-mode: screen`.
- Timings come from 48 fps recordings. Zeus animations are WebPs needing a fresh blob URL per play (revoke after use); `zeus-idle.webp` starts at frame 64.
- `useLoopingMusic` uses Web Audio for gapless loops; `blocked` until a `click` (not `pointerdown`).
- Gates of Olympus uses its own ₱100,000 demo credit; wiring it to the wallet requires Cloud Functions.

## Content

- `data/legal.ts` says plainly it's a portfolio project (old casino copy is in git before `92ae0f2`). Promotions only describe real features, never cash prizes.
