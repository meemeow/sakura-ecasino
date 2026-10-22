<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { animationLength, pose } from '@/games/gates-of-olympus/spineLite'
import {
  createSpineRenderer,
  type SpineRenderer,
  type SpineTexture,
} from '@/games/gates-of-olympus/spineGl'
import { STAGE } from '@/games/gates-of-olympus/winFx'
import { ZEUS, loadZeus, type ZeusRigs } from '@/games/gates-of-olympus/zeusRig'

const props = defineProps<{ asset: string }>()

type Pose = 'idle' | 'charging'

const canvasEl = ref<HTMLCanvasElement | null>(null)
let renderer: SpineRenderer | null = null
let textures: { zeus: SpineTexture; transition: SpineTexture } | null = null
let rigs: ZeusRigs | null = null
let raf = 0
let observer: ResizeObserver | null = null

let shown: { pose: Pose; since: number } = { pose: 'idle', since: performance.now() }
let next: { pose: Pose; at: number } | null = null
let transitionStart = -Infinity
let releaseAt: number | null = null

const heading = () => next?.pose ?? shown.pose

function transitionTo(target: Pose, at: number) {
  transitionStart = at
  next = { pose: target, at: at + ZEUS.swapAfterMs }
}

function charge(delayMs = 0, holdMs?: number) {
  const at = performance.now() + delayMs
  if (heading() !== 'charging') transitionTo('charging', at)
  releaseAt = holdMs === undefined ? null : at + holdMs
}

function release() {
  releaseAt = null
  if (heading() === 'charging') transitionTo('idle', performance.now())
}

defineExpose({ charge, release })

const boxStyle = {
  left: `${(100 * ZEUS.box.x) / STAGE.w}%`,
  top: `${(100 * ZEUS.box.y) / STAGE.h}%`,
  width: `${(100 * ZEUS.box.w) / STAGE.w}%`,
  height: `${(100 * ZEUS.box.h) / STAGE.h}%`,
}

function setup() {
  const canvas = canvasEl.value
  if (!canvas || !rigs) return
  try {
    renderer = createSpineRenderer(canvas)
    textures = {
      zeus: renderer.upload(rigs.zeus.image),
      transition: renderer.upload(rigs.transition.image),
    }
  } catch (e) {
    console.warn("Couldn't start the Zeus renderer", e)
    renderer = null
    textures = null
  }
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(box.width * devicePixelRatio))
  canvas.height = Math.max(1, Math.round(box.height * devicePixelRatio))
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  if (releaseAt !== null && now >= releaseAt) {
    transitionTo('idle', releaseAt)
    releaseAt = null
  }
  if (next && now > next.at) {
    shown = { pose: next.pose, since: next.at }
    next = null
  }
  const canvas = canvasEl.value
  if (!renderer || !textures || !rigs || !canvas) return
  const k = canvas.width / ZEUS.box.w
  const s = k * ZEUS.scale
  const base: [number, number, number, number, number, number] = [
    s,
    0,
    0,
    -s,
    k * (ZEUS.origin.x - ZEUS.box.x),
    k * (ZEUS.origin.y - ZEUS.box.y),
  ]
  renderer.clear()
  const anim = shown.pose === 'idle' ? ZEUS.idle : ZEUS.charging
  const t = ((now - shown.since) / 1000) % animationLength(rigs.zeus.data, anim)
  renderer.draw(pose(rigs.zeus.data, anim, t), textures.zeus, base)
  const tt = (now - transitionStart) / 1000
  if (tt >= 0 && tt < animationLength(rigs.transition.data, ZEUS.transition))
    renderer.draw(pose(rigs.transition.data, ZEUS.transition, tt), textures.transition, base)
}

function onContextLost(e: Event) {
  e.preventDefault()
  renderer = null
  textures = null
}

onMounted(async () => {
  resize()
  observer = new ResizeObserver(resize)
  if (canvasEl.value) {
    observer.observe(canvasEl.value)
    canvasEl.value.addEventListener('webglcontextlost', onContextLost)
    canvasEl.value.addEventListener('webglcontextrestored', setup)
  }
  try {
    rigs = await loadZeus(props.asset)
  } catch (e) {
    console.warn("Couldn't load Zeus", e)
    return
  }
  setup()
  shown = { pose: 'idle', since: performance.now() }
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  canvasEl.value?.removeEventListener('webglcontextlost', onContextLost)
  canvasEl.value?.removeEventListener('webglcontextrestored', setup)
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvasEl" class="zeus" :style="boxStyle" />
</template>

<style scoped>
.zeus {
  position: absolute;
  pointer-events: none;
}
</style>
