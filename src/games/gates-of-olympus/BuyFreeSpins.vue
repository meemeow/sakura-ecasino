<script setup lang="ts">
import { ref } from 'vue'
import LayeredLabel from '@/games/gates-of-olympus/LayeredLabel.vue'
import { BUY_PRICE, BUY_TITLE } from '@/games/gates-of-olympus/labelLayers'
import { STAGE, UI_PX, uiPoint } from '@/games/gates-of-olympus/winFx'

defineProps<{ asset: string; price: string; disabled: boolean; hidden?: boolean }>()
const emit = defineEmits<{ buy: [] }>()

const CENTER = uiPoint(-756, 297.9)
const FRAME: [number, number] = [273, 172]
const GLOW: [number, number] = [249, 146]
const HIT: [number, number] = [248, 146]
const TITLE_Y = 16.2
const PRICE_Y = -40.8
const TEXT_WIDTH = 189

const hover = ref(false)
const pressed = ref(false)

const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const box = ([w, h]: [number, number]) => ({
  left: cqw(CENTER[0] - (w * UI_PX) / 2),
  top: cqw(CENTER[1] - (h * UI_PX) / 2),
  width: cqw(w * UI_PX),
  height: cqw(h * UI_PX),
})
const labelAt = (y: number): [number, number] => [CENTER[0], CENTER[1] - y * UI_PX]
const origin = `${cqw(CENTER[0])} ${cqw(CENTER[1])}`
</script>

<template>
  <div
    class="buy-free-spins"
    :class="{
      disabled,
      hidden,
      hover: hover && !disabled && !hidden,
      pressed: pressed && !disabled && !hidden,
    }"
    :style="{ transformOrigin: origin }"
  >
    <div class="press" :style="{ transformOrigin: origin }">
      <img
        class="fade"
        :src="`${asset}/ui/buy-free-spins.webp`"
        :style="box(FRAME)"
        alt=""
        draggable="false"
      />
    </div>
    <img
      class="glow"
      :src="`${asset}/ui/buy-free-spins-glow.webp`"
      :style="box(GLOW)"
      alt=""
      draggable="false"
    />
    <div class="press" :style="{ transformOrigin: origin }">
      <LayeredLabel
        class="fade"
        :text="'BUY\nFREE SPINS'"
        font="arial"
        :size="29"
        :at="labelAt(TITLE_Y)"
        :layers="BUY_TITLE"
        :max-width="TEXT_WIDTH"
      />
      <LayeredLabel
        class="fade"
        :text="price"
        font="kurrent"
        :size="48"
        :at="labelAt(PRICE_Y)"
        :layers="BUY_PRICE"
        :max-width="TEXT_WIDTH"
      />
    </div>
    <button
      type="button"
      class="hit"
      :style="box(HIT)"
      :disabled="disabled || hidden"
      aria-label="Buy free spins"
      @pointerenter="hover = true"
      @pointerleave="hover = pressed = false"
      @pointerdown="pressed = true"
      @pointerup="pressed = false"
      @click="emit('buy')"
    />
  </div>
</template>

<style scoped>
.buy-free-spins,
.press {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.buy-free-spins {
  transition:
    scale 0.3333s cubic-bezier(0.3333, 0, 0.6667, 1),
    opacity 0.3333s cubic-bezier(0.3333, 0, 0.6667, 1);
}

.buy-free-spins.hidden {
  scale: 0;
  opacity: 0.01;
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

.fade {
  transition: opacity 0.1667s linear;
}

.disabled .fade {
  opacity: 0.6706;
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

.hit {
  position: absolute;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  pointer-events: auto;
}

.hit:disabled {
  cursor: default;
}
</style>
