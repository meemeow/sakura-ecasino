<script setup lang="ts">
import { computed, useId } from 'vue'

// Full-color cherry blossom. Fixed colors with an outline so it reads on dark and light headers.
// variant="gold": golden petals with a brown outline, for use on gold/pink buttons.
// symbol: a character (e.g. ₱) in a disc at the center, replacing the stamens, so the
// blossom can stand in for a coin.
const props = withDefaults(defineProps<{ variant?: 'pink' | 'gold'; symbol?: string }>(), {
  variant: 'pink',
})

const palettes = {
  pink: {
    stops: ['#e63f7a', '#f78fb3', '#ffe3ee'],
    /** Where the middle color sits (0 = center, 1 = petal tip) */
    mid: 0.4,
    outline: '#d6336c',
    stamen: '#ffc200',
    center: '#ad1457',
  },
  gold: {
    // Gold reaches just past halfway; tips are a light gold-cream
    stops: ['#e08600', '#ffc83d', '#ffeaa6'],
    mid: 0.55,
    outline: '#8a4b00',
    stamen: '#703902',
    center: '#703902',
  },
}
const colors = computed(() => palettes[props.variant])

const petals = [0, 72, 144, 216, 288]
// Stamens sit between the petals
const stamens = petals.map((a) => a + 36)
const gradientId = `sakura-petal-${useId()}`
</script>

<template>
  <svg viewBox="-12 -12 24 24" width="20" height="20" aria-hidden="true">
    <defs>
      <radialGradient :id="gradientId" cx="0" cy="0" r="11" gradientUnits="userSpaceOnUse">
        <stop offset="0" :stop-color="colors.stops[0]" />
        <stop :offset="colors.mid" :stop-color="colors.stops[1]" />
        <stop offset="1" :stop-color="colors.stops[2]" />
      </radialGradient>
    </defs>

    <path
      v-for="angle in petals"
      :key="angle"
      :transform="`rotate(${angle})`"
      d="M0 -1 C-2.6 -2.4 -5 -5 -4.4 -8.2 C-4 -10.2 -2.4 -11.2 -1.1 -10.6 L0 -9.4 L1.1 -10.6 C2.4 -11.2 4 -10.2 4.4 -8.2 C5 -5 2.6 -2.4 0 -1 Z"
      :fill="`url(#${gradientId})`"
      :stroke="colors.outline"
      stroke-width="0.7"
      stroke-linejoin="round"
    />

    <template v-if="symbol">
      <!-- Same colors as the plain blossom: its brown center dot, enlarged, with the
           symbol in the petals' gold -->
      <circle r="4.8" :fill="colors.center" />
      <text
        y="0.4"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="colors.stops[1]"
        font-family="Montserrat, sans-serif"
        font-weight="900"
        font-size="7.5"
      >
        {{ symbol }}
      </text>
    </template>
    <template v-else>
      <g v-for="angle in stamens" :key="angle" :transform="`rotate(${angle})`">
        <line
          y1="-1.4"
          y2="-4.2"
          :stroke="colors.stamen"
          stroke-width="0.5"
          stroke-linecap="round"
        />
        <circle cy="-4.4" r="0.65" :fill="colors.stamen" />
      </g>
      <circle r="1.6" :fill="colors.center" />
    </template>
  </svg>
</template>
