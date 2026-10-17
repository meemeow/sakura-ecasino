<script setup lang="ts">
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useTheme } from '@/composables/useTheme'
import SakuraIcon from './SakuraIcon.vue'
import logoUrl from '@/assets/images/logo-sakura.png'
import branchUrl from '@/assets/images/sakura-branch.svg'

const auth = useAuthStore()
const wallet = useWalletStore()
const toast = useToast()
const { isDark, toggleTheme } = useTheme()
defineProps<{ menuOpen?: boolean }>()
defineEmits<{ toggleMenu: [] }>()

const peso = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Refetches the balance from the server; the icon spins until it's back
async function refreshBalance() {
  if (!(await wallet.refreshBalance())) {
    toast.add({
      severity: 'error',
      summary: "Couldn't refresh balance",
      detail: 'Check your connection and try again.',
      life: 3000,
    })
  }
}

// Falling petals in the header: start position, size, fall time and start delay
const petals = [
  { x: '8%', s: 0.8, d: '9s', delay: '0s' },
  { x: '19%', s: 1, d: '11s', delay: '-4s' },
  { x: '31%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '43%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '52%', s: 1.1, d: '10s', delay: '-7s' },
  { x: '61%', s: 0.75, d: '9.5s', delay: '-3s' },
  { x: '70%', s: 1, d: '11.5s', delay: '-9s' },
  { x: '79%', s: 0.85, d: '8.5s', delay: '-5s' },
  { x: '90%', s: 0.7, d: '10.5s', delay: '-1s' },
]
</script>

<template>
  <header class="header">
    <!-- Cherry blossoms behind the content: one branch and drifting petals -->
    <div class="branches" aria-hidden="true">
      <img :src="branchUrl" alt="" class="branch" />
      <span
        v-for="(p, i) in petals"
        :key="i"
        class="petal"
        :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
      />
    </div>
    <div class="brand">
      <!-- Becomes a tight 2x2 grid while the menu is open. The outgoing icon spins away
           while the incoming one spins in (the grid's tiles pop in one by one). -->
      <Button
        text
        rounded
        aria-label="Menu"
        :aria-expanded="menuOpen"
        class="menu-btn"
        @click="$emit('toggleMenu')"
      >
        <template #icon>
          <span class="menu-icon">
            <Transition name="menu-swap">
              <svg
                v-if="menuOpen"
                key="grid"
                class="menu-grid"
                viewBox="0 0 22 19"
                aria-hidden="true"
              >
                <template v-for="(y, row) in [0, 10.5]" :key="y">
                  <rect
                    v-for="(x, col) in [0, 12]"
                    :key="x"
                    :x="x"
                    :y="y"
                    width="10"
                    height="8.5"
                    rx="2"
                    :style="{ '--i': row * 2 + col }"
                  />
                </template>
              </svg>
              <i v-else key="bars" class="pi pi-bars p-button-icon" aria-hidden="true" />
            </Transition>
          </span>
        </template>
      </Button>
      <RouterLink to="/" class="logo">
        <img v-if="isDark" :src="logoUrl" alt="Sakura" class="logo-img" />
        <!-- Light mode: same logo used as a stencil, filled navy so it shows on white -->
        <span
          v-else
          role="img"
          aria-label="Sakura"
          class="logo-img logo-dark"
          :style="{ '--logo-url': `url(${logoUrl})` }"
        />
      </RouterLink>
    </div>

    <nav class="actions">
      <!-- Wallet pill: gold sakura coin with ₱ in its center + balance, gold Deposit segment -->
      <div v-if="auth.isLoggedIn" class="wallet">
        <RouterLink to="/wallet" class="balance" aria-label="Balance">
          <SakuraIcon variant="gold" symbol="₱" class="coin" />
          {{ peso.format(wallet.displayBalance) }}
        </RouterLink>
        <button
          type="button"
          class="refresh"
          :class="{ spinning: wallet.refreshing }"
          aria-label="Refresh balance"
          @click="refreshBalance"
        >
          <i class="pi pi-sync" aria-hidden="true" />
        </button>
        <RouterLink to="/wallet" class="wallet-deposit" aria-label="Deposit">
          <!-- Wallet with a plus badge: "add money" -->
          <svg class="deposit-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17v3"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h7M3 7.5A2.5 2.5 0 0 0 5.5 10H19a1.5 1.5 0 0 1 1.5 1.5v1"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="18" cy="18" r="4.6" fill="currentColor" />
            <path
              d="M18 15.8v4.4M15.8 18h4.4"
              stroke="#ffc200"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </RouterLink>
      </div>
      <RouterLink v-else to="/login">
        <Button label="Join &amp; Play Now" class="auth-btn" />
      </RouterLink>
      <!-- Theme switch: the track shows the current mode's icon, the sakura knob slides over -->
      <button
        type="button"
        role="switch"
        :aria-checked="isDark"
        aria-label="Dark mode"
        class="theme-switch"
        :class="isDark ? 'is-dark' : 'is-light'"
        @click="toggleTheme"
      >
        <svg class="track-icon sun" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5" fill="currentColor" />
          <path
            d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        </svg>
        <svg class="track-icon moon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor" />
        </svg>
        <span class="knob"><SakuraIcon /></span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 66px;
  padding: 0 16px 0 24px;
  background: var(--app-navbar);
  border-bottom: 1px solid var(--app-border);
}

