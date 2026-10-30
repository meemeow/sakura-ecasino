<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import LayeredLabel from '@/games/gates-of-olympus/LayeredLabel.vue'
import { POPUP_PRICE, POPUP_TITLE } from '@/games/gates-of-olympus/labelLayers'
import { loadSpine, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'
import { boneOffset, draw, pose } from '@/games/gates-of-olympus/spineLite'
import { BUY_POPUP_RIG, STAGE, UI_PX, uiPoint } from '@/games/gates-of-olympus/winFx'

const props = defineProps<{ asset: string; price: string }>()
const emit = defineEmits<{ answer: [buy: boolean]; closed: [] }>()

const ANIM = {
  in: 'gool_buy_feature_popup_in',
  loop: 'gool_buy_feature_popup_loop',
  no: 'gool_buy_feature_popup_out',
  yes: 'gaoo_1000_buy_feature_popup_yes_click_out',
}
const LOOP_AT = 0.3333
const LOOP_LENGTH = 1.6667
const LOOP_PERIOD = 2.3333
const OUT_LENGTH = 0.7333
const OUT_PERIOD = 0.3333
const TEXTS_AT = 0.15
const FADE = 0.1667
const ALPHA_FLOOR = 0.01

const SKELETON_UI: [number, number] = [5.5, 44.7]
const SPINE_UI = 0.999
const FRAME_BONE: [number, number] = [3.87, 43.7]
const BONE_UI: [number, number] = [
  SKELETON_UI[0] + FRAME_BONE[0] * SPINE_UI,
  SKELETON_UI[1] + FRAME_BONE[1] * SPINE_UI,
]
const TEXT_UNIT = 0.994
const TEXT_X = (-5.5 * 0.497) / TEXT_UNIT
const TITLE_Y = 89.1
const PRICE_Y = -45.4
const TITLE_GRADIENT = [-66.1, 12.5] as const
const PRICE_GRADIENT = [-62.4, 5.3] as const
const TEXT_WIDTH = 639
const BUTTON_Y = -153.2
const BUTTON_X = { no: -174.5, yes: 172.5 }
const BUTTON_SIZE: [number, number] = [139.5, 107]
const BODY_UI: [number, number] = [0, 145]
const BODY_SIZE: [number, number] = [702, 288]

const boxEl = ref<HTMLElement | null>(null)
const normalEl = ref<HTMLCanvasElement | null>(null)
const lightEl = ref<HTMLCanvasElement | null>(null)
const opacity = ref(ALPHA_FLOOR)
const scale = ref(0)
const textsShown = ref(false)
const buttonsLive = ref(false)

let rig: LoadedRig | null = null
let raf = 0
let shownAt = 0
let answeredAt = 0
let answer: boolean | null = null

const smooth = (p: number) => {
  const q = Math.min(1, Math.max(0, p))
  return q * q * (3 - 2 * q)
}
const fadeIn = (t: number) => ALPHA_FLOOR + (1 - ALPHA_FLOOR) * smooth(t / FADE)

const bonePoint = uiPoint(...BONE_UI)
const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const textAt = (y: number): [number, number] => [
  bonePoint[0] + TEXT_X * UI_PX,
  bonePoint[1] - y * UI_PX,
]
const buttonBox = (x: number) => ({
  left: cqw(bonePoint[0] + (TEXT_X + x - BUTTON_SIZE[0] / 2) * UI_PX),
  top: cqw(bonePoint[1] - (BUTTON_Y + BUTTON_SIZE[1] / 2) * UI_PX),
  width: cqw(BUTTON_SIZE[0] * UI_PX),
  height: cqw(BUTTON_SIZE[1] * UI_PX),
})
const [bodyX, bodyY] = uiPoint(...BODY_UI)
const bodyBox = {
  left: cqw(bodyX - (BODY_SIZE[0] * UI_PX) / 2),
  top: cqw(bodyY - (BODY_SIZE[1] * UI_PX) / 2),
  width: cqw(BODY_SIZE[0] * UI_PX),
  height: cqw(BODY_SIZE[1] * UI_PX),
}
const origin = `${cqw(bonePoint[0])} ${cqw(bonePoint[1])}`

function rigPose(now: number): [anim: string, t: number] {
  if (answer !== null) {
    const t = ((now - answeredAt) / 1000) * (OUT_LENGTH / OUT_PERIOD)
    return [answer ? ANIM.yes : ANIM.no, Math.min(t, OUT_LENGTH)]
  }
  const t = (now - shownAt) / 1000
  if (t < LOOP_AT) return [ANIM.in, t]
  return [ANIM.loop, (((t - LOOP_AT) * LOOP_LENGTH) / LOOP_PERIOD) % LOOP_LENGTH]
}

function fit(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

function frame(now: number) {
  const shown = (now - shownAt) / 1000
  if (answer === null) {
    opacity.value = fadeIn(shown)
    textsShown.value = shown >= TEXTS_AT
    buttonsLive.value = shown >= LOOP_AT
  } else {
    const out = (now - answeredAt) / 1000
    if (out >= OUT_PERIOD) {
      emit('closed')
      return
    }
    opacity.value = ALPHA_FLOOR + (1 - ALPHA_FLOOR) * (1 - smooth((out - FADE) / FADE))
  }
  const box = boxEl.value
  const normal = normalEl.value?.getContext('2d')
  const light = lightEl.value?.getContext('2d')
  if (rig && box && normal && light) {
    const [anim, t] = rigPose(now)
    scale.value = boneOffset(rig.data, anim, t, 'bone').scale
    const width = Math.round(box.clientWidth * devicePixelRatio)
    const height = Math.round(box.clientHeight * devicePixelRatio)
    fit(normal.canvas, width, height)
    fit(light.canvas, width, height)
    normal.clearRect(0, 0, width, height)
    light.clearRect(0, 0, width, height)
    normal.imageSmoothingQuality = light.imageSmoothingQuality = 'high'
    const k = width / STAGE.w
    const unit = k * SPINE_UI * UI_PX
    const [x, y] = uiPoint(...SKELETON_UI)
    draw(pose(rig.data, anim, t), rig.image, [unit, 0, 0, -unit, k * x, k * y], normal, light)
  }
  raf = requestAnimationFrame(frame)
}

function choose(buy: boolean) {
  if (answer !== null) return
  answer = buy
  answeredAt = performance.now()
  buttonsLive.value = false
  emit('answer', buy)
}

onMounted(() => {
  shownAt = performance.now()
  raf = requestAnimationFrame(frame)
  loadSpine(props.asset, BUY_POPUP_RIG)
    .then((loaded) => (rig = loaded))
    .catch((error) => console.warn('buy popup', error))
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div
    class="buy-popup"
    role="dialog"
    aria-modal="true"
    aria-label="Buy free spins"
    :style="{ opacity }"
    @click.stop
  >
    <div class="dim" @click="choose(false)" />
    <div ref="boxEl" class="box">
      <canvas ref="normalEl" />
      <canvas ref="lightEl" class="light" />
      <div class="body" :style="bodyBox" />
      <div class="follow" :style="{ transformOrigin: origin, scale: TEXT_UNIT * scale }">
        <template v-if="textsShown">
          <LayeredLabel
            :text="'BUY\nFREE SPINS'"
            font="arial"
            :size="72"
            :at="textAt(TITLE_Y)"
            :layers="POPUP_TITLE"
            :max-width="TEXT_WIDTH"
            :gradient-span="TITLE_GRADIENT"
          />
          <LayeredLabel
            :text="price"
            font="kurrent"
            :size="111"
            :at="textAt(PRICE_Y)"
            :layers="POPUP_PRICE"
            :max-width="TEXT_WIDTH"
            :gradient-span="PRICE_GRADIENT"
          />
        </template>
        <button
          type="button"
          class="hit"
          :style="buttonBox(BUTTON_X.no)"
          :disabled="!buttonsLive"
          aria-label="Cancel"
          @click="choose(false)"
        />
        <button
          type="button"
          class="hit"
          :style="buttonBox(BUTTON_X.yes)"
          :disabled="!buttonsLive"
          aria-label="Buy"
          @click="choose(true)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.buy-popup,
.dim {
  position: absolute;
  inset: 0;
}

.buy-popup {
  pointer-events: auto;
}

.dim {
  background: rgb(0 0 0 / 0.5);
}

.box {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(100vw, 100vh * 16 / 9);
  height: min(100vh, 100vw * 9 / 16);
  container-type: size;
  pointer-events: none;
}

canvas,
.follow {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.light {
  mix-blend-mode: plus-lighter;
}

.body {
  position: absolute;
  pointer-events: auto;
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
