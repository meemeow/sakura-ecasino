<script setup lang="ts">
import { useId } from 'vue'
import { STAGE } from '@/games/gates-of-olympus/winFx'
import { MULT_GLYPH_BASE, MULT_GLYPH_CAP, layoutGlyphs } from '@/games/gates-of-olympus/multGlyphs'

const TEXT = 'MAX WIN'
const EM = 72
const FONT_SIZE = 39
const GAP = 15
const LIFT = 1.5
const UNIT = EM / FONT_SIZE
const LAYERS = {
  rim: { color: '#29002C', outline: 2.2, opacity: 0.85 },
  halo: { outline: 3.2, blur: 0.5, opacity: 0.3 },
  under: { color: '#B9255E', drop: 3 },
  outline: 1.2,
  fill: [
    ['#E07F0E', 0.054],
    ['#E1B31D', 0.179],
    ['#E3DD2A', 0.286],
    ['#E4F430', 0.393],
    ['#E4FF35', 0.464],
  ],
} as const

const uid = useId()
const ids = { text: `${uid}-text`, fill: `${uid}-fill`, blur: `${uid}-blur`, both: `${uid}-both` }

const { glyphs, advance: x } = layoutGlyphs(TEXT)
const height = MULT_GLYPH_CAP + MULT_GLYPH_BASE
const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const viewBox = `0 ${-MULT_GLYPH_CAP} ${x} ${height}`
const style = {
  width: cqw(x / UNIT),
  height: cqw(height / UNIT),
  marginRight: cqw(GAP),
  top: cqw(-LIFT),
}
const drop = LAYERS.under.drop * UNIT
</script>

<template>
  <svg
    class="max-win-label"
    :viewBox="viewBox"
    :style="style"
    overflow="visible"
    role="img"
    :aria-label="TEXT"
  >
    <defs>
      <linearGradient
        :id="ids.fill"
        gradientUnits="userSpaceOnUse"
        x1="0"
        :y1="-MULT_GLYPH_CAP - LAYERS.outline * UNIT"
        x2="0"
        y2="0"
      >
        <stop v-for="[color, at] in LAYERS.fill" :key="at" :offset="at" :stop-color="color" />
      </linearGradient>
      <filter :id="ids.blur" x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur :stdDeviation="LAYERS.halo.blur * UNIT" />
      </filter>
      <g :id="ids.text">
        <path v-for="(g, i) in glyphs" :key="i" :d="g.d" :transform="g.transform" />
      </g>
      <g :id="ids.both">
        <use :href="`#${ids.text}`" />
        <use :href="`#${ids.text}`" :transform="`translate(0 ${drop})`" />
      </g>
    </defs>
    <g stroke-linejoin="round" :fill="LAYERS.rim.color" :stroke="LAYERS.rim.color">
      <use
        :href="`#${ids.both}`"
        :filter="`url(#${ids.blur})`"
        :opacity="LAYERS.halo.opacity"
        :stroke-width="LAYERS.halo.outline * 2 * UNIT"
      />
      <use
        :href="`#${ids.both}`"
        :opacity="LAYERS.rim.opacity"
        :stroke-width="LAYERS.rim.outline * 2 * UNIT"
      />
    </g>
    <g stroke-linejoin="round" :stroke-width="LAYERS.outline * 2 * UNIT">
      <use
        :href="`#${ids.text}`"
        :transform="`translate(0 ${drop})`"
        :fill="LAYERS.under.color"
        :stroke="LAYERS.under.color"
      />
      <use
        :href="`#${ids.text}`"
        :fill="`url(#${ids.fill})`"
        :stroke="`url(#${ids.fill})`"
        paint-order="stroke"
      />
    </g>
  </svg>
</template>

<style scoped>
.max-win-label {
  position: relative;
  flex: none;
  display: block;
}
</style>
