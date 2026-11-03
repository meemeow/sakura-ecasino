<script setup lang="ts">
import SakuraIcon from '@/components/icons/SakuraIcon.vue'
import { promotions } from '@/data/promotions'
import { SLIDE_MS, type PromoSlides } from '@/composables/usePromoSlides'
import type { useSheetSwipe } from '@/composables/useSheetSwipe'
import logoUrl from '@/assets/images/logo-sakura.png'
import branchUrl from '@/assets/images/sakura-branch.svg'

const props = defineProps<{ slides: PromoSlides; swipe: ReturnType<typeof useSheetSwipe> }>()

const { offer, slide, slideRun, offerTransition, artTransition } = props.slides

const petals = [
  { x: '46%', s: 0.8, d: '9s', delay: '0s' },
  { x: '58%', s: 1, d: '11s', delay: '-4s' },
  { x: '68%', s: 0.7, d: '8s', delay: '-6s' },
  { x: '79%', s: 0.9, d: '12s', delay: '-2s' },
  { x: '90%', s: 1.1, d: '10s', delay: '-7s' },
]
</script>

<template>
  <header
    class="auth-hero"
    :class="{ dragging: swipe.dragging.value }"
    :style="swipe.dragStyle.value"
    @pointerdown="swipe.onDragStart"
    @pointermove="swipe.onDragMove"
    @pointerup="swipe.onDragEnd"
    @pointercancel="swipe.onDragEnd"
  >
    <span class="auth-grabber" aria-hidden="true" />
    <Transition name="auth-crossfade">
      <img :key="offer.id" :src="offer.background" alt="" draggable="false" class="auth-hero-bg" />
    </Transition>
    <div class="auth-hero-shade" />

    <div class="auth-hero-blossoms" aria-hidden="true">
      <img :src="branchUrl" alt="" class="auth-branch" />
      <span
        v-for="(p, i) in petals"
        :key="i"
        class="auth-petal"
        :style="{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay }"
      />
    </div>

    <div class="auth-hero-covers" aria-hidden="true">
      <Transition :name="artTransition">
        <div :key="offer.id" class="auth-hero-art">
          <template v-if="offer.covers">
            <img
              v-for="(src, i) in offer.covers"
              :key="src"
              :src="src"
              alt=""
              class="auth-hero-cover"
              :class="offer.covers.length === 1 ? 'only' : i === 0 ? 'back' : 'front'"
            />
          </template>
          <SakuraIcon
            v-else-if="offer.coin"
            variant="gold"
            :symbol="offer.coin"
            class="auth-hero-coin"
          />
          <SakuraIcon v-else-if="offer.seal" variant="gold" mark="check" class="auth-hero-coin" />
          <img v-else-if="offer.icon" :src="offer.icon" alt="" class="auth-hero-coin" />
        </div>
      </Transition>
    </div>

    <div class="auth-hero-copy">
      <span
        role="img"
        aria-label="Sakura"
        class="auth-logo"
        :style="{ '--logo-url': `url(${logoUrl})` }"
      />
      <div class="auth-hero-drag">
        <Transition :name="offerTransition" mode="out-in">
          <div :key="offer.id" class="auth-hero-offer">
            <span class="auth-eyebrow">{{ offer.eyebrow }}</span>
            <p class="auth-offer">
              <small>{{ offer.headline }}</small>
              {{ offer.amount }}
            </p>
            <p class="auth-offer-sub">{{ offer.subline }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <div class="auth-dots" :style="{ '--slide-ms': `${SLIDE_MS}ms` }">
      <button
        v-for="(p, i) in promotions"
        :key="p.id"
        type="button"
        class="auth-dot"
        :class="{ active: i === slide }"
        :aria-label="`Show ${p.title}`"
        :aria-current="i === slide || undefined"
        @click="slides.goToSlide(i)"
      >
        <span v-if="i === slide" :key="slideRun" class="auth-dot-fill" />
      </button>
    </div>
  </header>
</template>

<style>
.sakura-auth .auth-hero {
  position: relative;
  height: 260px;
  overflow: hidden;
  isolation: isolate;
  background: #05070f;
  color: #fff;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

.sakura-auth .auth-hero.dragging {
  cursor: grabbing;
}

.sakura-auth .auth-grabber {
  display: none;
}

.sakura-auth .auth-hero img {
  -webkit-user-drag: none;
}

.sakura-auth .auth-hero-covers,
.sakura-auth .auth-hero-drag {
  translate: var(--drag-x) 0;
  opacity: var(--drag-fade);
  transition:
    translate 0.25s ease,
    opacity 0.25s ease;
}

.sakura-auth .auth-hero.dragging .auth-hero-covers,
.sakura-auth .auth-hero.dragging .auth-hero-drag {
  transition: none;
}

.sakura-auth .auth-hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: auth-hero-drift 18s ease-in-out infinite alternate;
}

@keyframes auth-hero-drift {
  from {
    transform: scale(1.02);
  }
  to {
    transform: scale(1.12) translateX(-2%);
  }
}

.sakura-auth .auth-hero-shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgb(5 7 15 / 0.88), rgb(5 7 15 / 0.5) 50%, rgb(5 7 15 / 0.05)),
    linear-gradient(to top, rgb(5 7 15 / 0.6), transparent 40%);
}

