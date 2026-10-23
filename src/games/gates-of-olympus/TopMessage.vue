<script setup lang="ts">
import { computed, useId } from 'vue'
import { STAGE } from '@/games/gates-of-olympus/winFx'
import { MULT_GLYPH_EM, layoutGlyphs } from '@/games/gates-of-olympus/multGlyphs'

export type TopMessageIcon = 'scatter' | 'orb'
export type TopMessagePart = string | { icon: TopMessageIcon }

const props = defineProps<{ parts: TopMessagePart[]; asset: string; scale: number }>()

const FONT_SIZE = 42
const UNIT = MULT_GLYPH_EM / FONT_SIZE
const SPACING = 12
const BASELINE = 12.6
const HALF_HEIGHT = 75
const GRADIENT_SPAN = [-72.5, 6.1] as const
const ICONS: Record<
  TopMessageIcon,
  { file: string; slot: number; w: number; h: number; y: number }
> = {
  scatter: { file: 'info-scatter', slot: 92, w: 102, h: 82, y: -2 },
  orb: { file: 'info-orb', slot: 99, w: 136, h: 119, y: -4.5 },
}
const LAYERS = {
  shadow: { color: '#000', drop: 1.5 },
  halo: { outline: 2.4, blur: 3.6, opacity: 0.7 },
  rim: { outline: 1.5, blur: 0.9, opacity: 0.7 },
  face: {
    outline: 0.85,
    blur: 0.55,
    stroke: '#FFFF00',
    stops: [
      ['#E5A64D', 0.195],
      ['#FBEC96', 0.54],
      ['#BA6B30', 0.885],
    ],
  },
} as const

const uid = useId()
const ids = {
  face: `${uid}-face`,
  halo: `${uid}-halo`,
  rim: `${uid}-rim`,
  edge: `${uid}-edge`,
  text: `${uid}-text`,
}
const filters = [
  [ids.halo, LAYERS.halo.blur],
  [ids.rim, LAYERS.rim.blur],
  [ids.edge, LAYERS.face.blur],
] as const

const layout = computed(() => {
  const items = props.parts.map((part) => {
    if (typeof part === 'string') {
      const { glyphs, advance } = layoutGlyphs(part, FONT_SIZE)
      return { kind: 'text' as const, glyphs, width: advance / UNIT }
    }
    const icon = ICONS[part.icon]
    return { kind: 'icon' as const, icon, width: icon.slot }
  })
  const total = items.reduce((sum, item) => sum + item.width, 0) + SPACING * (items.length - 1)
  let x = -total / 2
  const texts: { d: string; transform: string }[] = []
  const icons: { href: string; x: number; y: number; w: number; h: number }[] = []
  for (const item of items) {
    if (item.kind === 'text') {
      for (const g of item.glyphs) {
        texts.push({
          d: g.d,
          transform: `translate(${x} ${BASELINE}) scale(${1 / UNIT}) ${g.transform}`,
        })
      }
    } else {
      const { icon } = item
      icons.push({
        href: `${props.asset}/ui/${icon.file}.webp`,
        x: x + (icon.slot - icon.w) / 2,
        y: icon.y - icon.h / 2,
        w: icon.w,
        h: icon.h,
      })
    }
    x += item.width + SPACING
  }
  const pad = 20
  const width = total + pad * 2
  const cqw = (units: number) => `${((units * props.scale * 100) / STAGE.w).toFixed(4)}cqw`
  return {
    texts,
    icons,
    viewBox: `${-width / 2} ${-HALF_HEIGHT} ${width} ${HALF_HEIGHT * 2}`,
    style: { width: cqw(width), height: cqw(HALF_HEIGHT * 2) },
  }
})
</script>

<template>
  <svg
    class="top-message"
    :viewBox="layout.viewBox"
    :style="layout.style"
    overflow="visible"
    aria-hidden="true"
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
      <filter
        v-for="[id, blur] in filters"
        :id="id"
        :key="id"
        x="-10%"
        y="-60%"
        width="120%"
        height="220%"
      >
        <feGaussianBlur :stdDeviation="blur" />
      </filter>
      <g :id="ids.text">
        <path v-for="(t, i) in layout.texts" :key="i" :d="t.d" :transform="t.transform" />
      </g>
    </defs>
    <g
      :transform="`translate(0 ${LAYERS.shadow.drop})`"
      :fill="LAYERS.shadow.color"
      :stroke="LAYERS.shadow.color"
      stroke-linejoin="round"
    >
      <use
        v-for="n in 2"
        :key="n"
        :href="`#${ids.text}`"
        :filter="`url(#${ids.halo})`"
        :opacity="LAYERS.halo.opacity"
        :stroke-width="LAYERS.halo.outline * 2 * UNIT"
      />
      <use
        :href="`#${ids.text}`"
        :filter="`url(#${ids.rim})`"
        :opacity="LAYERS.rim.opacity"
        :stroke-width="LAYERS.rim.outline * 2 * UNIT"
      />
    </g>
    <use
      :href="`#${ids.text}`"
      :filter="`url(#${ids.edge})`"
      :fill="LAYERS.face.stroke"
      :stroke="LAYERS.face.stroke"
      :stroke-width="LAYERS.face.outline * 2 * UNIT"
      stroke-linejoin="round"
    />
    <use :href="`#${ids.text}`" :fill="`url(#${ids.face})`" />
    <image
      v-for="(icon, i) in layout.icons"
      :key="i"
      :href="icon.href"
      :x="icon.x"
      :y="icon.y"
      :width="icon.w"
      :height="icon.h"
    />
  </svg>
</template>

<style scoped>
.top-message {
  display: block;
}
</style>
