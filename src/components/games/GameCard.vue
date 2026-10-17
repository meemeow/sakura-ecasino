<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import type { Game } from '@/types'

const props = defineProps<{ game: Game }>()

const auth = useAuthStore()
const favorites = useFavoritesStore()
const route = useRoute()
const router = useRouter()

const isFavorite = computed(() => favorites.isFavorite(props.game.id))

function open() {
  if (props.game.playable) router.push({ name: 'play', params: { gameId: props.game.id } })
}

// Signed-out users are sent to log in, then back to this page
function onHeart() {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  favorites.toggle(props.game.id)
}
</script>

<template>
  <article class="card" :class="{ playable: game.playable }" @click="open">
    <div class="thumb-wrap">
      <img :src="game.thumbnail" :alt="game.name" class="thumb" loading="lazy" />
      <Button
        :icon="isFavorite ? 'pi pi-heart-fill' : 'pi pi-heart'"
        :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        :aria-pressed="isFavorite"
        rounded
        class="fav-btn"
        :class="{ active: isFavorite }"
        @click.stop="onHeart"
      />
    </div>
    <div class="info">
      <h3>{{ game.name }}</h3>
      <p>{{ game.provider }}</p>
    </div>
  </article>
</template>

<style scoped>
.card {
  overflow: hidden;
  border-radius: var(--app-radius);
  background: var(--app-surface);
  transition: transform 0.15s;
}

.card.playable {
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
}

.thumb-wrap {
  position: relative;
}

.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

/* Heart toggle in the image's top-right corner */
.fav-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: rgb(0 0 0 / 0.55);
  color: #fff;
}

.fav-btn:not(:disabled):hover {
  border: none;
  background: rgb(0 0 0 / 0.75);
  color: #fff;
}

.fav-btn.active,
.fav-btn.active:not(:disabled):hover {
  color: #ff4d6d;
}

.info {
  padding: 8px 10px 10px;
}

h3 {
  margin: 0;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

p {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--app-muted);
}
</style>
