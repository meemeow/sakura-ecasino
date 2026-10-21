<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import WalletFlowDialog from '@/components/wallet/WalletFlowDialog.vue'
import WalletHistory from '@/components/wallet/WalletHistory.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import SakuraCoinIcon from '@/components/icons/SakuraCoinIcon.vue'
import {
  DEPOSIT_WINDOW_MINUTES,
  WITHDRAW_DAILY_LIMIT,
  depositExpiresAt,
  type WalletMode,
} from '@/constants/wallet'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useBalance } from '@/composables/useBalance'
import { useCountUp } from '@/composables/useCountUp'
import { fetchProfile, verificationStatus, type VerificationStatus } from '@/services/profile'
import { depositState } from '@/services/wallet'
import { useNow } from '@/composables/useNow'
import { useTheme } from '@/composables/useTheme'
import VipBadge from '@/components/vip/VipBadge.vue'
import type { UserProfile } from '@/types'
import cardArtUrl from '@/assets/images/wallet-card.webp'
import { formatCountdown, formatMoney, localMobile, maskMobile } from '@/utils/format'

const auth = useAuthStore()
const wallet = useWalletStore()

const { shownBalance, refreshBalance } = useBalance()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const shortId = computed(() => (auth.user?.uid ?? '').slice(0, 8).toUpperCase())

const cardId = computed(() => `${shortId.value.slice(0, 4)} ${shortId.value.slice(4)}`)
const holder = computed(() => {
  const p = wallet.profile
  const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.displayName
  if (name) return name
  const local = localMobile(auth.user?.phoneNumber)
  return local ? maskMobile(local, '•••') : 'Sakura Player'
})
const memberSince = computed(() => {
  const created = auth.user?.metadata.creationTime
  return created
    ? new Intl.DateTimeFormat('en-PH', { month: '2-digit', year: '2-digit' }).format(
        new Date(created),
      )
    : '--/--'
})
const vip = computed(() => wallet.vip.current)

const petals = [
  { x: '38%', s: 0.8, d: '9s', delay: '0s' },
  { x: '52%', s: 1, d: '11s', delay: '-4s' },
  { x: '64%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '76%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '88%', s: 1.1, d: '10s', delay: '-7s' },
  { x: '97%', s: 0.75, d: '9.5s', delay: '-3s' },
]

const tilt = ref({ x: 0, y: 0, active: false })
function onCardMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.value = {
    x: (e.clientX - r.left) / r.width - 0.5,
    y: (e.clientY - r.top) / r.height - 0.5,
    active: true,
  }
}
function onCardLeave() {
  tilt.value = { x: 0, y: 0, active: false }
}

const status = computed<VerificationStatus | null>(() =>
  wallet.profile === undefined ? null : verificationStatus(wallet.profile),
)
const locked = computed(() => status.value !== null && status.value !== 'verified')

const now = useNow()
const { isDark } = useTheme()
const openDeposit = computed(() => {
  const d = wallet.pendingDeposit
  if (!d || d.id !== wallet.profile?.pendingDepositId) return null
  const state = depositState(d, now.value)
  if (state !== 'pending' && state !== 'submitted') return null
  const expiresAt = depositExpiresAt(d) ?? now.value + DEPOSIT_WINDOW_MINUTES * 60_000
  return { deposit: d, state, timeLeft: formatCountdown(expiresAt - now.value) }
})

const NOTICE_MS = 15_000
const credited = computed(() => wallet.depositNotice)
let creditedTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => credited.value?.id,
  (id) => {
    clearTimeout(creditedTimer)
    if (id) creditedTimer = setTimeout(dismissCredited, NOTICE_MS)
  },
  { immediate: true },
)
function dismissCredited() {
  clearTimeout(creditedTimer)
  wallet.dismissDepositNotice()
}
onBeforeUnmount(() => clearTimeout(creditedTimer))

