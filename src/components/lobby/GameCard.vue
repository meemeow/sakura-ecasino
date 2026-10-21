<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import type { Game } from '@/types'

const props = defineProps<{ game: Game }>()

const auth = useAuthStore()
const favorites = useFavoritesStore()
const route = useRoute()
const router = useRouter()

const isFavorite = computed(() => favorites.isFavorite(props.game.id))
// Set on the first tap, so hearts don't all pop on page load
const tapped = ref(false)

// Gradient ids must be unique per card, since every card draws its own heart
const uid = useId()
const faceId = `heart-face-${uid}`
const shineId = `heart-shine-${uid}`

function open() {
  if (props.game.playable) router.push({ name: 'play', params: { gameId: props.game.id } })
}

// Signed-out users are sent to log in, then back to this page
function onHeart() {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  tapped.value = true
  favorites.toggle(props.game.id)
}
</script>

<template>
  <article
    class="card"
    :class="{ playable: game.playable }"
    :tabindex="game.playable ? 0 : undefined"
    @click="open"
    @keydown.enter="open"
  >
    <div class="thumb-wrap">
      <img :src="game.thumbnail" :alt="game.name" class="thumb" loading="lazy" />

      <!-- Hover overlay: a sakura play button, or a coming-soon chip -->
      <div class="overlay" aria-hidden="true">
        <SakuraIcon v-if="game.playable" mark="play" class="overlay-play" />
        <span v-else class="overlay-soon">
          <SakuraIcon mark="clock" class="overlay-soon-icon" />
          Coming soon
        </span>
      </div>

      <button
        type="button"
        class="fav-btn"
        :class="{ active: isFavorite }"
        :aria-label="isFavorite ? 'Remove from favorites' : 'Add to favorites'"
        :aria-pressed="isFavorite"
        @click.stop="onHeart"
        @keydown.enter.stop
      >
        <!-- Favorited: the Favorites tab icon's glossy 3D red heart (extruded edge, shine) -->
        <svg
          v-if="isFavorite"
          key="on"
          class="fav-heart"
          :class="{ pop: tapped }"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <defs>
            <linearGradient :id="faceId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ff5470" />
              <stop offset=".45" stop-color="#f0002f" />
              <stop offset="1" stop-color="#a30022" />
            </linearGradient>
            <radialGradient :id="shineId" cx=".5" cy=".5" r=".5">
              <stop offset="0" stop-color="#fff" stop-opacity=".95" />
              <stop offset="1" stop-color="#fff" stop-opacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M32 59C10 45 4 33 4 23c0-9 7-15 15-15 6 0 10 3 13 8 3-5 7-8 13-8 8 0 15 6 15 15 0 10-6 22-28 36z"
            fill="#3d0010"
          />
          <path
            d="M32 55C10 41 4 29 4 19c0-9 7-15 15-15 6 0 10 3 13 8 3-5 7-8 13-8 8 0 15 6 15 15 0 10-6 22-28 36z"
            :fill="`url(#${faceId})`"
            stroke="#5c0016"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <ellipse
            cx="18"
            cy="16"
            rx="9"
            ry="6"
            :fill="`url(#${shineId})`"
            transform="rotate(-30 18 16)"
          />
          <ellipse
            cx="45"
            cy="13"
            rx="4"
            ry="2.5"
            fill="#fff"
            opacity=".6"
            transform="rotate(20 45 13)"
          />
        </svg>
        <!-- Not yet: a flat outline that reads as empty, waiting to be filled. It beats while
             the card is hovered and fills pink while the button is, previewing the tap. -->
        <svg
          v-else
          key="off"
          class="fav-heart fav-heart-empty"
          :class="{ pop: tapped }"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <path
            d="M32 56C10 42 4 30 4 20c0-9 7-15 15-15 6 0 10 3 13 8 3-5 7-8 13-8 8 0 15 6 15 15 0 10-6 22-28 36z"
          />
        </svg>
      </button>
    </div>

    <div class="info">
      <h3>{{ game.name }}</h3>
      <p>{{ game.provider }}</p>
    </div>
  </article>
</template>

<!-- 3D tile in the same spirit as the site's buttons: a solid edge underneath and a light
     top rim. Lifts on hover (edge grows), presses down on click (edge shrinks). -->
