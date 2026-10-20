<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/layout/EmptyState.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import { WITHDRAW_DAILY_LIMIT } from '@/components/wallet/walletOptions'
import { useWalletStore } from '@/stores/wallet'
import { useAuthStore } from '@/stores/auth'
import {
  countHistory,
  fetchHistoryPage,
  type HistoryFilter,
  type HistoryRow,
} from '@/services/history'
import walletIcon from '@/assets/icons/wallet.svg'

// Deposits, withdrawals and bonuses with filter pills, shared by the wallet and account pages.
// "Make a deposit" is emitted so each page opens the deposit its own way.
defineProps<{ title: string; note?: string }>()
const emit = defineEmits<{ deposit: [] }>()

const wallet = useWalletStore()
const auth = useAuthStore()
const router = useRouter()

type Filter = HistoryFilter
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'bonus', label: 'Bonuses' },
]
const filter = ref<Filter>('all')
// Paged from Firestore, one query per page turned (services/history.ts). Every page fetched is
// cached, so turning back costs no reads. Rows that are also in the live recent history
// (wallet.walletTxs) show that live copy, so a pending deposit still turns successful in place.
// A new transaction shifts every page, so the cache is dropped and the current page refetched.
const PAGE_SIZES = [5, 10, 25, 50]
const pageSize = ref(10)
const page = ref(1)

type CachedPage = { rows: HistoryRow[]; last?: QueryDocumentSnapshot }
const pages = new Map<string, CachedPage>()
const pageKey = (f: Filter, size: number, n: number) => `${f}|${size}|${n}`
const counts = ref<Partial<Record<Filter, number>>>({})
const pageRows = shallowRef<HistoryRow[]>([])
// Until the first page arrives (or if the query fails, e.g. while the index is still building)
// the table falls back to the live recent history
const fallback = ref(true)

const liveFiltered = computed(() =>
  filter.value === 'all'
    ? wallet.walletTxs
    : wallet.walletTxs.filter((t) => t.type === filter.value),
)
const total = computed(() =>
  fallback.value ? liveFiltered.value.length : (counts.value[filter.value] ?? 0),
)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pagedTxs = computed(() => {
  if (fallback.value) {
    return liveFiltered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  }
  return pageRows.value.map((r) => wallet.walletTxs.find((l) => l.id === r.id) ?? r)
})
const range = computed(() => {
  const from = Math.min((page.value - 1) * pageSize.value + 1, total.value)
  return `${from}–${Math.min(page.value * pageSize.value, total.value)}`
})

// Fetches a page, and any pages before it that aren't cached yet (each needs the one before's
// last row to continue from). Only the latest request updates the table.
let request = 0
async function loadPage() {
  const uid = auth.user?.uid
  if (!uid) return
  const mine = ++request
  const f = filter.value
  const size = pageSize.value
  const n = page.value
  try {
    if (counts.value[f] === undefined) {
      const c = await countHistory(uid, f)
      counts.value = { ...counts.value, [f]: c }
    }
    for (let i = 1; i <= n; i++) {
      if (pages.has(pageKey(f, size, i))) continue
      const before = i > 1 ? pages.get(pageKey(f, size, i - 1))?.last : undefined
      pages.set(pageKey(f, size, i), await fetchHistoryPage(uid, f, size, before))
    }
    if (mine !== request) return
    pageRows.value = pages.get(pageKey(f, size, n))!.rows
    fallback.value = false
  } catch (e) {
    console.warn("Couldn't load transaction history page", e)
    if (mine === request) fallback.value = true
  }
}

// Back to page 1 when the filter or page size changes
watch([filter, pageSize], () => {
  if (page.value === 1) loadPage()
  else page.value = 1
})
watch(page, loadPage)
onMounted(loadPage)

// Pill counts: one aggregation per filter, fetched with the pages; the live list until then
async function loadCounts() {
  const uid = auth.user?.uid
  if (!uid) return
  try {
    const ids: Filter[] = ['all', 'deposit', 'withdrawal', 'bonus']
    const values = await Promise.all(ids.map((f) => countHistory(uid, f)))
    counts.value = Object.fromEntries(ids.map((f, i) => [f, values[i]]))
  } catch {
    // Keeps showing the live counts
  }
}
onMounted(loadCounts)

// Something new at the top (or the newest gone): every cached page is out of step
watch(
  () => wallet.walletTxs[0]?.id,
  (id, old) => {
    if (old === undefined) return
    pages.clear()
    counts.value = {}
    loadCounts()
    loadPage()
  },
)
// Kept in range if rows go away
watch(pageCount, (n) => {
  if (page.value > n) page.value = n
})

const liveCount = (id: Filter) =>
  id === 'all' ? wallet.walletTxs.length : wallet.walletTxs.filter((t) => t.type === id).length
const countFor = (id: Filter) => counts.value[id] ?? liveCount(id)

