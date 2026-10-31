<script lang="ts">
import type { InjectionKey, Ref } from 'vue'

export const CELL_LIGHT: InjectionKey<Ref<HTMLElement | null>> = Symbol('cell-light')
</script>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { animationLength, draw, pose } from '@/games/gates-of-olympus/spineLite'
import { loadSpine, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'

export type CellPlace = { x: number; y: number; unit: number }

const props = defineProps<{
  file: string
  anim: string
  at: number
  place: CellPlace
  asset: string
  free?: boolean
}>()
const emit = defineEmits<{ ready: [rig: LoadedRig]; done: [] }>()

const MARGIN = 1
const BOARD_OVERHANG = 0.00673

const lightLayer = inject(CELL_LIGHT, ref(null))

const rootEl = ref<HTMLElement | null>(null)
const normalEl = ref<HTMLCanvasElement | null>(null)
const lightEl = ref<HTMLCanvasElement | null>(null)
const overEl = ref<HTMLElement | null>(null)
const drawn = ref(false)
let loaded: LoadedRig | null = null
let raf = 0

function fit(canvas: HTMLCanvasElement, width: number, height: number) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

function frame(now: number) {
  const root = rootEl.value
  const normal = normalEl.value?.getContext('2d')
  const light = lightEl.value?.getContext('2d')
  if (!root) return
  placeOver(root)
  if (!loaded || !normal || !light) {
    raf = requestAnimationFrame(frame)
    return
  }
  const t = (now - props.at) / 1000
  if (t < 0) {
    drawn.value = false
    normal.clearRect(0, 0, normal.canvas.width, normal.canvas.height)
    light.clearRect(0, 0, light.canvas.width, light.canvas.height)
    raf = requestAnimationFrame(frame)
    return
  }
  if (t > animationLength(loaded.data, props.anim)) {
    drawn.value = false
    normal.clearRect(0, 0, normal.canvas.width, normal.canvas.height)
    light.clearRect(0, 0, light.canvas.width, light.canvas.height)
    emit('done')
    return
  }
  const cellW = root.offsetWidth * devicePixelRatio
  const cellH = root.offsetHeight * devicePixelRatio
  const width = Math.round(cellW * (1 + 2 * MARGIN))
  const height = Math.round(cellH * (1 + 2 * MARGIN))
  fit(normal.canvas, width, height)
  fit(light.canvas, width, height)
  normal.clearRect(0, 0, width, height)
  light.clearRect(0, 0, width, height)
  normal.imageSmoothingQuality = light.imageSmoothingQuality = 'high'
  light.save()
  placeLight(root, light, !props.free)
  if (props.free) placeLight(root, normal, false)
  const s = props.place.unit * cellW
  const x = cellW * (MARGIN + props.place.x)
  const y = cellH * (MARGIN + props.place.y)
  draw(pose(loaded.data, props.anim, t), loaded.image, [s, 0, 0, -s, x, y], normal, light)
  light.restore()
  drawn.value = true
  raf = requestAnimationFrame(frame)
}

function placeOver(root: HTMLElement) {
  const over = overEl.value
  const layer = lightLayer.value
  if (!over || !layer || over.parentElement !== layer) return
  const cell = root.getBoundingClientRect()
  const origin = layer.getBoundingClientRect()
  const board = root.closest('.reels')?.getBoundingClientRect()
  const overhang = board ? board.height * BOARD_OVERHANG : 0
  const clip = board
    ? `inset(${board.top - overhang - cell.top}px ${cell.right - board.right}px ${cell.bottom - board.bottom - overhang}px ${board.left - cell.left}px)`
    : 'none'
  Object.assign(over.style, {
    left: `${cell.left - origin.left}px`,
    top: `${cell.top - origin.top}px`,
    width: `${cell.width}px`,
    height: `${cell.height}px`,
    clipPath: clip,
    visibility: 'visible',
  })
}

function placeLight(root: HTMLElement, light: CanvasRenderingContext2D, clip = true) {
  const layer = lightLayer.value
  if (!layer || light.canvas.parentElement !== layer) return
  const cell = root.getBoundingClientRect()
  const origin = layer.getBoundingClientRect()
  const left = cell.left - origin.left - root.offsetWidth * MARGIN
  const top = cell.top - origin.top - root.offsetHeight * MARGIN
  Object.assign(light.canvas.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${root.offsetWidth * (1 + 2 * MARGIN)}px`,
    height: `${root.offsetHeight * (1 + 2 * MARGIN)}px`,
  })
  const board = root.closest('.reels')?.getBoundingClientRect()
  if (!board || !clip) return
  const overhang = board.height * BOARD_OVERHANG
  light.beginPath()
  light.rect(
    (board.left - origin.left - left) * devicePixelRatio,
    (board.top - overhang - origin.top - top) * devicePixelRatio,
    board.width * devicePixelRatio,
    (board.height + 2 * overhang) * devicePixelRatio,
  )
  light.clip()
}

onMounted(() => {
  raf = requestAnimationFrame(frame)
  loadSpine(props.asset, props.file)
    .then((rig) => {
      loaded = rig
      emit('ready', rig)
    })
    .catch((error) => {
      console.warn('cell spine', props.file, error)
      emit('done')
    })
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div ref="rootEl" class="cell-spine" :class="{ drawn }">
    <canvas v-if="!free" ref="normalEl" />
    <Teleport :to="lightLayer" :disabled="!lightLayer" defer>
      <canvas v-if="free" ref="normalEl" />
      <canvas ref="lightEl" class="light" />
      <div v-if="$slots.over" ref="overEl" class="over"><slot name="over" /></div>
    </Teleport>
  </div>
</template>

<style scoped>
.cell-spine {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

canvas {
  position: absolute;
  left: -100%;
  top: -100%;
  width: 300%;
  height: 300%;
}

.light {
  mix-blend-mode: plus-lighter;
}

.over {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}
</style>
