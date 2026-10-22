<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  COLS,
  ROWS,
  FX_BOARD_CLIP,
  FX_FRAME_MS,
  FX_SHEETS,
  FX_SOURCE_CELL,
  WIN_FX,
  type WinFx,
} from '@/games/gates-of-olympus/winFx'

const props = defineProps<{ fx: WinFx | null; asset: string }>()

const FX_COLS = COLS + 1
const FX_ROWS = ROWS + 1
type Sheet = (typeof FX_SHEETS)[keyof typeof FX_SHEETS]

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let rate = 1
let cells: [number, number][] = []
let observer: ResizeObserver | null = null

const images = new Map<Sheet, HTMLImageElement>()
for (const sheet of Object.values(FX_SHEETS)) {
  const img = new Image()
  img.src = `${props.asset}/${sheet.file}`
  images.set(sheet, img)
}

function resize() {
  const el = canvas.value
  if (!el) return
  const box = el.getBoundingClientRect()
  el.width = Math.round(box.width * devicePixelRatio)
  el.height = Math.round(box.height * devicePixelRatio)
}

function drawSheet(
  g: CanvasRenderingContext2D,
  sheet: Sheet,
  index: number,
  cw: number,
  ch: number,
) {
  const img = images.get(sheet)
  if (!img?.complete || !img.naturalWidth) return
  const sx = (index % sheet.cols) * sheet.w
  const sy = Math.floor(index / sheet.cols) * sheet.h
  const dw = (sheet.w * cw) / FX_SOURCE_CELL.w
  const dh = (sheet.h * ch) / FX_SOURCE_CELL.h
  for (const [c, r] of cells)
    g.drawImage(img, sx, sy, sheet.w, sheet.h, (c + 1) * cw - dw / 2, (r + 1) * ch - dh / 2, dw, dh)
}

const SHARED_EDGE_GAP = 6

function drawBorders(g: CanvasRenderingContext2D, index: number, cw: number, ch: number) {
  const sheet = FX_SHEETS.border
  const img = images.get(sheet)
  if (!img?.complete || !img.naturalWidth) return
  const sx = (index % sheet.cols) * sheet.w
  const sy = Math.floor(index / sheet.cols) * sheet.h
  const dw = (sheet.w * cw) / FX_SOURCE_CELL.w
  const dh = (sheet.h * ch) / FX_SOURCE_CELL.h
  const winning = new Set(cells.map(([c, r]) => `${c},${r}`))
  const gap = (SHARED_EDGE_GAP * cw) / FX_SOURCE_CELL.w
  for (const [c, r] of cells) {
    const left = (c + 1) * cw - dw / 2
    const top = (r + 1) * ch - dh / 2
    const right = winning.has(`${c + 1},${r}`) ? (c + 1.5) * cw - gap : left + dw
    const bottom = winning.has(`${c},${r + 1}`) ? (r + 1.5) * ch - gap : top + dh
    g.save()
    g.beginPath()
    g.rect(left, top, right - left, bottom - top)
    g.clip()
    g.drawImage(img, sx, sy, sheet.w, sheet.h, left, top, dw, dh)
    g.restore()
  }
}

function frame(now: number) {
  const el = canvas.value
  if (!ctx || !el || !props.fx) return
  const t = (now - props.fx.start) * rate
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, el.width, el.height)
  if (t > WIN_FX.burstAt + WIN_FX.burstFrames * FX_FRAME_MS) return
  const cw = el.width / FX_COLS
  const ch = el.height / FX_ROWS
  ctx.save()
  ctx.beginPath()
  ctx.rect(
    cw * (0.5 - FX_BOARD_CLIP.x),
    ch * (0.5 - FX_BOARD_CLIP.y),
    cw * (COLS + 2 * FX_BOARD_CLIP.x),
    ch * (ROWS + 2 * FX_BOARD_CLIP.y),
  )
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  const borderFrame = Math.floor(t / FX_FRAME_MS)
  if (props.fx.border && borderFrame < WIN_FX.borderFrames) drawBorders(ctx, borderFrame, cw, ch)
  if (t >= WIN_FX.burstAt) {
    const burstFrame = Math.floor((t - WIN_FX.burstAt) / FX_FRAME_MS)
    if (burstFrame < WIN_FX.burstFrames) drawSheet(ctx, FX_SHEETS.explode, burstFrame, cw, ch)
  }
  ctx.restore()
  raf = requestAnimationFrame(frame)
}

function play() {
  cancelAnimationFrame(raf)
  const el = canvas.value
  if (!el) return
  ctx ??= el.getContext('2d')
  ctx?.clearRect(0, 0, el.width, el.height)
  if (!props.fx) return
  rate = props.fx.rate
  cells = props.fx.cells
  raf = requestAnimationFrame(frame)
}

watch(() => props.fx?.id, play)
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
  <div class="win-fx">
    <canvas ref="canvas" />
    <div
      v-if="fx"
      :key="fx.id"
      class="labels"
      :style="{ '--rate': fx.rate, '--amount-ms': `${WIN_FX.amountLength}ms` }"
    >
      <span
        v-for="label in fx.labels"
        :key="`${label.c}-${label.r}`"
        class="win-amount"
        :style="{
          left: `${((label.c + 1) / FX_COLS) * 100}%`,
          top: `${((label.r + 1) / FX_ROWS) * 100 - 2.5}%`,
        }"
        >{{ label.text }}</span
      >
    </div>
  </div>
</template>

<style scoped>
.win-fx {
  position: absolute;
  left: calc(15.9375% - 68.07% / 12);
  top: calc(10.141% - 76.014% / 10);
  width: calc(68.07% * 7 / 6);
  height: calc(76.014% * 6 / 5);
  pointer-events: none;
}

canvas,
.labels {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

canvas {
  mix-blend-mode: plus-lighter;
}

.win-amount {
  position: absolute;
  translate: -50% -50%;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 3.29cqw;
  line-height: 1;
  white-space: nowrap;
  background: linear-gradient(#fff, #e4e5ee 55%, #b9bbc9);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0.035em 0 0 #1b2a9a) drop-shadow(-0.035em 0 0 #1b2a9a)
    drop-shadow(0 0.035em 0 #1b2a9a) drop-shadow(0 -0.035em 0 #1b2a9a);
  opacity: 0;
  animation: amount-pop calc(var(--amount-ms) / var(--rate)) linear forwards;
}

@keyframes amount-pop {
  0% {
    opacity: 0;
    scale: 0.5;
    animation-timing-function: ease-out;
  }
  7.5% {
    opacity: 1;
    scale: 1.3;
    animation-timing-function: ease-in-out;
  }
  35% {
    opacity: 1;
    scale: 1;
  }
  69% {
    opacity: 1;
    scale: 1;
  }
  100% {
    opacity: 0;
    scale: 1;
  }
}
</style>