const flowMode = ref<WalletMode>('deposit')
const flowOpen = ref(false)
watch(
  () => route.query.mode,
  (mode) => {
    if (mode === 'deposit' || mode === 'withdraw') openFlow(mode, { fromLink: true })
  },
  { immediate: true },
)
watch(flowOpen, (open) => {
  if (!open && route.query.mode) router.replace({ query: { ...route.query, mode: undefined } })
})

async function openFlow(mode: WalletMode, { fromLink = false } = {}) {
  const uid = auth.user?.uid
  if (!uid) return
  let profile: UserProfile | null | undefined = wallet.profile
  if (profile === undefined) {
    try {
      profile = await fetchProfile(uid)
    } catch {
      toast.add({
        severity: 'error',
        summary: "Couldn't load your account",
        detail: 'Check your connection and try again.',
        life: 3000,
      })
      return
    }
  }
  const current = verificationStatus(profile)
  const go = (to: RouteLocationRaw) => (fromLink ? router.replace(to) : router.push(to))
  if (current === 'unverified') {
    go({ name: 'account', query: { completeProfile: '1', redirect: `/wallet?mode=${mode}` } })
    return
  }
  if (current === 'verifying') {
    go({ name: 'account', query: { verifying: '1' } })
    return
  }
  if (mode === 'deposit' && openDeposit.value) {
    go({ name: 'deposit-pay', params: { id: openDeposit.value.deposit.id } })
    return
  }
  flowMode.value = mode
  flowOpen.value = true
}

const stats = computed<
  { label: string; action?: WalletMode; icon?: string; value: number; turnover?: boolean }[]
>(() => [
  { label: 'Total deposited', action: 'deposit', value: wallet.profile?.totalDeposit ?? 0 },
  { label: 'Total wagered', icon: 'coin', value: wallet.profile?.totalBet ?? 0 },
  {
    label: 'Withdrawable today',
    action: 'withdraw',
    value: wallet.turnover.met ? Math.min(wallet.balance, WITHDRAW_DAILY_LIMIT) : 0,
    turnover: !wallet.turnover.met,
  },
])

const shownStats = stats.value.map((_, i) =>
  useCountUp(() => stats.value[i]!.value, {
    fromZero: true,
    ready: () => wallet.profile !== undefined,
  }),
)
</script>

