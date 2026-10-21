<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useBalance } from '@/composables/useBalance'
import { useTheme } from '@/composables/useTheme'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import logoUrl from '@/assets/images/logo-sakura.png'
import branchUrl from '@/assets/images/sakura-branch.svg'
import { formatMoney } from '@/utils/format'

defineProps<{ menuOpen?: boolean }>()
defineEmits<{ toggleMenu: [] }>()

const auth = useAuthStore()
const wallet = useWalletStore()
const { shownBalance, refreshBalance } = useBalance()
const { isDark, toggleTheme } = useTheme()

const headerEl = ref<HTMLElement | null>(null)
const brandEl = ref<HTMLElement | null>(null)
const actionsEl = ref<HTMLElement | null>(null)
const balanceLink = ref<ComponentPublicInstance | null>(null)
const refreshEl = ref<HTMLElement | null>(null)
const balanceFits = ref(true)
const BREATHING_ROOM = 24
const LOGO_RATIO = 1686 / 280

function fitBalance() {
  const header = headerEl.value
  const brand = brandEl.value
  const actions = actionsEl.value
  const balance = balanceLink.value?.$el as HTMLElement | undefined
  if (!header || !brand || !actions || !balance) return
  const style = getComputedStyle(header)
  const inner = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const logo = brand.querySelector<HTMLElement>('.logo-img')
  const logoFull = logo ? logo.offsetHeight * LOGO_RATIO : 0
  const brandFull = brand.offsetWidth - (logo?.offsetWidth ?? 0) + logoFull
  const refresh = refreshEl.value
  const needed =
    balance.offsetWidth +
    (refresh ? refresh.offsetWidth + parseFloat(getComputedStyle(refresh).marginRight) : 0)
  const actionsWithout = actions.offsetWidth - (balanceFits.value ? needed : 0)
  balanceFits.value = inner - brandFull - BREATHING_ROOM - actionsWithout >= needed
}

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  resizeObserver = new ResizeObserver(() => fitBalance())
  if (headerEl.value) resizeObserver.observe(headerEl.value)
  fitBalance()
  document.fonts?.ready.then(fitBalance)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
watch([() => formatMoney(wallet.balance), () => auth.isLoggedIn], () => nextTick(fitBalance))

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
  <header ref="headerEl" class="header">
    <div class="branches" aria-hidden="true">
      <img :src="branchUrl" alt="" class="branch" />
      <span
        v-for="(p, i) in petals"
        :key="i"
        class="petal"
        :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
      />
    </div>
    <div ref="brandEl" class="brand">
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
        <span
          v-else
          role="img"
          aria-label="Sakura"
          class="logo-img logo-dark"
          :style="{ '--logo-url': `url(${logoUrl})` }"
        />
      </RouterLink>
    </div>

    <nav ref="actionsEl" class="actions">
      <div v-if="auth.isLoggedIn" class="wallet">
        <RouterLink
          ref="balanceLink"
          to="/wallet"
          class="balance"
          :class="{ tucked: !balanceFits }"
          aria-label="Balance"
          :aria-hidden="!balanceFits || undefined"
          :tabindex="balanceFits ? undefined : -1"
        >
          <SakuraIcon variant="gold" symbol="₱" class="coin" />
          <span class="amount">
            <span>{{ formatMoney(shownBalance) }}</span>
            <span class="amount-final" aria-hidden="true">{{ formatMoney(wallet.balance) }}</span>
          </span>
        </RouterLink>
        <button
          type="button"
          ref="refreshEl"
          class="refresh"
          :class="{ spinning: wallet.refreshing, tucked: !balanceFits }"
          aria-label="Refresh balance"
          :aria-hidden="!balanceFits || undefined"
          :tabindex="balanceFits ? undefined : -1"
          @click="refreshBalance"
        >
          <i class="pi pi-sync" aria-hidden="true" />
        </button>
        <RouterLink to="/wallet?mode=deposit" class="wallet-deposit" aria-label="Deposit">
          <WalletActionIcon kind="deposit" class="deposit-icon" />
        </RouterLink>
      </div>
      <Button v-else :as="RouterLink" to="/login" aria-label="Join &amp; Play Now" class="auth-btn">
        <span class="auth-label auth-label-full" aria-hidden="true">Join &amp; Play Now</span>
        <span class="auth-label auth-label-short" aria-hidden="true">Join Now</span>
      </Button>
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

