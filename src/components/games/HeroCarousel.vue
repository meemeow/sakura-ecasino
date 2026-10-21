<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import Carousel from 'primevue/carousel'
import Button from 'primevue/button'
import { localGames } from '@/services/games'
import SakuraIcon from '@/components/layout/SakuraIcon.vue'

// Up to 5 featured games: wide scenery background + the game's cover art
const featured = [
  { id: 'gates-of-olympus-1000', tagline: 'Zeus multiplies every tumble up to 1000x' },
  { id: 'starlight-princess-1000', tagline: 'Magical multipliers rain from the sky' },
  { id: 'sweet-bonanza-1000', tagline: 'Candy bombs that burst up to 1000x' },
  { id: 'sugar-rush-1000', tagline: 'Sticky multipliers on every cluster win' },
  { id: 'gates-of-gatot-kaca-1000', tagline: 'Thunder strikes with mega multipliers' },
]

// Provider logos shown in the eyebrow pill; providers without one show their name
const providerLogos: Record<string, string> = {
  'Pragmatic Play': '/providers/pragmatic-play.svg',
}

const slides = featured.slice(0, 5).flatMap((f) => {
  const game = localGames.find((g) => g.id === f.id)
  return game ? [{ ...f, game, background: `/hero/${f.id}.webp` }] : []
})

// Own autoplay instead of PrimeVue's: every page change (auto, arrow or dot)
// restarts the countdown from the slide now showing, then advances to the next one.
// The active dot's progress bar runs on the same duration (--hero-interval).
const INTERVAL = 5000
const page = ref(0)
// navForward is what the carousel's own Next arrow calls. Unlike setting page = 0, it wraps
// from the last slide to the first through the cloned first slide, so it keeps moving right.
const carousel = ref<{ navForward: (e: object) => void } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => carousel.value?.navForward({}), INTERVAL)
}

watch(page, schedule, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="hero-wrap" :style="{ '--hero-interval': `${INTERVAL}ms` }">
    <Carousel
      ref="carousel"
      v-model:page="page"
      :value="slides"
      :num-visible="1"
      :num-scroll="1"
      circular
      class="hero"
    >
      <template #item="{ data }">
        <div class="slide" :class="{ current: data.id === slides[page]?.id }">
          <img :src="data.background" alt="" class="slide-bg" />
          <div class="slide-shade" />

          <div class="content">
            <span class="eyebrow">
              <img
                v-if="providerLogos[data.game.provider]"
                :src="providerLogos[data.game.provider]"
                :alt="data.game.provider"
                class="eyebrow-logo"
              />
              <template v-else>{{ data.game.provider }}</template>
            </span>
            <h2>{{ data.game.name }}</h2>
            <p>{{ data.tagline }}</p>
            <RouterLink
              v-if="data.game.playable"
              :to="{ name: 'play', params: { gameId: data.game.id } }"
              class="play-link"
            >
              <Button label="Play now" class="play-btn">
                <template #icon="{ class: iconClass }">
                  <SakuraIcon mark="play" :class="[iconClass, 'play-icon']" />
                </template>
              </Button>
            </RouterLink>
            <span v-else class="soon">
              <SakuraIcon mark="clock" class="soon-icon" />
              Coming soon
            </span>
          </div>

          <img :src="data.game.thumbnail" :alt="data.game.name" class="cover" />
        </div>
      </template>
    </Carousel>
  </div>
</template>

<style scoped>
.hero-wrap {
  margin-top: 16px;
}

.slide {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: clamp(230px, 30vw, 360px);
  padding: 0 clamp(24px, 6vw, 80px);
  overflow: hidden;
  isolation: isolate;
  border-radius: 20px;
  background: #05070f;
}

/* Layers, back to front: art, shade, then the copy and cover */
.slide-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Darkens the left for the copy and the bottom edge, like the login modal's banner */
.slide-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgb(5 7 15 / 0.88), rgb(5 7 15 / 0.45) 50%, rgb(5 7 15 / 0.05)),
    linear-gradient(to top, rgb(5 7 15 / 0.55), transparent 40%);
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  max-width: 700px;
  color: #fff;
  font-family: 'Montserrat', sans-serif;
}

