<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import LayeredLabel from '@/games/gates-of-olympus/LayeredLabel.vue'
import { SCROLL_PRICE, SCROLL_TEXT, SLIDER_TEXT } from '@/games/gates-of-olympus/labelLayers'
import { STAGE, UI_PX, uiPoint } from '@/games/gates-of-olympus/winFx'

defineProps<{ asset: string; price: string }>()
const on = defineModel<boolean>({ required: true })

const CENTER = uiPoint(-756, 75)
const BACK: [number, number] = [264, 302]
const GLOW: [number, number] = [238, 276]
const HIT: [number, number] = [238, 276]
const HIT_Y = 9
const TEXT_WIDTH = 174
const REARM_MS = 200
const LABELS = {
  bet: { y: 75.9, size: 39 },
  price: { y: 34.2, size: 42 },
  double: { y: -2.05, size: 30, spacingY: 1 },
  chance: { y: -37.2, size: 21, spacingY: 1.5 },
}
const SLIDER = {
  y: -79.8,
  frame: [102, 40] as [number, number],
  knob: [50, 30] as [number, number],
  tick: [23, 18] as [number, number],
  arrow: [24, 18] as [number, number],
  knobX: 21,
  textX: 23.7,
  textY: -2,
  textSize: 18,
}

const hover = ref(false)
const pressed = ref(false)
const armed = ref(true)
let rearmTimer = 0

function toggle() {
  if (!armed.value) return
  on.value = !on.value
  armed.value = false
  clearTimeout(rearmTimer)
  rearmTimer = window.setTimeout(() => (armed.value = true), REARM_MS)
}

onBeforeUnmount(() => clearTimeout(rearmTimer))

const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const point = (x: number, y: number): [number, number] => [
  CENTER[0] + x * UI_PX,
  CENTER[1] - y * UI_PX,
]
const box = ([w, h]: [number, number], x = 0, y = 0) => {
  const [cx, cy] = point(x, y)
  return {
    left: cqw(cx - (w * UI_PX) / 2),
    top: cqw(cy - (h * UI_PX) / 2),
    width: cqw(w * UI_PX),
    height: cqw(h * UI_PX),
  }
}
const origin = `${cqw(CENTER[0])} ${cqw(CENTER[1])}`
const knobSlide = cqw(2 * SLIDER.knobX * UI_PX)
const sliderText = (x: number) => point(x, SLIDER.y + SLIDER.textY)
</script>

<template>
  <div
    class="ante-bet"
    :class="{ on, hover: hover && armed, pressed }"
    :style="{ '--knob-slide': knobSlide }"
  >
    <div class="press" :style="{ transformOrigin: origin }">
      <img :src="`${asset}/ui/ante-bet.webp`" :style="box(BACK)" alt="" draggable="false" />
    </div>
    <img
      class="glow"
      :src="`${asset}/ui/ante-bet-glow.webp`"
      :style="box(GLOW)"
      alt=""
      draggable="false"
    />
    <div class="press" :style="{ transformOrigin: origin }">
      <LayeredLabel
        text="BET"
        font="arial"
        :size="LABELS.bet.size"
        :at="point(0, LABELS.bet.y)"
        :layers="SCROLL_TEXT"
        :max-width="TEXT_WIDTH"
      />
      <LayeredLabel
        :text="price"
        font="kurrent"
        :size="LABELS.price.size"
        :at="point(0, LABELS.price.y)"
        :layers="SCROLL_PRICE"
        :max-width="TEXT_WIDTH"
      />
      <LayeredLabel
        text="DOUBLE"
        font="arial"
        :size="LABELS.double.size"
        :spacing-y="LABELS.double.spacingY"
        :at="point(0, LABELS.double.y)"
        :layers="SCROLL_TEXT"
        :max-width="TEXT_WIDTH"
      />
      <LayeredLabel
        :text="'CHANCE TO\nWIN FEATURE'"
        font="arial"
        :size="LABELS.chance.size"
        :spacing-y="LABELS.chance.spacingY"
        :at="point(0, LABELS.chance.y)"
        :layers="SCROLL_TEXT"
        :max-width="TEXT_WIDTH"
      />
      <img
        :src="`${asset}/ui/ante-slider.webp`"
        :style="box(SLIDER.frame, 0, SLIDER.y)"
        alt=""
        draggable="false"
      />
      <LayeredLabel
        class="state-on"
        text="ON"
        font="kurrent"
        :size="SLIDER.textSize"
        :at="sliderText(-SLIDER.textX)"
        :layers="SLIDER_TEXT"
      />
      <LayeredLabel
        class="state-off"
        text="OFF"
        font="kurrent"
        :size="SLIDER.textSize"
        :at="sliderText(SLIDER.textX)"
        :layers="SLIDER_TEXT"
      />
      <div class="knob">
        <img
          :src="`${asset}/ui/ante-knob.webp`"
          :style="box(SLIDER.knob, -SLIDER.knobX, SLIDER.y)"
          alt=""
          draggable="false"
        />
        <img
          class="tick"
          :src="`${asset}/ui/ante-tick.webp`"
          :style="box(SLIDER.tick, -SLIDER.knobX, SLIDER.y)"
          alt=""
          draggable="false"
        />
        <img
          class="arrow"
          :src="`${asset}/ui/ante-arrow.webp`"
          :style="box(SLIDER.arrow, -SLIDER.knobX, SLIDER.y)"
          alt=""
          draggable="false"
        />
      </div>
    </div>
    <button
      type="button"
      class="hit"
      :style="box(HIT, 0, HIT_Y)"
      :aria-pressed="on"
      aria-label="Double chance to win feature"
      @pointerenter="hover = true"
      @pointerleave="hover = pressed = false"
      @pointerdown="pressed = true"
      @pointerup="pressed = false"
      @click="toggle"
    />
  </div>
</template>

<style scoped>
.ante-bet,
.press,
.knob {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.press {
  transition: scale 0.1667s linear;
}

.pressed .press,
.pressed .glow {
  scale: 0.945;
}

img {
  position: absolute;
  display: block;
  max-width: none;
}

.glow {
  mix-blend-mode: plus-lighter;
  opacity: 0;
  transition:
    opacity 0.1667s linear,
    scale 0.1667s linear;
}

.hover .glow {
  opacity: 0.4588;
}

.knob {
  transition: translate 0.1667s cubic-bezier(0.333, 0, 0.667, 1);
}

.on .knob {
  translate: var(--knob-slide) 0;
}

.tick,
.arrow {
  transition: opacity 0s 0.0833s;
}

.tick,
.on .arrow {
  opacity: 0;
}

.on .tick {
  opacity: 1;
}

.state-on {
  opacity: 0;
  transition: opacity 0s 0.15s;
}

.on .state-on {
  opacity: 1;
  transition-delay: 0.0167s;
}

.state-off {
  transition: opacity 0s;
}

.on .state-off {
  opacity: 0;
  transition-delay: 0.1667s;
}

.hit {
  position: absolute;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  pointer-events: auto;
}
</style>
