# Sakura

A play-money online casino demo built as a portfolio project: a game lobby, a playable Gates of Olympus 1000 slot, phone sign-in, a wallet with QR deposits, VIP levels, promotions, and light and dark themes. No real money is involved.

Live: [meemeow.github.io/sakura-ecasino](https://meemeow.github.io/sakura-ecasino/)

## Stack

- Vue 3 (`<script setup>`, TypeScript), Vue Router, Pinia
- PrimeVue 4 (styled mode, custom preset over Aura)
- Firebase: Auth (phone), Firestore (with VueFire), Hosting; Cloud Functions scaffolded in `functions/`
- Vite, vue-tsc, oxlint + ESLint, Prettier

## Getting started

Requires Node `^22.18.0` or `>=24.12.0`.

```sh
npm install
cp .env.example .env.local   # fill in the Firebase web app config
npm run dev
```

The dev server talks to the live Firebase project; there are no emulators.

## Scripts

| Command              | What it does                            |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Start the Vite dev server               |
| `npm run build`      | Type-check and build to `dist/`         |
| `npm run type-check` | Type-check only                         |
| `npm run lint`       | oxlint, then ESLint (both with `--fix`) |
| `npm run format`     | Prettier on `src/`                      |

## Deploying

- **GitHub Pages**: every push to `main` builds and publishes through `.github/workflows/deploy-pages.yml`. It needs the six `VITE_FIREBASE_*` repository secrets.
- **Firebase**: `npm run build`, then `firebase deploy` (or `--only hosting`, `--only firestore:rules`).

## Project structure

```
src/
  components/   UI by feature (lobby, wallet, account, auth, ...) plus common/ and icons/
  composables/  reusable use* functions
  constants/    business rules: wallet limits, VIP levels, lobby tabs
  data/         static content: game catalog, promotions, legal copy
  firebase/     Firebase app, auth and Firestore instances
  games/        playable games and their shared controls
  layouts/      app shell
  router/       routes and guards
  services/     Firestore and Auth calls
  stores/       Pinia stores
  utils/        pure helpers
  views/        route pages
functions/      Cloud Functions (Admin SDK)
firestore.rules Security rules; they validate every client write that touches money
```

See [CLAUDE.md](CLAUDE.md) for the architecture, money rules and conventions.