.sakura-auth .auth-hero-blossoms {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.sakura-auth .auth-branch {
  position: absolute;
  top: 0;
  right: -64px;
  height: 66px;
  user-select: none;
}

.sakura-auth .auth-petal {
  position: absolute;
  top: -14px;
  left: var(--x);
  width: calc(9px * var(--s));
  height: calc(12px * var(--s));
  border-radius: 150% 0 150% 0;
  background: linear-gradient(135deg, #fff0f5, #f8a9c4);
  opacity: 0;
  animation: auth-petal-fall var(--d) linear var(--delay) infinite;
}

@keyframes auth-petal-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg);
  }
  12% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-110px, 250px) rotate(320deg);
  }
}

.sakura-auth .auth-hero-covers {
  position: absolute;
  top: 50%;
  right: 36px;
  z-index: 1;
  width: 190px;
  height: 180px;
  transform: translateY(-46%);
}

.sakura-auth .auth-hero-drag {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.sakura-auth .auth-hero-cover {
  position: absolute;
  width: 128px;
  border: 3px solid #ffd54a;
  border-radius: 18px;
  box-shadow:
    0 0 0 1px rgb(120 60 0 / 0.5),
    0 6px 0 rgb(90 40 0 / 0.35),
    0 16px 34px rgb(0 0 0 / 0.5);
  animation: auth-cover-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.sakura-auth .auth-hero-cover.back {
  top: 0;
  right: 0;
  animation-delay: 0.1s;
}

.sakura-auth .auth-hero-cover.front {
  bottom: 0;
  left: 0;
  animation-delay: 0.22s;
}

.sakura-auth .auth-hero-art {
  position: absolute;
  inset: 0;
}

.sakura-auth .auth-hero-cover.only {
  top: 50%;
  left: 50%;
  translate: -50% -50%;
}

.sakura-auth .auth-hero-offer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.sakura-auth .auth-swap-enter-active,
.sakura-auth .auth-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.sakura-auth .auth-swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.sakura-auth .auth-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.sakura-auth .auth-crossfade-enter-active,
.sakura-auth .auth-crossfade-leave-active {
  transition: opacity 0.6s ease;
}

.sakura-auth .auth-crossfade-enter-from,
.sakura-auth .auth-crossfade-leave-to {
  opacity: 0;
}

.sakura-auth .auth-swipe-next-enter-active,
.sakura-auth .auth-swipe-next-leave-active,
.sakura-auth .auth-swipe-prev-enter-active,
.sakura-auth .auth-swipe-prev-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.sakura-auth .auth-swipe-next-enter-from,
.sakura-auth .auth-swipe-prev-leave-to {
  opacity: 0;
  transform: translateX(80px);
}

.sakura-auth .auth-swipe-next-leave-to,
.sakura-auth .auth-swipe-prev-enter-from {
  opacity: 0;
  transform: translateX(-80px);
}

.sakura-auth .auth-dots {
  position: absolute;
  right: 36px;
  bottom: 16px;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 6px;
  width: 190px;
}

.sakura-auth .auth-dot {
  position: relative;
  width: 8px;
  height: 8px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.35);
  cursor: pointer;
  transition: width 0.3s ease;
}

.sakura-auth .auth-dot.active {
  width: 36px;
}

.sakura-auth .auth-dot-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #ffc200;
  transform-origin: left;
  animation: auth-dot-fill var(--slide-ms) linear both;
}

