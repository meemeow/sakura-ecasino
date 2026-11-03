# CLAUDE.md

Game-specific notes live in `src/games/gates-of-olympus/CLAUDE.md`.

## No code comments

No comments in any file (TS, Vue, CSS, SVG, `firestore.rules`, configs, workflows). Name things so code explains itself; non-obvious reasons, library quirks and values that must stay in sync go in these CLAUDE.md files. Only tool directives are allowed (`/// <reference>`, `// prettier-ignore`, `// eslint-disable...`, `// @ts-expect-error`).

## Project

Play-money online casino demo. Vue 3 (`<script setup>`) + TS + Vite (Rolldown), Vue Router, Pinia, VueFire, PrimeVue (styled, custom preset over Aura, no Tailwind). Firebase Auth, Firestore, Hosting; Functions code exists but the project (`sakura-ecasino`) is on Spark, so none are deployed. No Storage; dev hits the live project (the Firestore emulator is used only by the rules tests).

Commands: `npm run dev`, `npm run build` (vue-tsc + build), `npm run type-check`, `npm run lint`, `npm run format` (no semicolons, single quotes, 100 cols), `npm test` (Vitest once; `test:unit` watches, `test:coverage`), `npm run test:rules` (Firestore emulator, needs Java 11+), `npm run test:e2e` (Playwright). `functions/` is a separate package (`npm run build`). `firebase deploy --only hosting|firestore:rules|functions` (build first).

GitHub Pages: `.github/workflows/deploy-pages.yml` publishes on push to `main` with `BASE_PATH=/sakura-ecasino/` and copies `index.html` to `404.html` for deep links. Files in `public/` must be referenced through `publicUrl()`, or they 404 there.

## Structure

- `constants/` business rules (wallet.ts, vip.ts, gameTabs.ts, personalDetails.ts), `data/` static content (games, promotions, legal, demoAccounts, occupations), `services/` Firestore/Auth wrappers, `stores/` Pinia, `composables/`, `utils/`.
- `games/shared/` holds game-agnostic controls (`GameControls`, `BetMenu`, `GameLoader`, `betLevels`, `futura.css`); each game has its own folder with `components/`, `composables/`, `engine/` (pure logic and tuned constants), `spine/`, `text/`.
- Components never hold rules or data, and services/stores never import components.
- There is no client wrapper for callables yet; add `src/firebase/functions.ts` (`getFunctions(firebaseApp, 'asia-southeast1')`) and import it only where a callable is used.

## Build

- `vite.config.ts` marks `@firebase/database`, `storage` and `app-check` side-effect free: VueFire imports them, the app uses none of them (no App Check is initialized), and without the rule they ship ~130 kB in the entry chunk. If the app ever uses one of them, remove it from the rule.
- Manual chunks: `vue` has a higher priority than `firebase`, otherwise the firebase group pulls the Vue runtime in through VueFire. Don't add PrimeVue to them.
- Images: WebP (lossless) only for fully opaque images. Images with soft alpha edges (`logo-sakura.png`, `logo-wordmark.png`, `avatar-default.png`) stay PNG: libwebp premultiplies with different rounding, which shifts anti-aliased edges by 1/255 in Chrome.

## Tests and CI

