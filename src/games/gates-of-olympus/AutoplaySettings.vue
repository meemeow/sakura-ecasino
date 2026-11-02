<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ count: number; skipScreens: boolean }>()
const speed = defineModel<number>('speed', { required: true })
const emit = defineEmits<{
  close: []
  start: [settings: { count: number; speed: number; skipScreens: boolean }]
}>()

const COUNTS = [10, 20, 30, 50, 70, 100, 250, 500, 1000]
const index = ref(Math.max(0, COUNTS.indexOf(props.count)))
const count = computed(() => COUNTS[index.value]!)
const t = computed(() => index.value / (COUNTS.length - 1))

const turbo = computed(() => speed.value === 2)
const quick = computed(() => speed.value === 1)
const skipScreens = ref(props.skipScreens)
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
      <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 6.7l24 26.6M32 6.7 8 33.3" /></svg>
    </button>

    <button
      type="button"
      class="check"
      style="--x: 26.9"
      :aria-pressed="turbo"
      @click="toggleTurbo"
    >
      <span class="box" :class="{ on: turbo }"
        ><svg v-if="turbo" viewBox="0 0 45 45"><path d="M12.4 22.4l7.8 8.2 16.1-16.7" /></svg
      ></span>
      <span class="label">TURBO<br />SPIN</span>
    </button>
    <button
      type="button"
      class="check"
      style="--x: 200.5"
      :aria-pressed="quick"
      @click="toggleQuick"
    >
      <span class="box" :class="{ on: quick }"
        ><svg v-if="quick" viewBox="0 0 45 45"><path d="M12.4 22.4l7.8 8.2 16.1-16.7" /></svg
      ></span>
      <span class="label">QUICK<br />SPIN</span>
    </button>
    <button
      type="button"
      class="check"
      style="--x: 374.1"
      :aria-pressed="skipScreens"
      @click="skipScreens = !skipScreens"
    >
      <span class="box" :class="{ on: skipScreens }"
        ><svg v-if="skipScreens" viewBox="0 0 45 45"><path d="M12.4 22.4l7.8 8.2 16.1-16.7" /></svg
      ></span>
      <span class="label">SKIP<br />SCREENS</span>
    </button>

    <p class="heading">NUMBER OF AUTOSPINS</p>

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
@font-face {
  font-family: 'Futura Condensed ExtraBold';
  src: url('@/assets/fonts/futura-condensed-extrabold.woff') format('woff');
  font-display: block;
}

@font-face {
  font-family: 'Futura Bold';
  src: url('@/assets/fonts/futura-bold.woff') format('woff');
  font-display: block;
}

.autoplay-settings {
  --p: calc(35.28cqw / 544);
  position: absolute;
  left: 32.36%;
  top: 19.38%;
  width: calc(544 * var(--p));
  height: calc(494 * var(--p));
  border-radius: calc(15.5 * var(--p));
  background: rgb(0 0 0 / 0.95);
  color: #fff;
  font-family: 'Futura Bold', sans-serif;
  font-weight: normal;
  line-height: 1;
  white-space: nowrap;
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
  font-weight: normal;
}

.title {
  top: calc(46.3 * var(--p));
  font-family: 'Futura Condensed ExtraBold', sans-serif;
  font-size: calc(21.2 * var(--p));
  color: #f3af31;
}

.heading {
  top: calc(236.7 * var(--p));
  font-size: calc(18.5 * var(--p));
}

.x {
  position: absolute;
  top: 0;
  right: 0;
  width: calc(76.8 * var(--p));
  height: calc(85.5 * var(--p));
  padding: 0;
  border: none;
  background: #000;
  cursor: pointer;
  transition: transform 0.08s;
}

.x:active {
  transform: scale(0.92);
}

.x svg {
  position: absolute;
  left: calc(12.7 * var(--p));
  top: calc(17.1 * var(--p));
  width: calc(53.4 * var(--p));
  height: calc(53.4 * var(--p));
  fill: none;
  stroke: #bebebe;
  stroke-width: 2.58;
}

.check {
  position: absolute;
  left: calc(var(--x) * var(--p));
  top: calc(144.6 * var(--p));
  width: calc(150 * var(--p));
  height: calc(46.6 * var(--p));
  padding: 0;
  border: none;
  background: none;
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.box {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  width: calc(46.6 * var(--p));
  height: calc(46.6 * var(--p));
  box-sizing: border-box;
  border: calc(1.8 * var(--p)) solid #a0a0a0;
  border-radius: calc(6 * var(--p));
}

.box.on {
  border-width: calc(0.8 * var(--p));
  border-color: transparent;
  background: #00b862 padding-box;
}

.box svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: #fff;
  stroke-width: 3.5;
}

.label {
  position: absolute;
  left: calc(65.2 * var(--p));
  top: calc(7.27 * var(--p));
  font-size: calc(14.7 * var(--p));
  line-height: calc(17.6 * var(--p));
  text-align: left;
}

.slider {
  position: absolute;
  left: calc(50 * var(--p));
  top: calc(292.3 * var(--p));
  width: calc(347 * var(--p));
  height: calc(44.3 * var(--p));
}

.track,
.fill {
  position: absolute;
  left: 0;
  top: calc(20.4 * var(--p));
  height: calc(3.5 * var(--p));
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
  width: calc(44.3 * var(--p));
  height: calc(44.3 * var(--p));
  translate: -50% 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(2.6 * var(--p));
  border-radius: calc(6 * var(--p));
  background: #00b862;
  pointer-events: none;
}

.thumb i {
  width: calc(2.7 * var(--p));
  height: calc(14 * var(--p));
  border-radius: calc(0.5 * var(--p));
  background: #fff;
}

.slider input {
  position: absolute;
  left: calc(-22 * var(--p));
  right: calc(-22 * var(--p));
  top: 0;
  width: calc(100% + 44 * var(--p));
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.count {
  position: absolute;
  left: calc(414.3 * var(--p));
  width: calc(80 * var(--p));
  top: calc(303.5 * var(--p));
  text-align: center;
  font-size: calc(25.7 * var(--p));
}

.start {
  position: absolute;
  left: calc(7.5 * var(--p));
  right: calc(7.5 * var(--p));
  top: calc(419.7 * var(--p));
  height: calc(66.4 * var(--p));
  padding: calc(1.4 * var(--p)) 0 0;
  border: none;
  border-radius: 0 0 calc(11.5 * var(--p)) calc(11.5 * var(--p));
  background: #00b862;
  color: #fff;
  font: inherit;
  font-size: calc(25.1 * var(--p));
  cursor: pointer;
  transition:
    filter 0.15s,
    transform 0.08s;
}

.start:hover {
  filter: brightness(1.08);
}

.start:active {
  transform: scale(0.98);
}
</style>
