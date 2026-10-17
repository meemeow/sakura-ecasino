<script setup lang="ts">
import GameCard from './GameCard.vue'
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
</style>