- Vitest projects (`vitest.config.ts`): `unit` runs `src/**/__tests__/*.spec.ts` in node (`utils/`, `constants/`, the game `engine/`) and must not touch Firebase or the DOM; `dom` runs those under `components/`, `views/`, `router/` in jsdom with Testing Library (`src/test/renderWithApp.ts` adds PrimeVue, ToastService and a memory router; `src/test/setupDom.ts` stubs `matchMedia` with reduced motion on). DOM tests mock stores and services with `vi.mock`, never Firebase itself. All are type-checked through `tsconfig.vitest.json`.
- `rules` runs `tests/firestore/` only when `FIRESTORE_EMULATOR_HOST` is set, which `npm run test:rules` (`firebase emulators:exec`, project `demo-sakura`, offline) does. Its deposit tests repeat the exact writes of `services/wallet.ts`: change both together.
- Coverage thresholds (`test:coverage`, CI) guard `utils/`, `constants/`, `router/` and the game engine; most other code is rendering and is covered by the smoke tests instead.
- Rule-sync tests: `constants/__tests__/wallet.spec.ts` and `personalDetails.spec.ts` read `firestore.rules` and `functions/src/limits.ts` and fail when a shared limit drifts.
- `e2e/` holds Playwright smoke tests (lobby, login modal, a game spin) against the live Firebase project: `npm run dev` locally (reused if already running), `vite preview` of a fresh build when `CI` is set. Chromium only (`npx playwright install chromium` once).
- `.github/workflows/ci.yml` runs format check, lint without `--fix` (`ci:lint`), type-check, unit and DOM tests with coverage, build, the functions build, the rules tests (Java 21 + global firebase-tools) and the smoke tests on every PR and push to `main`; it needs the `VITE_FIREBASE_*` secrets, so PRs from forks fail the build steps. The Pages deploy also runs `npm test` first.
- `.github/dependabot.yml` opens weekly grouped minor/patch updates for both packages and monthly ones for actions.
- New `lint:*` scripts run as part of `npm run lint` (`run-s "lint:*"`); CI-only variants are named `ci:*`.

## Routing

- Lobby tabs (`constants/gameTabs.ts`) are routes rendering `GamesView` with a `tab` prop. `GameTabs` re-syncs after each navigation because PrimeVue highlights a clicked tab even when the guard redirects.
- `/login` renders the lobby with `AuthModal` open. Closing it replaces to `safeRedirect(query.redirect)` if signed in, else `/`.
- `meta.requiresAuth` routes redirect to `/login?redirect=`. Signing out on a guarded page (any tab) sends to `/`; views read the user null-safely because it turns null one render before that redirect.
- The wallet's Deposit/Withdraw (`WalletView` `openFlow`) sends unverified players to `/account?completeProfile=1&redirect=` or `/account?verifying=1`. Admin verifies by setting `users/{uid}.verifiedAt`. AccountView watches the query, not `onMounted`, since a navigation can land while already on `/account`. `?mode=` links use `router.replace`.
- Every `?redirect=` goes through `safeRedirect()`: same-site paths only, never `//host`, `/\host`, `/login`.
- Scroll is kept on query-only changes and lobby tab switches. `router.onError` reloads once on stale chunks (10 s sessionStorage guard).

## Money and security

- Clients never write `balance` freely: bets, payouts and withdrawals must be Cloud Functions running Admin SDK transactions that also append to `users/{uid}/transactions`. Only the QR deposit claim is client-written, checked by rules to the centavo.
- Keep equal across `src/constants/wallet.ts`, `functions/src/limits.ts`, `firestore.rules`: `MAX_BALANCE` ₱9,999,999,999.99, deposit ₱20–₱50,000, `DEPOSIT_WINDOW_MINUTES` 10, `RELOAD_BONUS_PERCENT` 30, turnover multipliers 1 / 10, methods `GCash`/`Maya` (`constants/__tests__/wallet.spec.ts` fails when they drift). Personal Details limits live in `constants/personalDetails.ts` and must match rules `validDetails`: display name 20, names 60, email 254, addresses 250, occupation 100, minimum age 21, earliest year 1900, required fields, write-once identity fields and the source-of-income list (`personalDetails.spec.ts` checks them). The rules also cap `bettingCap` at ₱10,000,000 (no UI writes it yet).
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
- All number/date display goes through `utils/format.ts` (`formatMoney`, `formatAmount`, `formatPeso`, `formatWhole`, `formatCompact`, `formatDateTime`, `formatMonthYear`, `formatCountdown`, `localMobile`, `maskMobile`); no `Intl.*Format` or `toLocaleString` in components. Balance display comes from `useBalance`.
- Every awaited Firestore/Auth call in a component shows a toast or inline error; background retries `console.warn`.
- Button links: `<Button :as="RouterLink" :to>` with `text-decoration: none`.
- Styling: `<style scoped>` with `--p-*` or `--app-*` tokens (light values under `:root:not(.app-dark)` in `main.css`), no hardcoded hex. Dark is default (`.app-dark` via `useTheme`). Accent: gold on dark, `#e0457f` on light.

