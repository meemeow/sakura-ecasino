<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ORB_RIGS, type OrbRig } from '@/games/gates-of-olympus/winFx'
import { animationLength, boneOffset } from '@/games/gates-of-olympus/spineLite'
import type { LoadedRig } from '@/games/gates-of-olympus/orbRigs'
import CellSpine, { type CellPlace } from '@/games/gates-of-olympus/CellSpine.vue'

const props = defineProps<{
  rig: OrbRig
  anim: string
  at: number
  place: CellPlace
  origin: string
  asset: string
}>()
const emit = defineEmits<{ done: [] }>()

const RIDE_FPS = 60

const rideEl = ref<HTMLElement | null>(null)
let loaded: LoadedRig | null = null
let ride: Animation | null = null

function bounce() {
  ride?.cancel()
  const el = rideEl.value
  if (!loaded || !el) return
  const length = animationLength(loaded.data, props.anim)
  const px = props.place.unit * el.offsetWidth
  const steps = Math.ceil(length * RIDE_FPS)
  const bone = ORB_RIGS[props.rig].bodyBone
  const frames = Array.from({ length: steps + 1 }, (_, i) => {
    const o = boneOffset(loaded!.data, props.anim, (length * i) / steps, bone)
    return {
      transform: `translate(${o.x * px}px, ${-o.y * px}px) scale(${o.scale}, ${o.scaleY})`,
    }
  })
  ride = el.animate(frames, { duration: length * 1000, delay: props.at - performance.now() })
}

function onReady(rig: LoadedRig) {
  loaded = rig
  bounce()
}

watch(() => props.at, bounce)
onBeforeUnmount(() => ride?.cancel())
</script>

<template>
  <CellSpine
    :file="ORB_RIGS[rig].file"
    :anim="anim"
    :at="at"
    :place="place"
    :asset="asset"
    @ready="onReady"
    @done="emit('done')"
  />
  <div ref="rideEl" class="ride" :style="{ transformOrigin: origin }"><slot /></div>
</template>

<style scoped>
.ride {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
