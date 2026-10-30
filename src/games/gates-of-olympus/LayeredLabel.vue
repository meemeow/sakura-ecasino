<script setup lang="ts">
import { computed, useId } from 'vue'
import { ARIAL_BAR, ARIAL_GLYPHS } from '@/games/gates-of-olympus/arialGlyphs'
import { MULT_BAR, MULT_GLYPHS, MULT_GLYPH_EM } from '@/games/gates-of-olympus/multGlyphs'
import { STAGE, UI_PX } from '@/games/gates-of-olympus/winFx'
import type { LabelLayer, LabelPaint } from '@/games/gates-of-olympus/labelLayers'

const props = defineProps<{
  text: string
  font: 'arial' | 'kurrent'
  size: number
  at: [x: number, y: number]
  layers: LabelLayer[]
  spacingY?: number
  maxWidth?: number
}>()

const FONTS = {
  arial: { glyphs: ARIAL_GLYPHS, bar: ARIAL_BAR },
  kurrent: { glyphs: MULT_GLYPHS, bar: MULT_BAR },
}
const EM = MULT_GLYPH_EM
const GRADIENT_SPAN = [-72.5, 6.1] as const
const SHADOW_BLUR = 0.5

const uid = useId()
const lineId = (i: number) => `${uid}-line${i}`
const paintId = (layer: number, part: 'fill' | 'stroke') => `${uid}-${part}${layer}`
const blurId = (layer: number) => `${uid}-blur${layer}`

const layout = computed(() => {
  const font = FONTS[props.font]
  const unit = EM / props.size
  const pitch = Math.floor(props.size + (props.spacingY ?? 0))
  const texts = props.text.split('\n')
  const height = ((texts.length - 1) * pitch + props.size) * unit
  const baseline = (EM + font.bar[0] + font.bar[1]) / 2
  const lines = texts.map((text, i) => {
    let x = 0
    const glyphs = []
    for (const char of text) {
      const glyph = font.glyphs[char]
      if (!glyph) continue
      glyphs.push({ d: glyph.d, x })
      x += Math.round(glyph.advance / unit) * unit
    }
    const top = -height / 2 + i * pitch * unit
    return { glyphs, dx: -x / 2, dy: top + baseline, width: x }
  })
  const width = Math.max(1, ...lines.map((line) => line.width))
  const fit = props.maxWidth ? Math.min(1, (props.maxWidth * unit) / width) : 1
  return { unit, lines, width, height, fit }
})

const gradients = computed(() =>
  props.layers.flatMap((layer, k) =>
    (['fill', 'stroke'] as const).flatMap((part) => {
      const paint = layer[part]
      return typeof paint === 'string' ? [] : [{ id: paintId(k, part), stops: paint }]
    }),
  ),
)

const paint = (value: LabelPaint, k: number, part: 'fill' | 'stroke') =>
  typeof value === 'string' ? value : `url(#${paintId(k, part)})`

const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const style = computed(() => {
  const { unit, width, height, fit } = layout.value
  const w = (width / unit) * UI_PX * fit
  const h = (height / unit) * UI_PX * fit
  return {
    left: cqw(props.at[0] - w / 2),
    top: cqw(props.at[1] - h / 2),
    width: cqw(w),
    height: cqw(h),
  }
})
const viewBox = computed(() => {
  const { width, height } = layout.value
  return `${-width / 2} ${-height / 2} ${width} ${height}`
})
</script>

<template>
  <svg
    class="layered-label"
    :viewBox="viewBox"
    :style="style"
    overflow="visible"
    role="img"
    :aria-label="text"
  >
    <defs>
      <linearGradient
        v-for="gradient in gradients"
        :id="gradient.id"
        :key="gradient.id"
        gradientUnits="userSpaceOnUse"
        x1="0"
        :y1="GRADIENT_SPAN[0]"
        x2="0"
        :y2="GRADIENT_SPAN[1]"
      >
        <stop v-for="[color, at] in gradient.stops" :key="at" :offset="at" :stop-color="color" />
      </linearGradient>
      <template v-for="(layer, k) in layers" :key="k">
        <filter v-if="layer.shadow" :id="blurId(k)" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur :stdDeviation="layer.shadow.size * SHADOW_BLUR * layout.unit" />
        </filter>
      </template>
      <g v-for="(line, i) in layout.lines" :id="lineId(i)" :key="i">
        <path
          v-for="(glyph, j) in line.glyphs"
          :key="j"
          :d="glyph.d"
          :transform="`translate(${glyph.x} 0)`"
        />
      </g>
    </defs>
    <g v-for="(layer, k) in layers" :key="k" stroke-linejoin="round">
      <template v-if="layer.shadow">
        <use
          v-for="(line, i) in layout.lines"
          :key="i"
          :href="`#${lineId(i)}`"
          :transform="`translate(${line.dx} ${line.dy + layer.shadow.dy * layout.unit})`"
          :fill="layer.shadow.color"
          :stroke="layer.shadow.color"
          :stroke-width="layer.outline * 2 * layout.unit"
          :filter="`url(#${blurId(k)})`"
        />
      </template>
      <use
        v-for="(line, i) in layout.lines"
        :key="i"
        :href="`#${lineId(i)}`"
        :transform="`translate(${line.dx} ${line.dy})`"
        :fill="paint(layer.fill, k, 'fill')"
        :stroke="paint(layer.stroke, k, 'stroke')"
        :stroke-width="layer.outline * 2 * layout.unit"
        paint-order="stroke"
      />
    </g>
  </svg>
</template>

<style scoped>
.layered-label {
  position: absolute;
  display: block;
  pointer-events: none;
}
</style>
