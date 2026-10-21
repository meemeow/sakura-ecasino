<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Drawer from 'primevue/drawer'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import LogoutDialog from '@/components/auth/LogoutDialog.vue'

const route = useRoute()

const sidebarOpen = ref(true)
const drawerOpen = ref(false)
const narrowQuery = window.matchMedia('(max-width: 900px)')
const narrow = ref(narrowQuery.matches)

function onBreakpoint(e: MediaQueryListEvent) {
  narrow.value = e.matches
  if (!e.matches) drawerOpen.value = false
}
narrowQuery.addEventListener('change', onBreakpoint)
onBeforeUnmount(() => narrowQuery.removeEventListener('change', onBreakpoint))

const menuOpen = computed(() => (narrow.value ? drawerOpen.value : sidebarOpen.value))

function toggleMenu() {
  if (narrow.value) drawerOpen.value = !drawerOpen.value
  else sidebarOpen.value = !sidebarOpen.value
}

watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)

const confirmLogout = ref(false)
let reopenDrawer = false
let logoutAfterDrawer = false
function askLogout() {
  reopenDrawer = drawerOpen.value
  if (drawerOpen.value) {
    logoutAfterDrawer = true
    drawerOpen.value = false
  } else {
    confirmLogout.value = true
  }
}
function onDrawerHidden() {
  if (!logoutAfterDrawer) return
  logoutAfterDrawer = false
  confirmLogout.value = true
}
watch(confirmLogout, (open) => {
  if (open) return
  if (reopenDrawer && narrow.value) drawerOpen.value = true
  reopenDrawer = false
})
</script>

<template>
  <div class="layout">
    <AppHeader :menu-open="menuOpen" @toggle-menu="toggleMenu" />
    <div class="body">
      <aside class="side" :class="{ collapsed: !sidebarOpen }" :inert="!sidebarOpen">
        <AppSidebar class="side-inner" @logout="askLogout" />
      </aside>
      <main class="content">
        <slot />
      </main>
    </div>

    <Drawer
      v-model:visible="drawerOpen"
      @after-hide="onDrawerHidden"
      :show-close-icon="false"
      :pt="{
        root: { style: 'width: 270px; border: none; background: var(--app-navbar)' },
        header: { style: 'display: none' },
        content: { style: 'padding: 0', class: 'drawer-scroll' },
      }"
    >
      <div class="drawer-top">
        <button
          type="button"
          class="drawer-close"
          aria-label="Close menu"
          aria-expanded="true"
          @click="drawerOpen = false"
        >
          <svg viewBox="0 0 22 19" aria-hidden="true">
            <template v-for="(y, row) in [0, 10.5]" :key="y">
              <rect
                v-for="(x, col) in [0, 12]"
                :key="x"
                :x="x"
                :y="y"
                width="10"
                height="8.5"
                rx="2"
                :style="{ '--i': row * 2 + col }"
              />
            </template>
          </svg>
        </button>
      </div>
      <AppSidebar @logout="askLogout" />
    </Drawer>

    <LogoutDialog v-model:visible="confirmLogout" @logged-out="reopenDrawer = false" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.body {
  display: flex;
}

.side {
  position: sticky;
  top: 66px;
  flex: 0 0 260px;
  height: calc(100vh - 66px);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  background: var(--app-navbar);
  transition: flex-basis 0.3s ease;
}

.side::-webkit-scrollbar {
  display: none;
}

.side-inner {
  width: 260px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.side.collapsed {
  flex-basis: 0;
  overflow-y: hidden;
}

.side.collapsed .side-inner {
  transform: translateX(-40px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .side,
  .side-inner {
    transition: none;
  }
}

.content {
  flex: 1;
  min-width: 0;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px;
}

@media (max-width: 900px) {
  .side {
    display: none;
  }
}
</style>

<style>
.drawer-scroll {
  scrollbar-width: none;
}

.drawer-scroll::-webkit-scrollbar {
  display: none;
}

.drawer-top {
  display: flex;
  align-items: center;
  height: 66px;
  padding-left: 12px;
}

@media (max-width: 480px) {
  .drawer-top {
    padding-left: 4px;
  }
}

.drawer-close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  transition: background-color 0.2s;
}

:root:not(.app-dark) .drawer-close {
  color: #1b2550;
}

.drawer-close:hover {
  background: rgb(128 140 175 / 0.12);
}

.drawer-close:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}

.drawer-close svg {
  width: calc((1.4rem * 0.775 + 0.8px) * 1.1);
  aspect-ratio: 22 / 19;
  fill: currentColor;
}

.drawer-close svg {
  animation: drawer-grid-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.drawer-close rect {
  transform-box: fill-box;
  transform-origin: center;
  animation: drawer-tile-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i) * 50ms);
}

@keyframes drawer-grid-in {
  from {
    opacity: 0;
    transform: rotate(-90deg) scale(0.4);
  }
}

@keyframes drawer-tile-pop {
  from {
    transform: scale(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-close svg,
  .drawer-close rect {
    animation: none;
  }
}
</style>
