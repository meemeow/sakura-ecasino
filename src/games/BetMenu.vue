<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import '@fontsource/montserrat/800.css'
import { BET_LEVELS, peso } from '@/games/betLevels'

// Bet picker opened by the -/+ buttons, rebuilt from the original game's panel.
// Everything is placed in the original screenshot's pixels (16.79px = 1cqw) through the --p unit.
// Closed by the X, Escape, or a press anywhere outside it (the game's backdrop).
const bet = defineModel<number>('bet', { required: true })
defineProps<{ multiplier: number }>()
const emit = defineEmits<{ close: [] }>()

function pick(level: number) {
  bet.value = level
  emit('close')
}

// capture phase, so Escape closes it and Space doesn't reach the controls' spin shortcut
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.code === 'Space') e.stopPropagation()
}
onMounted(() => window.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <div class="bet-menu" role="dialog" aria-modal="true" aria-label="Choose bet">
    <h2 class="title">BET MULTIPLIER {{ multiplier }}x</h2>
    <button type="button" class="x" aria-label="Close" @click="emit('close')">
      <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 8l24 24M32 8 8 32" /></svg>
    </button>
    <div class="levels">
      <button
        v-for="level in BET_LEVELS"
        :key="level"
        type="button"
        class="level"
        :class="{ on: level === bet }"
        :aria-pressed="level === bet"
        @click="pick(level)"
      >
        {{ peso.format(level) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 1 screenshot px of the original panel (930 wide); sits just above the controls bar,
   right of centre over the reels, and grows upwards with the number of rows */
.bet-menu {
  --p: calc(1cqw / 16.79);
  position: absolute;
  left: 32.59%;
  bottom: 20.43%;
  width: calc(930 * var(--p));
  box-sizing: border-box;
  padding: calc(89 * var(--p)) calc(13 * var(--p)) calc(14 * var(--p));
  border-radius: calc(10 * var(--p));
  background: rgb(0 0 0 / 0.95);
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  line-height: 1;
  pointer-events: auto;
  z-index: 6;
}

.title {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(31 * var(--p));
  margin: 0;
  text-align: center;
  font-size: calc(19 * var(--p));
  color: #f3af31;
}

.x {
  position: absolute;
  top: calc(18 * var(--p));
  right: calc(11 * var(--p));
  display: grid;
  place-items: center;
  width: calc(56 * var(--p));
  height: calc(56 * var(--p));
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: transform 0.08s;
}

.x:active {
  transform: scale(0.92);
}

.x svg {
  width: calc(46 * var(--p));
  height: calc(46 * var(--p));
  fill: none;
  stroke: #fff;
  stroke-width: 2.6;
}

/* 5 columns of 174x77 buttons on a 182x82 grid */
.levels {
  display: grid;
  grid-template-columns: repeat(5, calc(174 * var(--p)));
  grid-auto-rows: calc(77 * var(--p));
  gap: calc(5 * var(--p)) calc(8 * var(--p));
}

.level {
  padding: 0;
  border: calc(2.5 * var(--p)) solid #404040;
  border-radius: calc(8 * var(--p));
  background: #1f1f1f;
  color: #fff;
  font: inherit;
  font-size: calc(23 * var(--p));
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.08s;
}

.level:hover {
  background: #2a2a2a;
}

.level:active {
  transform: scale(0.97);
}

.level.on {
  border-color: #148810;
}
</style>
