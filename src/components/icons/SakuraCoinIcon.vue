<script setup lang="ts">
import { useId } from 'vue'

// The sakura coin (SakuraIcon with symbol="₱") in outline: the blossom's petals, the disc at
// its center and the ₱. Drawn in currentColor like WalletActionIcon, so it takes the tile's
// accent. Sized by font-size.
const petals = [0, 72, 144, 216, 288]
// Hides the petals' inner ends inside the disc. Unique per instance, like WalletActionIcon's.
const maskId = `coin-disc-${useId()}`
</script>

<template>
  <svg class="coin-icon" width="1.25em" height="1.25em" viewBox="-12 -12 24 24" aria-hidden="true">
    <defs>
      <mask :id="maskId">
        <rect x="-12" y="-12" width="24" height="24" fill="#fff" />
        <circle r="5.6" fill="#000" />
      </mask>
    </defs>
    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <g :mask="`url(#${maskId})`">
        <!-- SakuraIcon's petal, a touch smaller so the stroke stays inside the box -->
        <path
          v-for="angle in petals"
          :key="angle"
          :transform="`rotate(${angle}) scale(0.94)`"
          d="M0 -1 C-2.6 -2.4 -5 -5 -4.4 -8.2 C-4 -10.2 -2.4 -11.2 -1.1 -10.6 L0 -9.4 L1.1 -10.6 C2.4 -11.2 4 -10.2 4.4 -8.2 C5 -5 2.6 -2.4 0 -1 Z"
          stroke-width="1.5"
        />
      </g>
      <circle r="4.9" stroke-width="1.5" />
    </g>
    <!-- The app's own ₱ glyph, as on the filled sakura coin -->
    <text
      y="0.4"
      text-anchor="middle"
      dominant-baseline="central"
      fill="currentColor"
      font-family="Montserrat, sans-serif"
      font-weight="800"
      font-size="6.6"
    >
      ₱
    </text>
  </svg>
</template>

<style scoped>
.coin-icon {
  flex: 0 0 auto;
}
</style>
