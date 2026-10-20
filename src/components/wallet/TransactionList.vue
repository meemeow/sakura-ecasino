<script setup lang="ts">
import type { Transaction } from '@/types'
import { DEPOSIT_METHODS, depositExpiresAt } from '@/components/wallet/walletOptions'
import SakuraCoinIcon from '@/components/wallet/SakuraCoinIcon.vue'
import WalletActionIcon from '@/components/wallet/WalletActionIcon.vue'
import { useWalletStore } from '@/stores/wallet'

// Wallet history (deposits, withdrawals, bonuses) as a table, or bet history as a list, newest
// first. Callers show their own empty state (EmptyState) instead of an empty list. The table is
// in the caller's --accent / --accent-tint (gold on dark, sakura pink on white).
defineProps<{ transactions: (Transaction & { id: string })[]; kind: 'wallet' | 'bets' }>()

const wallet = useWalletStore()

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

// A Reload Bonus is stored as {depositId}_bonus: it shows the gateway and reference of the
// deposit it came with (looked up in the whole history, so it works under the Bonuses filter)
type Row = Transaction & { id: string }
const sourceDeposit = (t: Row) =>
  t.type === 'bonus' && t.id.endsWith('_bonus')
    ? wallet.walletTxs.find((d) => d.id === t.id.slice(0, -'_bonus'.length))
    : undefined
const gateway = (t: Row) => (t.type === 'bonus' ? sourceDeposit(t)?.method : t.method) ?? '—'
// GCash / Maya logo for the gateway, when it's one of ours
const gatewayLogo = (t: Row) => DEPOSIT_METHODS.find((m) => m.label === gateway(t))?.logo
const referenceOf = (t: Row) =>
  (t.type === 'bonus' ? sourceDeposit(t)?.reference : t.reference) ?? '—'

// A QR deposit still pending past its 10 minutes reads as expired (services/wallet.ts)
const shownStatus = (t: Transaction) => {
  const status = t.status ?? 'successful'
  const expiresAt = t.type === 'deposit' ? depositExpiresAt(t) : null
  return status === 'pending' && expiresAt !== null && expiresAt <= Date.now() ? 'expired' : status
}
const statusLabel = (t: Transaction) =>
  ({ successful: 'Successful', pending: 'Pending', failed: 'Rejected', expired: 'Expired' })[
    shownStatus(t)
  ]
</script>

