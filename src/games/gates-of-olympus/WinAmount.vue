<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TumbleNumber from '@/games/gates-of-olympus/TumbleNumber.vue'
import { WIN_FONT } from '@/games/gates-of-olympus/winFont'
import { STAGE, WIN_AMOUNT, hermite } from '@/games/gates-of-olympus/winFx'

const props = defineProps<{ text: string; asset: string; rate: number }>()

const FPS = 60
const cqw = (px: number) => `${(100 * px) / STAGE.w}cqw`

const el = ref<HTMLElement | null>(null)

const STEPS = Math.ceil((WIN_AMOUNT.ms / 1000) * FPS)
const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
  const t = ((WIN_AMOUNT.ms / 1000) * i) / STEPS
  const y = (WIN_AMOUNT.drop - hermite(WIN_AMOUNT.rise, t)) * WIN_AMOUNT.uiPx
  return {
    transform: `translate(-50%, -50%) translateY(${cqw(y)}) scale(${hermite(WIN_AMOUNT.scale, t)})`,
    opacity: Math.min(1, Math.max(0, hermite(WIN_AMOUNT.alpha, i / STEPS))),
  }
})

onMounted(() => el.value?.animate(frames, { duration: WIN_AMOUNT.ms / props.rate, fill: 'both' }))
</script>

<template>
  <span ref="el" class="win-amount">
    <TumbleNumber
      :text="text"
      :asset="asset"
      :font="WIN_FONT"
      :size="WIN_AMOUNT.fontSize * WIN_AMOUNT.uiPx"
    />
  </span>
</template>

<style scoped>
.win-amount {
  position: absolute;
  display: block;
  white-space: nowrap;
  pointer-events: none;
}
</style>
