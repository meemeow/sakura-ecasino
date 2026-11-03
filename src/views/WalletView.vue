<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import WalletCard from '@/components/wallet/WalletCard.vue'
import WalletFlowDialog from '@/components/wallet/WalletFlowDialog.vue'
import WalletHistory from '@/components/wallet/WalletHistory.vue'
import WalletNotices from '@/components/wallet/WalletNotices.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import SakuraCoinIcon from '@/components/icons/SakuraCoinIcon.vue'
import { WITHDRAW_DAILY_LIMIT, type WalletMode } from '@/constants/wallet'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useCountUp } from '@/composables/useCountUp'
import { useOpenDeposit } from '@/composables/useOpenDeposit'
import { fetchProfile, verificationStatus, type VerificationStatus } from '@/services/profile'
import type { UserProfile } from '@/types'
import { formatMoney } from '@/utils/format'

const auth = useAuthStore()
const wallet = useWalletStore()

const toast = useToast()
const route = useRoute()
const router = useRouter()

const status = computed<VerificationStatus | null>(() =>
  wallet.profile === undefined ? null : verificationStatus(wallet.profile),
)
const locked = computed(() => status.value !== null && status.value !== 'verified')

const openDeposit = useOpenDeposit()

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

    <WalletNotices />

    <div class="top">
      <div class="card-stage">
        <WalletCard />
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

.top {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.card-stage {
  min-width: 0;
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

@container (max-width: 300px) {
  .actions {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
}
</style>
