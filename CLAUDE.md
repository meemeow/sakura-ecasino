# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## No code comments

Do not write comments in any file: TypeScript, Vue (script, template and style), CSS, SVG, `firestore.rules`, configs or workflows. Name things so the code explains itself. Anything a future reader genuinely needs to be reminded of (a non-obvious reason, a library quirk, a value that must stay in sync with another file) goes in this file, under the matching section below. The only allowed comments are tool directives: `/// <reference ...>`, `// prettier-ignore`, `// eslint-disable...`, `// @ts-expect-error`.

## Project

Sakura is a single-page online casino demo (play money only): Vue 3 + TypeScript + Vite on the frontend, Firebase (Auth, Firestore, Cloud Functions, Hosting) on the backend. Firebase project ID: `sakura-ecasino`.

Stack: Vue 3 (`<script setup>`, Composition API), Vue Router, Pinia, VueFire, PrimeVue (styled mode, custom preset over Aura). No Tailwind. Firebase Storage is intentionally not used yet.

## Commands

Frontend (repo root):
- `npm run dev`: Vite dev server
- `npm run build`: type-check (`vue-tsc`) and production build to `dist/`, run in parallel
- `npm run type-check`: type-check only
- `npm run lint`: oxlint then ESLint, both with `--fix`
- `npm run format`: Prettier on `src/` (no semicolons, single quotes, 100 cols)

Cloud Functions (`functions/`, separate npm package):
- `npm run build` / `npm run build:watch`: compile `src/` to `lib/`

Firebase (repo root):
- `firebase deploy` or `--only hosting|firestore:rules|functions`. Hosting serves `dist/`, so run `npm run build` first.
- No Firebase emulators: the dev app always talks to the live `sakura-ecasino` project.

GitHub Pages (`meemeow.github.io/sakura-ecasino`): `.github/workflows/deploy-pages.yml` builds and publishes on every push to `main` (or by hand from the Actions tab), with `BASE_PATH=/sakura-ecasino/` and the six `VITE_FIREBASE_*` repository secrets. Pages has no SPA fallback, so the workflow copies `index.html` to `404.html` to make deep links and refreshes work. Paths to files in `public/` must go through `publicUrl()` (`src/utils/publicUrl.ts`) so they pick up the base path; a bare `'/hero/...'` 404s there.

There is no test runner set up yet.

## Layout

```
src/
  firebase/      initializeApp + auth, db (index.ts); functions client in functions.ts (import only when used)
  router/        routes, auth guard, sign-out redirect, stale-chunk reload
  stores/        Pinia setup stores (auth, wallet, favorites)
  services/      Firestore reads/writes and callable-function wrappers (auth, profile, wallet, history)
  composables/   reusable use* functions
  constants/     business rules and fixed config: wallet.ts (money limits, bonus, turnover, methods), vip.ts, gameTabs.ts
  data/          static content: games.ts (local catalog), promotions.ts, legal.ts, countries/nationalities JSON
  utils/         pure helpers: format.ts, redirect.ts, withTimeout.ts, publicUrl.ts
  types/         shared TS types
  views/         route-level pages
  layouts/       page shells (header + sidebar + content)
  components/
    common/      generic UI (DialogBand, EmptyState)
    icons/       drawn SVG icon components (SakuraIcon, WalletActionIcon, SakuraCoinIcon, PencilIcon)
    layout/      app shell (AppHeader, AppSidebar, AppToast)
    lobby/       game lobby (GameCard, GameGrid, GameSearch, GameTabs, HeroCarousel)
    account/ auth/ legal/ promotions/ vip/ wallet/   feature components
  games/         playable games: shared controls (GameControls, BetMenu, GameLoader, betLevels) + one folder per game
  theme/         PrimeVue preset
  assets/        images, icons, styles/main.css (global only)
functions/src/   Cloud Functions (Admin SDK)
```

Components never hold business rules or static data; those live in `constants/` and `data/`, so `services/` and `stores/` never import from `components/`.

## Routing model

`/`, `/slots`, `/favorites` and the other category tabs (defined in `constants/gameTabs.ts`) all render `views/GamesView.vue` with a `tab` prop, and the tabs in `GameTabs.vue` navigate between routes, so the active tab is always in the URL. `GameTabs` re-syncs its selected tab after every navigation because PrimeVue highlights a clicked tab immediately even when the guard redirects. `/login` renders the same view with `showAuth: true`, which opens `AuthModal` over the lobby. Closing the modal calls `router.replace` to `safeRedirect(route.query.redirect)` if the user is signed in, otherwise to `/` (the redirect target is guarded and would reopen the modal).

