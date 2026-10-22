<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  COLS,
  ROWS,
  FX_FRAME_MS,
  FX_SOURCE_CELL,
  STRIKE_CANVAS,
  STRIKE_FX,
  type BoltGlow,
  type Strike,
} from '@/games/gates-of-olympus/winFx'

const props = defineProps<{ strikes: Strike[]; asset: string; layer: 'back' | 'front' }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let observer: ResizeObserver | null = null
const tinted = document.createElement('canvas')
const tintCtx = tinted.getContext('2d')

function loadSheet(file: string) {
  const img = new Image()
  img.src = `${props.asset}/${file}`
  return img
}
const light = loadSheet(STRIKE_FX.light)
const glowSheets = { red: loadSheet(STRIKE_FX.red), blue: loadSheet(STRIKE_FX.blue) }
const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0

function resize() {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()
  el.width = Math.round(box.width * devicePixelRatio)
  el.height = Math.round(box.height * devicePixelRatio)
}

const frameAt = (strike: Strike, now: number) =>
  Math.floor(STRIKE_FX.landFrame + (now - strike.landAt) / FX_FRAME_MS)

function drawTinted(g: CanvasRenderingContext2D, index: number, glow: BoltGlow, box: number[]) {
  const [x, y, w, h] = box as [number, number, number, number]
  const sx = (index % STRIKE_FX.cols) * STRIKE_FX.w
  const sy = Math.floor(index / STRIKE_FX.cols) * STRIKE_FX.h
  g.drawImage(light, sx, sy, STRIKE_FX.w, STRIKE_FX.h, x, y, w, h)
  if (!tintCtx) return
  const tw = Math.ceil(w)
  const th = Math.ceil(h)
  if (tinted.width < tw || tinted.height < th) {
    tinted.width = Math.max(tinted.width, tw)
    tinted.height = Math.max(tinted.height, th)
  }
  for (const channel of ['red', 'blue'] as const) {
    tintCtx.globalCompositeOperation = 'copy'
    tintCtx.drawImage(glowSheets[channel], sx, sy, STRIKE_FX.w, STRIKE_FX.h, 0, 0, w, h)
    tintCtx.globalCompositeOperation = 'multiply'
    tintCtx.fillStyle = glow[channel]
    tintCtx.fillRect(0, 0, tw, th)
    g.drawImage(tinted, 0, 0, w, h, x, y, w, h)
  }
}

function drawStrike(
  g: CanvasRenderingContext2D,
  strike: Strike,
  index: number,
  cw: number,
  ch: number,
) {
  const front = index >= STRIKE_FX.frontFrom
  if (props.layer === 'front' && !front) return
  const scaleX = cw / FX_SOURCE_CELL.w
  const scaleY = ch / FX_SOURCE_CELL.h
  const cx = (strike.c + STRIKE_CANVAS.side + 0.5) * cw
  const cy = (STRIKE_CANVAS.top + strike.r + 0.5) * ch
  const box = [
    cx - STRIKE_FX.anchor.x * scaleX,
    cy - STRIKE_FX.anchor.y * scaleY,
    STRIKE_FX.w * scaleX,
    STRIKE_FX.h * scaleY,
  ]
  g.save()
  if (front) {
    g.beginPath()
    if (props.layer === 'back') g.rect(0, 0, g.canvas.width, g.canvas.height)
    g.ellipse(cx, cy, STRIKE_FX.impact.rx * scaleX, STRIKE_FX.impact.ry * scaleY, 0, 0, Math.PI * 2)
    g.clip('evenodd')
  }
  drawTinted(g, index, strike.glow, box)
  g.restore()
}

function frame(now: number) {
  const el = canvas.value
  if (!ctx || !el) return
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, el.width, el.height)
  const live = props.strikes.filter((strike) => frameAt(strike, now) < STRIKE_FX.frames)
  if (!live.length) return
  raf = requestAnimationFrame(frame)
  if (![light, glowSheets.red, glowSheets.blue].every(ready)) return
  const cw = el.width / (COLS + 2 * STRIKE_CANVAS.side)
  const ch = el.height / (STRIKE_CANVAS.top + ROWS + STRIKE_CANVAS.bottom)
  ctx.save()
  ctx.beginPath()
  ctx.rect(
    cw * (STRIKE_CANVAS.side - STRIKE_CANVAS.clip.x),
    0,
    cw * (COLS + 2 * STRIKE_CANVAS.clip.x),
    ch * (STRIKE_CANVAS.top + ROWS + STRIKE_CANVAS.clip.y),
  )
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  for (const strike of live) {
    const index = frameAt(strike, now)
    if (index >= 0) drawStrike(ctx, strike, index, cw, ch)
  }
  ctx.restore()
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
})
</script>

<template>
  <canvas ref="canvas" class="strike-fx" />
</template>

<style scoped>
.strike-fx {
  position: absolute;
  left: calc(15.9375% - 68.07% / 6);
  top: 0;
  width: calc(68.07% * 8 / 6);
  height: calc(9.63% + 77.04% * 5.5 / 5);
  pointer-events: none;
  mix-blend-mode: plus-lighter;
}
</style>