<template>
  <section class="wallet">
    <h1 class="page-title">Wallet</h1>

    <RouterLink
      v-if="openDeposit"
      :to="{ name: 'deposit-pay', params: { id: openDeposit.deposit.id } }"
      class="pending-bar"
    >
      <span class="pending-icon"><WalletActionIcon kind="deposit" /></span>
      <span class="pending-text">
        <template v-if="openDeposit.state === 'submitted'">
          <strong>Payment sent</strong> — we're checking your ₱{{
            formatMoney(openDeposit.deposit.amount)
          }}
          deposit.
        </template>
        <template v-else>
          <strong>Deposit pending</strong> — pay ₱{{ formatMoney(openDeposit.deposit.amount) }} to
          finish your deposit.
        </template>
      </span>
      <span class="pending-timer"
        ><SakuraIcon mark="clock" ticking /> {{ openDeposit.timeLeft }}</span
      >
      <i class="pi pi-angle-right pending-go" />
    </RouterLink>

    <Transition name="credited">
      <div
        v-if="credited && !openDeposit"
        :key="credited.id"
        class="pending-bar credited"
        :class="{
          rejected: credited.outcome === 'failed',
          expired: credited.outcome === 'expired',
        }"
        :role="credited.outcome === 'failed' ? 'alert' : 'status'"
        :style="{ '--notice-ms': `${NOTICE_MS}ms` }"
      >
        <span class="notice-icon" aria-hidden="true">
          <SakuraIcon v-if="credited.outcome === 'successful'" mark="check" />
          <SakuraIcon v-else-if="credited.outcome === 'failed'" variant="red" mark="alert" />
          <SakuraIcon v-else :variant="isDark ? 'gold' : 'pink'" mark="alert" />
        </span>
        <span v-if="credited.outcome === 'expired'" class="pending-text">
          <strong>Deposit expired</strong> — time ran out on your ₱{{
            formatMoney(credited.amount)
          }}
          deposit.
          <template v-if="credited.reference"
            >If you paid, it'll still be credited once we've checked it.</template
          >
          <template v-else>Start a new one when you're ready.</template>
        </span>
        <span v-else-if="credited.outcome === 'failed'" class="pending-text">
          <strong>Deposit rejected</strong> — we couldn't match your ₱{{
            formatMoney(credited.amount)
          }}
          payment. If you sent it, contact support<template v-if="credited.reference">
            with reference <strong>{{ credited.reference }}</strong></template
          >.
        </span>
        <span v-else class="pending-text">
          <strong>Deposit successful</strong> — ₱{{ formatMoney(credited.amount) }} added to your
          balance<template v-if="credited.bonus"
            >, plus ₱{{ formatMoney(credited.bonus) }} Reload Bonus</template
          >.
        </span>
        <button type="button" class="credited-close" aria-label="Dismiss" @click="dismissCredited">
          <i class="pi pi-times" />
        </button>
        <span class="credited-countdown" aria-hidden="true" />
      </div>
    </Transition>

    <div class="top">
      <div class="card-stage">
        <div
          class="credit-card"
          :class="{ tilting: tilt.active }"
          :style="{ '--tx': tilt.x, '--ty': tilt.y }"
          @pointermove="onCardMove"
          @pointerleave="onCardLeave"
        >
          <div class="cc-scene" aria-hidden="true">
            <img :src="cardArtUrl" alt="" class="cc-art" />
            <span
              v-for="(p, i) in petals"
              :key="i"
              class="cc-petal"
              :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
            />
          </div>
          <span class="cc-shine" aria-hidden="true" />

          <div class="cc-head">
            <span class="cc-brand"><SakuraIcon variant="gold" class="cc-logo" /> Sakura</span>
            <span
              class="cc-tier"
              :style="{
                background: `linear-gradient(${vip.rank.light}, ${vip.rank.dark})`,
                color: vip.rank.ink,
              }"
            >
              {{ vip.level ? `${vip.rank.name} · VIP ${vip.level}` : vip.rank.name }}
            </span>
          </div>

          <div class="cc-chip-row" aria-hidden="true">
            <span class="cc-chip" />
            <svg class="cc-contactless" viewBox="0 0 24 24">
              <path d="M7 9.5a4 4 0 0 1 0 5" />
              <path d="M10.5 7a7.5 7.5 0 0 1 0 10" />
              <path d="M14 4.5a11 11 0 0 1 0 15" />
            </svg>
          </div>

          <div class="cc-balance">
            <p class="cc-label">Balance</p>
            <p class="cc-amount">
              <span class="currency">₱</span>{{ formatMoney(shownBalance) }}
              <button
                type="button"
                class="refresh"
                :class="{ spinning: wallet.refreshing }"
                aria-label="Refresh balance"
                @click="refreshBalance"
              >
                <i class="pi pi-refresh" />
              </button>
            </p>
          </div>

          <div class="cc-foot">
            <div class="cc-field holder">
              <span class="cc-label">Card holder</span>
              <span class="cc-value">{{ holder }}</span>
            </div>
            <div class="cc-field">
              <span class="cc-label">Member since</span>
              <span class="cc-value">{{ memberSince }}</span>
            </div>
            <div class="cc-field">
              <span class="cc-label">Player ID</span>
              <span class="cc-value">{{ cardId }}</span>
            </div>
            <VipBadge :level="vip.level" :size="46" plain class="cc-network" />
          </div>
        </div>
      </div>

      <div class="side">
        <div class="actions">
          <button
            type="button"
            class="action deposit"
            :title="locked ? 'Verify your account to deposit' : undefined"
            @click="openFlow('deposit')"
          >
            <i v-if="locked" class="pi pi-lock" />
            <WalletActionIcon v-else kind="deposit" class="action-icon" />
            Deposit
          </button>
          <button
            type="button"
            class="action withdraw"
            :title="locked ? 'Verify your account to withdraw' : undefined"
            @click="openFlow('withdraw')"
          >
            <i v-if="locked" class="pi pi-lock" />
            <WalletActionIcon v-else kind="withdraw" class="action-icon" />
            Withdraw
          </button>
        </div>

        <ul class="stats">
          <li v-for="(s, i) in stats" :key="s.label" class="stat">
            <span class="stat-icon">
              <WalletActionIcon v-if="s.action" :kind="s.action" />
              <SakuraCoinIcon v-else-if="s.icon === 'coin'" />
              <i v-else class="pi" :class="s.icon" />
            </span>
            <div class="stat-text">
              <p class="stat-label">{{ s.label }}</p>
              <p class="stat-value">₱{{ formatMoney(shownStats[i]!.value) }}</p>
              <template v-if="s.turnover">
                <div class="stat-bar" aria-hidden="true">
                  <span :style="{ width: `${wallet.turnover.progress * 100}%` }" />
                </div>
                <p class="stat-note">
                  Bet <strong>₱{{ formatMoney(wallet.turnover.remaining) }}</strong> more to unlock
                </p>
              </template>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <WalletHistory
      title="Transaction History"
      note="Deposits, withdrawals and bonuses on your wallet."
      @deposit="openFlow('deposit')"
    />

    <WalletFlowDialog v-model:visible="flowOpen" :mode="flowMode" />
  </section>
