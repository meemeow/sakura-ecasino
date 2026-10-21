<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/roboto/900.css'
import '@fontsource/barlow-condensed/900.css'
import { BET_LEVELS, peso } from '@/games/betLevels'
import { publicUrl } from '@/utils/publicUrl'

// Bottom control bar for slot games: menu/sound/info, credit + bet (pesos),
// rotating message, bet -/+ (open the bet menu), spin and autoplay. Laid out on a 1920px-wide
// design and scaled with the window (cqw units).
// busy: a spin or win animation is playing; the spin button shows a stop square meanwhile
// betMenuOpen: the game's bet menu is showing; only -/+ stay live (above its backdrop)
// win: what the current/last spin has won so far (0 = nothing), for the message in the middle
const props = defineProps<{ credit: number; busy?: boolean; betMenuOpen?: boolean; win?: number }>()
const bet = defineModel<number>('bet', { required: true })
const muted = defineModel<boolean>('muted', { default: false })
// music volume 0-100, set from the popover over the sound button
const volume = defineModel<number>('volume', { default: 50 })
// last non-zero level, so unmuting from 0 goes back to where the sound was
let lastVolume = volume.value || 50
watch(volume, (v) => v > 0 && (lastVolume = v))
const volumeOpen = ref(false)
const dragging = ref(false)
// speaker icon: x when muted or silent, one wave up to 50, two above
const speakerLevel = computed(() =>
  muted.value || volume.value === 0 ? 0 : volume.value > 50 ? 2 : 1,
)
// the bar's sound button only ever shows full sound or the x
const buttonLevel = computed(() => (speakerLevel.value === 0 ? 0 : 2))
// unmuting keeps the level the sound was left at (or the last non-zero one if it was dragged to 0)
function toggleMute() {
  if (muted.value || volume.value === 0) {
    muted.value = false
    if (volume.value === 0) volume.value = lastVolume
  } else muted.value = true
}
// slider: the value comes straight from the pointer's spot on the drawn track,
// so the knob and the number always agree (left end 0, right end 100)
function volumeAt(e: PointerEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const v = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100)
  volume.value = v
  if (muted.value && v > 0) muted.value = false
}
function dragStart(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragging.value = true
  volumeAt(e)
}
function dragMove(e: PointerEvent) {
  if (dragging.value) volumeAt(e)
}
function dragEnd() {
  dragging.value = false
}

// sound button: every press toggles mute straight away, and opens or closes the popover
function onSoundButton() {
  toggleMute()
  volumeOpen.value = !volumeOpen.value
}
const volumeBox = ref<HTMLElement | null>(null)
const soundBtn = ref<HTMLElement | null>(null)
function closeVolumeOnOutside(e: PointerEvent) {
  const t = e.target as Node
  if (volumeOpen.value && !volumeBox.value?.contains(t) && !soundBtn.value?.contains(t))
    volumeOpen.value = false
}
const autoplay = defineModel<boolean>('autoplay', { default: false })
// spin speed: 0 normal, 1 quick, 2 turbo (lights up that many extra marks)
const speed = defineModel<number>('speed', { default: 0 })
const emit = defineEmits<{ spin: []; menu: []; info: []; autoplayMenu: []; betMenu: [] }>()

// -/+ open the bet menu, then step the bet one level while it's open;
// each is disabled at its end of the bet range
const betIndex = computed(() => BET_LEVELS.indexOf(bet.value))
function onBetButton(d: number) {
  if (!props.betMenuOpen) return emit('betMenu')
  const i = Math.min(
    BET_LEVELS.length - 1,
    Math.max(0, (betIndex.value < 0 ? BET_LEVELS.indexOf(5) : betIndex.value) + d),
  )
  bet.value = BET_LEVELS[i]!
}

