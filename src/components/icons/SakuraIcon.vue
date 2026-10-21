<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'pink' | 'gold' | 'red'
    symbol?: string
    mark?: 'check' | 'play' | 'clock' | 'alert' | 'info' | 'eye' | 'eye-closed'
    ticking?: boolean
  }>(),
  { variant: 'pink' },
)

const palettes = {
  pink: {
    stops: ['#e63f7a', '#f78fb3', '#ffe3ee'],
    mid: 0.4,
    outline: '#d6336c',
    stamen: '#ffc200',
    center: '#ad1457',
  },
  red: {
    stops: ['#c4122f', '#f2506a', '#ffd9df'],
    mid: 0.42,
    outline: '#a10f27',
    stamen: '#ffc200',
    center: '#7a0a1c',
  },
  gold: {
    stops: ['#e08600', '#ffc83d', '#ffeaa6'],
    mid: 0.55,
    outline: '#8a4b00',
    stamen: '#703902',
    center: '#703902',
  },
}
const colors = computed(() => palettes[props.variant])

const petals = [0, 72, 144, 216, 288]
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

    <template v-if="mark">
      <circle
        :r="mark === 'check' || mark === 'play' ? 4.8 : mark?.startsWith('eye') ? 6.4 : 5.6"
        :fill="colors.center"
      />
      <path
        v-if="mark === 'check'"
        d="M-2.3 0.2 L-0.7 1.8 L2.4 -1.5"
        fill="none"
        stroke="#fff"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <g
        v-else-if="mark === 'clock'"
        fill="none"
        stroke="#fff"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M0 0 L2.3 1.6" />
        <path d="M0 -3.2 L0 0" :class="{ 'tick-hand': ticking }" />
      </g>
      <template v-else-if="mark === 'alert'">
        <path d="M0 -2.8 L0 -0.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round" />
        <circle cy="2.3" r="0.95" fill="#fff" />
      </template>
      <template v-else-if="mark === 'info'">
        <circle cy="-2.3" r="0.95" fill="#fff" />
        <path d="M0 0.2 L0 2.8" stroke="#fff" stroke-width="1.7" stroke-linecap="round" />
      </template>
      <g v-else-if="mark === 'eye'" stroke="#fff" stroke-width="1.3" stroke-linejoin="round">
        <path d="M-4.4 0 Q0 -4.1 4.4 0 Q0 4.1 -4.4 0 Z" fill="none" />
        <circle r="1.7" fill="#fff" stroke="none" />
      </g>
      <g
        v-else-if="mark === 'eye-closed'"
        fill="none"
        stroke="#fff"
        stroke-width="1.4"
        stroke-linecap="round"
      >
        <path d="M-4.2 -1.1 Q0 2.8 4.2 -1.1" />
        <path d="M-2.6 0.8 L-3.4 2.4" />
        <path d="M0 1.8 L0 3.5" />
        <path d="M2.6 0.8 L3.4 2.4" />
      </g>
      <path
        v-else
        d="M-1.4 -2.4 L2.6 0 L-1.4 2.4 Z"
        fill="#fff"
        stroke="#fff"
        stroke-width="0.6"
        stroke-linejoin="round"
      />
    </template>
    <template v-else-if="symbol">
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

<style scoped>
.tick-hand {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: tick 12s steps(12) infinite;
}

@keyframes tick {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tick-hand {
    animation: none;
  }
}
</style>