<template>
  <!-- Wallet: a table, scrolling sideways inside its card on narrow screens -->
  <div v-if="transactions.length && kind === 'wallet'" class="tx-table-wrap">
    <table class="tx-table">
      <!-- Fixed widths, so the columns spread evenly whatever is in them -->
      <colgroup>
        <col style="width: 15%" />
        <col style="width: 11%" />
        <col style="width: 12%" />
        <col style="width: 22%" />
        <col style="width: 15%" />
        <col style="width: 25%" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col"><span class="type-head">Type</span></th>
          <th scope="col">Gateway</th>
          <th scope="col" class="center">Amount</th>
          <th scope="col">Reference no.</th>
          <th scope="col" class="center">Status</th>
          <th scope="col" class="right">Date/time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in transactions" :key="t.id">
          <td>
            <span class="type">
              <!-- The wallet page's own icons, in an accent tile -->
              <span class="type-icon" aria-hidden="true">
                <SakuraCoinIcon v-if="t.type === 'bonus'" />
                <WalletActionIcon v-else :kind="t.type === 'withdrawal' ? 'withdraw' : 'deposit'" />
              </span>
              {{ txLabel[t.type] }}
            </span>
          </td>
          <td>
            <!-- White chip, so the logos' white backgrounds blend in -->
            <span v-if="gatewayLogo(t)" class="gateway-logo"
              ><img :src="gatewayLogo(t)" :alt="gateway(t)"
            /></span>
            <template v-else>{{ gateway(t) }}</template>
          </td>
          <td class="amount center">{{ signedAmount(t) }}</td>
          <td class="ref">
            <span v-if="referenceOf(t) !== '—'" class="ref-tag" :title="referenceOf(t)"
              ><i class="pi pi-hashtag" /><span class="ref-text">{{ referenceOf(t) }}</span></span
            >
            <template v-else>—</template>
          </td>
          <td class="center">
            <span class="status" :class="shownStatus(t)">{{ statusLabel(t) }}</span>
          </td>
          <td class="date">{{ when(t) }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <ul v-else-if="transactions.length" class="tx-list">
    <li v-for="t in transactions" :key="t.id" class="tx">
      <div class="tx-info">
        <strong>{{ t.gameName ?? 'Game' }}</strong>
        <span v-if="t.roundId" class="tx-sub">{{ t.roundId }}</span>
        <span class="tx-date">{{ when(t) }}</span>
      </div>
      <span class="tx-amount" :class="isCredit(t) ? 'credit' : 'debit'">
        {{ signedAmount(t) }}
      </span>
    </li>
  </ul>
</template>

<style scoped>
/* ---------- Wallet table ---------- */
/* Uses the room below it: about a screen's worth of rows before it scrolls */
.tx-table-wrap {
  max-height: max(380px, calc(100vh - 220px));
  overflow: auto;
  scrollbar-width: thin;
}

.tx-table {
  width: 100%;
  min-width: 840px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.82rem;
}

/* Header stays put while the rows scroll under it */
.tx-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 16px 24px;
  border-bottom: 1px solid var(--app-border);
  /* The card's own background (WalletHistory's .list-card), so rows hide under it */
  background: var(--app-navbar);
  color: var(--app-muted);
  font-weight: 800;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.tx-table td {
  padding: 16px 24px;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-text);
  font-weight: 600;
  white-space: nowrap;
  /* Fixed columns: an extra-long reference ends in … instead of spilling over */
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-table tbody tr:last-child td {
  border-bottom: none;
}

/* Every other row a shade apart, so long rows are easy to follow across */
.tx-table tbody tr:nth-child(even) td {
  background: rgb(128 140 175 / 0.06);
}

:root:not(.app-dark) .tx-table tbody tr:nth-child(even) td {
  background: #f7f8fc;
}

/* Hover: a neutral shade a step past the striping, no accent */
.tx-table tbody tr:hover td {
  background: rgb(128 140 175 / 0.12);
}

:root:not(.app-dark) .tx-table tbody tr:hover td {
  background: #eef1f8;
}

/* The Type block: wide enough for "Deposit" with its icon. The header is centered over the
   same width, so it sits over the icon and label. */
.type-head {
  display: inline-block;
  min-width: 112px;
  text-align: center;
}

.tx-table .type {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 112px;
  text-align: left;
  font-weight: 800;
}

.type-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent-tint);
  color: var(--accent);
}

.type-icon .wallet-icon {
  width: 20px;
  height: 20px;
}

.type-icon .coin-icon {
  width: 24px;
  height: 24px;
}

.gateway-logo {
  display: inline-grid;
  place-items: center;
  width: 76px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.gateway-logo img {
  max-width: 100%;
  max-height: 15px;
}

.tx-table .center {
  text-align: center;
}

.tx-table .right {
  text-align: right;
}

/* Both ends inset the same: the Type block starts as far in as the dates end */
.tx-table th:first-child,
.tx-table td:first-child {
  padding-left: 44px;
}

.tx-table th:last-child,
.tx-table td:last-child {
  padding-right: 44px;
}

.tx-table .amount {
  font-size: 0.92rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.tx-table .ref {
  color: var(--app-muted);
}

/* The reference as a tag: outlined chip with a # mark, cut short with … if it's very long */
.ref-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 4px 10px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-panel);
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.76rem;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ref-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ref-tag .pi {
  flex: 0 0 auto;
  color: var(--app-muted);
  font-size: 0.62rem;
}

.tx-table .date {
  text-align: right;
  color: var(--app-muted);
  font-weight: 500;
}

/* Status: dark green when successful, red when rejected, pending outlined in the accent,
   expired grey. On dark, the same faint tints with deep text. */
.status {
  display: inline-block;
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.7rem;
}

.status.successful {
  background: rgb(34 197 94 / 0.14);
  color: #16a34a;
}

:root:not(.app-dark) .status.successful {
  background: #dcfce7;
  color: #166534;
}

.status.failed {
  background: rgb(239 68 68 / 0.14);
  color: #dc2626;
}

:root:not(.app-dark) .status.failed {
  background: #fee2e2;
  color: #b91c1c;
}

.status.pending {
  border-color: var(--accent);
  color: var(--accent);
}

.status.expired {
  background: var(--app-panel);
  color: var(--app-muted);
}

/* ---------- Bet list ---------- */
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
</style>
