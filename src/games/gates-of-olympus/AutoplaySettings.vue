<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import '@fontsource/montserrat/800.css'

// Autoplay settings opened by the AUTOPLAY button, rebuilt from the original game's panel.
// Everything is placed in the original screenshot's pixels (544x499) through the --p unit.
// speed is shared with the controls bar: ticking turbo/quick switches it there right away
const speed = defineModel<number>('speed', { required: true })
const emit = defineEmits<{ close: []; start: [settings: { count: number; speed: number; skipScreens: boolean }] }>()

const COUNTS = [10, 20, 30, 50, 70, 100, 250, 500, 1000]
const index = ref(COUNTS.indexOf(100))
const count = computed(() => COUNTS[index.value]!)
const t = computed(() => index.value / (COUNTS.length - 1)) // thumb position along the track

// turbo and quick are the two faster spin speeds, so at most one can be ticked; none = normal
const turbo = computed(() => speed.value === 2)
const quick = computed(() => speed.value === 1)
const skipScreens = ref(true)
const toggleTurbo = () => (speed.value = turbo.value ? 0 : 2)
const toggleQuick = () => (speed.value = quick.value ? 0 : 1)

function start() {
  emit('start', { count: count.value, speed: speed.value, skipScreens: skipScreens.value })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="autoplay-settings" role="dialog" aria-modal="true" aria-label="Autoplay settings">
    <h2 class="title">AUTOPLAY SETTINGS</h2>
    <button type="button" class="x" aria-label="Close" @click="emit('close')">
      <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 8l24 24M32 8 8 32" /></svg>
    </button>

    <button type="button" class="check" style="--x: 29" :aria-pressed="turbo" @click="toggleTurbo">
      <span class="box" :class="{ on: turbo }"><svg v-if="turbo" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
      <span class="label">TURBO<br />SPIN</span>
    </button>
    <button type="button" class="check" style="--x: 200" :aria-pressed="quick" @click="toggleQuick">
      <span class="box" :class="{ on: quick }"><svg v-if="quick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
      <span class="label">QUICK<br />SPIN</span>
    </button>
    <button type="button" class="check" style="--x: 372" :aria-pressed="skipScreens" @click="skipScreens = !skipScreens">
      <span class="box" :class="{ on: skipScreens }"><svg v-if="skipScreens" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
      <span class="label">SKIP<br />SCREENS</span>
    </button>

    <p class="heading">NUMBER OF AUTOSPINS</p>

    <!-- slider: drawn track + thumb, a transparent range input on top does the dragging -->
    <div class="slider" :style="{ '--t': t }">
      <div class="track" />
      <div class="fill" />
      <div class="thumb"><i /><i /><i /></div>
      <input
        v-model.number="index"
        type="range"
        min="0"
        :max="COUNTS.length - 1"
        step="1"
        aria-label="Number of autospins"
        :aria-valuetext="String(count)"
      />
    </div>
    <span class="count">{{ count }}</span>

    <button type="button" class="start" @click="start">START AUTOPLAY ({{ count }})</button>
  </div>
</template>

<style scoped>
/* 1 screenshot px of the original 544x499 panel; centred on the reels */
.autoplay-settings {
  --p: calc(35.28cqw / 544);
  position: absolute;
  left: 32.36%;
  top: 19.38%;
  width: calc(544 * var(--p));
  height: calc(499 * var(--p));
  border-radius: calc(14 * var(--p));
  background: rgb(0 0 0 / 0.95);
  color: #fff;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  line-height: 1;
  pointer-events: auto;
  overflow: hidden;
  z-index: 6;
}

.title,
.heading {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  font-size: calc(18.5 * var(--p));
}

.title {
  top: calc(53 * var(--p));
  color: #e1a22d;
}

.heading {
  top: calc(241 * var(--p));
}

.x {
  position: absolute;
  top: calc(8 * var(--p));
  right: calc(4 * var(--p));
  width: calc(76 * var(--p));
  height: calc(80 * var(--p));
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
  width: calc(54 * var(--p));
  height: calc(54 * var(--p));
  fill: none;
  stroke: #fff;
  stroke-width: 2.6;
}

/* checkbox + two-line label */
.check {
  position: absolute;
  left: calc(var(--x) * var(--p));
  top: calc(151 * var(--p));
  display: flex;
  align-items: center;
  gap: calc(20 * var(--p));
  padding: 0;
  border: none;
  background: none;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.box {
  display: grid;
  place-items: center;
  width: calc(44 * var(--p));
  height: calc(44 * var(--p));
  box-sizing: border-box;
  border: calc(1.5 * var(--p)) solid #a09fa0;
  border-radius: calc(6 * var(--p));
}

.box.on {
  border-color: #00b862;
  background: #00b862;
}

.box svg {
  width: 76%;
  fill: none;
  stroke: #fff;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.label {
  font-size: calc(15 * var(--p));
  line-height: calc(18 * var(--p));
  text-align: left;
}

/* slider: track x 50-394 on y 319; green up to the thumb, grey after */
.slider {
  position: absolute;
  left: calc(50 * var(--p));
  top: calc(297 * var(--p));
  width: calc(344 * var(--p));
  height: calc(42 * var(--p));
}

.track,
.fill {
  position: absolute;
  left: 0;
  top: calc(20 * var(--p));
  height: calc(3 * var(--p));
}

.track {
  right: 0;
  background: #404040;
}

.fill {
  width: calc(var(--t) * 100%);
  background: #00703d;
}

.thumb {
  position: absolute;
  left: calc(var(--t) * 100%);
  top: 0;
  width: calc(41 * var(--p));
  height: calc(42 * var(--p));
  translate: -50% 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(3 * var(--p));
  border-radius: calc(6 * var(--p));
  background: #00b862;
  pointer-events: none;
}

.thumb i {
  width: calc(2.6 * var(--p));
  height: calc(12 * var(--p));
  border-radius: calc(1 * var(--p));
  background: #fff;
}

.slider input {
  position: absolute;
  left: calc(-21 * var(--p));
  right: calc(-21 * var(--p));
  top: 0;
  width: calc(100% + 42 * var(--p));
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.count {
  position: absolute;
  left: calc(420 * var(--p));
  width: calc(80 * var(--p));
  top: calc(308 * var(--p));
  text-align: center;
  font-size: calc(26 * var(--p));
}

.start {
  position: absolute;
  left: calc(8 * var(--p));
  right: calc(8 * var(--p));
  top: calc(422 * var(--p));
  height: calc(65 * var(--p));
  padding: 0;
  border: none;
  border-radius: calc(4 * var(--p));
  background: #00b862;
  color: #fff;
  font: inherit;
  font-size: calc(26 * var(--p));
  cursor: pointer;
  transition: filter 0.15s, transform 0.08s;
}

.start:hover {
  filter: brightness(1.08);
}

.start:active {
  transform: scale(0.98);
}
</style>