/* Cherry blossoms behind the header content. z-index -1 stays inside the header's own
   stacking context (sticky + z-index), so they paint over the background but under the
   buttons. One branch reaches in from the right, and loose petals drift across the bar. */
.branches {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

/* Grows in from the right edge, its cluster behind the wallet pill and the bare tip
   pointing back toward the logo */
.branch {
  position: absolute;
  top: 0;
  right: 0;
  height: 66px;
  user-select: none;
}

/* Falling petals: each drifts down and to the left while tumbling, then loops.
   Spread across the bar with their own size, speed and start time. */
.petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: petal-fall var(--d) linear var(--delay) infinite;
}

@keyframes petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  12% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-90px, 92px) rotate(320deg);
  }
}

/* Dark mode: dimmed so the blossoms glow softly on navy instead of shouting */
:root.app-dark .branch {
  opacity: 0.6;
}

:root.app-dark .petal {
  filter: brightness(0.75);
}

@media (prefers-reduced-motion: reduce) {
  .petal {
    display: none;
  }
}

/* Small screens: the logo and wallet fill the bar, so only the petals stay */
@media (max-width: 900px) {
  .branch {
    display: none;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Lets the logo give way before the actions overflow the viewport */
  min-width: 0;
}

.menu-btn {
  width: 44px;
  height: 44px;
  margin-left: -12px;
  color: var(--app-text);
}

/* Light mode: the logo's navy, so the icon and wordmark read as one */
:root:not(.app-dark) .menu-btn {
  color: #1b2550;
}

.menu-btn :deep(.p-button-icon) {
  font-size: 1.4rem;
}

/* PrimeIcons' bars are thin; thicken them a little */
.menu-btn :deep(.pi-bars) {
  -webkit-text-stroke: 0.8px currentColor;
}

/* 10% wider than the burger (its bars span 77.5% of the 1.4rem glyph, plus the 0.8px stroke);
   height follows the 22:19 viewBox */
.menu-grid {
  width: calc((1.4rem * 0.775 + 0.8px) * 1.1);
  aspect-ratio: 22 / 19;
  fill: currentColor;
}

/* Both icons share one cell so they can cross over during the swap */
.menu-icon {
  display: grid;
  place-items: center;
}

.menu-icon > * {
  grid-area: 1 / 1;
}

.menu-swap-enter-active {
  transition:
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.menu-swap-leave-active {
  transition:
    transform 0.25s ease-in,
    opacity 0.2s ease-in;
}

.menu-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.4);
}

.menu-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.4);
}

/* Grid tiles pop in one after another */
.menu-grid.menu-swap-enter-active rect {
  transform-box: fill-box;
  transform-origin: center;
  animation: tile-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i) * 50ms);
}

@keyframes tile-pop {
  from {
    transform: scale(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .menu-swap-enter-active,
  .menu-swap-leave-active {
    transition: none;
  }

  .menu-grid.menu-swap-enter-active rect {
    animation: none;
  }
}

.logo {
  display: flex;
  min-width: 0;
}

.logo-img {
  height: 22px;
  max-width: 100%;
  object-fit: contain;
  object-position: left center;
}

.logo-dark {
  display: block;
  /* logo-sakura.png is 1686 x 280 */
  aspect-ratio: 1686 / 280;
  background: #1b2550;
  mask: var(--logo-url) left center / contain no-repeat;
}

.actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.actions a {
  display: flex;
  text-decoration: none;
}

.wallet {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-panel);
  font-family: 'Montserrat', sans-serif;
}

/* Light mode: white pill lifted by a soft shadow, like the sidebar's member card
   (the grey panel looked dull over the blossoms) */
:root:not(.app-dark) .wallet {
  border-color: rgb(27 37 80 / 0.07);
  background: #fff;
  box-shadow: 0 3px 10px rgb(27 37 80 / 0.1);
}

.balance {
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  color: var(--app-gold-text);
  font-weight: 600;
  font-size: 0.85rem;
}

.refresh {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-right: 2px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.refresh:hover {
  background: rgb(128 140 175 / 0.12);
  color: var(--app-gold-text);
}

.refresh:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 1px;
}

/* Bold two-arrow sync icon */
.refresh .pi {
  font-size: 0.85rem;
  -webkit-text-stroke: 0.6px currentColor;
}

.refresh.spinning .pi {
  animation: refresh-spin 0.7s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Gold sakura in place of a ₱ coin */
.coin {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.3));
}

