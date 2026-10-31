<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import TumbleNumber from '@/games/gates-of-olympus/TumbleNumber.vue'
import {
  BIG_WIN,
  BIG_WIN_FONT,
  COIN,
  linearRamp,
  pulseScale,
  ramp,
  type BigWinTier,
} from '@/games/gates-of-olympus/bigWin'
import { loadSpine, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'
import { boneOffset, pose } from '@/games/gates-of-olympus/spineLite'
import {
  createSpineRenderer,
  type SpineRenderer,
  type SpineTexture,
} from '@/games/gates-of-olympus/spineGl'
import { STAGE, UI_PX, uiPoint } from '@/games/gates-of-olympus/winFx'
import { formatPeso } from '@/utils/format'

const props = defineProps<{
  asset: string
  tier: BigWinTier
  amount: number
  at: number
  fast?: boolean
}>()
const emit = defineEmits<{ stop: []; done: [] }>()

const BONE_REST: [number, number] = [11.81, -287.84]

const rootEl = ref<HTMLElement | null>(null)
const coinEl = ref<HTMLCanvasElement | null>(null)
const rigEl = ref<HTMLCanvasElement | null>(null)
const dim = ref<number>(BIG_WIN.dim.floor)
const shownAmount = ref(0)
const hidden = ref(false)
const label = ref({ x: 0, y: 0, scale: 1, opacity: 0 })

let rig: LoadedRig | null = null
let renderer: SpineRenderer | null = null
let texture: SpineTexture | null = null
let coins: HTMLImageElement | null = null
let raf = 0
let stopAt: number = (props.fast ? BIG_WIN.fast.stopAt : props.tier.seconds) + BIG_WIN.rigLag
const outAfter = props.fast ? BIG_WIN.fast.outAfter : BIG_WIN.outAfter
const hideAfter = outAfter + BIG_WIN.hideAfter - BIG_WIN.outAfter
const doneAfter = outAfter + BIG_WIN.doneAfter - BIG_WIN.outAfter
let stopped = false
let observer: ResizeObserver | null = null
const seed = (props.at * 1000) >>> 0

const text = computed(() => formatPeso(shownAmount.value))
const fit = computed(() => {
  const width = [...text.value].reduce(
    (sum, char) => sum + (BIG_WIN_FONT.glyphs[char]?.[6] ?? 0),
    0,
  )
  return width > BIG_WIN.label.width ? BIG_WIN.label.width / width : 1
})
const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const labelStyle = computed(() => ({
  left: cqw(label.value.x),
  top: cqw(label.value.y),
  opacity: label.value.opacity,
  transform: `translate(-50%, -50%) rotate(${BIG_WIN.label.rotation}deg) scale(${label.value.scale * fit.value})`,
}))

function random(emitter: number, n: number) {
  return (slot: number) => {
    let h = Math.imul(
      seed ^ (emitter * 0x9e3779b1) ^ Math.imul(n, 0x85ebca6b) ^ (slot * 0xc2b2ae35),
      0x27d4eb2d,
    )
    h ^= h >>> 15
    h = Math.imul(h, 0x2c1b3c6d)
    h ^= h >>> 12
    h = Math.imul(h, 0x297a2d39)
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
  }
}

function stageBox(canvas: HTMLCanvasElement) {
  const width = canvas.width
  const height = canvas.height
  const w = Math.min(width, (height * STAGE.w) / STAGE.h)
  const k = w / STAGE.w
  return { k, left: (width - w) / 2, top: (height - (w * STAGE.h) / STAGE.w) / 2 }
}

function drawCoins(t: number) {
  const canvas = coinEl.value
  const g = canvas?.getContext('2d')
  if (!canvas || !g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, canvas.width, canvas.height)
  const sheet = coins
  if (!sheet?.complete || !sheet.naturalWidth) return
  const { k, left, top } = stageBox(canvas)
  const { w, h } = COIN.frame
  const emitting = Math.min(t, stopAt)
  props.tier.coins.forEach((emitter, e) => {
    const first = Math.max(1, Math.ceil((t - emitter.life) * emitter.rate))
    const last = Math.floor(emitting * emitter.rate)
    for (let n = first; n <= last; n++) {
      const age = t - n / emitter.rate
      if (age < 0 || age >= emitter.life) continue
      const p = random(e, n)
      const [x, y, scale, angle] = emitter.draw(p, age)
      const frame = (Math.floor(p(0) * COIN.frames) + Math.floor(age * COIN.fps)) % COIN.frames
      const s = scale * k
      const cos = Math.cos(angle) * s
      const sin = Math.sin(angle) * s
      g.setTransform(cos, sin, -sin, cos, left + x * k, top + y * k)
      g.drawImage(
        sheet,
        (frame % COIN.columns) * w,
        Math.floor(frame / COIN.columns) * h,
        w,
        h,
        -w / 2,
        -h / 2,
        w,
        h,
      )
    }
  })
}

function rigPose(t: number, outT: number): [string, number] {
  const name = props.tier.name
  if (outT >= 0) return [`gool_bigwin_${name}_out`, Math.min(outT, BIG_WIN.outSec)]
  if (t < BIG_WIN.inSec) return [`gool_bigwin_${name}_in`, Math.max(0, t)]
  return [`gool_bigwin_${name}_loop`, (t - BIG_WIN.inSec) % BIG_WIN.loopSec]
}

function drawRig(anim: string, at: number, slideUi: number) {
  const canvas = rigEl.value
  if (!renderer || !texture || !rig || !canvas) return
  renderer.clear()
  if (hidden.value) return
  const { k, left, top } = stageBox(canvas)
  const s = k * BIG_WIN.spineUi * UI_PX
  const [x, y] = uiPoint(0, slideUi)
  renderer.draw(pose(rig.data, anim, at), texture, [s, 0, 0, -s, left + x * k, top + y * k])
}

function placeLabel(anim: string, at: number, slideUi: number, opacity: number, pulse: number) {
  if (!rig) return
  const bone = boneOffset(rig.data, anim, at, BIG_WIN.label.bone)
  const [ox, oy] = BIG_WIN.label.offset
  const [x, y] = uiPoint(
    (BONE_REST[0] + bone.x) * BIG_WIN.spineUi + ox * bone.scale,
    (BONE_REST[1] + bone.y) * BIG_WIN.spineUi + oy * bone.scale + slideUi,
  )
  label.value = { x, y, scale: bone.scale * pulse, opacity }
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  const t = (now - props.at) / 1000
  if (!stopped && t >= stopAt) {
    stopped = true
    emit('stop')
  }
  if (t >= stopAt + doneAfter) {
    cancelAnimationFrame(raf)
    emit('done')
    return
  }
  const outT = t - (stopAt + outAfter)
  hidden.value = t >= stopAt + hideAfter
  shownAmount.value =
    stopped || props.fast
      ? props.amount
      : Math.round(props.amount * Math.min(1, Math.max(0, t / props.tier.seconds)) * 100) / 100
  const { alpha, floor } = BIG_WIN.dim
  const rigT = t - BIG_WIN.rigLag
  const lagT = rigT - BIG_WIN.animatorLag
  const lagOut = outT - BIG_WIN.animatorLag
  dim.value =
    outT >= 0
      ? alpha + (floor - alpha) * ramp(lagOut, BIG_WIN.dim.out)
      : floor + (alpha - floor) * ramp(lagT, BIG_WIN.dim.in)
  const slideUi =
    BIG_WIN.slide.ui *
    (outT >= 0 ? linearRamp(lagOut, BIG_WIN.slide.out) : 1 - linearRamp(lagT, BIG_WIN.slide.in))
  const labelOpacity =
    outT >= 0
      ? 1 + (BIG_WIN.label.floor - 1) * ramp(lagOut, BIG_WIN.label.out)
      : BIG_WIN.label.floor + (1 - BIG_WIN.label.floor) * ramp(lagT, BIG_WIN.label.in)
  const [anim, at] = rigPose(rigT, outT)
  placeLabel(anim, at, slideUi, labelOpacity, stopped ? pulseScale(t - stopAt) : 1)
  drawRig(anim, at, slideUi)
  drawCoins(t)
}

function skip() {
  const t = (performance.now() - props.at) / 1000
  if (stopped || props.fast || t < BIG_WIN.inSec + BIG_WIN.rigLag) return
  stopAt = t
}

function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space' || e.repeat) return
  e.preventDefault()
  skip()
}

