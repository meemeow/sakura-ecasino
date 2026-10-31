<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadSpine, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'
import { animationLength, pose } from '@/games/gates-of-olympus/spineLite'
import {
  createSpineRenderer,
  type SpineRenderer,
  type SpineTexture,
} from '@/games/gates-of-olympus/spineGl'
import { STAGE } from '@/games/gates-of-olympus/winFx'

const props = withDefaults(
  defineProps<{
    asset: string
    file: string
    anim: string
    at: number
    x: number
    y: number
    scale: number
    loop?: boolean
    rate?: number
    opacity?: number
  }>(),
  { loop: false, rate: 1, opacity: 1 },
)
const emit = defineEmits<{ done: [] }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let rig: LoadedRig | null = null
let renderer: SpineRenderer | null = null
let texture: SpineTexture | null = null
let raf = 0
let finished = false
let observer: ResizeObserver | null = null

function stageBox(canvas: HTMLCanvasElement) {
  const w = Math.min(canvas.width, (canvas.height * STAGE.w) / STAGE.h)
  return {
    k: w / STAGE.w,
    left: (canvas.width - w) / 2,
    top: (canvas.height - (w * STAGE.h) / STAGE.w) / 2,
  }
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  const canvas = canvasEl.value
  if (!renderer || !texture || !rig || !canvas) return
  renderer.clear()
  const length = animationLength(rig.data, props.anim)
  let t = ((now - props.at) / 1000) * props.rate
  if (t < 0) return
  if (props.loop && length > 0) t %= length
  else if (t > length) {
    if (!finished) {
      finished = true
      emit('done')
    }
    return
  }
  const { k, left, top } = stageBox(canvas)
  const s = props.scale * k
  renderer.draw(
    pose(rig.data, props.anim, t),
    texture,
    [s, 0, 0, -s, left + props.x * k, top + props.y * k],
    props.opacity,
  )
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas) return
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio))
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio))
}

function setup() {
  const canvas = canvasEl.value
  if (!canvas || !rig) return
  try {
    renderer = createSpineRenderer(canvas)
    texture = renderer.upload(rig.image)
  } catch (e) {
    console.warn(`Couldn't start the ${props.file} renderer`, e)
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
  if (canvasEl.value) observer.observe(canvasEl.value)
  canvasEl.value?.addEventListener('webglcontextlost', onContextLost)
  canvasEl.value?.addEventListener('webglcontextrestored', setup)
  loadSpine(props.asset, props.file)
    .then((loaded) => {
      rig = loaded
      setup()
    })
    .catch((error) => console.warn(props.file, error))
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
  <canvas ref="canvasEl" class="stage-spine" />
</template>

<style scoped>
.stage-spine {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
