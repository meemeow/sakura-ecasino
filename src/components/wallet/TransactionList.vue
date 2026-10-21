<script setup lang="ts">
import { ref } from 'vue'
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

// Mouse drag scrolls the table like a touch swipe (touch scrolls natively). A few pixels of
// movement count as a drag, and the click that ends one is swallowed.
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
      <!-- Fixed widths sized to their content, all left-aligned (dates on the right), so the
           gaps between columns come out even -->
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
/* ---------- Wallet table ---------- */
/* Pages (WalletHistory's pager) keep it short, so it only scrolls sideways, on narrow screens */
.tx-table-wrap {
  overflow-x: auto;
  scrollbar-width: thin;
  cursor: grab;
}

/* While dragging: grabbing hand, and no text gets selected on the way */
.tx-table-wrap.dragging {
  cursor: grabbing;
  user-select: none;
}

/* Never narrower than this, so columns keep their room; smaller screens drag or scroll it */
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
  /* The card's own background (WalletHistory's .list-card) */
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

/* Both ends inset the same: the Type block starts as far in as the dates end */
.tx-table th:first-child,
.tx-table td:first-child {
  padding-left: 44px;
}

.tx-table th:last-child,
.tx-table td:last-child {
  padding-right: 44px;
}

/* Narrow cards (WalletHistory's .list-card is the container): the deep inset on both ends and
   the wide cell padding only push the columns off-screen, so the table hugs its edges */
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

/* Amount and reference in the row's own type, figures lined up */
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

/* Status as plain text with a colored dot: green successful, red rejected, accent pending,
   grey expired */
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
