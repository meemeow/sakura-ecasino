<script setup lang="ts">
import { computed, useId } from 'vue'
import { MULT_GLYPHS, MULT_GLYPH_BASE, MULT_GLYPH_CAP } from '@/games/gates-of-olympus/multGlyphs'

const props = defineProps<{ text: string; shadow?: number }>()

const SQUASH = 0.9
const PAD = 12
const EM = 72
const GLYPH_SCALE: Record<string, number> = { x: 0.9 }
const GRADIENT_SPAN = [-72.5, 6.1] as const
const LAYERS = {
  under: { color: '#FE3C80', outline: 1.8, drop: 3.6 },
  shadow: { color: '#14020c', outline: 4.2, blur: 0.9, opacity: 0.85 },
  rim: {
    outline: 1.8,
    stops: [
      ['#DAFF4B', 0.195],
      ['#F0FF4E', 0.54],
      ['#E4FF4B', 0.885],
    ],
  },
  inner: {
    outline: 1.2,
    stops: [
      ['#C1FF41', 0.195],
      ['#C9FF45', 0.54],
      ['#C8FF44', 0.885],
    ],
  },
  face: {
    outline: 0.6,
    fill: [
      ['#DF750A', 0.195],
      ['#E3FF2F', 0.54],
      ['#E5FF35', 0.885],
    ],
    stops: [
      ['#E45A01', 0.195],
      ['#BBFF43', 0.54],
      ['#C7FF3D', 0.885],
    ],
  },
} as const

const uid = useId()
const ids = {
  text: `${uid}-text`,
  rim: `${uid}-rim`,
  inner: `${uid}-inner`,
  fill: `${uid}-fill`,
  face: `${uid}-face`,
  blur: `${uid}-blur`,
}
const gradients = [
  { id: ids.rim, stops: LAYERS.rim.stops },
  { id: ids.inner, stops: LAYERS.inner.stops },
  { id: ids.fill, stops: LAYERS.face.fill },
  { id: ids.face, stops: LAYERS.face.stops },
]

const run = computed(() => {
  let x = 0
  let left = Infinity
  let right = -Infinity
  const glyphs = []
  for (const char of props.text) {
    const glyph = MULT_GLYPHS[char]
    if (!glyph) continue
    const scale = GLYPH_SCALE[char] ?? 1
    glyphs.push({ d: glyph.d, transform: `translate(${x} 0) scale(${scale})` })
    left = Math.min(left, x + glyph.left * scale)
    right = Math.max(right, x + glyph.right * scale)
    x += glyph.advance * scale
  }
  const halfW = (right - left) / 2 + PAD
  const halfH = (MULT_GLYPH_CAP + MULT_GLYPH_BASE) / 2 + PAD
  const cx = (left + right) / 2
  const cy = (MULT_GLYPH_BASE - MULT_GLYPH_CAP) / 2
  return {
    glyphs,
    viewBox: `${cx - halfW} ${cy - halfH} ${halfW * 2} ${halfH * 2}`,
    style: {
      width: `calc(var(--mult-em) * ${((halfW * 2 * SQUASH) / EM).toFixed(4)})`,
      aspectRatio: `${(halfW * 2 * SQUASH).toFixed(2)} / ${(halfH * 2).toFixed(2)}`,
      marginLeft: `calc(var(--mult-em) * ${((-halfW * SQUASH) / EM).toFixed(4)})`,
      marginTop: `calc(var(--mult-em) * ${(-halfH / EM).toFixed(4)})`,
    },
  }
})
</script>

<template>
  <svg
    class="mult-label"
    :viewBox="run.viewBox"
    :style="run.style"
    preserveAspectRatio="none"
    overflow="visible"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        v-for="g in gradients"
        :id="g.id"
        :key="g.id"
        gradientUnits="userSpaceOnUse"
        x1="0"
        :y1="GRADIENT_SPAN[0]"
        x2="0"
        :y2="GRADIENT_SPAN[1]"
      >
        <stop v-for="[color, at] in g.stops" :key="at" :offset="at" :stop-color="color" />
      </linearGradient>
      <filter :id="ids.blur" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur :stdDeviation="LAYERS.shadow.blur" />
      </filter>
      <g :id="ids.text">
        <path v-for="(g, i) in run.glyphs" :key="i" :d="g.d" :transform="g.transform" />
      </g>
    </defs>
    <g stroke-linejoin="round">
      <use
        :href="`#${ids.text}`"
        :transform="`translate(0 ${LAYERS.under.drop})`"
        :filter="`url(#${ids.blur})`"
        :opacity="shadow ?? LAYERS.shadow.opacity"
        :fill="LAYERS.shadow.color"
        :stroke="LAYERS.shadow.color"
        :stroke-width="LAYERS.shadow.outline * 2"
      />
      <use
        :href="`#${ids.text}`"
        :transform="`translate(0 ${LAYERS.under.drop})`"
        :fill="LAYERS.under.color"
        :stroke="LAYERS.under.color"
        :stroke-width="LAYERS.under.outline * 2"
      />
      <use
        :href="`#${ids.text}`"
        fill="none"
        :stroke="`url(#${ids.rim})`"
        :stroke-width="LAYERS.rim.outline * 2"
      />
      <use
        :href="`#${ids.text}`"
        fill="none"
        :stroke="`url(#${ids.inner})`"
        :stroke-width="LAYERS.inner.outline * 2"
      />
      <use
        :href="`#${ids.text}`"
        :fill="`url(#${ids.fill})`"
        :stroke="`url(#${ids.face})`"
        :stroke-width="LAYERS.face.outline * 2"
        paint-order="stroke"
      />
    </g>
  </svg>
</template>

<style scoped>
.mult-label {
  display: block;
}
</style>