/* rotating message in the middle of the bar */
// GOOD LUCK! only while a spin runs; afterwards back to the tips: the next one after a
// losing spin, the same one again after a win
const TIPS = ['HOLD SPACE FOR TURBO SPIN', 'SPIN TO WIN!', 'PLACE YOUR BETS!']
let tipIndex = 0
const message = ref(TIPS[0]!)
watch(
  () => props.busy,
  (busy) => {
    if (busy) {
      message.value = 'GOOD LUCK!'
      return
    }
    if (!props.win) tipIndex = (tipIndex + 1) % TIPS.length
    message.value = TIPS[tipIndex]!
  },
)

/* spin button; during autoplay it shows the stop square and pressing it ends autoplay */
const spinning = ref(false)
function spin() {
  if (autoplay.value) {
    autoplay.value = false
    return
  }
  if (spinning.value || props.busy) return
  spinning.value = true
  emit('spin')
  setTimeout(() => (spinning.value = false), 150) // debounce only; the game blocks spins while busy
}

function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space') return
  e.preventDefault()
  spin()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', closeVolumeOnOutside)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', closeVolumeOnOutside)
})
</script>

<template>
  <section class="band" :class="{ 'bet-open': betMenuOpen }" aria-label="Game controls">
    <div class="bar">
      <button type="button" class="round small menu" aria-label="Menu" @click="emit('menu')">
        <i class="pi pi-bars" />
      </button>
      <button
        ref="soundBtn"
        type="button"
        class="round small sound"
        aria-label="Volume"
        :aria-expanded="volumeOpen"
        @click="onSoundButton"
      >
        <svg viewBox="1.1 3.8 20.4 14.8" class="speaker" aria-hidden="true">
          <path class="cone" d="M3.5 8.4h3.6l4.4-3.9v15l-4.4-3.9H3.5z" />
          <path v-if="buttonLevel === 0" d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
          <template v-else>
            <path d="M14.6 9.4a3.6 3.6 0 0 1 0 5.2" />
            <path d="M17 6.8a7.4 7.4 0 0 1 0 10.4" />
          </template>
        </svg>
      </button>

      <!-- volume popover: speaker (mute toggle), slider, value -->
      <div
        v-if="volumeOpen"
        ref="volumeBox"
        class="volume"
        :class="{ muted: speakerLevel === 0, dragging }"
      >
        <button
          type="button"
          class="vol-icon"
          :aria-label="muted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <svg viewBox="1.1 3.8 20.4 14.8" class="speaker" aria-hidden="true">
            <path class="cone" d="M3.5 8.4h3.6l4.4-3.9v15l-4.4-3.9H3.5z" />
            <path v-if="speakerLevel === 0" d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
            <template v-else>
              <path d="M14.6 9.4a3.6 3.6 0 0 1 0 5.2" />
              <path :class="{ dim: speakerLevel === 1 }" d="M17 6.8a7.4 7.4 0 0 1 0 10.4" />
            </template>
          </svg>
        </button>
        <div
          class="vol-slider"
          :style="{ '--t': volume / 100 }"
          @pointerdown="dragStart"
          @pointermove="dragMove"
          @pointerup="dragEnd"
          @pointercancel="dragEnd"
        >
          <div class="vol-track" />
          <div class="vol-fill" />
          <div class="vol-thumb" />
          <input
            v-model.number="volume"
            type="range"
            min="0"
            max="100"
            aria-label="Volume"
            tabindex="0"
            @input="muted && volume > 0 && (muted = false)"
          />
        </div>
        <span class="vol-value">{{ volume }}</span>
      </div>
      <button type="button" class="round info" aria-label="Game info" @click="emit('info')">
        i
      </button>

      <div class="wallet">
        <div>
          <span class="label"
            ><img
              class="credit"
              :src="publicUrl('/ui/label-credit.webp')"
              alt="CREDIT"
              draggable="false"
          /></span>
          <span class="value">{{ peso.format(credit) }}</span>
        </div>
        <div>
          <span class="label"
            ><img class="bet" :src="publicUrl('/ui/label-bet.webp')" alt="BET" draggable="false"
          /></span>
          <span class="value">{{ peso.format(bet) }}</span>
        </div>
      </div>

      <!-- WIN + the spin's tumble total once it pays (until the next spin), otherwise the message -->
      <div class="message">
        <template v-if="win">
          <img
            class="win-label"
            :src="publicUrl('/ui/label-win.webp')"
            alt="WIN"
            draggable="false"
          />
          <span class="win-value">{{ peso.format(win) }}</span>
        </template>
        <template v-else>{{ message }}</template>
      </div>

      <button
        type="button"
        class="round pm minus"
        aria-label="Lower bet"
        :disabled="autoplay || betIndex === 0"
        @click="onBetButton(-1)"
      >
        <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 20h20" /></svg>
      </button>
      <button
        type="button"
        class="round spin"
        :aria-label="autoplay ? 'Stop autoplay' : 'Spin'"
        @click="spin"
      >
        <svg v-if="busy || autoplay" class="stop" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="27" y="27" width="46" height="46" rx="6.5" />
        </svg>
        <svg v-else viewBox="0 0 100 100" aria-hidden="true">
          <!-- two thick clockwise arcs, arrowheads pointing down (right) and up (left) -->
          <path d="M23.8 23.8A37 37 0 0 1 87 48" />
          <path d="M76.2 76.2A37 37 0 0 1 13 52" />
          <polygon points="72,47 102,47 87,74" />
          <polygon points="-2,53 28,53 13,26" />
        </svg>
        <!-- crown on the top-left of the ring (white crown cut from the provider logo) -->
        <img class="crown" :src="publicUrl('/ui/spin-crown.webp')" alt="" draggable="false" />
      </button>
      <button
        type="button"
        class="round pm plus"
        aria-label="Raise bet"
        :disabled="autoplay || betIndex === BET_LEVELS.length - 1"
        @click="onBetButton(1)"
      >
        <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 20h20M20 10v20" /></svg>
      </button>
      <!-- one outline, two buttons: spin speed (left) and autoplay, joined by a chevron -->
      <div class="ap-group">
        <svg class="ap-frame" viewBox="0 0 184 35" preserveAspectRatio="none" aria-hidden="true">
          <!-- one pill; a chevron line splits it into the speed and autoplay buttons -->
          <path
            class="seg"
            d="M17.5 1H166.5A16.5 16.5 0 0 1 166.5 34H17.5A16.5 16.5 0 0 1 17.5 1Z"
          />
          <path class="divider" d="M41 1L50 17.5 41 34" />
        </svg>
        <button
          type="button"
          class="speed"
          :aria-label="['Normal spin', 'Quick spin', 'Turbo spin'][speed]"
          @click="speed = (speed + 1) % 3"
        >
          <!-- same chevrons as the speed toast -->
          <svg viewBox="0 0 76 40" aria-hidden="true">
            <path
              v-for="i in 3"
              :key="i"
              :class="{ lit: i <= speed + 1 }"
              :transform="`translate(${(i - 1) * 23} 0)`"
              d="M12 0H28L30.5 18 17 40H0L14 18Z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="autoplay"
          :class="{ on: autoplay }"
          :aria-pressed="autoplay"
          @click="autoplay ? (autoplay = false) : emit('autoplayMenu')"
        >
          AUTOPLAY
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* full-width section along the bottom, darkened so the controls read on any scenery */
.band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  /* as light as the original's: it reaches up over the board's bottom edge */
  background: linear-gradient(to top, rgb(0 0 0 / 0.33), rgb(0 0 0 / 0.15) 60%, transparent);
  pointer-events: none;
}

