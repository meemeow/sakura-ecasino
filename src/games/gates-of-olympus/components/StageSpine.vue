<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadSpine, type LoadedRig } from '@/games/gates-of-olympus/spine/rigs'
import { animationLength, pose } from '@/games/gates-of-olympus/spine/spineLite'
import { useSpineGl } from '@/games/gates-of-olympus/spine/useSpineGl'
import { STAGE } from '@/games/gates-of-olympus/engine/winFx'

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
const gl = useSpineGl<'rig'>(canvasEl, props.file)
let rig: LoadedRig | null = null
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
  const spine = gl.current()
  if (!spine || !rig || !canvas) return
  spine.renderer.clear()
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
  spine.renderer.draw(
    pose(rig.data, props.anim, t),
    spine.textures.rig,
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

onMounted(() => {
  resize()
  observer = new ResizeObserver(resize)
  if (canvasEl.value) observer.observe(canvasEl.value)
  loadSpine(props.asset, props.file)
    .then((loaded) => {
      rig = loaded
      gl.start({ rig: loaded.image })
    })
    .catch((error) => console.warn(props.file, error))
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
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