<style scoped>
.card {
  --card-edge: #05070f;
  --card-rim: rgb(255 255 255 / 0.07);

  position: relative;
  overflow: hidden;
  margin-bottom: 6px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
  box-shadow:
    inset 0 1px 0 var(--card-rim),
    0 5px 0 var(--card-edge),
    0 10px 20px rgb(0 0 0 / 0.25);
  font-family: 'Montserrat', sans-serif;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

:root:not(.app-dark) .card {
  --card-edge: #d3d9e8;
  --card-rim: rgb(255 255 255 / 0.9);
  box-shadow:
    inset 0 1px 0 var(--card-rim),
    0 5px 0 var(--card-edge),
    0 10px 20px rgb(20 30 70 / 0.08);
}

.card.playable {
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 0 var(--card-rim),
    0 9px 0 var(--card-edge),
    0 18px 30px rgb(0 0 0 / 0.35);
}

:root:not(.app-dark) .card:hover {
  box-shadow:
    inset 0 1px 0 var(--card-rim),
    0 9px 0 var(--card-edge),
    0 18px 30px rgb(20 30 70 / 0.14);
}

/* Pressed into the page */
.card.playable:active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 var(--card-rim),
    0 2px 0 var(--card-edge),
    0 4px 10px rgb(0 0 0 / 0.2);
  transition-duration: 0.08s;
}

.card.playable:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 3px;
}

:root:not(.app-dark) .card.playable:focus-visible {
  outline-color: #e0457f;
}

.thumb-wrap {
  position: relative;
  overflow: hidden;
}

.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.card:hover .thumb {
  transform: scale(1.06);
}

/* --- Hover overlay --- */

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(to top, rgb(5 7 15 / 0.7), rgb(5 7 15 / 0.25));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card:hover .overlay,
.card:focus-visible .overlay {
  opacity: 1;
}

.overlay-play {
  width: 58px;
  height: 58px;
  filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.5));
  transform: scale(0.6) rotate(-72deg);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card:hover .overlay-play,
.card:focus-visible .overlay-play {
  transform: none;
}

.overlay-soon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px 0 8px;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 999px;
  background: rgb(8 11 24 / 0.6);
  backdrop-filter: blur(6px);
  color: #fff;
  font-weight: 700;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transform: translateY(8px);
  transition: transform 0.25s ease;
}

.card:hover .overlay-soon {
  transform: none;
}

.overlay-soon-icon {
  width: 18px;
  height: 18px;
}

/* --- Favorite toggle: frosted, like the modal close buttons --- */

.fav-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 50%;
  background: rgb(8 11 24 / 0.55);
  backdrop-filter: blur(6px);
  color: #fff;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.fav-btn:hover {
  background: rgb(8 11 24 / 0.8);
  transform: scale(1.08);
}

/* Nudged down: the heart's lobes are its widest part, so true center looks too high */
.fav-heart {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35));
}

/* Empty: white outline, no gloss. Smaller than the 3D heart since it has no extruded edge. */
.fav-heart-empty {
  width: 17px;
  height: 17px;
  margin-top: 1px;
}

.fav-heart-empty path {
  fill: rgb(240 0 47 / 0);
  stroke: #fff;
  stroke-width: 5;
  stroke-linejoin: round;
  transition:
    fill 0.2s ease,
    stroke 0.2s ease;
}

/* Hovering the card: a slow heartbeat, nudging toward a tap */
.card:hover .fav-heart-empty {
  animation: heart-beat 1.4s ease-in-out infinite;
}

/* Hovering the button: fills with the favorited heart's red, previewing the tap */
.fav-btn:hover .fav-heart-empty path {
  fill: #f0002f;
  stroke: #ff5470;
}

@keyframes heart-beat {
  0%,
  40%,
  100% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.18);
  }
  28% {
    transform: scale(1.06);
  }
}

/* Pops after a tap (the svg re-mounts on toggle), a little longer when favoriting */
.fav-heart.pop {
  animation: heart-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fav-btn.active .fav-heart.pop {
  animation-duration: 0.4s;
}

@keyframes heart-pop {
  from {
    transform: scale(0.4);
  }
}

/* --- Title and provider --- */

.info {
  padding: 10px 12px 12px;
}

h3 {
  margin: 0;
  overflow: hidden;
  color: var(--app-text);
  font-weight: 700;
  font-size: 0.85rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

p {
  margin: 3px 0 0;
  color: var(--app-muted);
  font-weight: 500;
  font-size: 0.72rem;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .thumb,
  .overlay-play,
  .overlay-soon {
    transition: none;
  }

  .fav-heart.pop,
  .card:hover .fav-heart-empty {
    animation: none;
  }
}

/* Touch screens: no hover, so no lift, overlay or heartbeat */
@media (hover: none) {
  .card:hover .fav-heart-empty {
    animation: none;
  }

  .card:hover {
    transform: none;
  }

  .card:hover .thumb {
    transform: none;
  }

  .card:hover .overlay {
    opacity: 0;
  }
}
</style>
