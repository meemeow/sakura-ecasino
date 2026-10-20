<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/layout/EmptyState.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import { WITHDRAW_DAILY_LIMIT } from '@/components/wallet/walletOptions'
import { useWalletStore } from '@/stores/wallet'
import walletIcon from '@/assets/icons/wallet.svg'

// Deposits, withdrawals and bonuses with filter pills, shared by the wallet and account pages.
// "Make a deposit" is emitted so each page opens the deposit its own way.
defineProps<{ title: string; note?: string }>()
const emit = defineEmits<{ deposit: [] }>()

const wallet = useWalletStore()
const router = useRouter()

type Filter = 'all' | 'deposit' | 'withdrawal' | 'bonus'
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'bonus', label: 'Bonuses' },
]
const filter = ref<Filter>('all')
const shownTxs = computed(() =>
  filter.value === 'all'
    ? wallet.walletTxs
    : wallet.walletTxs.filter((t) => t.type === filter.value),
)
const countFor = (id: Filter) =>
  id === 'all' ? wallet.walletTxs.length : wallet.walletTxs.filter((t) => t.type === id).length

// Empty history, in the lobby's empty-state style: what's missing and one way forward
const emptyState = computed(() => {
  const deposit = { label: 'Make a deposit', run: () => emit('deposit') }
  switch (filter.value) {
    case 'deposit':
      return {
        title: 'No deposits yet',
        text: 'Top up with GCash, Maya or QR Ph to start playing.',
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
      v-if="!shownTxs.length"
      :icon="walletIcon"
      :title="emptyState.title"
      :text="emptyState.text"
      :action-label="emptyState.action.label"
      @action="emptyState.action.run()"
    />
    <div v-else class="list-card">
      <TransactionList :transactions="shownTxs" kind="wallet" />
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
</style>