function resize() {
  for (const canvas of [coinEl.value, rigEl.value]) {
    if (!canvas) continue
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio))
  }
}

function setup() {
  const canvas = rigEl.value
  if (!canvas || !rig) return
  try {
    renderer = createSpineRenderer(canvas)
    texture = renderer.upload(rig.image)
  } catch (e) {
    console.warn("Couldn't start the big win renderer", e)
    renderer = null
    texture = null
  }
}

function onContextLost(e: Event) {
  e.preventDefault()
  renderer = null
  texture = null
}

onMounted(() => {
  resize()
  observer = new ResizeObserver(resize)
  if (rootEl.value) observer.observe(rootEl.value)
  rigEl.value?.addEventListener('webglcontextlost', onContextLost)
  rigEl.value?.addEventListener('webglcontextrestored', setup)
  window.addEventListener('keydown', onKey)
  coins = new Image()
  coins.src = `${props.asset}/${COIN.file}`
  loadSpine(props.asset, BIG_WIN.rig)
    .then((loaded) => {
      rig = loaded
      setup()
    })
    .catch((error) => console.warn('big win rig', error))
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
  rigEl.value?.removeEventListener('webglcontextlost', onContextLost)
  rigEl.value?.removeEventListener('webglcontextrestored', setup)
  renderer?.dispose()
})
</script>

<template>
  <div
    ref="rootEl"
    class="big-win"
    role="status"
    :aria-label="`${tier.name} win ${formatPeso(amount)}`"
    @click.stop="skip"
  >
    <div v-if="!hidden" class="dim" :style="{ opacity: dim }" />
    <canvas ref="coinEl" class="layer" />
    <canvas ref="rigEl" class="layer" />
    <div class="box">
      <span v-if="!hidden" class="amount" :style="labelStyle">
        <TumbleNumber
          :text="text"
          :asset="asset"
          :font="BIG_WIN_FONT"
          :size="BIG_WIN_FONT.size * UI_PX"
        />
      </span>
    </div>
  </div>
</template>

<style scoped>
.big-win {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: auto;
}

.dim,
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.dim {
  background: #000;
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

.amount {
  position: absolute;
  display: block;
  white-space: nowrap;
}
</style>
