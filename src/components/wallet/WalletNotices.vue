<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import { useOpenDeposit } from '@/composables/useOpenDeposit'
import { useTheme } from '@/composables/useTheme'
import { useWalletStore } from '@/stores/wallet'
import { formatMoney } from '@/utils/format'

const wallet = useWalletStore()
const { isDark } = useTheme()
const openDeposit = useOpenDeposit()

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
</script>

<template>
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
        <strong>Deposit expired</strong> — time ran out on your ₱{{ formatMoney(credited.amount) }}
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
</template>

<style scoped>
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
</style>