Routes with `meta.requiresAuth` (`/favorites`, `/wallet`, `/wallet/deposit/:id`, `/account`) are guarded in `router/index.ts` using VueFire's `getCurrentUser()`. A signed-out user is redirected to `/login?redirect=<path>`. If the user signs out while on a guarded page (including from another tab), `onAuthStateChanged` in the router sends them to `/`. Views on guarded routes must still read the user null-safely (`auth.user?.uid`): the user turns null one render before that redirect lands.

Routes with `meta.requiresProfile` also need a verified account (`verificationStatus` in `services/profile.ts`); no route uses it at the moment. If the personal details or declarations are missing, the guard sends the player to `/account?completeProfile=1&redirect=<path>`, which opens the Personal Details dialog. Once saved, the account is "verifying" until an admin approves it by setting `users/{uid}.verifiedAt` (Firebase console or Admin SDK; clients can't write it), and the guard sends the player to `/account?verifying=1` instead. AccountView watches the query rather than using `onMounted`, because the guard can redirect there while the player is already on `/account`; closing the dialog unsaved drops `?completeProfile` so the next redirect is a real navigation.

`/wallet` only needs sign-in, so any player can see their balance and history. Its Deposit / Withdraw buttons (and `/wallet?mode=deposit|withdraw` links, which open the dialog directly) run the same verification check in `WalletView.vue`'s `openFlow` and redirect to the account page the same way, with `redirect=/wallet?mode=<mode>`. Links arriving with `?mode=` use `router.replace` so Back doesn't bounce.

Every `?redirect=` value goes through `safeRedirect()` (`utils/redirect.ts`): only same-site paths, never `//host`, `/\host` or `/login`.

Scroll: a new page starts at the top; back/forward restore the saved position; query-only changes and switching between lobby tabs keep the scroll so the tab strip stays in view.

After a deploy, an open tab may request lazy chunks that no longer exist. `router.onError` reloads the target URL once (guarded by a 10-second sessionStorage stamp so a truly missing chunk can't loop).

## Money and security rules

- **Clients never write `balance` freely.** Withdrawals, bets and payouts must be callable Cloud Functions that update `users/{uid}.balance` and append to `users/{uid}/transactions` in a Firestore transaction using the Admin SDK. The one exception is crediting an approved QR deposit (below), which `firestore.rules` check to the centavo. Keep the rules in sync when adding collections.
- Values that must stay equal across `src/constants/wallet.ts`, `functions/src/limits.ts` and `firestore.rules`: `MAX_BALANCE` (₱9,999,999,999.99, `maxBalance()` in the rules), `MIN_DEPOSIT` / `MAX_DEPOSIT` (₱20 / ₱50,000), `DEPOSIT_WINDOW_MINUTES` (10, `depositWindow()`), `RELOAD_BONUS_PERCENT` (30), `TURNOVER_DEPOSIT_MULTIPLIER` / `TURNOVER_BONUS_MULTIPLIER` (1 / 10), the deposit methods (`GCash`, `Maya`), and the Personal Details limits and source-of-income list (rules' `validDetails`, `PersonalDetailsDialog`, `EditNameDialog`: display name ≤ 20, names ≤ 60, email ≤ 254, addresses ≤ 250, occupation ≤ 100, betting cap ≤ ₱10,000,000).
- Functions must never credit past the balance cap: reject deposits over it and cap payouts with `capCredit()`.
- Reload Bonus: 30% of a deposit, once per Philippine day (`reloadBonusFor`, `reloadBonusUsedToday`, `phDay`). It is computed as `Math.round(amount * 30) / 100` everywhere, never `amount * 0.3`, because `0.3 * 100` is not exactly 30 in floating point and the rules compare to the centavo. A function must recompute it and never trust a client's bonus. The bonus history entry is written at the fixed id `{depositId}_bonus` so it can only exist once; `TransactionList` uses that id to show the source deposit's gateway and reference.
- Turnover: before withdrawing, a player must bet 1× each deposit plus 10× its Reload Bonus (`turnoverFor`). A credited deposit applies `turnoverAfterDeposit`: if nothing was left to bet, a new cycle starts so the progress bar only measures the new requirement. Bet functions count it down with `turnoverAfterBet` (never below 0); withdraw must reject with `failed-precondition` while `turnoverRemaining > 0`. The client's block is display only.
- VIP: `users/{uid}.totalDeposit` and `totalBet` decide the level (`constants/vip.ts`, both minimums must be met). Deposit and bet functions must increment them in the same transaction. A rank is 10 levels; one petal grows every two levels; only VIP 50 gets the gold Sakura chip (`assets/icons/promos/vip.svg`).
- QR deposits run on the Spark plan with no Cloud Functions: the player's app writes every step (`src/services/wallet.ts`) and `firestore.rules` check each one.
  1. `createDeposit` opens a `pending` deposit transaction and sets `users/{uid}.pendingDepositId` in one batch (rules: `opensDeposit` + `opensNewDeposit`): amount in range and whole centavos, method, exact bonus or 0, balance cap, verified account, no other deposit still open, `createdAt == request.time`.
  2. Sakura is a play-money demo: on `/wallet/deposit/:id` (`DepositPayView.vue`) the player presses "I've paid" with `sentAmount` (must equal `amount`) and any dummy `reference` (8–16 letters/digits) within the window, and the same write sets `approvedAt` (rules: `addsProof`). The QR shown is the developer's real one, labelled as a demo placement and open for donations only; it never adds credits.
  3. The admin may still set `rejectedAt` in the Firebase console; the player's app then marks it `failed` (`closesRejected`).
  4. The wallet store watches decided deposits and runs `claimDeposit`: one transaction crediting balance, bonus (none if today's was used since), `totalDeposit` and turnover, marking the deposit `successful`, with `claimedDepositId` tying the profile write to it (`claimsDeposit` + `closesClaimed`). The arithmetic in `claimDeposit` is written in the same order as the rules' float math so the totals match exactly.
  5. Undecided after the window, the app marks it `expired` and clears `pendingDepositId` (`closesExpired`, `clearsPending`; checked against server time, so the store waits a 3-second grace and retries every 10 s if refused). A late approval still credits an expired deposit.
- Firestore data model: `games/{gameId}` (public read, admin write), `users/{uid}` (owner read; owner may write only `displayName`, `bettingCap`, `consentedAt` and the Personal Details fields, validated, plus the checked QR deposit writes), `users/{uid}/favorites/{gameId}` (owner create/delete; id must match `^[a-z0-9-]{1,80}$`, body only `addedAt`; the count can't be capped without a function), `users/{uid}/transactions/{txId}` (owner read; QR deposit steps only).
- Identity fields (`firstName`, `middleName`, `lastName`, `birthdate`, `nationality`) can be filled once, then only changed through the Admin SDK (`keepsIdentity`). `consentedAt` must equal `request.time` so declarations can't be backdated.
- Birthdate is stored as `'YYYY-MM-DD'` (not a Timestamp) to avoid time-zone shifts, from 1900 on, and the player must be 21+ today in Philippine time (PAGCOR). The rules' `validBirthdate` counts from the 1st of the month plus days so 29 February can't produce an invalid date, and shifts by 8 hours because `timestamp.date()` is UTC midnight. The dialog's `maxBirthdate` uses the same rule.
- `fetchProfile` reads with `serverTimestamps: 'estimate'` so a just-saved `consentedAt` isn't read as null.
- Firestore keeps retrying offline writes forever, so profile saves race a 10-second `withTimeout` and show a connection error.
- Functions run in `asia-southeast1`; the client's `getFunctions` in `src/firebase/functions.ts` must use the same region. `setGlobalOptions` caps each function at 10 instances. Cloud Functions require the Blaze billing plan; the project is currently on Spark.
- Hosting sends `nosniff`, `Referrer-Policy` and `Permissions-Policy` headers, caches `/assets/**` (hashed) for a year and revalidates HTML. Don't add `X-Frame-Options`/`frame-ancestors` without checking Firebase Auth's `/__/auth/iframe`, which is served from the same hosting.
- `v-html` is only allowed with hardcoded strings (the Gates of Olympus rules screen). Never pass user or Firestore data to it.
- `src/firebase/index.ts` throws at startup if any `VITE_FIREBASE_*` value is missing.

## Conventions

- Import with the `@/` alias (maps to `src/`), never relative paths.
- In `<script setup>`, put `defineProps` / `defineModel` / `defineEmits` right after the imports.
- Firebase config comes from `VITE_FIREBASE_*` env vars in `.env.local` (gitignored); `.env.example` lists the keys (fill them from Firebase console > Project settings). Read the user and Firestore data through VueFire (`useCurrentUser`, `useDocument`, `useCollection`) rather than hand-written `onSnapshot` listeners.
- Money formatting comes from `utils/format.ts`: `formatMoney` (always 2 decimals), `formatAmount` (up to 2), `formatPeso` (currency style, used in games), `formatCountdown` (m:ss). Phone display uses `localMobile` / `maskMobile`. Don't create `Intl.NumberFormat` instances in components.
- Balance display with count-up and the refresh button with its error toast come from `composables/useBalance.ts`.
- Error handling: every awaited Firestore or Auth call in a component is wrapped and shows a toast or inline error. `main.ts` sets `app.config.errorHandler` as a last resort toast. Background retries (wallet store) log with `console.warn`.
- Links styled as buttons use `<Button :as="RouterLink" :to="...">` (import `RouterLink` from `vue-router`), never a `<Button>` inside a `<RouterLink>`; add `text-decoration: none` to the button's class.
- Styling: PrimeVue components first. Custom styling goes in `<style scoped>` using CSS variables, either PrimeVue's tokens (`--p-primary-color` etc.) or the app's own (`--app-*` in `src/assets/styles/main.css`). Brand colors change in `src/theme/preset.ts`. Dark is the default; the header's sun/moon button switches themes via `composables/useTheme.ts`, which toggles `.app-dark` on `<html>` and saves the choice in localStorage. Light values for the `--app-*` tokens live under `:root:not(.app-dark)` in `main.css`, so use those tokens instead of hardcoded hex colors. Accent convention: gold on dark, sakura pink (`#e0457f`) on light.
- Import PrimeVue components per file (`import Button from 'primevue/button'`); they are not registered globally.
- Vite splits `firebase` and `vue` vendor chunks (`vite.config.ts`) so they stay cached across deploys. Don't group PrimeVue: its components belong to the lazy route chunks that use them.

## PrimeVue, VueFire and browser quirks

- Dialog, Drawer, Toast, Select and DatePicker overlays teleport to `<body>`, so their styles live in a second, unscoped `<style>` block with every rule under the component's own class (`.sakura-auth`, `.sakura-edit-name`, `.pager-popover`, ...). `VerifyCodeStep` can stay scoped because its elements carry the scope attribute; it reads `--auth-*` variables from `.sakura-auth`. `PersonalDetailsDialog` shares `EditNameDialog`'s `.sakura-edit-name` form styles and doubles its class to win on width.
- PrimeVue paints its amber primary on Button hover/active/disabled, so custom-colored buttons restate their colors for those states.
- PrimeVue's disabled Checkbox fades the tick away; the locked declarations restyle it with a more specific selector.
- `InputNumber` only updates its model and applies `:max` on blur. Inputs that need live values listen to `@input` (`capWhileTyping`, `onAmountInput`). The minimum still waits for blur, or typing "500" would snap the "5" to 20.
- DatePicker: the birthdate picker pages 1900–2099, but days/months/years past the 21+ cutoff are disabled through `pt` (click and Enter/Space swallowed in capture phase) because `max-date` would also stop paging. The arrows are disabled at the paging limits since PrimeVue's ignore min/max. It opens on the year grid at the cutoff by setting the internal `currentView`/`currentYear`/`currentMonth` (PrimeVue 4 internals; recheck on upgrade).
- Carousel: `HeroCarousel` runs its own autoplay and calls the internal `navForward` so the last slide wraps forward through the cloned first slide. Items are pinned to one viewport width or a long title widens them.
- Toast: PrimeVue only pauses the close timer on hover when `onMouseEnter`/`onMouseLeave` handlers exist, so `AppToast` passes no-op ones. Its offset is an inline style, so the CSS override needs `!important`.
- On-screen keyboards: iOS Safari (and Android Chrome since 108) don't shrink the layout viewport, so a fixed bottom sheet ends up under the keyboard. `useKeyboardInset` reads `visualViewport` (`innerHeight - height - offsetTop`, ignored while pinch-zoomed); on phones `AuthModal` lifts the sheet by that inset, caps it to the visible height, collapses the banner to a 60px strip and, once the keyboard has settled, scrolls only `.p-dialog-content` to centre the focused input if it is hidden. Never use `scrollIntoView` there: it also scrolls the locked page behind the modal, which then can't be scrolled back, and running it on every focus makes the OTP boxes bounce as each digit moves focus.
- Drawer: on phones, logging out from the drawer waits for `after-hide` before opening the dialog, because the closing drawer returns focus to the menu button and would pull it out of the dialog.
- VueFire keeps the last document when a source becomes null, so `pendingDeposit` is only trusted while its id still equals `profile.pendingDepositId`. VueFire also updates arrays in place, so watchers watch derived computeds (decided/undecided deposits), not the raw array.
- SVG gradients, masks and clip paths need ids unique per instance (`useId()`), since many icons render on one page.
- Demo accounts: the project is on Spark, where Firebase sends no real SMS, so sign-in uses the four test phone numbers in `data/demoAccounts.ts`. They must match the list under Firebase console > Authentication > Sign-in method > Phone > Phone numbers for testing. The login step lists them; picking one sends the code, and `VerifyCodeStep` fills in the known code, which verifies automatically. For demo numbers `sendPhoneCode` sets `auth.settings.appVerificationDisabledForTesting` so no reCAPTCHA challenge appears (Firebase only accepts that for registered test numbers) and recreates the verifier whenever the mode changes, because Firebase picks a real or mock verifier at construction. The accounts are shared by every visitor.
- Firebase phone auth's invisible reCAPTCHA lives in its own element on `<body>` (so it survives the dialog closing) and is recreated after any failure. Its badge is hidden in `main.css`, which Google allows only with the attribution text shown in `AuthModal`.
- `logo-sakura.png` is 1686 × 280; `AppHeader` uses that ratio to measure whether the balance fits beside the full-width logo. In light mode the logo is drawn as a CSS mask stencil filled navy.
- `useCountUp` jumps (doesn't count) while `ready()` is false and on the first loaded value, so opening the app doesn't count every balance up from 0; `fromZero` opts into counting the first value. Reduced-motion users get the value instantly.
- `useDragScroll` adds mouse drag with momentum to horizontal strips (touch scrolls natively) and swallows the click that ends a drag in the capture phase.
- Wallet history (`services/history.ts`, `WalletHistory.vue`) pages straight from Firestore with cursors and needs the `(type, createdAt desc)` index in `firestore.indexes.json`. Fetched pages are cached; a new transaction at the top clears the cache. Counts come from one shared aggregation request per reset. If a page query fails (e.g. the index is still building) the table falls back to the live last-100 list.

## Games

- `views/PlayView.vue` maps catalog ids to lazily loaded game components and shows `GameLoader` at 0% while the chunk downloads; the game then reports asset progress itself.
- Game UIs are rebuilt from the original game's screenshots. Layouts use the original pixel grid through container units: the stage is 1920 × 1080 design px (1cqw = 19.2 px), and panels define a `--p` unit equal to one screenshot pixel (BetMenu 930 wide, AutoplaySettings 544 × 499, GameRules 1180 × 692 at 82.04% of the stage). Reel art is cut 1:1 from a 191.5 × 145.6 cell, with per-symbol boxes in `REEL_ART`.
- The stage is centered with margins, not `translate(-50%)`, because a half-pixel offset blurs the art. The flash layer sits in a non-isolated twin box so `mix-blend-mode: screen` reaches the background.
- Spin speeds and win animations are timed from 48 fps recordings of the original. Zeus's idle, strike and light animations are animated WebPs; `zeus-idle.webp` starts at frame 64 so restarting it as the strike ends continues seamlessly. Each play needs a fresh blob URL because browsers only restart an animated image when its URL changes; all blob URLs are revoked after use and on unmount.
- `useLoopingMusic` plays gapless loops through the Web Audio API (an `<audio loop>` clicks at the loop point). Browsers keep audio locked until a click or key press on a direct load; `blocked` is true meanwhile and the sound button shows as muted. It listens for `click` (not `pointerdown`) so the first click on the sound button still sees the sound as blocked.
- Gates of Olympus is a demo with its own credit (₱100,000) and is not wired to the wallet yet. When it is, every bet and payout must go through a Cloud Function (see Money and security rules).

## Content

- The Terms and Privacy copy (`data/legal.ts`) says plainly that Sakura is a personal portfolio project. The original casino-style copy was kept as a commented block until commit `92ae0f2`; recover it from git history if it's needed.
- Promotions (`data/promotions.ts`) only describe what the app really does (Reload Bonus, VIP levels, Get Verified) and never promise cash prizes.
