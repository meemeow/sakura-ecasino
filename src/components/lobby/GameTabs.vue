<script setup lang="ts">
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gameTabs as tabs, type GameTab } from './gameTabs'
import { useDragScroll } from '@/composables/useDragScroll'

const props = defineProps<{ active: GameTab }>()
const route = useRoute()

// PrimeVue highlights a clicked tab right away. If the route guard redirects
// (e.g. Favorites while signed out), `active` may not change, so re-sync after
// every navigation instead of trusting the click.
const current = ref<string>(props.active)
watch(
  () => [props.active, route.fullPath],
  () => (current.value = props.active),
)

// Drag to scroll with the mouse, with momentum (see composables/useDragScroll.ts)
const root = ref<HTMLElement>()
useDragScroll(() => root.value?.querySelector<HTMLElement>('.p-tablist-viewport'))
</script>

<template>
  <div ref="root">
    <Tabs v-model:value="current" scrollable :show-navigators="false" class="game-tabs">
      <TabList>
        <RouterLink v-for="tab in tabs" :key="tab.value" :to="tab.to" custom v-slot="{ navigate }">
          <Tab :value="tab.value" @click="navigate">
            <img :src="tab.icon" alt="" class="tab-icon" draggable="false" />
            <span>{{ tab.label }}</span>
          </Tab>
        </RouterLink>
      </TabList>
    </Tabs>
  </div>
</template>

<style scoped>
/* Rounded-rectangle tabs: transparent strip, gold fill for the active tab */
.game-tabs {
  margin: 16px 0;
}

.game-tabs :deep(.p-tablist),
.game-tabs :deep(.p-tablist-content),
.game-tabs :deep(.p-tablist-tab-list) {
  background: transparent;
  border: none;
}

.game-tabs :deep(.p-tablist-tab-list) {
  gap: 8px;
}

.game-tabs :deep(.p-tablist-active-bar) {
  display: none;
}

/* Draggable strip: grab cursor, and no smooth-scroll lag while the mouse is dragging */
.game-tabs :deep(.p-tablist-viewport) {
  cursor: grab;
}

.game-tabs :deep(.p-tablist-viewport.dragging) {
  cursor: grabbing;
  scroll-behavior: auto;
  user-select: none;
}

.game-tabs :deep(.p-tablist-viewport.dragging .p-tab) {
  cursor: grabbing;
}

.game-tabs :deep(.p-tab) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 18px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-muted);
  font-weight: 700;
  font-size: 0.9rem;
  transition:
    background 0.15s,
    color 0.15s;
}

/* Blue-grey tint over the tab's own surface: slightly lighter on navy, slightly darker on white */
.game-tabs :deep(.p-tab:not(.p-tab-active):hover) {
  background: linear-gradient(rgb(128 140 175 / 0.16), rgb(128 140 175 / 0.16)), var(--app-surface);
  color: var(--app-text);
}

.game-tabs :deep(.p-tab-active) {
  background: #ffc200;
  border-color: #ffc200;
  color: #3d1f00;
}

/* TRY: light mode uses sakura pink for the selected tab */
:root:not(.app-dark) .game-tabs :deep(.p-tab-active) {
  background: #ffe3ee;
  border-color: #f3b3cb;
  color: #c2185b;
}
.game-tabs :deep(.p-tab) {
  flex-shrink: 0;
  white-space: nowrap;
}

.tab-icon {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.35));
  /* Keep the browser's image drag from hijacking the strip drag */
  pointer-events: none;
}
</style>
