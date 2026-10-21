<script setup lang="ts">
import GameCard from '@/components/lobby/GameCard.vue'
import type { Game } from '@/types'

defineProps<{ games: Game[] }>()
</script>

<template>
  <div class="grid">
    <GameCard v-for="game in games" :key="game.id" :game="game" />
  </div>
</template>

<style scoped>
.grid {
  --gap: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(160px, calc((100% - var(--gap)) / 2)), 1fr));
  gap: var(--gap);
}

@media (max-width: 640px) {
  .grid {
    --gap: 10px;
  }
}
</style>
