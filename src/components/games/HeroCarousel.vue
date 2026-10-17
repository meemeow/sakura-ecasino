<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import Carousel from 'primevue/carousel'
import Button from 'primevue/button'
import { localGames } from '@/services/games'

// Up to 5 featured games: wide scenery background + the game's cover art
const featured = [
  { id: 'gates-of-olympus-1000', tagline: 'Zeus multiplies every tumble up to 1000x' },
  { id: 'starlight-princess-1000', tagline: 'Magical multipliers rain from the sky' },
  { id: 'sweet-bonanza-1000', tagline: 'Candy bombs that burst up to 1000x' },
  { id: 'sugar-rush-1000', tagline: 'Sticky multipliers on every cluster win' },
  { id: 'gates-of-gatot-kaca-1000', tagline: 'Thunder strikes with mega multipliers' },
]

const slides = featured.slice(0, 5).flatMap((f) => {
  const game = localGames.find((g) => g.id === f.id)
  return game ? [{ ...f, game, background: `/hero/${f.id}.webp` }] : []
})

// Own autoplay instead of PrimeVue's: every page change (auto, arrow or dot)
// restarts the 5s countdown from the slide now showing, then advances to the next one.
const INTERVAL = 5000
const page = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = (page.value + 1) % slides.length
  }, INTERVAL)
}

watch(page, schedule, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Carousel
    v-model:page="page"
    :value="slides"
    :num-visible="1"
    :num-scroll="1"
    circular
    class="hero"
  >
    <template #item="{ data }">
      <div class="slide" :style="{ backgroundImage: `url(${data.background})` }">
        <div class="content">
          <span class="provider">{{ data.game.provider }}</span>
          <h2>{{ data.game.name }}</h2>
          <p>{{ data.tagline }}</p>
          <RouterLink
            v-if="data.game.playable"
            :to="{ name: 'play', params: { gameId: data.game.id } }"
          >
            <Button label="Play now" class="play-btn" />
          </RouterLink>
          <Button v-else label="Coming soon" class="play-btn" disabled />
        </div>
        <img :src="data.game.thumbnail" :alt="data.game.name" class="cover" />
      </div>
    </template>
  </Carousel>
</template>

<style scoped>
.hero {
  margin-top: 16px;
}

.slide {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: clamp(220px, 30vw, 360px);
  padding: 0 clamp(20px, 5vw, 56px);
  overflow: hidden;
  border-radius: var(--app-radius);
  background-size: cover;
  background-position: center;
}

/* Darken the left side so the text stays readable on bright scenery */
.slide::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgb(0 0 0 / 0.75), rgb(0 0 0 / 0.15) 65%, transparent);
}

.content {
  position: relative;
  max-width: 480px;
}

.provider {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffc200;
}

h2 {
  margin: 6px 0 8px;
  font-size: clamp(1.4rem, 3.2vw, 2.4rem);
  line-height: 1.1;
  /* Always white: sits on the dark banner art in both themes */
  color: #fff;
}

p {
  margin: 0 0 18px;
  color: #e5e5e5;
}

.cover {
  position: relative;
  height: 82%;
  aspect-ratio: 1;
  border-radius: var(--app-radius);
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.5);
}

/* Same gold 3D style as the header's login button */
.play-btn {
  padding: 10px 22px;
  border: none;
  border-radius: 6px;
  background: #ffc200;
  box-shadow: 0 5px 0 #d9871f;
  color: #703902;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.play-btn :deep(.p-button-label) {
  font-weight: 900;
}

.play-btn:not(:disabled):hover {
  border: none;
  background: #ffd033;
  color: #703902;
}

/* Carousel chrome: arrows overlay the slide, dots sit below */
.hero :deep(.p-carousel-content) {
  position: relative;
}

.hero :deep(.p-carousel-prev-button),
.hero :deep(.p-carousel-next-button) {
  position: absolute;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
  background: rgb(0 0 0 / 0.45);
  color: #fff;
}

.hero :deep(.p-carousel-prev-button) {
  left: 8px;
}

.hero :deep(.p-carousel-next-button) {
  right: 8px;
}

.hero :deep(.p-carousel-indicator-list) {
  padding: 12px 0 0;
}

.hero :deep(.p-carousel-indicator-active .p-carousel-indicator-button) {
  background: #ffc200;
}

/* TRY: light mode uses sakura pink for the active dot (#FFE3EE is too pale on the page) */
:root:not(.app-dark) .hero :deep(.p-carousel-indicator-active .p-carousel-indicator-button) {
  background: #ff5c9a;
}

@media (max-width: 640px) {
  .cover {
    display: none;
  }
}
</style>