// Empty history, in the lobby's empty-state style: what's missing and one way forward
const emptyState = computed(() => {
  const deposit = { label: 'Make a deposit', run: () => emit('deposit') }
  switch (filter.value) {
    case 'deposit':
      return {
        title: 'No deposits yet',
        text: 'Top up with GCash or Maya to start playing.',
        action: deposit,
      }
    case 'withdrawal':
      return {
        title: 'No withdrawals yet',
        text: `Cash out to GCash or Maya, up to ₱${WITHDRAW_DAILY_LIMIT.toLocaleString('en-PH')} a day.`,
        action: { label: 'Play slots', run: () => router.push('/slots') },
      }
    case 'bonus':
      return {
        title: 'No bonuses yet',
        text: 'Keep the Reload Bonus on to get 30% extra on one deposit a day.',
        action: deposit,
      }
    default:
      return {
        title: 'No transactions yet',
        text: 'Your deposits, withdrawals and bonuses will show up here.',
        action: deposit,
      }
  }
})
</script>

<template>
  <div class="history">
    <div class="history-head" :class="{ 'has-note': note }">
      <h2 class="history-title">{{ title }}</h2>
      <div class="filters" role="tablist" :aria-label="`Filter ${title.toLowerCase()}`">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          role="tab"
          class="filter"
          :class="{ active: filter === f.id }"
          :aria-selected="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }}
          <span class="filter-count">{{ countFor(f.id) }}</span>
        </button>
      </div>
    </div>
    <p v-if="note" class="history-note">{{ note }}</p>

    <EmptyState
      v-if="!total"
      :icon="walletIcon"
      :title="emptyState.title"
      :text="emptyState.text"
      :action-label="emptyState.action.label"
      @action="emptyState.action.run()"
    />
    <div v-else class="list-card">
      <TransactionList :transactions="pagedTxs" kind="wallet" />

      <!-- Footer: rows per page on the left, the page and its arrows on the right -->
      <nav class="pager" aria-label="Transaction pages">
        <div class="pager-sizes" role="group" aria-label="Rows per page">
          <span class="pager-label">Rows</span>
          <button
            v-for="n in PAGE_SIZES"
            :key="n"
            type="button"
            class="pager-size"
            :class="{ active: pageSize === n }"
            :aria-pressed="pageSize === n"
            @click="pageSize = n"
          >
            {{ n }}
          </button>
        </div>
        <div class="pager-pages">
          <span class="pager-range">{{ range }} of {{ total }}</span>
          <button
            type="button"
            class="pager-arrow"
            aria-label="Previous page"
            :disabled="page === 1"
            @click="page--"
          >
            <i class="pi pi-angle-left" />
          </button>
          <span class="pager-page" aria-live="polite">
            Page <strong>{{ page }}</strong> of {{ pageCount }}
          </span>
          <button
            type="button"
            class="pager-arrow"
            aria-label="Next page"
            :disabled="page === pageCount"
            @click="page++"
          >
            <i class="pi pi-angle-right" />
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Gold in dark mode, sakura pink on white, like the Account page */
.history {
  --accent: #ffc200;
  --accent-tint: rgb(255 194 0 / 0.12);
  font-family: 'Montserrat', sans-serif;
}

:root:not(.app-dark) .history {
  --accent: #e0457f;
  --accent-tint: #ffe9f1;
}

.history-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 28px 0 12px;
}

.history-head.has-note {
  margin-bottom: 4px;
}

.history-title {
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  font-size: 1rem;
  text-transform: uppercase;
}

.history-note {
  margin: 0 0 14px;
  color: var(--app-muted);
  font-size: 0.8rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface);
  color: var(--app-muted);
  font: inherit;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.filter:hover {
  color: var(--app-text);
}

.filter.active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--accent);
}

.filter:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.filter-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgb(128 140 175 / 0.16);
  font-size: 0.65rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.list-card {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-navbar);
}

:root:not(.app-dark) .list-card {
  box-shadow: 0 2px 8px rgb(27 37 80 / 0.05);
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.pager-sizes,
.pager-pages {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pager-label {
  margin-right: 4px;
}

/* Page sizes: small versions of the filter pills */
.pager-size {
  min-width: 34px;
  padding: 4px 8px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface);
  color: var(--app-muted);
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.pager-size:hover {
  color: var(--app-text);
}

.pager-size.active {
  border-color: var(--accent);
  background: var(--accent-tint);
  color: var(--accent);
}

.pager-range {
  margin-right: 10px;
  font-variant-numeric: tabular-nums;
}

.pager-page {
  min-width: 92px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.pager-page strong {
  color: var(--app-text);
  font-weight: 900;
}

.pager-arrow {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.pager-arrow:not(:disabled):hover {
  border-color: var(--accent);
  color: var(--accent);
}

.pager-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-size:focus-visible,
.pager-arrow:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Phones: the range drops out so the arrows keep their room */
@media (max-width: 520px) {
  .pager {
    padding: 12px 16px;
  }

  .pager-range {
    display: none;
  }
}
</style>
