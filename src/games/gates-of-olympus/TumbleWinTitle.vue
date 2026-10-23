<script setup lang="ts">
import { useId } from 'vue'
import { STAGE } from '@/games/gates-of-olympus/winFx'
import { MULT_GLYPH_BASE, MULT_GLYPH_CAP, layoutGlyphs } from '@/games/gates-of-olympus/multGlyphs'

const props = defineProps<{ scale: number; baseline: number }>()

const TEXT = 'TUMBLE WIN'
const EM = 72
const FONT_SIZE = 28
const UNIT = EM / FONT_SIZE
const GRADIENT_SPAN = [-72.5, 6.1] as const
const LAYERS = {
  shadow: { color: '#000', outline: 3.2, blur: 1.1, drop: 1.5 },
  face: {
    outline: 0.8,
    stops: [
      ['#F09A25', 0.21],
      ['#FDF01A', 0.57],
      ['#EF971C', 0.9],
    ],
  },
} as const

const uid = useId()
const ids = { text: `${uid}-text`, face: `${uid}-face`, blur: `${uid}-blur` }

const { glyphs, advance } = layoutGlyphs(TEXT)
const height = MULT_GLYPH_CAP + MULT_GLYPH_BASE
const cqw = (px: number) => `${((px * props.scale * 100) / STAGE.w).toFixed(4)}cqw`
const viewBox = `0 ${-MULT_GLYPH_CAP} ${advance} ${height}`
const style = {
  width: cqw(advance / UNIT),
  height: cqw(height / UNIT),
  marginLeft: cqw(-advance / UNIT / 2),
  top: `calc(${cqw(props.baseline / props.scale)} - ${cqw(MULT_GLYPH_CAP / UNIT)})`,
}
const drop = LAYERS.shadow.drop * UNIT
</script>

<template>
  <svg
    class="tumble-win-title"
    :viewBox="viewBox"
    :style="style"
    overflow="visible"
    role="img"
    :aria-label="TEXT"
  >
    <defs>
      <linearGradient
        :id="ids.face"
        gradientUnits="userSpaceOnUse"
        x1="0"
        :y1="GRADIENT_SPAN[0]"
        x2="0"
        :y2="GRADIENT_SPAN[1]"
      >
        <stop v-for="[color, at] in LAYERS.face.stops" :key="at" :offset="at" :stop-color="color" />
      </linearGradient>
      <filter :id="ids.blur" x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur :stdDeviation="LAYERS.shadow.blur * UNIT" />
      </filter>
      <g :id="ids.text">
        <path v-for="(g, i) in glyphs" :key="i" :d="g.d" :transform="g.transform" />
      </g>
    </defs>
    <g
      stroke-linejoin="round"
      :fill="LAYERS.shadow.color"
      :stroke="LAYERS.shadow.color"
      :stroke-width="LAYERS.shadow.outline * 2 * UNIT"
      :transform="`translate(0 ${drop})`"
    >
      <use :href="`#${ids.text}`" :filter="`url(#${ids.blur})`" />
      <use :href="`#${ids.text}`" />
    </g>
    <use
      :href="`#${ids.text}`"
      :fill="`url(#${ids.face})`"
      :stroke="`url(#${ids.face})`"
      :stroke-width="LAYERS.face.outline * 2 * UNIT"
      stroke-linejoin="round"
      paint-order="stroke"
    />
  </svg>
</template>

<style scoped>
.tumble-win-title {
  position: absolute;
  left: 50%;
  display: block;
}
</style>
