<script setup lang="ts">
import { defineAsyncComponent, h } from 'vue'
import GameLoader from '@/games/GameLoader.vue'
import { publicUrl } from '@/utils/publicUrl'

defineProps<{ gameId: string }>()

const games: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'gates-of-olympus-1000': defineAsyncComponent({
    loader: () => import('@/games/gates-of-olympus/GatesOfOlympus.vue'),
    loadingComponent: {
      render: () =>
        h(GameLoader, {
          progress: 0,
          logo: publicUrl('/providers/pragmatic-play.svg'),
          logoAlt: 'Pragmatic Play',
        }),
    },
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
