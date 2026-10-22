<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { COLS, ROWS, FX_BOARD_CLIP, type OrbWin } from '@/games/gates-of-olympus/winFx'
import { animationLength, draw, pose } from '@/games/gates-of-olympus/spineLite'
import { loadRig, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'

const props = defineProps<{ wins: OrbWin[]; asset: string }>()
const emit = defineEmits<{ done: [id: number] }>()

const FX_COLS = COLS + 1
const FX_ROWS = ROWS + 1

const normalEl = ref<HTMLCanvasElement | null>(null)
const lightEl = ref<HTMLCanvasElement | null>(null)
const rigs = new Map<OrbWin['rig'], LoadedRig>()
let raf = 0
let observer: ResizeObserver | null = null

function resize() {
  for (const el of [normalEl.value, lightEl.value]) {
    if (!el) continue
    const box = el.getBoundingClientRect()
    el.width = Math.round(box.width * devicePixelRatio)
    el.height = Math.round(box.height * devicePixelRatio)
  }
}

function frame(now: number) {
  const normal = normalEl.value?.getContext('2d')
  const light = lightEl.value?.getContext('2d')
  if (!normal || !light) return
  const { width, height } = normal.canvas
  normal.clearRect(0, 0, width, height)
  light.clearRect(0, 0, width, height)
  const cw = width / FX_COLS
  const ch = height / FX_ROWS
  for (const g of [normal, light]) {
    g.save()
    g.beginPath()
    g.rect(
      cw * (0.5 - FX_BOARD_CLIP.x),
      ch * (0.5 - FX_BOARD_CLIP.y),
      cw * (COLS + 2 * FX_BOARD_CLIP.x),
      ch * (ROWS + 2 * FX_BOARD_CLIP.y),
    )
    g.clip()
  }
  let live = false
  for (const win of props.wins) {
    const rig = rigs.get(win.rig)
    const t = ((now - win.at) / 1000) * win.rate
    if (!rig || t < 0) {
      live = true
      continue
    }
    if (t > animationLength(rig.data, win.anim)) {
      emit('done', win.id)
      continue
    }
    live = true
    const s = win.unit * cw
    const x = (win.c + 0.5 + win.x) * cw
    const y = (win.r + 0.5 + win.y) * ch
    draw(pose(rig.data, win.anim, t), rig.image, [s, 0, 0, -s, x, y], normal, light)
  }
  normal.restore()
  light.restore()
  raf = live ? requestAnimationFrame(frame) : 0
}

function play() {
  for (const win of props.wins)
    if (!rigs.has(win.rig))
      loadRig(props.asset, win.rig)
        .then((rig) => rigs.set(win.rig, rig))
        .catch((error) => console.warn('orb win rig', error))
  if (!raf && props.wins.length) raf = requestAnimationFrame(frame)
}

watch(() => props.wins.map((win) => win.id).join(), play)
onMounted(() => {
  resize()
  observer = new ResizeObserver(resize)
  if (normalEl.value) observer.observe(normalEl.value)
  play()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
})
</script>

<template>
  <div class="orb-win-fx">
    <canvas ref="normalEl" />
    <canvas ref="lightEl" class="light" />
  </div>
</template>

<style scoped>
.orb-win-fx {
  position: absolute;
  left: calc(15.9375% - 68.07% / 12);
  top: calc(10.141% - 76.014% / 10);
  width: calc(68.07% * 7 / 6);
  height: calc(76.014% * 6 / 5);
  pointer-events: none;
}

canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.light {
  mix-blend-mode: plus-lighter;
}
</style>