/* Gold, matching the sakura coin and the balance */
.wallet-deposit {
  align-items: center;
  gap: 6px;
  height: 100%;
  /* Icon only: a short pill */
  padding: 0 16px;
  border-radius: 999px;
  background: linear-gradient(#ffe27a, #ffc200 55%, #e8a200);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.45),
    inset 0 -2px 0 #d9871f;
  color: #703902;
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition:
    box-shadow 0.2s,
    filter 0.2s,
    transform 0.1s;
}

.wallet-deposit:hover {
  filter: brightness(1.06);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.45),
    inset 0 -2px 0 #d9871f,
    0 0 14px rgb(255 194 0 / 0.5);
}

.deposit-icon {
  flex: 0 0 auto;
  width: 21px;
  height: 21px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Little hop on hover */
.wallet-deposit:hover .deposit-icon {
  transform: translateY(-0.75px) scale(1.04);
}

.wallet-deposit:active {
  transform: scale(0.96);
}

.wallet-deposit:focus-visible {
  outline: 2px solid #ffc200;
  outline-offset: 2px;
}

/* Gold 3D button: solid face with a darker bottom edge */
/* Login or Register: the logo's colors, like the logout modal's main button.
   Dark mode is lavender with navy text, light mode is navy with white text. */
.auth-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  /* reserve room for the 5px edge so face + edge center together */
  margin-bottom: 5px;
  color: #1b2550;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* PrimeVue sets its own weight on the label span */
.auth-btn :deep(.p-button-label) {
  font-weight: 900;
}

/* PrimeVue paints its amber primary on hover/active, so restate the face */
.auth-btn:not(:disabled):hover,
.auth-btn:not(:disabled):active {
  border: none;
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
  color: #1b2550;
}

.auth-btn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}

:root:not(.app-dark) .auth-btn {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 5px 0 #0b1029;
  color: #fff;
}

:root:not(.app-dark) .auth-btn:not(:disabled):hover,
:root:not(.app-dark) .auth-btn:not(:disabled):active {
  background: linear-gradient(#3d4b9a, #222d60 55%, #161f47);
  color: #fff;
}

:root:not(.app-dark) .auth-btn:not(:disabled):active {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 2px 0 #0b1029;
}

/* Theme switch. Dark: navy track, moon on the right, knob left.
   Light: pink track, sun on the left, knob right. */
.theme-switch {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 30px;
  padding: 0;
  border: 1px solid;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background-color 0.3s,
    border-color 0.3s;
}

.theme-switch.is-dark {
  background: #1a2042;
  border-color: #2f3868;
}

.theme-switch.is-light {
  background: #ffe3ee;
  border-color: #f3b3cb;
}

.theme-switch:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

.track-icon {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  transform: translateY(-50%);
  transition: opacity 0.3s;
}

.sun {
  left: 9px;
  color: #f59e0b;
}

.moon {
  right: 9px;
  color: #ffc200;
}

.is-dark .sun,
.is-light .moon {
  opacity: 0;
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  transition:
    transform 0.3s ease,
    background-color 0.3s;
}

.is-dark .knob {
  background: #2c3563;
}

.is-light .knob {
  background: #ffffff;
  transform: translateX(26px) rotate(72deg);
}

.knob svg {
  width: 18px;
  height: 18px;
}

.theme-switch:hover .knob {
  box-shadow: 0 0 0 3px rgb(255 194 0 / 0.35);
}

@media (max-width: 480px) {
  .header {
    padding-left: 16px;
  }

  /* Phones: just the Deposit segment (balance + refresh live in the sidebar).
     Must beat `.actions a { display: flex }` */
  .actions .balance,
  .refresh {
    display: none;
  }
}

@media (max-width: 380px) {
  .header {
    padding: 0 12px;
  }

  .menu-btn {
    margin-left: -8px;
  }

  .logo-img {
    height: 18px;
  }

  .actions {
    gap: 8px;
  }

  .auth-btn,
  .wallet-deposit {
    padding-inline: 12px;
  }
}
</style>
