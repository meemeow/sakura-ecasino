# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sakura is a single-page online casino app: Vue 3 + TypeScript + Vite on the frontend, Firebase (Auth, Firestore, Cloud Functions, Hosting) on the backend. Firebase project ID: `sakura-ecasino`.

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

There is no test runner set up yet.

## Layout

```
src/
  firebase/      initializeApp + exported auth, db, functions
  router/        routes + auth guard
  stores/        Pinia setup stores (auth, wallet, favorites)
  services/      Firestore queries and callable-function wrappers
  composables/   reusable use* functions
  views/         route-level pages
  layouts/       page shells (header + content)
  components/    grouped by feature: auth/, games/, layout/
  theme/         PrimeVue preset
  types/         shared TS types
  assets/styles/ main.css (global only)
functions/src/   Cloud Functions (Admin SDK)
```

## Routing model

`/`, `/slots`, `/favorites` and the other category tabs (defined in `components/games/gameTabs.ts`) all render `views/GamesView.vue` with a `tab` prop, and the tabs in `GameTabs.vue` navigate between routes, so the active tab is always in the URL. `/login` renders the same view with `showAuth: true`, which opens `AuthModal` over the lobby. Closing the modal calls `router.replace` to the `?redirect=` query if the user is signed in, otherwise to `/` (the redirect target is guarded and would reopen the modal).

Routes with `meta.requiresAuth` (`/favorites`, `/wallet`, `/account`) are guarded in `router/index.ts` using VueFire's `getCurrentUser()`. A signed-out user is redirected to `/login?redirect=<path>`. Routes with `meta.requiresProfile` also need a verified account (`verificationStatus` in `services/profile.ts`); no route uses it at the moment. If the personal details or declarations are missing, the guard sends the player to `/account?completeProfile=1&redirect=<path>`, which opens the Personal Details dialog. Once saved, the account is "verifying" until an admin approves it by setting `users/{uid}.verifiedAt` (Firebase console or Admin SDK; clients can't write it), and the guard sends the player to `/account?verifying=1` instead.

`/wallet` only needs sign-in, so any player can see their balance and history. Its Deposit / Withdraw buttons (and `/wallet?mode=deposit|withdraw` links, which open the dialog directly) run the same verification check in `WalletView.vue`'s `openFlow` and redirect to the account page the same way, with `redirect=/wallet?mode=<mode>`.

## Money and security rules

- **Clients never write `balance`.** Deposits, withdrawals, bets and payouts must be callable Cloud Functions that update `users/{uid}.balance` and append to `users/{uid}/transactions` in a Firestore transaction using the Admin SDK. `firestore.rules` enforces this; keep it in sync when adding collections.
- Balance cap: ₱9,999,999,999.99 (`MAX_BALANCE` in `src/stores/wallet.ts` and `functions/src/limits.ts`, keep them equal). Functions must never credit past it: reject deposits over the cap and cap payouts with `capCredit()`.
- Reload Bonus: 30% of a deposit, once per Philippine day (`RELOAD_BONUS_RATE`, `reloadBonusFor`, `reloadBonusUsedToday` in the same two files, keep them equal). The deposit function recomputes it, checks and sets `users/{uid}.lastReloadBonusAt` in its transaction, and never trusts a bonus amount from the client.
- Turnover: before withdrawing, a player must bet 1× each deposit plus 10× its Reload Bonus (`TURNOVER_*` and `turnoverFor` in `src/components/wallet/walletOptions.ts` and `functions/src/limits.ts`, keep them equal). Functions keep `users/{uid}.turnoverRequired` / `turnoverRemaining` up to date in the deposit and bet transactions (`turnoverAfterDeposit`, `turnoverAfterBet`) and must reject withdrawals while `turnoverRemaining > 0`; the client's block is only for display.
- QR deposits (`functions/src/deposits.ts`): the `createDeposit` callable opens a `pending` deposit transaction (server-computed bonus, `DEPOSIT_WINDOW_MINUTES` = 10 expiry) and sets `users/{uid}.pendingDepositId`, so a player has one open deposit at a time. The player pays the admin's GCash/Maya QR on `/wallet/deposit/:id` (`DepositPayView.vue`) and adds `sentAmount` (must equal `amount`) + `reference`, the only client write `firestore.rules` allow on a transaction. The admin approves by setting `approvedAt` on that transaction in the Firebase console (or `rejectedAt`), and the `onDepositDecision` trigger credits balance, bonus, `totalDeposit` and turnover. Unapproved past `expiresAt` it reads as expired and the player may start another; a late approval still credits it.
- Firestore data model: `games/{gameId}` (public read, admin write), `users/{uid}` (owner read/update except `balance`), `users/{uid}/favorites/{gameId}` (owner read/write), `users/{uid}/transactions/{txId}` (owner read-only).
- Functions run in `asia-southeast1`. The client's `getFunctions(app, 'asia-southeast1')` in `src/firebase/index.ts` must use the same region.
- Cloud Functions require the Blaze billing plan; the project is currently on Spark.

## Conventions

- Import with the `@/` alias (maps to `src/`).
- Firebase config comes from `VITE_FIREBASE_*` env vars in `.env.local` (gitignored); `.env.example` lists the keys. Read the user and Firestore data through VueFire (`useCurrentUser`, `useDocument`, `useCollection`) rather than hand-written `onSnapshot` listeners.
- Styling: PrimeVue components first. Custom styling goes in `<style scoped>` using CSS variables, either PrimeVue's tokens (`--p-primary-color` etc.) or the app's own (`--app-*` in `src/assets/styles/main.css`). Brand colors change in `src/theme/preset.ts`. Dark is the default; the header's sun/moon button switches themes via `composables/useTheme.ts`, which toggles `.app-dark` on `<html>` and saves the choice in localStorage. Light values for the `--app-*` tokens live under `:root:not(.app-dark)` in `main.css`, so use those tokens instead of hardcoded hex colors.
- Import PrimeVue components per file (`import Button from 'primevue/button'`); they are not registered globally.
