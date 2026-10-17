<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'
import AuthModal from '@/components/auth/AuthModal.vue'
import GameGrid from '@/components/games/GameGrid.vue'
import GameSearch from '@/components/games/GameSearch.vue'
import GameTabs from '@/components/games/GameTabs.vue'
import { gameTabs, type GameTab } from '@/components/games/gameTabs'
import HeroCarousel from '@/components/games/HeroCarousel.vue'
import { localGames } from '@/services/games'
import providerIcon from '@/assets/icons/provider.svg'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'

const props = defineProps<{
  tab: GameTab
  showAuth?: boolean
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()

const search = ref('')

// Provider filter (null = all). Options come from the catalog, so new providers appear on their own.
const provider = ref<string | null>(null)
const providerOptions = computed(() => [
  { label: 'All providers', value: null },
  ...[...new Set(localGames.map((g) => g.provider))].sort().map((p) => ({ label: p, value: p })),
])

// TODO: load the catalog from Firestore
const tabGames = computed(() => {
  if (props.tab === 'all') return localGames
  if (props.tab === 'favorites') {
    if (!auth.isLoggedIn) return []
    return localGames.filter((g) => favorites.isFavorite(g.id))
  }
  const tab = gameTabs.find((t) => t.value === props.tab)
  return localGames.filter((g) => tab && 'category' in tab && g.category === tab.category)
})

// Provider filter, then search, narrow the active tab
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

const emptyMessage = computed(() => {
  if (search.value.trim()) return 'No games match your search.'
  if (provider.value) return `No ${provider.value} games in this category yet.`
  if (props.tab === 'favorites' && !auth.isLoggedIn) return 'Log in to see your favorites.'
  if (props.tab === 'favorites') return 'No favorites yet. Tap the heart on a game to add it here.'
  return 'No games in this category yet. Check back soon!'
})

// Closing the modal leaves /login. Signed in: continue to where the user was headed.
// Dismissed while signed out: back to the lobby, since the redirect target
// (e.g. /favorites) is guarded and would just reopen the modal.
function leaveLogin(signedIn: boolean) {
  const redirect = signedIn ? (route.query.redirect as string) : undefined
  router.replace(redirect || '/')
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
    <!-- Category tabs, with the provider filter on the opposite side -->
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
    <p v-else class="empty">{{ emptyMessage }}</p>
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

/* Tabs take the free space and scroll; the filter keeps its width */
.tabs {
  flex: 1;
  min-width: 0;
}

.tabs :deep(.game-tabs) {
  margin: 0;
}

/* Same look as an inactive tab */
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

/* Narrow screens: the filter drops below the tabs, full width */
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

.empty {
  margin: 48px 0;
  color: var(--app-muted);
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  text-align: center;
}
</style>

<!-- Not scoped: the popover teleports to <body> -->
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
  border-color: var(--app-gold-text);
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

.provider-popover .p-select-empty-message {
  color: var(--app-muted);
  font-size: 0.85rem;
}
</style>