/* bet menu open: the bar sits above the menu's backdrop but only -/+ take presses;
   everything else falls through to the backdrop, which closes the menu */
.band.bet-open {
  z-index: 1;
}

.band.bet-open .bar,
.band.bet-open .bar > :not(.pm) {
  pointer-events: none;
}

.band.bet-open .bar > .pm {
  pointer-events: auto;
}

/* 1920x200 design; 1cqw = 19.2 design px */
.bar {
  position: relative;
  width: min(100vw, 100vh * 16 / 9);
  aspect-ratio: 1920 / 200;
  container-type: size;
  font-family: 'Oswald', sans-serif;
  pointer-events: auto;
}

.bar > * {
  position: absolute;
}

/* ---------- round buttons ---------- */
.round {
  display: grid;
  place-items: center;
  padding: 0;
  border: calc(0.16cqw - 0.5px) solid #fff;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.45);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

/* hover: the grey disc stays, only the icon gets a soft light glow */
.round > * {
  transition: filter 0.15s;
}

/* the spin button's crown and busy square stay unlit; only its arrows glow */
.round:hover:not(:disabled) > :not(.crown, .stop) {
  filter: drop-shadow(0 0 0.4cqw rgb(255 255 255 / 0.95));
}

.info {
  transition: text-shadow 0.15s;
}

.info:hover {
  text-shadow: 0 0 0.45cqw rgb(255 255 255 / 0.95);
}

/* original drawing size (62% of a 24-unit box), viewBox cropped so it centres exactly */
.speaker {
  width: 1.011cqw;
  height: 0.734cqw;
  display: block;
  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* the unused outer wave stays visible but grey (volume 1-50) */
.speaker .dim {
  stroke: #7a7a7a;
}

.speaker .cone {
  fill: #fff;
}

.round:disabled {
  opacity: 0.45;
  cursor: default;
}

.small {
  border-width: calc(0.16cqw - 1px);
  width: 1.92cqw;
  height: 1.92cqw;
  font-size: 0.8cqw;
}

/* burger glyph scales with the stage (was a fixed 16px, so it changed with browser zoom);
   56% of the circle, as it looks at 110% zoom */
.menu .pi {
  font-size: 1.075cqw;
}

.menu {
  left: 10.09cqw;
  top: 4.41cqw;
}

.sound {
  left: 10.09cqw;
  top: 7.12cqw;
}

.info {
  left: 12.49cqw;
  top: 4.94cqw;
  width: 3.36cqw;
  height: 3.36cqw;
  border-width: calc(0.18cqw - 1.5px);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2.1cqw;
  font-style: italic;
  font-weight: 700;
}

/* 3.7cqw circle (was 4.06), same centres; same border as the spin button; bigger glyph */
.pm {
  top: 3.15cqw;
  width: 3.7cqw;
  height: 3.7cqw;
  border-width: calc(0.24cqw - 0.5px);
}

.pm svg {
  width: 93.1%;
  stroke: #fff;
  stroke-width: 2.6;
  stroke-linecap: round;
}

.minus {
  left: 67.84cqw;
}

.plus {
  left: 83.15cqw;
}

.spin {
  left: 72.76cqw;
  top: 0.36cqw;
  width: 9.27cqw;
  height: 9.27cqw;
  border-width: calc(0.24cqw - 0.5px);
  background: rgb(0 0 0 / 0.5);
}

.spin svg {
  width: 74%;
  fill: none;
  stroke: #fff;
  stroke-width: 12;
  overflow: visible;
}

/* the big spin button's arrows glow much more softly than the small buttons */
.round.spin:hover:not(:disabled) > svg:not(.stop) {
  filter: drop-shadow(0 0 0.25cqw rgb(255 255 255 / 0.35));
}

/* while busy or autoplaying: pink-red rounded square in the middle of the button */
.spin svg.stop {
  width: 100%;
  stroke: #e04655;
  stroke-width: 2.6;
}

.spin .crown {
  position: absolute;
  left: -9%;
  top: -10%;
  width: 27%;
  pointer-events: none;
  /* leans out from the ring, following the curve at about 10 o'clock */
  rotate: -32deg;
  transform-origin: 70% 95%;
}

.spin polygon {
  fill: #fff;
  stroke: none;
}

/* idle: every 7s the arrows wind up 40deg clockwise, snap back and wobble to rest (0.79s);
   keyframes are the original's measured angle per frame at 48fps */
.spin svg:not(.crown, .stop) {
  animation: idle-turn 7s linear infinite;
}

@keyframes idle-turn {
  0%,
  88.69% {
    rotate: 0deg;
  }
  88.988% {
    rotate: 1deg;
  }
  89.286% {
    rotate: 2deg;
  }
  89.583% {
    rotate: 4deg;
  }
  89.881% {
    rotate: 7deg;
  }
  90.179% {
    rotate: 8deg;
  }
  90.476% {
    rotate: 11deg;
  }
  90.774% {
    rotate: 13deg;
  }
  91.071% {
    rotate: 16deg;
  }
  91.369% {
    rotate: 19deg;
  }
  91.667% {
    rotate: 21deg;
  }
  91.964% {
    rotate: 23deg;
  }
  92.262% {
    rotate: 26deg;
  }
  92.56% {
    rotate: 29deg;
  }
  92.857% {
    rotate: 31deg;
  }
  93.155% {
    rotate: 32deg;
  }
  93.452% {
    rotate: 35deg;
  }
  93.75% {
    rotate: 37deg;
  }
  94.048% {
    rotate: 37deg;
  }
  94.345% {
    rotate: 38deg;
  }
  94.643% {
    rotate: 40deg;
  }
  94.94% {
    rotate: 40deg;
  }
  95.238% {
    rotate: 38deg;
  }
  95.536% {
    rotate: 35deg;
  }
  95.833% {
    rotate: 27deg;
  }
  96.131% {
    rotate: 19deg;
  }
  96.429% {
    rotate: 11deg;
  }
  96.726% {
    rotate: 1deg;
  }
  97.024% {
    rotate: -2deg;
  }
  97.321% {
    rotate: -7deg;
  }
  97.619% {
    rotate: -5deg;
  }
  97.917% {
    rotate: -2deg;
  }
  98.214% {
    rotate: 0deg;
  }
  98.512% {
    rotate: 4deg;
  }
  98.81% {
    rotate: 4deg;
  }
  99.107% {
    rotate: 0deg;
  }
  99.405% {
    rotate: -2deg;
  }
  99.702% {
    rotate: -2deg;
  }
  100% {
    rotate: 0deg;
  }
}

/* autoplay group: outline drawn in SVG (thicker border), buttons laid over each segment */
/* whole bar (184x35 outline: speed | autoplay to a rounded end), centred under the spin button */
.ap-group {
  left: 71.93cqw;
  top: 8.23cqw;
  width: 10.94cqw;
  height: 2.08cqw;
}

.ap-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ap-frame .seg {
  fill: #000;
  stroke: #fff;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-width: 0.19cqw;
  transition: fill 0.15s;
}

.ap-frame .divider {
  fill: none;
  stroke: #fff;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  stroke-width: 0.19cqw;
}

.speed,
.autoplay {
  position: absolute;
  top: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.speed {
  left: 0;
  width: 25%;
}

.speed svg {
  display: block;
  width: 54%;
  margin: 0 auto 0 24%;
  transition: filter 0.15s;
}

.speed path {
  fill: #8a8a8a;
}

.speed path.lit {
  fill: #fff;
}

/* hover: only the lit chevrons glow */
.speed path {
  transition: filter 0.15s;
}

.speed:hover path.lit {
  filter: drop-shadow(0 0 0.3cqw rgb(255 255 255 / 0.9));
}

.autoplay {
  left: 27%;
  right: 6%;
  color: #fff;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.16cqw;
  letter-spacing: 0.02em;
  padding-left: 0.2cqw;
  transition: text-shadow 0.15s;
}

.autoplay:hover {
  text-shadow: 0 0 0.45cqw rgb(255 255 255 / 0.95);
}

/* while autoplay runs the pill stays black and the word turns red, like the stop square */
.autoplay.on {
  color: #e04655;
}

/* hover while running: a faint red glow instead of the white one */
.autoplay.on:hover {
  text-shadow: 0 0 0.45cqw rgb(224 70 85 / 0.45);
}

/* ---------- volume popover (above the menu/sound buttons; 1 original px = 0.064cqw) ---------- */
.volume {
  left: 9.58cqw;
  top: -1.03cqw;
  width: 21.56cqw;
  height: 3.19cqw;
  border-radius: 0.3cqw;
  background: rgb(0 0 0 / 0.9);
  z-index: 2;
}

.vol-icon {
  position: absolute;
  left: 1cqw;
  top: 50%;
  translate: 0 -50%;
  display: grid;
  place-items: center;
  width: 2cqw;
  height: 2cqw;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.vol-icon .speaker {
  width: 1.43cqw;
  height: 1.05cqw;
}

.vol-slider {
  position: absolute;
  left: 4.1cqw;
  top: 0;
  width: 11.7cqw;
  height: 100%;
}

.vol-track,
.vol-fill {
  position: absolute;
  left: 0;
  top: 50%;
  height: 0.29cqw;
  translate: 0 -50%;
}

.vol-track {
  right: 0;
  background: #d4d4d4;
}

.vol-fill {
  width: calc(var(--t) * 100%);
  background: #87e112;
}

.vol-thumb {
  position: absolute;
  left: calc(var(--t) * 100%);
  top: 50%;
  width: 0.68cqw;
  height: 1.6cqw;
  translate: -50% -50%;
  border-radius: 0.34cqw;
  background: #fff;
  pointer-events: none;
}

/* while dragging the thumb turns green; muted (or 0) shows red */
.volume.dragging .vol-thumb {
  background: #87e112;
}

.volume.muted .vol-fill,
.volume.muted .vol-thumb {
  background: #c30a0a;
}

.vol-slider {
  cursor: pointer;
  touch-action: none;
}

/* kept for keyboard (arrow keys); the pointer is handled on the drawn track */
.vol-slider input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.vol-value {
  position: absolute;
  left: 16.7cqw;
  width: 3.96cqw;
  top: 50%;
  translate: 0 -50%;
  text-align: center;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.6cqw;
  line-height: 1;
  color: #fff;
}

/* ---------- text ---------- */
/* laid out like the original (1 screenshot px = 0.065cqw): labels and amounts both 19px tall,
   14px apart, rows 28px apart; the two rows centred between the menu and sound buttons */
.wallet {
  left: 17.35cqw;
  top: 4.905cqw;
  font-family: 'Roboto', sans-serif;
  font-weight: 900;
  font-size: calc(19 * 0.065cqw / 0.711); /* Roboto's capitals are 0.711em tall */
  line-height: calc(28 * 0.065cqw);
  white-space: nowrap;
}

/* labels are images cut from the original, right-aligned, sitting on the amounts' baseline */
.wallet .label {
  display: inline-block;
  width: 5.7cqw;
  margin-right: calc(14 * 0.065cqw);
  text-align: right;
}

.wallet .label img {
  vertical-align: baseline;
  /* shadow, like the amounts' */
  filter: drop-shadow(0 0.12cqw 0.22cqw rgb(0 0 0 / 0.75));
}

/* its image has one more transparent column on the right than BET's: pull it over so the
   two right edges line up */
.wallet .label .credit {
  height: calc(22 * 19 / 21 * 0.065cqw);
  margin-right: calc(-1 * 19 / 21 * 0.065cqw);
}

.wallet .label .bet {
  height: calc(19 * 0.065cqw);
}

.wallet .value {
  color: #fff;
  text-shadow: 0 0.12cqw 0.22cqw rgb(0 0 0 / 0.85);
}

/* WIN label cut from the original (1 screenshot px = 0.055cqw, same as CREDIT/BET) */
.win-label {
  height: calc(49 * 0.055cqw);
  margin-right: calc(15 * 0.055cqw);
}

.win-value {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 3.45cqw;
  color: #fff;
  text-shadow: 0 0.1cqw 0.15cqw rgb(0 0 0 / 0.6);
}

.message {
  left: 34.5cqw;
  top: 3.26cqw;
  width: 31.25cqw;
  height: 3.44cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.55cqw; /* same capital height as the old Oswald 2.2cqw */
  letter-spacing: 0.03em;
  white-space: nowrap;
  color: #fff;
  text-shadow:
    0 0.1cqw 0 rgb(0 0 0 / 0.55),
    0 0 0.4cqw rgb(0 0 0 / 0.45);
}
</style>
