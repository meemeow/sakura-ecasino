<script setup lang="ts">
import { computed } from 'vue'
import StageSpine from '@/games/gates-of-olympus/components/StageSpine.vue'
import LayeredLabel from '@/games/gates-of-olympus/components/LayeredLabel.vue'
import {
  FS_LEFT_TITLE,
  PANEL_COUNT,
  PANEL_TITLE,
  PILLAR_VALUE,
} from '@/games/gates-of-olympus/text/labelLayers'
import {
  PILLAR,
  PILLAR_LEVEL_SCALES,
  pillarFxLevel,
  pillarLevel,
} from '@/games/gates-of-olympus/engine/freeSpins'
import { STAGE, UI_PX } from '@/games/gates-of-olympus/engine/winFx'

const props = defineProps<{
  asset: string
  total: number
  left: number
  levelAt: number
  bumpKey: number
}>()

const VALUE_CHARS = { x: 60 / 72 }

const level = computed(() => pillarLevel(props.total))
const fxLevel = computed(() => pillarFxLevel(props.total))
const pulse = computed(() => ({
  '--pulse': PILLAR_LEVEL_SCALES[level.value]!,
  transformOrigin: `${cqw(PILLAR.value[0])} ${cqw(PILLAR.value[1])}`,
}))

const cqw = (px: number) => `${((px * 100) / STAGE.w).toFixed(4)}cqw`
const spriteBox = ([x, y]: readonly [number, number], [w, h]: readonly [number, number]) => ({
  left: cqw(x - (w * UI_PX) / 2),
  top: cqw(y - (h * UI_PX) / 2),
  width: cqw(w * UI_PX),
})
</script>

<template>
  <div class="fs-panel">
    <template v-if="total > 0">
      <StageSpine
        :key="`under${fxLevel}`"
        :asset="asset"
        file="fx/pillar-under"
        :anim="`level${fxLevel}`"
        :at="levelAt"
        loop
        :x="PILLAR.fx.x"
        :y="PILLAR.fx.y"
        :scale="PILLAR.fx.scale"
      />
    </template>
    <img
      class="sprite"
      :src="`${asset}/ui/pillar.webp`"
      :style="spriteBox(PILLAR.center, PILLAR.sprite)"
      alt=""
      draggable="false"
    />
    <StageSpine
      v-if="total > 0"
      :key="`over${fxLevel}`"
      :asset="asset"
      file="fx/pillar-over"
      :anim="`level${fxLevel}`"
      :at="levelAt"
      loop
      :x="PILLAR.fx.x"
      :y="PILLAR.fx.y"
      :scale="PILLAR.fx.scale"
    />
    <LayeredLabel
      :text="'TOTAL\nMULTIPLIER'"
      font="arial"
      :size="25"
      :at="PILLAR.title"
      :layers="PANEL_TITLE"
      :max-width="PILLAR.titleWidth"
    />
    <img
      class="sprite"
      :src="`${asset}/ui/fs-left.webp`"
      :style="spriteBox(PILLAR.left.center, PILLAR.left.sprite)"
      alt=""
      draggable="false"
    />
    <LayeredLabel
      :text="'FREE SPINS\nLEFT'"
      font="arial"
      :size="25"
      :at="PILLAR.left.title"
      :layers="FS_LEFT_TITLE"
      :max-width="PILLAR.titleWidth"
    />
    <LayeredLabel
      :text="String(left)"
      font="arial"
      :size="54"
      :at="PILLAR.left.value"
      :layers="PANEL_COUNT"
    />
    <div v-if="total > 0" class="pillar-pulse" :style="pulse">
      <LayeredLabel
        :key="bumpKey"
        class="pillar-value"
        :text="`${total}x`"
        font="kurrent"
        :size="72"
        :at="PILLAR.value"
        :layers="PILLAR_VALUE"
        :max-width="PILLAR.valueWidth"
        :char-scale="VALUE_CHARS"
        :squash="PILLAR.valueSquash"
      />
    </div>
  </div>
</template>

<style scoped>
.fs-panel {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sprite {
  position: absolute;
  display: block;
  height: auto;
  max-width: none;
}

.pillar-pulse {
  position: absolute;
  inset: 0;
  animation: pillar-pulse 0.3333s cubic-bezier(0.3333, 0, 0.6667, 1) infinite alternate;
}

@keyframes pillar-pulse {
  to {
    scale: var(--pulse);
  }
}

.pillar-value {
  animation: pillar-bump 0.3s ease-out;
}

@keyframes pillar-bump {
  37% {
    scale: 1.4;
  }
}
</style>
