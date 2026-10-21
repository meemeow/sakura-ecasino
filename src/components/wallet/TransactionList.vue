<script setup lang="ts">
import { ref } from 'vue'
import type { Transaction } from '@/types'
import { DEPOSIT_METHODS, depositExpiresAt } from '@/constants/wallet'
import SakuraCoinIcon from '@/components/icons/SakuraCoinIcon.vue'
import WalletActionIcon from '@/components/icons/WalletActionIcon.vue'
import { useWalletStore } from '@/stores/wallet'
import { formatAmount } from '@/utils/format'

defineProps<{ transactions: (Transaction & { id: string })[]; kind: 'wallet' | 'bets' }>()

const wallet = useWalletStore()

const dateFmt = new Intl.DateTimeFormat('en-PH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const isCredit = (t: Transaction) => t.type === 'deposit' || t.type === 'bonus' || t.type === 'win'
const signedAmount = (t: Transaction) => `${isCredit(t) ? '' : '-'}₱${formatAmount(t.amount)}`
const when = (t: Transaction) => (t.createdAt ? dateFmt.format(t.createdAt.toDate()) : '')
const txLabel: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bonus: 'Bonus',
}

type Row = Transaction & { id: string }
const sourceDeposit = (t: Row) =>
  t.type === 'bonus' && t.id.endsWith('_bonus')
    ? wallet.walletTxById.get(t.id.slice(0, -'_bonus'.length))
    : undefined
const gateway = (t: Row) => (t.type === 'bonus' ? sourceDeposit(t)?.method : t.method) ?? '—'
const gatewayLogo = (t: Row) => DEPOSIT_METHODS.find((m) => m.label === gateway(t))?.logo
const referenceOf = (t: Row) =>
  (t.type === 'bonus' ? sourceDeposit(t)?.reference : t.reference) ?? '—'

const dragging = ref(false)
let dragStart: { x: number; y: number; left: number } | null = null
let moved = false
function startDrag(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  dragStart = { x: e.clientX, y: e.clientY, left: el.scrollLeft }
  moved = false
}
function drag(e: PointerEvent) {
  if (!dragStart) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  const el = e.currentTarget as HTMLElement
  if (!moved && Math.hypot(dx, dy) < 4) return
  if (!moved) {
    moved = dragging.value = true
    el.setPointerCapture(e.pointerId)
  }
  el.scrollLeft = dragStart.left - dx
}
function endDrag() {
  dragStart = null
  dragging.value = false
}
function swallowDragClick(e: MouseEvent) {
  if (moved) e.stopPropagation()
  moved = false
}

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
  <div
    v-if="transactions.length && kind === 'wallet'"
    class="tx-table-wrap"
    :class="{ dragging }"
    @pointerdown="startDrag"
    @pointermove="drag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @click.capture="swallowDragClick"
  >
    <table class="tx-table">
      <colgroup>
        <col style="width: 17%" />
        <col style="width: 14%" />
        <col style="width: 12%" />
        <col style="width: 18%" />
        <col style="width: 16%" />
        <col style="width: 23%" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Gateway</th>
          <th scope="col">Amount</th>
          <th scope="col">Reference ID</th>
          <th scope="col">Status</th>
          <th scope="col" class="right">Date/time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in transactions" :key="t.id">
          <td>
            <span class="type">
              <span class="type-icon" aria-hidden="true">
                <SakuraCoinIcon v-if="t.type === 'bonus'" />
                <WalletActionIcon v-else :kind="t.type === 'withdrawal' ? 'withdraw' : 'deposit'" />
              </span>
              {{ txLabel[t.type] }}
            </span>
          </td>
          <td>
            <span v-if="gatewayLogo(t)" class="gateway-logo"
              ><img :src="gatewayLogo(t)" :alt="gateway(t)"
            /></span>
            <template v-else>{{ gateway(t) }}</template>
          </td>
          <td class="amount">{{ signedAmount(t) }}</td>
          <td class="ref" :title="referenceOf(t) !== '—' ? referenceOf(t) : undefined">
            {{ referenceOf(t) }}
          </td>
          <td>
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
.tx-table-wrap {
  overflow-x: auto;
  scrollbar-width: thin;
  cursor: grab;
}

.tx-table-wrap.dragging {
  cursor: grabbing;
  user-select: none;
}

.tx-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 0.82rem;
}

.tx-table th {
  padding: 16px 24px;
  border-bottom: 1px solid var(--app-border);
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
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-table tbody tr:last-child td {
  border-bottom: none;
}

.tx-table tbody tr:nth-child(even) td {
  background: rgb(128 140 175 / 0.06);
}

:root:not(.app-dark) .tx-table tbody tr:nth-child(even) td {
  background: #f7f8fc;
}

.tx-table tbody tr:hover td {
  background: rgb(128 140 175 / 0.12);
}

:root:not(.app-dark) .tx-table tbody tr:hover td {
  background: #eef1f8;
}

.tx-table .type {
  display: inline-flex;
  align-items: center;
  gap: 12px;
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

.tx-table .right {
  text-align: right;
}

.tx-table th:first-child,
.tx-table td:first-child {
  padding-left: 44px;
}

.tx-table th:last-child,
.tx-table td:last-child {
  padding-right: 44px;
}

@container (max-width: 640px) {
  .tx-table th,
  .tx-table td {
    padding: 14px 16px;
  }

  .tx-table th:first-child,
  .tx-table td:first-child {
    padding-left: 16px;
  }

  .tx-table th:last-child,
  .tx-table td:last-child {
    padding-right: 16px;
  }

  .tx-table {
    min-width: 820px;
  }
}

.tx-table .amount,
.tx-table .ref {
  font-variant-numeric: tabular-nums;
}

.tx-table .ref,
.tx-table .date {
  color: var(--app-muted);
  font-weight: 500;
}

.tx-table .date {
  text-align: right;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.status.successful::before {
  background: #22c55e;
}

.status.failed::before {
  background: #ef4444;
}

.status.pending::before {
  background: var(--accent);
}

.status.expired {
  color: var(--app-muted);
}

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