.branches {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.branch {
  position: absolute;
  top: 0;
  right: 0;
  height: 66px;
  user-select: none;
}

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

@media (max-width: 900px) {
  .branch {
    mask-image: linear-gradient(to left, #000 25%, transparent 48%);
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.menu-btn {
  width: 44px;
  height: 44px;
  margin-left: -12px;
  color: var(--app-text);
}

:root:not(.app-dark) .menu-btn {
  color: #1b2550;
}

.menu-btn :deep(.p-button-icon) {
  font-size: 1.4rem;
}

.menu-btn :deep(.pi-bars) {
  -webkit-text-stroke: 0.8px currentColor;
}

.menu-grid {
  width: calc((1.4rem * 0.775 + 0.8px) * 1.1);
  aspect-ratio: 22 / 19;
  fill: currentColor;
}

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

.balance.tucked,
.refresh.tucked {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}

.amount {
  display: inline-grid;
  font-variant-numeric: tabular-nums;
}

.amount > * {
  grid-area: 1 / 1;
}

.amount-final {
  visibility: hidden;
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
  outline: 2px solid var(--app-focus);
  outline-offset: 1px;
}

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

.coin {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.3));
}

.wallet-deposit {
  align-items: center;
  gap: 6px;
  height: 100%;
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

.wallet-deposit:hover .deposit-icon {
  transform: translateY(-0.75px) scale(1.04);
}

.wallet-deposit:active {
  transform: scale(0.96);
}

.wallet-deposit:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}

.auth-btn {
  padding: 8px 18px;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  margin-bottom: 5px;
  color: #1b2550;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

@keyframes auth-label-push {
  0%,
  45%,
  100% {
    transform: translateY(0);
  }
  18% {
    transform: translateY(-1.2px);
  }
  32% {
    transform: translateY(0.3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-btn .auth-label {
    animation: none;
  }
}

.auth-label {
  animation: auth-label-push 3.6s ease-in-out infinite;
  font-weight: 900;
  white-space: nowrap;
}

.auth-label-short {
  display: none;
}

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
  outline: 2px solid var(--app-focus);
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
    gap: 12px;
    padding-left: 16px;
  }

  .logo-img {
    height: clamp(17px, 3.125vw + 7px, 22px);
  }

  .balance {
    gap: 6px;
    padding: 0 8px 0 2px;
    font-size: 0.8rem;
  }

  .coin {
    width: 24px;
    height: 24px;
  }

  .wallet-deposit {
    padding: 0 12px;
  }

  .auth-label-full {
    display: none;
  }

  .auth-label-short {
    display: inline;
  }

  .auth-btn {
    flex-shrink: 0;
    padding: 6px clamp(10px, 2.5vw + 2px, 14px);
    margin-bottom: 4px;
    border-radius: 5px;
    font-size: clamp(10px, 1.25vw + 6px, 12px);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.6),
      0 4px 0 #8f9bd1;
  }

  :root:not(.app-dark) .auth-btn {
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.18),
      0 4px 0 #0b1029;
  }
}

@media (max-width: 380px) {
  .header {
    padding: 0 12px;
  }

  .menu-btn {
    margin-left: -8px;
  }

  .actions {
    gap: 8px;
  }

  .wallet-deposit {
    padding-inline: 12px;
  }
}

@media (max-width: 340px) {
  .header {
    gap: 6px;
    padding: 0 10px;
  }

  .brand {
    gap: 6px;
  }

  .menu-btn {
    width: 40px;
  }

  .actions {
    gap: 6px;
  }
}
</style>
