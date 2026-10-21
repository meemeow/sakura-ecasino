<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import Select from 'primevue/select'
import EmptyState from '@/components/common/EmptyState.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import { WITHDRAW_DAILY_LIMIT } from '@/constants/wallet'
import { useWalletStore } from '@/stores/wallet'
import { useAuthStore } from '@/stores/auth'
import {
  countHistory,
  fetchHistoryPage,
  type HistoryFilter,
  type HistoryRow,
} from '@/services/history'
import walletIcon from '@/assets/icons/wallet.svg'

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
const PAGE_SIZES = [5, 10, 25, 50]
const pageSize = ref(10)
const page = ref(1)

type CachedPage = { rows: HistoryRow[]; last?: QueryDocumentSnapshot }
const pages = new Map<string, CachedPage>()
const pageKey = (f: Filter, size: number, n: number) => `${f}|${size}|${n}`
const counts = ref<Partial<Record<Filter, number>>>({})
const pageRows = shallowRef<HistoryRow[]>([])
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
  return pageRows.value.map((r) => wallet.walletTxById.get(r.id) ?? r)
})
const range = computed(() => {
  const from = Math.min((page.value - 1) * pageSize.value + 1, total.value)
  const to = Math.min(page.value * pageSize.value, total.value)
  return from === to ? `${from}` : `${from}–${to}`
})

const pageNumbers = computed<(number | null)[]>(() => {
  const n = pageCount.value
  const shown = [...new Set([1, page.value - 1, page.value, page.value + 1, n])]
    .filter((p) => p >= 1 && p <= n)
    .sort((a, b) => a - b)
  return shown.flatMap((p, i) => (i && p - shown[i - 1]! > 1 ? [null, p] : [p]))
})

const jumpTo = ref<number | ''>(1)
watch(page, (p) => (jumpTo.value = p), { immediate: true })
function jump() {
  const target = Math.round(Number(jumpTo.value))
  if (jumpTo.value === '' || !Number.isFinite(target)) jumpTo.value = page.value
  else page.value = jumpTo.value = Math.min(Math.max(target, 1), pageCount.value)
}

let countsLoad: Promise<void> | null = null
function loadCounts(uid: string) {
  const ids = filters.map((f) => f.id)
  countsLoad ??= Promise.all(ids.map((f) => countHistory(uid, f)))
    .then((values) => {
      counts.value = Object.fromEntries(ids.map((f, i) => [f, values[i]]))
    })
    .catch((e) => {
      countsLoad = null
      throw e
    })
  return countsLoad
}

async function loadPages(uid: string, f: Filter, size: number, n: number) {
  for (let i = 1; i <= n; i++) {
    if (pages.has(pageKey(f, size, i))) continue
    const before = i > 1 ? pages.get(pageKey(f, size, i - 1))?.last : undefined
    pages.set(pageKey(f, size, i), await fetchHistoryPage(uid, f, size, before))
  }
}

let request = 0
async function loadPage() {
  const uid = auth.user?.uid
  if (!uid) return
  const mine = ++request
  const f = filter.value
  const size = pageSize.value
  const n = page.value
  try {
    await Promise.all([loadCounts(uid), loadPages(uid, f, size, n)])
    if (mine !== request) return
    pageRows.value = pages.get(pageKey(f, size, n))!.rows
    fallback.value = false
  } catch (e) {
    console.warn("Couldn't load transaction history page", e)
    if (mine === request) fallback.value = true
  }
}

watch([filter, pageSize], () => {
  if (page.value === 1) loadPage()
  else page.value = 1
})
watch(page, loadPage)
onMounted(loadPage)

watch(
  () => wallet.walletTxs[0]?.id,
  (_, old) => {
    if (old === undefined) return
    pages.clear()
    countsLoad = null
    loadPage()
  },
)
watch(pageCount, (n) => {
  if (page.value > n) page.value = n
})

const liveCount = (id: Filter) =>
  id === 'all' ? wallet.walletTxs.length : wallet.walletTxs.filter((t) => t.type === id).length
const countFor = (id: Filter) => counts.value[id] ?? liveCount(id)

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

      <nav class="pager" aria-label="Transaction pages">
        <span class="pager-range" aria-live="polite">
          Showing <strong>{{ range }}</strong> of <strong>{{ total }}</strong>
        </span>
        <div class="pager-controls">
          <label class="pager-sizes">
            <span>Rows<span class="wide-label"> per page</span></span>
            <Select
              v-model="pageSize"
              :options="PAGE_SIZES"
              aria-label="Rows per page"
              :pt="{ overlay: { class: 'pager-popover' } }"
              class="pager-select"
            />
          </label>
          <div class="pager-pages">
            <button
              type="button"
              class="pager-btn"
              aria-label="Previous page"
              :disabled="page === 1"
              @click="page--"
            >
              <i class="pi pi-angle-left" />
            </button>
            <template v-for="(n, i) in pageNumbers" :key="i">
              <span v-if="n === null" class="pager-gap" aria-hidden="true">…</span>
              <button
                v-else
                type="button"
                class="pager-btn"
                :class="{ active: page === n }"
                :aria-label="`Page ${n}`"
                :aria-current="page === n ? 'page' : undefined"
                @click="page = n"
              >
                {{ n }}
              </button>
            </template>
            <button
              type="button"
              class="pager-btn"
              aria-label="Next page"
              :disabled="page === pageCount"
              @click="page++"
            >
              <i class="pi pi-angle-right" />
            </button>
          </div>
          <label class="pager-goto">
            <span class="wide-label">Go to</span>
            <span class="phone-label">Page</span>
            <input
              v-model="jumpTo"
              type="number"
              class="pager-jump"
              min="1"
              :max="pageCount"
              aria-label="Go to page"
              @keydown.enter="jump"
              @blur="jump"
            />
            <span class="phone-label">of {{ pageCount }}</span>
          </label>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
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
  container-type: inline-size;
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
  gap: 12px 24px;
  padding: 12px 24px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.pager-range {
  font-variant-numeric: tabular-nums;
}

