<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import StageSpine from '@/games/gates-of-olympus/StageSpine.vue'
import LayeredLabel from '@/games/gates-of-olympus/LayeredLabel.vue'
import TumbleNumber from '@/games/gates-of-olympus/TumbleNumber.vue'
import { FS_FONT, FS_WINDOW } from '@/games/gates-of-olympus/freeSpins'
import { PRESS_TEXT, WINDOW_TEXT } from '@/games/gates-of-olympus/labelLayers'
import { linearRamp } from '@/games/gates-of-olympus/bigWin'
import { STAGE, UI_PX } from '@/games/gates-of-olympus/winFx'

export type WindowKind = 'start' | 'additional' | 'result'

const props = defineProps<{
  asset: string
  kind: WindowKind
  amount: string
  spins?: number
  at: number
  waitForClick?: boolean
}>()
const emit = defineEmits<{ closing: []; done: [] }>()

const AUTO_CLOSE: Record<WindowKind, number> = {
  start: FS_WINDOW.autoStart,
  additional: FS_WINDOW.autoAdditional,
  result: FS_WINDOW.autoResult,
}
const ZELDA_SPAN = [-58, 8] as const

const now = ref(performance.now())
const closeAt = ref<number | null>(null)
let raf = 0

const t = computed(() => (now.value - props.at) / 1000)
const outT = computed(() => (closeAt.value === null ? -1 : (now.value - closeAt.value) / 1000))
const banner = computed(() => {
  if (closeAt.value !== null)
    return { anim: 'gool_congratulation_banner_out', at: closeAt.value, loop: false }
  if (t.value < FS_WINDOW.inSec)
    return { anim: 'gool_congratulation_banner_in', at: props.at, loop: false }
  return {
    anim: 'gool_congratulation_banner_loop',
    at: props.at + FS_WINDOW.inSec * 1000,
    loop: true,
  }
})
const fadeOut = computed(() => (outT.value < 0 ? 1 : 1 - linearRamp(outT.value, FS_WINDOW.out)))
const titleOpacity = computed(() => linearRamp(t.value, FS_WINDOW.titleIn) * fadeOut.value)
const textOpacity = computed(() => linearRamp(t.value, FS_WINDOW.textIn) * fadeOut.value)
const dimOpacity = computed(
  () => FS_WINDOW.dim * linearRamp(t.value, FS_WINDOW.titleIn) * fadeOut.value,
)
function sampleZoom(keys: [number, number][], time: number) {
  const next = keys.findIndex(([at]) => at > time)
  if (next < 0) return keys.at(-1)![1]
  if (next === 0) return keys[0]![1]
  const [a, va] = keys[next - 1]!
  const [b, vb] = keys[next]!
  return va + ((vb - va) * (time - a)) / (b - a)
}
const zoomOrigin = `50% ${((FS_WINDOW.banner.y * 100) / STAGE.h).toFixed(3)}%`
const zoomStyle = (keys: [number, number][]) => ({
  transform: `scale(${closeAt.value === null ? sampleZoom(keys, t.value) : 1})`,
  transformOrigin: zoomOrigin,
})
const spinsText = computed(() =>
  props.kind === 'result' ? `IN ${props.spins ?? 0} FREE SPINS` : 'FREE SPINS',
)

const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const titleBox = {
  left: cqw(FS_WINDOW.title.left),
  top: cqw(FS_WINDOW.title.top),
  width: cqw(FS_WINDOW.title.width),
}

function close() {
  if (closeAt.value !== null) return
  closeAt.value = performance.now()
  emit('closing')
}

function onClick() {
  if (t.value >= FS_WINDOW.inSec) close()
}

function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space' || e.repeat) return
  e.preventDefault()
  onClick()
}

function frame(time: number) {
  raf = requestAnimationFrame(frame)
  now.value = time
  if (closeAt.value === null && !props.waitForClick && t.value >= AUTO_CLOSE[props.kind]) close()
  if (outT.value >= FS_WINDOW.outSec) {
    cancelAnimationFrame(raf)
    emit('done')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="fs-window" role="dialog" aria-label="Free spins" @click.stop="onClick">
    <div class="dim" :style="{ opacity: dimOpacity }" />
    <StageSpine
      :asset="asset"
      :file="FS_WINDOW.banner.file"
      :anim="banner.anim"
      :at="banner.at"
      :loop="banner.loop"
      :x="FS_WINDOW.banner.x"
      :y="FS_WINDOW.banner.y"
      :scale="FS_WINDOW.banner.scale"
    />
    <div class="box" :style="zoomStyle(FS_WINDOW.titleZoom)">
      <img
        class="title"
        :src="`${asset}/ui/fs-congratulations.webp`"
        :style="{ ...titleBox, opacity: titleOpacity }"
        alt="Congratulations!"
        draggable="false"
      />
    </div>
    <div class="box" :style="zoomStyle(FS_WINDOW.textZoom)">
      <div class="texts" :style="{ opacity: textOpacity }">
        <LayeredLabel
          text="YOU HAVE WON"
          font="zelda"
          :size="69"
          :at="[960, FS_WINDOW.youWon]"
          :layers="WINDOW_TEXT"
          :gradient-span="ZELDA_SPAN"
          :max-width="750"
        />
        <span class="amount" :style="{ top: cqw(FS_WINDOW.amount) }">
          <TumbleNumber
            :text="amount"
            :asset="asset"
            :font="FS_FONT"
            :size="FS_FONT.size * UI_PX"
          />
        </span>
        <LayeredLabel
          :text="spinsText"
          font="zelda"
          :size="69"
          :at="[960, FS_WINDOW.spins]"
          :layers="WINDOW_TEXT"
          :gradient-span="ZELDA_SPAN"
          :max-width="1089"
        />
        <LayeredLabel
          v-if="kind !== 'additional'"
          text="PRESS ANYWHERE TO CONTINUE"
          font="kurrent"
          :size="27"
          :at="[960, FS_WINDOW.press]"
          :layers="PRESS_TEXT"
          :max-width="1179"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fs-window {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: auto;
}

.dim {
  position: absolute;
  inset: 0;
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

.title {
  position: absolute;
  height: auto;
  max-width: none;
}

.texts {
  position: absolute;
  inset: 0;
}

.amount {
  position: absolute;
  left: 50%;
  display: block;
  translate: -50% -50%;
  white-space: nowrap;
}
</style>