</template>

<style scoped>
.wallet {
  --accent: #ffc200;
  --accent-tint: rgb(255 194 0 / 0.12);
  container-type: inline-size;
  font-family: 'Montserrat', sans-serif;
}

:root:not(.app-dark) .wallet {
  --accent: #e0457f;
  --accent-tint: #ffe9f1;
}

.page-title {
  margin: 4px 0 16px;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.pending-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--accent);
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-text);
  text-decoration: none;
  transition: background 0.15s;
}

.pending-bar:hover {
  background: linear-gradient(var(--accent-tint), var(--accent-tint)), var(--app-surface);
}

.pending-bar.credited {
  --credited: #ffc200;
  position: relative;
  overflow: hidden;
  border-color: var(--app-border);
}

:root:not(.app-dark) .pending-bar.credited {
  --credited: #e0457f;
}

.pending-bar.credited.rejected {
  --credited: #f87171;
}

:root:not(.app-dark) .pending-bar.credited.rejected {
  --credited: #dc2626;
}

.pending-bar.credited.expired {
  --credited: #ffb020;
}

:root:not(.app-dark) .pending-bar.credited.expired {
  --credited: #e0457f;
}

.pending-bar.credited:hover {
  background: var(--app-surface);
}

.notice-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
}

.notice-icon svg {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
}

.credited-close {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-panel);
  color: var(--app-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.credited-close:hover {
  color: var(--app-text);
}

.credited-close .pi {
  font-size: 0.65rem;
}

.credited-countdown {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--credited);
  transform-origin: left;
  animation: credited-countdown var(--notice-ms) linear forwards;
}

@keyframes credited-countdown {
  to {
    transform: scaleX(0);
  }
}

.credited-enter-active,
.credited-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}

.credited-enter-from,
.credited-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .credited-countdown {
    animation: none;
  }
}

.pending-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent-tint);
  color: var(--accent);
}

.pending-icon .wallet-icon {
  width: 22px;
  height: 22px;
}

.pending-text {
  flex: 1;
  min-width: 0;
  color: var(--app-muted);
  font-size: 0.85rem;
}

.pending-text strong {
  color: var(--app-text);
  font-weight: 800;
}