/* The provider's logo on its own, straight on the banner (or its name in gold) */
.eyebrow {
  display: inline-flex;
  align-items: center;
  color: #ffc200;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eyebrow-logo {
  height: 52px;
  filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.45));
}

/* Always one line: sized to fit the longest featured name next to the cover, with an
   ellipsis as a last resort on narrow screens */
h2 {
  max-width: 100%;
  margin: 4px 0 0;
  overflow: hidden;
  font-weight: 900;
  font-size: clamp(1.4rem, 3vw, 2.6rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

p {
  margin: 10px 0 22px;
  color: rgb(255 255 255 / 0.85);
  font-weight: 500;
  font-size: clamp(0.85rem, 1.3vw, 1rem);
}

.play-link {
  text-decoration: none;
}

/* Lavender 3D button, the header's Join & Play Now colors, with a sakura play mark. Stays
   lavender in light mode too: the banner art behind it is dark in both themes. */
.play-btn {
  gap: 8px;
  height: 38px;
  margin-bottom: 5px;
  padding: 0 26px 0 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(#f1f4ff, #dbe3fc 55%, #bcc8f4);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 5px 0 #8f9bd1;
  color: #1b2550;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Same 700 weight as Coming soon. Dark text on the light face reads thinner than light text
   on dark, so a hairline stroke in the text's own color makes the two look equally bold. */
.play-btn :deep(.p-button-label) {
  font-weight: 700;
  -webkit-text-stroke: 0.4px currentColor;
}

/* PrimeVue paints its own primary on hover/active, so restate the face */
.play-btn:not(:disabled):hover,
.play-btn:not(:disabled):active {
  border: none;
  background: linear-gradient(#f6f8ff, #e3e9fd 55%, #c6d1f6);
  color: #1b2550;
}

.play-btn:not(:disabled):active {
  transform: translateY(3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.6),
    0 2px 0 #8f9bd1;
}

.play-icon {
  width: 20px;
  height: 20px;
}

/* Not playable yet: a frosted label instead of a dead button */
.soon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgb(255 255 255 / 0.18);
  border-radius: 10px;
  background: rgb(255 255 255 / 0.08);
  backdrop-filter: blur(6px);
  color: rgb(255 255 255 / 0.85);
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* A touch bigger than Play now's blossom so the clock hands read */
.soon-icon {
  width: 22px;
  height: 22px;
}

/* Gold-framed game card, upright, framed like the login modal's covers */
.cover {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  height: 78%;
  aspect-ratio: 1;
  margin-right: clamp(0px, 3vw, 40px);
  border: 3px solid #ffd54a;
  border-radius: 20px;
  box-shadow:
    0 0 0 1px rgb(120 60 0 / 0.5),
    0 7px 0 rgb(90 40 0 / 0.35),
    0 20px 40px rgb(0 0 0 / 0.5);
}

/* --- Entrance: each time a slide comes up, its art drifts, the copy rises in and the
   cover is dealt onto the table. Keyed off our own page (.current), not PrimeVue's
   active class, so the cloned first slide animates in sync with the real one when
   wrapping from the last slide. --- */

.slide.current .slide-bg {
  animation: bg-drift 9s ease-out both;
}

.slide.current .content > * {
  animation: rise-in 0.5s ease-out both;
}

.slide.current .content > :nth-child(2) {
  animation-delay: 0.06s;
}

.slide.current .content > :nth-child(3) {
  animation-delay: 0.12s;
}

.slide.current .content > :nth-child(4) {
  animation-delay: 0.18s;
}

.slide.current .cover {
  animation: cover-deal 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
}

@keyframes bg-drift {
  from {
    transform: scale(1.1);
  }
  to {
    transform: scale(1.02);
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

@keyframes cover-deal {
  from {
    opacity: 0;
    transform: translateY(-40px) scale(0.85);
  }
}

/* --- Carousel chrome: frosted arrows over the slide, progress dots below --- */

.hero :deep(.p-carousel-content) {
  position: relative;
}

/* Each item is a flex child that by default can't shrink below its content. The one-line
   title would then widen it past the viewport whenever space is tight (e.g. sidebar open),
   throwing every slide's position off. Pin items to exactly one viewport wide. */
.hero :deep(.p-carousel-item),
.hero :deep(.p-carousel-item-clone) {
  min-width: 0;
}

.hero :deep(.p-carousel-prev-button),
.hero :deep(.p-carousel-next-button) {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: 1px solid rgb(255 255 255 / 0.2);
  background: rgb(8 11 24 / 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  opacity: 0;
  transform: translateY(-50%);
  transition:
    opacity 0.2s ease,
    background 0.15s ease;
}

/* Arrows appear on hover (always shown on touch screens) */
.hero:hover :deep(.p-carousel-prev-button),
.hero:hover :deep(.p-carousel-next-button),
.hero :deep(.p-carousel-prev-button:focus-visible),
.hero :deep(.p-carousel-next-button:focus-visible) {
  opacity: 1;
}

@media (hover: none) {
  .hero :deep(.p-carousel-prev-button),
  .hero :deep(.p-carousel-next-button) {
    opacity: 1;
  }
}

.hero :deep(.p-carousel-prev-button:not(:disabled):hover),
.hero :deep(.p-carousel-next-button:not(:disabled):hover) {
  background: rgb(8 11 24 / 0.85);
  color: #fff;
}

.hero :deep(.p-carousel-prev-button) {
  left: 12px;
}

.hero :deep(.p-carousel-next-button) {
  right: 12px;
}

.hero :deep(.p-carousel-indicator-list) {
  gap: 6px;
  padding: 14px 0 0;
}

.hero :deep(.p-carousel-indicator-button) {
  position: relative;
  width: 8px;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-muted) 35%, transparent);
  transition: width 0.3s ease;
}

/* The active dot stretches into a bar that fills over the autoplay interval */
.hero :deep(.p-carousel-indicator-active .p-carousel-indicator-button) {
  width: 36px;
}

.hero :deep(.p-carousel-indicator-active .p-carousel-indicator-button)::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #ffc200;
  transform-origin: left;
  animation: dot-fill var(--hero-interval) linear both;
}

/* Light mode: sakura pink instead of gold */
:root:not(.app-dark) .hero :deep(.p-carousel-indicator-active .p-carousel-indicator-button)::after {
  background: #ff5c9a;
}

@keyframes dot-fill {
  from {
    transform: scaleX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide.current .slide-bg,
  .slide.current .content > *,
  .slide.current .cover {
    animation: none;
  }
}

/* Phones: text and a smaller cover side by side. Too narrow for one-line names next to the
   cover, so the title may wrap to two lines here (no ellipsis cutting names short). */
@media (max-width: 640px) {
  .slide {
    gap: 14px;
    height: 250px;
    padding: 0 18px;
    border-radius: 16px;
  }

  .eyebrow-logo {
    height: 38px;
  }

  h2 {
    font-size: clamp(1.2rem, 5.6vw, 1.5rem);
    line-height: 1.1;
    white-space: normal;
  }

  p {
    margin: 6px 0 14px;
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .cover {
    width: clamp(96px, 30vw, 132px);
    height: auto;
    margin: 0;
    border-width: 2px;
    border-radius: 14px;
    box-shadow:
      0 0 0 1px rgb(120 60 0 / 0.5),
      0 5px 0 rgb(90 40 0 / 0.35),
      0 12px 24px rgb(0 0 0 / 0.5);
  }

  /* Play now / Coming soon on one line: tighter padding, smaller text and icon */
  .play-btn {
    height: 34px;
    padding: 0 16px 0 12px;
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .play-icon {
    width: 17px;
    height: 17px;
  }

  .soon {
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .soon-icon {
    width: 18px;
    height: 18px;
  }

  /* Swipe and the dots handle navigation; the arrows would sit on the title */
  .hero :deep(.p-carousel-prev-button),
  .hero :deep(.p-carousel-next-button) {
    display: none;
  }
}
</style>
