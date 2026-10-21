<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'
import AuthModal from '@/components/auth/AuthModal.vue'
import GameGrid from '@/components/lobby/GameGrid.vue'
import GameSearch from '@/components/lobby/GameSearch.vue'
import GameTabs from '@/components/lobby/GameTabs.vue'
import { gameTabs, type GameTab, type GameTabDef } from '@/constants/gameTabs'
import HeroCarousel from '@/components/lobby/HeroCarousel.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { localGames } from '@/data/games'
import providerIcon from '@/assets/icons/provider.svg'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { safeRedirect } from '@/utils/redirect'

const props = defineProps<{
  tab: GameTab
  showAuth?: boolean
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()

const search = ref('')

const provider = ref<string | null>(null)
const providerOptions = computed(() => [
  { label: 'All providers', value: null },
  ...[...new Set(localGames.map((g) => g.provider))].sort().map((p) => ({ label: p, value: p })),
])

const tabGames = computed(() => {
  if (props.tab === 'all') return localGames
  if (props.tab === 'favorites') {
    if (!auth.isLoggedIn) return []
    return localGames.filter((g) => favorites.isFavorite(g.id))
  }
  const tab = gameTabs.find((t) => t.value === props.tab)
  return localGames.filter((g) => tab && 'category' in tab && g.category === tab.category)
})

const games = computed(() => {
  const byProvider = provider.value
    ? tabGames.value.filter((g) => g.provider === provider.value)
    : tabGames.value
  const q = search.value.trim().toLowerCase()
  if (!q) return byProvider
  return byProvider.filter(
    (g) => g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q),
  )
})

const activeTab = computed<GameTabDef>(
  () => gameTabs.find((t) => t.value === props.tab) ?? gameTabs[0]!,
)

interface EmptyStateContent {
  title: string
  text: string
  action: { label: string; run: () => void }
}

const emptyState = computed<EmptyStateContent>(() => {
  const q = search.value.trim()
  if (q) {
    return {
      title: `No results for “${q}”`,
      text: 'Check the spelling, or search by provider instead.',
      action: { label: 'Clear search', run: () => (search.value = '') },
    }
  }
  if (provider.value) {
    return {
      title: `No ${provider.value} games here`,
      text: `${provider.value} has nothing in ${activeTab.value.label} yet.`,
      action: { label: 'Show all providers', run: () => (provider.value = null) },
    }
  }
  if (props.tab === 'favorites' && !auth.isLoggedIn) {
    return {
      title: 'Your favorites live here',
      text: 'Log in to save games and find them in one place.',
      action: {
        label: 'Log in',
        run: () => router.push({ name: 'login', query: { redirect: '/favorites' } }),
      },
    }
  }
  if (props.tab === 'favorites') {
    return {
      title: 'No favorites yet',
      text: 'Tap the heart on any game to keep it here.',
      action: { label: 'Browse all games', run: () => router.push('/') },
    }
  }
  return {
    title: `${activeTab.value.title ?? activeTab.value.label} are on the way`,
    text: "We're adding new games to this category soon. Spin some slots in the meantime.",
    action: { label: 'Play slots', run: () => router.push('/slots') },
  }
})

function leaveLogin(signedIn: boolean) {
  router.replace(signedIn ? safeRedirect(route.query.redirect) : '/')
}

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (!loggedIn && props.tab === 'favorites') {
      router.replace({ name: 'login', query: { redirect: '/favorites' } })
    }
  },
)

const authVisible = computed({
  get: () => props.showAuth ?? false,
  set: (open) => {
    if (!open) leaveLogin(auth.isLoggedIn)
  },
})
</script>

<template>
  <section>
    <HeroCarousel />
    <GameSearch v-model="search" />
    <div class="tabs-row">
      <GameTabs :active="tab" class="tabs" />
      <Select
        v-model="provider"
        :options="providerOptions"
        option-label="label"
        option-value="value"
        aria-label="Filter by provider"
        filter
        filter-placeholder="Search providers"
        empty-filter-message="No providers found"
        reset-filter-on-hide
        :pt="{ overlay: { class: 'provider-popover' } }"
        class="provider-select"
      >
        <template #value="{ value }">
          <span class="provider-value">
            <img :src="providerIcon" alt="" class="provider-icon" draggable="false" />
            {{ value ?? 'All providers' }}
          </span>
        </template>
      </Select>
    </div>
    <GameGrid v-if="games.length" :games="games" />
    <EmptyState
      v-else
      :icon="activeTab.icon"
      :title="emptyState.title"
      :text="emptyState.text"
      :action-label="emptyState.action.label"
      @action="emptyState.action.run()"
    />
    <AuthModal v-model:visible="authVisible" @signed-in="leaveLogin(true)" />
  </section>
</template>

<style scoped>
.tabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}

.tabs {
  flex: 1;
  min-width: 0;
}

.tabs :deep(.game-tabs) {
  margin: 0;
}

.provider-select {
  flex: 0 0 auto;
  width: 200px;
  border: none;
  border-radius: 6px;
  background: var(--app-surface);
  box-shadow: none;
  font-family: 'Montserrat', sans-serif;
}

.provider-select :deep(.p-select-label) {
  padding: 9px 12px;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.85rem;
}

.provider-value {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-icon {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.3));
}

@media (max-width: 640px) {
  .tabs-row {
    flex-wrap: wrap;
  }

  .tabs {
    flex-basis: 100%;
  }

  .provider-select {
    width: 100%;
  }
}
</style>

<style>
.provider-popover {
  margin-top: 6px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-navbar);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
  font-family: 'Montserrat', sans-serif;
}

.provider-popover .p-select-header {
  padding: 8px;
  background: transparent;
}

.provider-popover .p-select-filter {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-panel);
  color: var(--app-text);
  font-family: inherit;
  font-size: 0.85rem;
}

.provider-popover .p-select-filter:focus {
  border-color: var(--app-focus);
}

.provider-popover .p-select-list {
  padding: 4px 8px 8px;
}

.provider-popover .p-select-option {
  border-radius: 6px;
  color: var(--app-text);
  font-weight: 600;
  font-size: 0.85rem;
}

.provider-popover .p-select-option:not(.p-select-option-selected):not(.p-disabled).p-focus,
.provider-popover .p-select-option:not(.p-select-option-selected):hover {
  background: rgb(128 140 175 / 0.14);
  color: var(--app-text);
}

.provider-popover .p-select-option.p-select-option-selected,
.provider-popover .p-select-option.p-select-option-selected.p-focus {
  background: var(--app-gold-tint);
  color: var(--app-gold-text);
}

:root:not(.app-dark) .provider-popover .p-select-option.p-select-option-selected,
:root:not(.app-dark) .provider-popover .p-select-option.p-select-option-selected.p-focus {
  background: #ffe9f1;
  color: #e0457f;
}

.provider-popover .p-select-empty-message {
  color: var(--app-muted);
  font-size: 0.85rem;
}
</style>
