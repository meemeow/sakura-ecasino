<script setup lang="ts">
import { defineAsyncComponent, h } from 'vue'
import GameLoader from '@/games/GameLoader.vue'

defineProps<{ gameId: string }>()

// Playable games, keyed by catalog id. Each one is loaded on demand, with the
// splash shown (at 0%) while its code downloads; the game then reports asset progress.
const games: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'gates-of-olympus-1000': defineAsyncComponent({
    loader: () => import('@/games/gates-of-olympus/GatesOfOlympus.vue'),
    loadingComponent: { render: () => h(GameLoader, { progress: 0, logo: '/providers/pragmatic-play.svg', logoAlt: 'Pragmatic Play' }) },
    delay: 0,
  }),
}
</script>

<template>
  <component :is="games[gameId]" v-if="games[gameId]" />
  <div v-else class="missing">
    <p>This game isn't available yet.</p>
    <RouterLink to="/">Back to lobby</RouterLink>
  </div>
</template>

<style scoped>
.missing {
  padding: 48px 16px;
  text-align: center;
}
</style>