## Quirks

- Teleported overlays (Dialog, Drawer, Toast, Select, DatePicker) are styled in a second unscoped `<style>` block under the component's own class (`.sakura-auth`, `.sakura-edit-name`, ...). `VerifyCodeStep` stays scoped and reads `--auth-*` from `.sakura-auth`.
- Split dialogs keep that: `WalletFlowAmount`/`Method`/`Turnover` style under `.sakura-wallet-flow`, `AuthHero`/`AuthPhoneStep` under `.sakura-auth`. Children's CSS loads before the parent's, so rules shared by several steps (and anything the parent's media queries override) stay in the parent. Scoped page splits (`WalletCard`, `WalletNotices`, `AccountHero`, `AccountDetailCards`) carry their own styles; their container queries still resolve against the page root.
- PrimeVue Button paints amber on hover/active/disabled: custom buttons restate colors for those states. Disabled Checkbox hides the tick, so locked declarations override it.
- `InputNumber` updates the model and `:max` only on blur; live inputs use `@input`. The minimum still waits for blur.
- Birthdate DatePicker (`useBirthdatePicker`, dates from `utils/birthdate.ts`): past-cutoff cells disabled via `pt` (not `max-date`, which stops paging); opens on the year grid via internal `currentView`/`currentYear`/`currentMonth` (recheck on PrimeVue upgrade).
- `HeroCarousel` calls internal `navForward` to wrap forward; items pinned to viewport width.
- `AppToast` passes no-op mouse handlers so hover pauses the timer; offset override needs `!important`.
- On-screen keyboard: iOS/Android don't shrink the layout viewport. `useKeyboardInset` reads `visualViewport`; on phones `AuthModal` lifts and caps the sheet (the hero is `AuthHero`, its slides `usePromoSlides`, its horizontal swipe and the phone sheet drag-to-close `useSheetSwipe`) (the banner stays, reachable by scrolling up) and scrolls only `.p-dialog-content` to a hidden focused input. Never `scrollIntoView` there: it scrolls the locked page behind the modal. The OTP in `VerifyCodeStep` is one transparent input over six drawn boxes, not PrimeVue `InputOtp`, because moving focus per digit makes iOS scroll the sheet on every keystroke.
- Drawer logout on phones waits for `after-hide` before opening the dialog (focus return).
- VueFire keeps the last doc when the source becomes null (trust `pendingDeposit` only while its id equals `profile.pendingDepositId`) and mutates arrays in place (watch derived computeds).
- SVG gradient/mask/clip ids use `useId()`.
- Demo accounts (`data/demoAccounts.ts`) must match Firebase console's phone test numbers; Spark sends no SMS. For them `sendPhoneCode` sets `appVerificationDisabledForTesting` and recreates the verifier when the mode changes. Shared by all visitors.
- The invisible reCAPTCHA lives on `<body>` and is recreated after failures; its badge is hidden, so `AuthModal` must show the attribution text.
- `logo-sakura.png` is 1686 × 280 (`AppHeader` measures with it); light mode draws it as a navy mask.
- `useCountUp` jumps on the first value and while not `ready()` (`fromZero` opts in). `useDragScroll` swallows the click ending a drag.
- Wallet history needs the `(type, createdAt desc)` index; pages are cached and fall back to the live last-100 list if a query fails.

## Content

- `data/legal.ts` says plainly it's a portfolio project (old casino copy is in git before `92ae0f2`). Promotions only describe real features, never cash prizes.
