<script setup lang="ts">
import SakuraIcon from '@/components/layout/SakuraIcon.vue'
import type { Promotion } from './promotions'

defineProps<{ promo: Promotion }>()
</script>

<template>
  <div class="banner" :style="{ backgroundImage: `url(${promo.background})` }">
    <div class="text">
      <img v-if="promo.eyebrowLogo" :src="promo.eyebrowLogo" :alt="promo.eyebrow" class="logo" />
      <span v-else class="eyebrow">{{ promo.eyebrow }}</span>
      <span class="headline" :style="{ '--fit': Math.min(1, 16 / promo.headline.length) }">{{
        promo.headline
      }}</span>
      <span class="amount">{{ promo.amount }}</span>
      <span class="subline">{{ promo.subline }}</span>
      <span v-if="promo.pill" class="pill">{{ promo.pill }}</span>
    </div>

    <div class="art" aria-hidden="true">
      <template v-if="promo.covers">
        <img
          v-for="(cover, i) in promo.covers"
          :key="cover"
          :src="cover"
          alt=""
          class="cover"
          :class="`cover-${i}`"
        />
      </template>
      <img v-else-if="promo.icon" :src="promo.icon" alt="" class="icon" />
      <!-- The header's gold sakura coin, big, with the promo's symbol in its center -->
      <SakuraIcon v-else-if="promo.coin" variant="gold" :symbol="promo.coin" class="coin" />
      <!-- The Account page's Verified seal: the gold sakura, here with a check -->
      <SakuraIcon v-else-if="promo.seal" variant="gold" mark="check" class="coin" />
    </div>
  </div>
</template>

<style scoped>
/* Text sizes scale with the banner width (cqi), so it reads the same in 1 or 2 columns */
.banner {
  container-type: inline-size;
  position: relative;
  display: flex;
  align-items: center;
  aspect-ratio: 8 / 3;
  overflow: hidden;
  border-radius: var(--app-radius);
  background-position: center;
  background-size: cover;
  font-family: 'Montserrat', sans-serif;
}

/* Darken the left side so the text stays readable on any scenery */
.banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(8 6 30 / 0.88) 0%, rgb(8 6 30 / 0.6) 45%, transparent 75%);
}

.text {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 58%;
  padding-left: 5cqi;
  color: #fff;
  /* Inside the card's banner button, which centers text: a wrapped headline stays left */
  text-align: left;
}

.eyebrow {
  color: #ffc200;
  font-weight: 800;
  font-size: 2.3cqi;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.logo {
  height: 6cqi;
}

/* Always one line: headlines longer than 16 characters ("Gates of Olympus") shrink to fit */
.headline {
  margin-top: 0.8cqi;
  font-weight: 900;
  font-size: calc(4.6cqi * var(--fit, 1));
  white-space: nowrap;
  line-height: 1;
  text-transform: uppercase;
  text-shadow: 0 0.4cqi 0 rgb(0 0 0 / 0.35);
}

/* Gold gradient lettering for the big number */
.amount {
  margin-top: 0.6cqi;
  background: linear-gradient(#fff6c2, #ffc200 55%, #e08a00);
  background-clip: text;
  color: transparent;
  font-weight: 900;
  font-size: 7.4cqi;
  line-height: 1.05;
  white-space: nowrap;
  filter: drop-shadow(0 0.5cqi 0 rgb(80 30 0 / 0.6));
}

.subline {
  margin-top: 1cqi;
  font-weight: 700;
  font-size: 2.2cqi;
  line-height: 1.35;
  /* Keep it to one line; long copy belongs in the card text below */
  white-space: nowrap;
}

.pill {
  margin-top: 2cqi;
  padding: 0.8cqi 2.2cqi;
  border: 0.25cqi solid #ffc200;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.45);
  color: #ffc200;
  font-weight: 800;
  font-size: 1.9cqi;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.art {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 45%;
}

/* Two covers fanned out like playing cards */
.cover {
  position: absolute;
  top: 50%;
  width: 22cqi;
  aspect-ratio: 1;
  border: 0.5cqi solid rgb(255 255 255 / 0.85);
  border-radius: 2cqi;
  box-shadow: 0 1.5cqi 3cqi rgb(0 0 0 / 0.45);
  object-fit: cover;
}

.cover-0 {
  right: 17cqi;
  transform: translateY(-50%) rotate(-9deg);
}

.cover-1 {
  right: 4cqi;
  transform: translateY(-44%) rotate(7deg);
}

/* A single cover sits upright in the middle of the art area */
.cover:only-child {
  right: 10cqi;
  width: 25cqi;
  transform: translateY(-50%);
}

.icon,
.coin {
  position: absolute;
  top: 50%;
  right: 7cqi;
  width: 26cqi;
  transform: translateY(-50%);
  filter: drop-shadow(0 0 3cqi rgb(255 194 0 / 0.55)) drop-shadow(0 1cqi 1.5cqi rgb(0 0 0 / 0.4));
}

.coin {
  height: auto;
  aspect-ratio: 1;
}
</style>