.pending-timer {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-weight: 800;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.pending-timer svg {
  width: 20px;
  height: 20px;
}

.pending-go {
  color: var(--app-muted);
}

.top {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.card-stage {
  min-width: 0;
}

.credit-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 320px;
  padding: 22px 24px 20px;
  overflow: hidden;
  isolation: isolate;
  border-radius: 18px;
  background: linear-gradient(135deg, #12123a, #1c1748 55%, #0e0f2e);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.1),
    0 18px 36px rgb(0 0 0 / 0.45);
  color: #ffffff;
  transform: perspective(900px) rotateY(calc(var(--tx, 0) * 10deg))
    rotateX(calc(var(--ty, 0) * -10deg));
  transition: transform 0.5s ease;
}

.credit-card.tilting {
  transition: transform 0.08s linear;
}

:root:not(.app-dark) .credit-card {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.1),
    0 16px 30px rgb(27 37 80 / 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .credit-card {
    transform: none;
  }
}

.cc-scene {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.cc-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 100% 40%;
  user-select: none;
}

.cc-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(10 8 32 / 0.35), transparent 45%);
}

.cc-petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: cc-petal-fall var(--d) linear var(--delay) infinite;
}

@keyframes cc-petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    opacity: 0.85;
  }
  85% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translate(-180px, 340px) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cc-petal {
    display: none;
  }
}

.cc-shine {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    115deg,
    transparent 32%,
    rgb(255 150 200 / 0.12) 42%,
    rgb(160 200 255 / 0.12) 50%,
    rgb(255 236 160 / 0.1) 58%,
    transparent 68%
  );
  background-position: calc(50% - var(--tx, 0) * 120%) 0;
  background-size: 250% 100%;
  mix-blend-mode: screen;
  pointer-events: none;
}

.cc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cc-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cc-logo {
  width: 24px;
  height: 24px;
}

.cc-tier {
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.4);
  font-weight: 900;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.cc-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.cc-chip {
  position: relative;
  width: 46px;
  height: 34px;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(135deg, #fff1a8, #ffc83d 40%, #d9a12a 70%, #f5d77a);
  box-shadow: inset 0 0 0 1px rgb(112 57 2 / 0.35);
}

.cc-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      transparent 31%,
      rgb(112 57 2 / 0.35) 31% 34%,
      transparent 34% 66%,
      rgb(112 57 2 / 0.35) 66% 69%,
      transparent 69%
    ),
    linear-gradient(transparent 47%, rgb(112 57 2 / 0.35) 47% 53%, transparent 53%);
}

.cc-chip::after {
  content: '';
  position: absolute;
  inset: 9px 15px;
  border: 1px solid rgb(112 57 2 / 0.4);
  border-radius: 4px;
  background: linear-gradient(135deg, #ffe27a, #e0ae36);
}

.cc-contactless {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: rgb(255 255 255 / 0.75);
  stroke-width: 2;
  stroke-linecap: round;
}

.cc-balance {
  margin-top: auto;
}

.cc-label {
  display: block;
  margin: 0;
  color: #aab2c5;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cc-amount {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin: 2px 0 0;
  font-weight: 900;
  font-size: 2rem;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 4px rgb(0 0 0 / 0.35);
  overflow-wrap: anywhere;
}

.currency {
  margin-right: 4px;
  color: #ffc83d;
}

.refresh {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(255 194 0 / 0.14);
  color: #ffc83d;
  text-shadow: none;
  cursor: pointer;
  transition: background 0.15s;
}

.refresh:hover {
  background: rgb(255 194 0 / 0.24);
}

.refresh:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}

.refresh .pi {
  font-size: 0.75rem;
}

.refresh.spinning .pi {
  animation: refresh-spin 0.7s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.cc-foot {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-top: 20px;
}

.cc-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.cc-field.holder {
  flex: 0 1 auto;
}

.cc-value {
  overflow: hidden;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.cc-network {
  flex: 0 0 auto;
  margin: 0 -4px -4px auto;
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.4));
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 4px;
  padding: 14px 16px;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-weight: 900;
  font-size: 0.85rem;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    filter 0.2s,
    transform 0.1s;
}