.sakura-auth .auth-hero.dragging .auth-dot-fill {
  animation-play-state: paused;
}

:root:not(.app-dark) .sakura-auth .auth-dot-fill {
  background: #ff5c9a;
}

@keyframes auth-dot-fill {
  from {
    transform: scaleX(0);
  }
}

.sakura-auth .auth-hero-coin {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 136px;
  height: 136px;
  margin: -68px 0 0 -68px;
  filter: drop-shadow(0 0 22px rgb(255 194 0 / 0.55)) drop-shadow(0 8px 12px rgb(0 0 0 / 0.45));
  animation: auth-cover-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

@keyframes auth-cover-in {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.85);
  }
}

.sakura-auth .auth-hero-copy {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0 36px 30px;
}

.sakura-auth .auth-logo {
  position: absolute;
  top: 26px;
  left: 36px;
  height: 20px;
  aspect-ratio: 1686 / 280;
  background: #fff;
  mask: var(--logo-url) left center / contain no-repeat;
}

.sakura-auth .auth-eyebrow {
  padding: 5px 11px;
  border-radius: 999px;
  background: rgb(255 194 0 / 0.18);
  color: #ffd84d;
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sakura-auth .auth-offer {
  margin: 10px 0 0;
  color: #ffc200;
  font-weight: 900;
  font-size: 3rem;
  line-height: 1;
  letter-spacing: -0.02em;
  text-shadow: 0 4px 20px rgb(0 0 0 / 0.45);
}

.sakura-auth .auth-offer small {
  display: block;
  margin-bottom: 4px;
  color: #fff;
  font-size: 0.95rem;
  letter-spacing: 0;
}

.sakura-auth .auth-offer-sub {
  margin: 8px 0 0;
  font-weight: 700;
  font-size: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .sakura-auth .auth-hero-bg,
  .sakura-auth .auth-hero-cover,
  .sakura-auth .auth-hero-coin {
    animation: none;
  }

  .sakura-auth .auth-swap-enter-active,
  .sakura-auth .auth-swap-leave-active,
  .sakura-auth .auth-crossfade-enter-active,
  .sakura-auth .auth-crossfade-leave-active,
  .sakura-auth .auth-swipe-next-enter-active,
  .sakura-auth .auth-swipe-next-leave-active,
  .sakura-auth .auth-swipe-prev-enter-active,
  .sakura-auth .auth-swipe-prev-leave-active,
  .sakura-auth .auth-hero-covers,
  .sakura-auth .auth-hero-drag {
    transition: none;
  }

  .sakura-auth .auth-petal {
    display: none;
  }
}

@media (max-width: 560px) {
  .sakura-auth .auth-hero {
    height: 226px;
    touch-action: none;
  }

  .sakura-auth .auth-grabber {
    position: absolute;
    top: 6px;
    left: 50%;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 58px;
    height: 18px;
    margin-left: -29px;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 999px;
    background: rgb(8 11 24 / 0.6);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
  }

  .sakura-auth .auth-grabber::before {
    content: '';
    width: 34px;
    height: 4px;
    border-radius: 999px;
    background: #fff;
  }

  .sakura-auth .auth-hero-copy {
    padding: 0 22px 22px;
  }

  .sakura-auth .auth-logo {
    top: 56px;
    left: 22px;
    height: 17px;
  }

  .sakura-auth .auth-offer {
    font-size: 2.1rem;
  }

  .sakura-auth .auth-offer-sub {
    font-size: 0.88rem;
  }

  .sakura-auth .auth-hero-covers {
    right: 14px;
    width: 140px;
    height: 136px;
  }

  .sakura-auth .auth-hero-cover {
    width: 96px;
    border-radius: 14px;
  }

  .sakura-auth .auth-hero-coin {
    width: 96px;
    height: 96px;
    margin: -48px 0 0 -48px;
  }

  .sakura-auth .auth-dots {
    right: 14px;
    bottom: 12px;
    width: 140px;
  }
}
</style>
