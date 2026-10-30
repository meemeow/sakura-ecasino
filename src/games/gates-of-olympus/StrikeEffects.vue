<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  COLS,
  REELS,
  ROWS,
  STAGE,
  STRIKE_FX,
  STRIKE_SHAKE,
  boltFrame,
  linearAt,
  type Strike,
  type StrikeFlipbook,
} from '@/games/gates-of-olympus/winFx'

const props = defineProps<{ strikes: Strike[]; asset: string; shake: HTMLElement | null }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let observer: ResizeObserver | null = null
let shaken = false

const sheet = new Image()
sheet.src = `${props.asset}/${STRIKE_FX.file}`

const SHAKE_END = STRIKE_SHAKE.x.at(-1)![0]

function resize() {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()
  el.width = Math.round(box.width * devicePixelRatio)
  el.height = Math.round(box.height * devicePixelRatio)
}

const strikeTime = (strike: Strike, now: number) => (now - strike.landAt + STRIKE_FX.lead) / 1000
const lastsFor = (strike: Strike) =>
  strike.bolt.shake ? Math.max(STRIKE_FX.end, SHAKE_END) : STRIKE_FX.end

function keyAt(book: StrikeFlipbook, t: number) {
  if (t >= STRIKE_FX.end) return -1
  return book.keys.filter((at) => t >= at).length - 1
}

function drawFrame(g: CanvasRenderingContext2D, book: StrikeFlipbook, index: number) {
  const sx = book.sheet[0] + (index % book.cols) * book.pitch[0]
  const sy = book.sheet[1] + Math.floor(index / book.cols) * book.pitch[1]
  const dw = book.w * book.scale
  const dh = book.h * book.scale
  g.drawImage(
    sheet,
    sx,
    sy,
    book.w,
    book.h,
    book.center[0] - dw / 2,
    book.center[1] - dh / 2,
    dw,
    dh,
  )
}

function drawStrike(g: CanvasRenderingContext2D, strike: Strike, t: number, px: number) {
  const key = keyAt(STRIKE_FX.bolt, t)
  if (key < 0) return
  const rootX = STAGE.w * (REELS.left + (REELS.width * (strike.c + 0.5)) / COLS)
  const rootY =
    STAGE.h * (REELS.top + (REELS.height * (strike.r + 0.5)) / ROWS) - STRIKE_FX.rootAbove
  const unit = px * STRIKE_FX.unitPx
  g.setTransform(unit * strike.flip, 0, 0, unit, rootX * px, rootY * px)
  drawFrame(g, STRIKE_FX.bolt, boltFrame(strike.bolt.variant, key))
  if (!strike.bolt.sparks) return
  const sparks = STRIKE_FX.sparks[strike.bolt.sparks]
  const spark = keyAt(sparks, t)
  if (spark >= 0) drawFrame(g, sparks, spark)
}

function setShake(x: number, y: number) {
  const el = props.shake
  if (!el || (!shaken && !x && !y)) return
  shaken = !!(x || y)
  el.style.setProperty('--shake-x', String(x))
  el.style.setProperty('--shake-y', String(y))
}

function shakeAt(live: Strike[], now: number) {
  const shaking = live
    .filter((strike) => strike.bolt.shake && strikeTime(strike, now) >= 0)
    .sort((a, b) => b.landAt - a.landAt)[0]
  if (!shaking) return setShake(0, 0)
  const t = strikeTime(shaking, now)
  setShake(linearAt(STRIKE_SHAKE.x, t) * shaking.flip, linearAt(STRIKE_SHAKE.y, t))
}

function frame(now: number) {
  const el = canvas.value
  if (!ctx || !el) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, el.width, el.height)
  const live = props.strikes.filter((strike) => strikeTime(strike, now) < lastsFor(strike))
  shakeAt(live, now)
  if (!live.length) return
  raf = requestAnimationFrame(frame)
  if (!sheet.complete || !sheet.naturalWidth) return
  const px = el.width / STAGE.w
  ctx.globalCompositeOperation = 'lighter'
  for (const strike of live) {
    const t = strikeTime(strike, now)
    if (t >= 0) drawStrike(ctx, strike, t, px)
  }
}

function play() {
  cancelAnimationFrame(raf)
  const el = canvas.value
  if (!el) return
  ctx ??= el.getContext('2d')
  raf = requestAnimationFrame(frame)
}

watch(() => props.strikes, play)
onMounted(() => {
  resize()
  observer = new ResizeObserver(resize)
  if (canvas.value) observer.observe(canvas.value)
  play()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  setShake(0, 0)
})
</script>

<template>
  <canvas ref="canvas" class="strike-fx" />
</template>

<style scoped>
.strike-fx {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  pointer-events: none;
  mix-blend-mode: plus-lighter;
  translate: calc(var(--shake-x, 0) * 1cqw / 19.2) calc(var(--shake-y, 0) * 1cqw / 19.2);
}
</style>