.action .pi {
  font-size: 0.95rem;
}

.action .action-icon {
  width: 24px;
  height: 24px;
}

.action:hover {
  filter: brightness(1.06);
}

.action:active {
  transform: translateY(2px);
}

.action:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.action.deposit {
  background: #ffc200;
  box-shadow: 0 4px 0 #d9871f;
  color: #703902;
}

:root:not(.app-dark) .action.deposit {
  background: linear-gradient(#ff7aae, #e0457f);
  box-shadow: 0 4px 0 #b8235e;
  color: #ffffff;
}

.action.withdraw {
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 4px 0 #8f9bd1;
  color: #1b2550;
}

:root:not(.app-dark) .action.withdraw {
  background: linear-gradient(#34418a, #1b2550 55%, #131b3d);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 4px 0 #0b1029;
  color: #ffffff;
}

.side .stats {
  flex: 1;
}

.stats {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

:root:not(.app-dark) .stat {
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.05);
}

.stat-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent-tint);
  color: var(--accent);
}

.stat-icon .pi {
  font-size: 0.95rem;
}

.stat-icon .wallet-icon {
  width: 22px;
  height: 22px;
}

.stat-icon .coin-icon {
  width: 26px;
  height: 26px;
}

.stat-text {
  min-width: 0;
}

.stat-label {
  margin: 0 0 2px;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.72rem;
}

.stat-value {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--app-text);
  font-weight: 800;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.stat-text:has(.stat-bar) {
  flex: 1;
}

.stat-bar {
  height: 6px;
  margin: 6px 0 4px;
  overflow: hidden;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.08);
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.4);
}

:root:not(.app-dark) .stat-bar {
  background: rgb(27 37 80 / 0.08);
  box-shadow: inset 0 1px 2px rgb(27 37 80 / 0.12);
}

.stat-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #ffe27a, #ffb800);
  transition: width 0.4s ease;
}

:root:not(.app-dark) .stat-bar span {
  background: linear-gradient(90deg, #ff9cc2, #e0457f);
}

.stat-note {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
  font-size: 0.7rem;
}

.stat-note strong {
  color: var(--accent);
  font-weight: 800;
}

@container (max-width: 820px) {
  .top {
    grid-template-columns: minmax(0, 1fr);
  }

  .stats {
    flex: 0 0 auto;
    grid-template-rows: none;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (max-width: 560px) {
  .credit-card {
    min-height: 220px;
    padding: 16px 18px 14px;
    border-radius: 14px;
  }

  .cc-chip-row {
    margin-top: 10px;
  }

  .cc-chip {
    width: 38px;
    height: 28px;
  }

  .cc-chip::after {
    inset: 7px 12px;
  }

  .cc-amount {
    font-size: 1.55rem;
  }

  .cc-foot {
    gap: 14px;
    margin-top: 14px;
  }

  .stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@container (max-width: 560px) {
  .actions {
    gap: 10px;
  }

  .action {
    gap: 6px;
    padding: 10px 12px;
    font-size: 0.78rem;
  }

  .action .action-icon {
    width: 20px;
    height: 20px;
  }
}

@container (max-width: 380px) {
  .credit-card {
    min-height: 250px;
    padding: 16px 18px 14px;
  }

  .cc-brand {
    font-size: 0.9rem;
    letter-spacing: 0.08em;
  }

  .cc-chip-row {
    margin: 12px 0 14px;
  }

  .cc-amount {
    font-size: 1.35rem;
  }

  .cc-foot {
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 16px;
  }

  .cc-network {
    zoom: 0.8;
  }

  .cc-field.holder {
    flex-basis: 100%;
  }

  .cc-foot .cc-label {
    white-space: nowrap;
  }
}

@container (max-width: 300px) {
  .actions {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
}
</style>