.pager-range strong {
  color: var(--app-text);
  font-weight: 600;
}

.pager-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.pager-controls > * + * {
  padding-left: 20px;
  border-left: 1px solid var(--app-border);
}

.pager-sizes,
.pager-goto {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.pager-select {
  align-items: center;
  height: 32px;
  border-color: var(--app-border);
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
}

.pager-select:not(.p-disabled):hover,
.pager-select.p-focus {
  border-color: var(--accent);
}

.pager-select :deep(.p-select-label) {
  padding: 5px 4px 5px 10px;
  color: var(--app-text);
  font-family: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.pager-select :deep(.p-select-dropdown) {
  width: 28px;
  color: var(--app-muted);
}

.pager-select :deep(.p-select-dropdown svg) {
  width: 11px;
  height: 11px;
}

.pager-pages {
  display: flex;
  align-items: center;
  gap: 2px;
}

.pager-btn {
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.pager-btn:not(:disabled):not(.active):hover {
  background: rgb(128 140 175 / 0.12);
  color: var(--app-text);
}

.pager-btn.active {
  aspect-ratio: 1;
  padding: 0;
  border-radius: 50%;
  background: var(--accent);
  color: var(--app-navbar);
  font-weight: 700;
}

.pager-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pager-btn .pi {
  font-size: 0.75rem;
}

.pager-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.pager-jump {
  width: 48px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  appearance: textfield;
  transition: border-color 0.15s;
}

.pager-jump::-webkit-inner-spin-button,
.pager-jump::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.pager-jump:hover,
.pager-jump:focus {
  border-color: var(--accent);
  outline: none;
}

.pager-gap {
  min-width: 20px;
  text-align: center;
}

.phone-label {
  display: none;
}

@container (max-width: 860px) {
  .pager {
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      'range sizes goto'
      'pages pages pages';
    gap: 12px 20px;
  }

  .pager-controls {
    display: contents;
  }

  .pager-controls > * + * {
    padding-left: 0;
    border-left: none;
  }

  .pager-range {
    grid-area: range;
  }

  .pager-sizes {
    grid-area: sizes;
  }

  .pager-goto {
    grid-area: goto;
  }

  .pager-pages {
    grid-area: pages;
    justify-content: center;
    padding-top: 12px;
    border-top: 1px solid var(--app-border);
  }
}

@container (max-width: 480px) {
  .pager {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'sizes goto'
      'pages pages';
    gap: 12px;
    padding: 12px 16px;
  }

  .pager-range,
  .wide-label {
    display: none;
  }

  .phone-label {
    display: inline;
  }

  .pager-sizes,
  .pager-goto {
    gap: 8px;
  }

  .pager-jump {
    width: 44px;
  }

  .pager-btn {
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
  }

  .pager-gap {
    min-width: 16px;
  }
}

@container (max-width: 360px) {
  .pager-pages {
    gap: 0;
  }

  .pager-btn {
    min-width: 26px;
    height: 26px;
    padding: 0 2px;
  }

  .pager-gap {
    min-width: 12px;
  }
}
</style>

<style>
.pager-popover {
  font-family: 'Montserrat', sans-serif;
}

.pager-popover .p-select-list {
  padding: 4px;
}

.pager-popover .p-select-option {
  justify-content: center;
  border-radius: 6px;
  color: var(--app-text);
  font-weight: 600;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.pager-popover .p-select-option:not(.p-select-option-selected):not(.p-disabled).p-focus,
.pager-popover .p-select-option:not(.p-select-option-selected):hover {
  background: rgb(128 140 175 / 0.14);
  color: var(--app-text);
}

.pager-popover .p-select-option.p-select-option-selected,
.pager-popover .p-select-option.p-select-option-selected.p-focus {
  background: rgb(255 194 0 / 0.12);
  color: #ffc200;
}

:root:not(.app-dark) .pager-popover .p-select-option.p-select-option-selected,
:root:not(.app-dark) .pager-popover .p-select-option.p-select-option-selected.p-focus {
  background: #ffe9f1;
  color: #e0457f;
}
</style>
