<script setup lang="ts">
import type { Transaction } from '@/types'
import { depositExpiresAt } from '@/components/wallet/walletOptions'

// Wallet history (deposits, withdrawals, bonuses) or bet history, newest first. Callers show
// their own empty state (EmptyState) instead of an empty list.
defineProps<{ transactions: (Transaction & { id: string })[]; kind: 'wallet' | 'bets' }>()

const peso = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat('en-PH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const isCredit = (t: Transaction) => t.type === 'deposit' || t.type === 'bonus' || t.type === 'win'
const signedAmount = (t: Transaction) => `${isCredit(t) ? '' : '-'}₱${peso.format(t.amount)}`
const when = (t: Transaction) => (t.createdAt ? dateFmt.format(t.createdAt.toDate()) : '')
const txLabel: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bonus: 'Bonus',
}
// A QR deposit still pending past its 10 minutes reads as expired (services/wallet.ts)
const shownStatus = (t: Transaction) => {
  const status = t.status ?? 'successful'
  const expiresAt = t.type === 'deposit' ? depositExpiresAt(t) : null
  return status === 'pending' && expiresAt !== null && expiresAt <= Date.now() ? 'expired' : status
}
const statusLabel = (t: Transaction) =>
  ({ successful: 'Successful', pending: 'Pending', failed: 'Failed', expired: 'Expired' })[
    shownStatus(t)
  ]
</script>

<template>
  <ul v-if="transactions.length" class="tx-list">
    <li v-for="t in transactions" :key="t.id" class="tx">
      <template v-if="kind === 'wallet'">
        <div class="tx-info">
          <strong>{{ txLabel[t.type] }}</strong>
          <span v-if="t.method" class="tx-sub">{{ t.method }}</span>
          <span class="tx-date">{{ when(t) }}</span>
        </div>
        <div class="tx-right">
          <span
            class="tx-amount"
            :class="t.type === 'bonus' ? 'bonus' : isCredit(t) ? 'credit' : 'debit'"
          >
            <i v-if="t.type === 'bonus'" class="pi pi-star-fill" />
            {{ signedAmount(t) }}
          </span>
          <span class="tx-status" :class="shownStatus(t)">
            {{ statusLabel(t) }}
          </span>
        </div>
      </template>

      <template v-else>
        <div class="tx-info">
          <strong>{{ t.gameName ?? 'Game' }}</strong>
          <span v-if="t.roundId" class="tx-sub">{{ t.roundId }}</span>
          <span class="tx-date">{{ when(t) }}</span>
        </div>
        <span class="tx-amount" :class="isCredit(t) ? 'credit' : 'debit'">
          {{ signedAmount(t) }}
        </span>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.tx-list {
  max-height: 360px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  scrollbar-width: thin;
  list-style: none;
}

.tx {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
}

.tx:nth-child(odd) {
  background: var(--app-surface);
}

.tx-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.tx-info strong {
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.9rem;
}

.tx-sub {
  color: var(--app-muted);
  font-size: 0.78rem;
}

.tx-date {
  color: var(--app-muted);
  font-size: 0.7rem;
  opacity: 0.8;
}

.tx-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.tx-amount {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 1.05rem;
  white-space: nowrap;
}

.tx-amount.credit {
  color: #4ade80;
}

.tx-amount.debit {
  color: #f87171;
}

.tx-amount.bonus {
  color: #ffc200;
}

.tx-status {
  font-size: 0.7rem;
  color: var(--app-muted);
}

.tx-status.pending {
  color: #ffc200;
}

.tx-status.expired {
  color: var(--app-muted);
  opacity: 0.7;
}

.tx-status.failed {
  color: #f87171;
}
</style>
