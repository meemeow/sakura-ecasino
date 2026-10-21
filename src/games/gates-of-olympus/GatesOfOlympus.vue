<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import GameControls from '@/games/GameControls.vue'
import GameLoader from '@/games/GameLoader.vue'
import BetMenu from '@/games/BetMenu.vue'
import GameRules from '@/games/gates-of-olympus/GameRules.vue'
import AutoplaySettings from '@/games/gates-of-olympus/AutoplaySettings.vue'
import { useLoopingMusic } from '@/composables/useLoopingMusic'
import { publicUrl } from '@/utils/publicUrl'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/roboto/900.css'
import { formatPeso } from '@/utils/format'

const ASSET = publicUrl('/slots/gates-of-olympus-1000')
const UI = ['board', 'logo', 'buy-free-spins', 'ante-bet', 'info-box']
type Sym = { id: string; mult?: number; key: number; win?: boolean; fall?: number }
let nextKey = 0
const PAY_SYMBOLS: [id: string, weight: number][] = [
  ['crown', 4],
  ['hourglass', 5],
  ['ring', 6],
  ['chalice', 7],
  ['red', 9],
  ['purple', 10],
  ['yellow', 11],
  ['green', 12],
  ['blue', 13],
]
const MULT_ORBS = ['mgreen', 'mblue', 'mpurple', 'mred']
const MULT_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000]
const COLS = 6
const ROWS = 5
const PAY_TOTAL = PAY_SYMBOLS.reduce((t, [, w]) => t + w, 0)

function pickSymbol(): Omit<Sym, 'key'> {
  const r = Math.random()
  if (r < 0.012) return { id: 'scatter' }
  if (r < 0.022) {
    const mult =
      MULT_VALUES[
        Math.min(MULT_VALUES.length - 1, Math.floor(Math.random() ** 2.5 * MULT_VALUES.length))
      ]!
    const id = mult >= 100 ? 'mdiamond' : MULT_ORBS[Math.floor(Math.random() * MULT_ORBS.length)]!
    return { id, mult }
  }
  let w = Math.random() * PAY_TOTAL
  for (const [id, weight] of PAY_SYMBOLS) if ((w -= weight) < 0) return { id }
  return { id: 'blue' }
}
const randomSymbol = (): Sym => ({ ...pickSymbol(), key: nextKey++ })
const randomGrid = () =>
  Array.from({ length: COLS }, () => Array.from({ length: ROWS }, randomSymbol))

const grid = ref<Sym[][]>(randomGrid())
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const reelState = ref<'idle' | 'out' | 'in' | 'highlight' | 'explode' | 'tumble'>('in')
let reelsBusy = false

type Speed = {
  outMs: number
  outCol: number
  inMs: number
  inCol: number
  inRow: number
  highlight: number
  explode: number
  fall: number
}
const SPEEDS: Speed[] = [
  {
    outMs: 330,
    outCol: 95,
    inMs: 260,
    inCol: 145,
    inRow: 65,
    highlight: 1500,
    explode: 420,
    fall: 420,
  },
  { outMs: 170, outCol: 0, inMs: 270, inCol: 0, inRow: 0, highlight: 700, explode: 350, fall: 300 },
  { outMs: 150, outCol: 0, inMs: 190, inCol: 0, inRow: 0, highlight: 0, explode: 0, fall: 200 },
]
const sp = computed(() => SPEEDS[speed.value]!)
const reelVars = computed(() => ({
  '--out-ms': `${sp.value.outMs}ms`,
  '--in-ms': `${sp.value.inMs}ms`,
  '--explode-ms': `${sp.value.explode}ms`,
  '--fall-ms': `${sp.value.fall}ms`,
}))
const cellVars = (c: number, r: number, sym: Sym) => ({
  '--odelay': `${c * sp.value.outCol}ms`,
  '--delay': `${c * sp.value.inCol + (ROWS - 1 - r) * sp.value.inRow}ms`,
  '--fall': sym.fall ?? 0,
})

async function spinReels() {
  if (reelsBusy) return false
  reelsBusy = true
  const t = sp.value
  reelState.value = 'out'
  await sleep((COLS - 1) * t.outCol + t.outMs)
  grid.value = randomGrid()
  reelState.value = 'in'
  await sleep((COLS - 1) * t.inCol + (ROWS - 1) * t.inRow + t.inMs + 40)
  reelState.value = 'idle'
  reelsBusy = false
  return true
}

const PAYS: Record<string, [number, number, number]> = {
  crown: [50, 25, 10],
  hourglass: [25, 10, 2.5],
  ring: [15, 5, 2],
  chalice: [12, 2, 1.5],
  red: [10, 1.5, 1],
  purple: [8, 1.2, 0.8],
  yellow: [5, 1, 0.5],
  green: [4, 0.9, 0.4],
  blue: [2, 0.75, 0.25],
}
type Win = { id: string; count: number; amount: number }
function findWins(g: Sym[][]): Win[] {
  const counts = new Map<string, number>()
  for (const col of g)
    for (const sym of col) if (PAYS[sym.id]) counts.set(sym.id, (counts.get(sym.id) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n >= 8)
    .map(([id, n]) => ({
      id,
      count: n,
      amount: bet.value * PAYS[id]![n >= 12 ? 0 : n >= 10 ? 1 : 2],
    }))
}

const tumbleWin = ref(0)

const TOP_MESSAGES: [file: string, width: number][] = [
  ['info-1', 518],
  ['info-2', 920],
  ['info-3', 559],
  ['info-4', 798],
]
const topMessage = ref(0)
const topTimer = setInterval(() => {
  if (tumbleWin.value === 0) topMessage.value = (topMessage.value + 1) % TOP_MESSAGES.length
}, 15000)
onBeforeUnmount(() => clearInterval(topTimer))
const WIN_ROWS_SHOWN = 5
const winRows = ref<(Win & { key: number; order: number })[]>([])
const shownWinRows = computed(() => winRows.value.slice(0, WIN_ROWS_SHOWN))

async function tumble() {
  let total = 0
  for (;;) {
    const wins = findWins(grid.value)
    if (!wins.length) break
    const t = sp.value
    const ids = new Set(wins.map((w) => w.id))
    grid.value = grid.value.map((col) =>
      col.map((sym) => (ids.has(sym.id) ? { ...sym, win: true } : sym)),
    )
    if (t.highlight) {
      reelState.value = 'highlight'
      await sleep(t.highlight)
      void zeusStrike()
      reelState.value = 'explode'
      await sleep(t.explode)
    }
    total += wins.reduce((t, w) => t + w.amount, 0)
    tumbleWin.value = total
    winRows.value = [
      ...wins.map((w, i) => ({ ...w, key: nextKey++, order: wins.length - 1 - i })),
      ...winRows.value,
    ]
    grid.value = grid.value.map((col) => {
      const kept = col.filter((sym) => !sym.win)
      const n = ROWS - kept.length
      const fresh = Array.from({ length: n }, () => ({ ...randomSymbol(), fall: n }))
      return [...fresh, ...kept.map((sym, i) => ({ ...sym, fall: n + i - col.indexOf(sym) }))]
    })
    reelState.value = 'tumble'
    await sleep(t.fall + 40)
    reelState.value = 'idle'
  }
  return total
}

const playing = ref(false)

async function onSpin() {
  if (rulesOpen.value || autoplayMenu.value || playing.value) return
  playing.value = true
  tumbleWin.value = 0
  winRows.value = []
  try {
    if (!(await spinReels())) return
    const total = await tumble()
    const mult = grid.value.flat().reduce((t, sym) => t + (sym.mult ?? 0), 0)
    if (mult) {
      await sleep(300)
      await zeusStrike()
      if (total) tumbleWin.value = total * mult
    }
  } finally {
    playing.value = false
  }
}

const REEL_ART: Record<string, [number, number, number, number]> = {
  yellow: [21.67, 15.8, 60.05, 70.05],
  green: [23.24, 10.16, 55.87, 78.3],
  red: [21.15, 11.68, 59.53, 80.36],
  blue: [22.45, 12.36, 55.35, 77.61],
  crown: [8.62, 0.69, 83.03, 100.96],
  hourglass: [12.01, -3.16, 75.72, 103.02],
  ring: [13.32, -3.71, 74.67, 99.59],
  chalice: [13.05, -2.88, 74.15, 100.27],
  purple: [23.76, 10.58, 53.79, 81.73],
  scatter: [1.31, -4.67, 99.74, 102.34],
}
const artBox = ([l, t, w, h]: [number, number, number, number]) => ({
  left: `${l}%`,
  top: `${t}%`,
  width: `${w}%`,
  height: `${h}%`,
})

const PRELOAD = [
  'background.webp',
  'ui/tumble-win.webp',
  ...UI.map((n) => `ui/${n}.webp`),
  ...Object.keys(REEL_ART).map((n) => `reel/${n}.webp`),
  ...[...MULT_ORBS, 'mdiamond'].map((n) => `info/${n}.webp`),
  ...TOP_MESSAGES.map(([file]) => `ui/${file}.webp`),
]

const music = useLoopingMusic(`${ASSET}/gates-of-olympus-1000-bgm.m4a`, 0.5)

const credit = ref(100000)
const bet = ref(5)
const muted = ref(false)
const autoplay = ref(false)

const autoplayMenu = ref(false)
const autoLeft = ref(0)
const skipScreens = ref(true)

function startAutoplay(settings: { count: number; speed: number; skipScreens: boolean }) {
  autoplayMenu.value = false
  speed.value = settings.speed
  skipScreens.value = settings.skipScreens
  autoLeft.value = settings.count
  autoplay.value = true
}

watch(autoplay, async (on) => {
  if (!on) return
  while (autoplay.value && autoLeft.value > 0) {
    if (rulesOpen.value || autoplayMenu.value) {
      await new Promise((r) => setTimeout(r, 300))
      continue
    }
    autoLeft.value--
    await onSpin()
    await new Promise((r) => setTimeout(r, 250))
  }
  autoplay.value = false
})

const speed = ref(0)
const SPEED_NAMES = ['NORMAL', 'QUICK', 'TURBO']
const speedToast = ref(false)
let speedToastTimer: ReturnType<typeof setTimeout> | undefined
watch(speed, () => {
  if (autoplayMenu.value) return
  speedToast.value = true
  clearTimeout(speedToastTimer)
  speedToastTimer = setTimeout(() => (speedToast.value = false), 1000)
})
const rulesOpen = ref(false)
const betMenu = ref(false)
const volume = ref(50)
watch(muted, (m) => music.setMuted(m))
const shownMuted = computed({
  get: () => muted.value || music.blocked.value,
  set: (m) => (muted.value = m),
})
watch(volume, (v) => music.setVolume(v / 100))

const ante = ref(false)
const buyPrice = computed(() => formatPeso(bet.value * 100))
const antePrice = computed(() => formatPeso(bet.value * 1.25))

const ZEUS_FPS = 47.97
const STRIKE_FRAMES = 80
const STRIKE_TAKEOVER = 18
const zeusBlobs: Record<'idle' | 'strike' | 'light', Blob | null> = {
  idle: null,
  strike: null,
  light: null,
}
const zeusIdleSrc = ref('')
const zeusStrikeSrc = ref('')
const zeusLightSrc = ref('')
const zeusIdleVisible = ref(true)
let striking = false

async function loadZeus() {
  const files = { idle: 'zeus-idle', strike: 'zeus-strike', light: 'zeus-strike-light' } as const
  try {
    await Promise.all(
      (Object.keys(files) as (keyof typeof files)[]).map(async (key) => {
        const res = await fetch(`${ASSET}/ui/${files[key]}.webp`)
        if (!res.ok) throw new Error(`${files[key]}: HTTP ${res.status}`)
        zeusBlobs[key] = await res.blob()
      }),
    )
    zeusIdleSrc.value = URL.createObjectURL(zeusBlobs.idle!)
  } catch (e) {
    console.warn("Couldn't load Zeus animations", e)
    zeusBlobs.idle = zeusBlobs.strike = zeusBlobs.light = null
  }
}

async function freshSrc(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.src = url
  await img.decode().catch(() => {})
  return url
}

const wait = (frames: number) => new Promise((r) => setTimeout(r, (frames / ZEUS_FPS) * 1000))

async function zeusStrike() {
  while (striking) await new Promise((r) => setTimeout(r, 50))
  if (striking || !zeusBlobs.strike || !zeusBlobs.light || !zeusBlobs.idle) return
  striking = true
  const [body, light, idle] = await Promise.all([
    freshSrc(zeusBlobs.strike),
    freshSrc(zeusBlobs.light),
    freshSrc(zeusBlobs.idle),
  ])
  zeusStrikeSrc.value = body
  zeusLightSrc.value = light
  await wait(STRIKE_TAKEOVER)
  zeusIdleVisible.value = false
  await wait(STRIKE_FRAMES - STRIKE_TAKEOVER)
  const oldIdle = zeusIdleSrc.value
  zeusIdleSrc.value = idle
  zeusIdleVisible.value = true
  zeusStrikeSrc.value = ''
  zeusLightSrc.value = ''
  for (const url of [oldIdle, body, light]) URL.revokeObjectURL(url)
  striking = false
}

const loading = ref(true)
const loadProgress = ref(0)

const LOAD_MS = 2500
function loadStages(): [ms: number, progress: number][] {
  const stages: [number, number][] = []
  let t = 120 + Math.random() * 200
  let p = 0
  while (p < 0.93) {
    const r = Math.random()
    if (r < 0.15) t += 350 + Math.random() * 350
    else if (r < 0.5) t += 30 + Math.random() * 60
    else t += 110 + Math.random() * 180
    p += r > 0.85 ? 0.12 + Math.random() * 0.14 : 0.015 + Math.random() * 0.07
    stages.push([t, Math.min(p, 0.97)])
  }
  const last = stages[stages.length - 1]![0]
  const fit = (LOAD_MS - 260) / last
  return [...stages.map(([ms, v]): [number, number] => [ms * fit, v]), [LOAD_MS, 1]]
}

async function preload() {
  const assets = Promise.all([
    music.ready,
    loadZeus(),
    ...PRELOAD.map(
      (file) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = img.onerror = () => resolve()
          img.src = `${ASSET}/${file}`
        }),
    ),
  ])
  const started = Date.now()
  const until = (ms: number) =>
    new Promise((r) => setTimeout(r, Math.max(0, ms - (Date.now() - started))))
  for (const [ms, progress] of loadStages()) {
    await until(ms)
    if (progress === 1) await assets
    loadProgress.value = progress
  }
  await new Promise((r) => setTimeout(r, 250))
  loading.value = false
  music.play()
}

onMounted(preload)
onBeforeUnmount(() => {
  autoplay.value = false
  clearTimeout(speedToastTimer)
  for (const url of [zeusIdleSrc.value, zeusStrikeSrc.value, zeusLightSrc.value])
    if (url) URL.revokeObjectURL(url)
})

const router = useRouter()

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}
</script>

<template>
  <GameLoader
    v-if="loading"
    :progress="loadProgress"
    :logo="publicUrl('/providers/pragmatic-play.svg')"
    logo-alt="Pragmatic Play"
  />
  <div v-else class="game">
    <img class="background" :src="`${ASSET}/background.webp`" alt="" draggable="false" />

    <div class="stage">
      <img class="ui board" :src="`${ASSET}/ui/board.webp`" alt="" draggable="false" />

      <div class="reels" :class="reelState" :style="reelVars">
        <div v-for="(col, c) in grid" :key="c" class="reel">
          <div
            v-for="(sym, r) in col"
            :key="sym.key"
            class="cell"
            :class="{ win: sym.win }"
            :style="cellVars(c, r, sym)"
          >
            <img
              v-if="REEL_ART[sym.id]"
              class="sym"
              :src="`${ASSET}/reel/${sym.id}.webp`"
              :style="artBox(REEL_ART[sym.id]!)"
              alt=""
              draggable="false"
            />
            <img
              v-else
              class="sym orb"
              :src="`${ASSET}/info/${sym.id}.webp`"
              alt=""
              draggable="false"
            />
            <span v-if="sym.mult" class="mult">{{ sym.mult }}x</span>
          </div>
        </div>
      </div>
      <img v-show="zeusIdleVisible" class="ui zeus" :src="zeusIdleSrc" alt="" draggable="false" />
      <img
        class="ui logo"
        :src="`${ASSET}/ui/logo.webp`"
        alt="Gates of Olympus 1000"
        draggable="false"
      />
      <img
        v-if="zeusStrikeSrc"
        class="ui zeus-strike"
        :src="zeusStrikeSrc"
        alt=""
        draggable="false"
      />

      <button type="button" class="ui buy" :disabled="ante" aria-label="Buy free spins">
        <img :src="`${ASSET}/ui/buy-free-spins.webp`" alt="" draggable="false" />
        <span class="buy-text">
          <span class="buy-title">BUY<br />FREE SPINS</span>
          <span class="buy-price">{{ buyPrice }}</span>
        </span>
      </button>

      <div class="ui ante">
        <img :src="`${ASSET}/ui/ante-bet.webp`" alt="" draggable="false" />
        <div class="ante-text">
          <span class="ante-bet">BET</span>
          <span class="ante-price">{{ antePrice }}</span>
          <span class="ante-double">DOUBLE</span>
          <span class="ante-small">CHANCE TO<br />WIN FEATURE</span>
          <button
            type="button"
            class="toggle"
            :class="{ on: ante }"
            :aria-pressed="ante"
            aria-label="Double chance to win feature"
            @click="ante = !ante"
          >
            <template v-if="ante"
              ><span class="state">ON</span><span class="mark">✓</span></template
            >
            <template v-else><span class="mark">➜</span><span class="state">OFF</span></template>
          </button>
        </div>
      </div>

      <img class="ui info-box" :src="`${ASSET}/ui/info-box.webp`" alt="" draggable="false" />

      <TransitionGroup tag="div" name="win-row" class="win-list">
        <div
          v-for="(row, i) in shownWinRows"
          :key="row.key"
          class="win-row"
          :style="{ '--slot': shownWinRows.length - 1 - i, '--delay': `${row.order * 120}ms` }"
        >
          <span class="win-count">{{ row.count }}</span>
          <img class="win-icon" :src="`${ASSET}/reel/${row.id}.webp`" alt="" draggable="false" />
          <span class="win-amount">{{ formatPeso(row.amount) }}</span>
        </div>
      </TransitionGroup>

      <Transition name="top-win">
        <div v-if="tumbleWin > 0" key="win" class="ui tumble-win">
          <img :src="`${ASSET}/ui/tumble-win.webp`" alt="" draggable="false" />
          <span class="tumble-amount">{{ formatPeso(tumbleWin) }}</span>
        </div>
        <div v-else key="info" class="top-info">
          <Transition name="top-swap">
            <img
              :key="topMessage"
              class="top-msg"
              :src="`${ASSET}/ui/${TOP_MESSAGES[topMessage]![0]}.webp`"
              :style="{ width: `calc(${TOP_MESSAGES[topMessage]![1]} * var(--p))` }"
              alt=""
              draggable="false"
            />
          </Transition>
        </div>
      </Transition>

      <Transition name="toast">
        <div v-if="speedToast" class="speed-toast" role="status">
          <svg viewBox="0 0 76 40" aria-hidden="true">
            <path
              v-for="i in 3"
              :key="i"
              :class="{ lit: i <= speed + 1 }"
              :transform="`translate(${(i - 1) * 23} 0)`"
              d="M12 0H28L30.5 18 17 40H0L14 18Z"
            />
          </svg>
          <p>
            <span>{{ SPEED_NAMES[speed] }}</span> SPINS ENABLED
          </p>
        </div>
      </Transition>
    </div>

    <div class="stage-fx">
      <img v-if="zeusLightSrc" class="ui zeus-light" :src="zeusLightSrc" alt="" draggable="false" />
    </div>

    <div v-if="autoplayMenu" class="stage">
      <AutoplaySettings
        v-model:speed="speed"
        @close="autoplayMenu = false"
        @start="startAutoplay"
      />
    </div>

    <div v-if="rulesOpen" class="stage">
      <GameRules :bet="bet" @close="rulesOpen = false" />
    </div>

    <GameControls
      v-model:bet="bet"
      v-model:muted="shownMuted"
      v-model:volume="volume"
      v-model:autoplay="autoplay"
      v-model:speed="speed"
      @autoplay-menu="autoplayMenu = true"
      @bet-menu="betMenu = true"
      :credit="credit"
      :busy="playing"
      :bet-menu-open="betMenu"
      :win="tumbleWin"
      @spin="onSpin"
      @info="rulesOpen = !rulesOpen"
    />
    <button type="button" class="back-btn" aria-label="Back to lobby" @click="goBack">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" />
        <path d="M15.5 11H6.5M10.5 7 6.5 11l4 4" />
      </svg>
    </button>
    <template v-if="betMenu">
      <div class="backdrop" @click="betMenu = false" />
      <div class="stage">
        <BetMenu v-model:bet="bet" :multiplier="ante ? 25 : 20" @close="betMenu = false" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
  user-select: none;
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.backdrop {
  position: absolute;
  inset: 0;
}

.background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stage {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(100vw, 100vh * 16 / 9);
  height: min(100vh, 100vw * 9 / 16);
  container-type: size;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  pointer-events: none;
}

.stage-fx {
  --w: min(100vw, 100vh * 16 / 9);
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--w);
  aspect-ratio: 16 / 9;
  margin: calc(var(--w) * -9 / 32) 0 0 calc(var(--w) / -2);
  pointer-events: none;
}

.ui {
  position: absolute;
  display: block;
}

.ui > img {
  display: block;
  width: 100%;
}

img.ui {
  height: auto;
}

.board {
  left: 12.5%;
  top: 3.704%;
  width: 75%;
}

.tumble-win {
  left: 35.53%;
  top: 2.2%;
  width: 28.95%;
  z-index: 4;
}

.top-info {
  --p: calc(1cqw / 19);
  position: absolute;
  left: 0;
  right: 0;
  top: 2.5cqw;
  translate: 0 -50%;
  display: grid;
  place-items: center;
  z-index: 4;
}

.top-msg {
  grid-area: 1 / 1;
  display: block;
  height: auto;
}

.top-swap-enter-active,
.top-swap-leave-active {
  transition: opacity 1s linear;
}

.top-win-enter-active,
.top-win-leave-active {
  transition: opacity 0.5s linear;
}

.top-swap-enter-from,
.top-swap-leave-to,
.top-win-enter-from,
.top-win-leave-to {
  opacity: 0;
}

.tumble-amount {
  position: absolute;
  left: 0;
  right: 0;
  top: 55%;
  translate: 0 -50%;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 2.15cqw;
  line-height: 1;
  background: linear-gradient(#fdffb0, #e9fb3b 55%, #cde41c);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0.14cqw 0 #b9255e) drop-shadow(0 0 0.12cqw rgb(0 0 0 / 0.8));
}

.win-list {
  position: absolute;
  left: 1.25%;
  top: 59.54%;
  width: 12.5%;
  height: 23.15%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
}

.win-row {
  flex: none;
  display: flex;
  align-items: center;
  height: 2.5cqw;
  padding: 0 0.57cqw 0 0;
  box-sizing: border-box;
  border: 0.07cqw solid #b4884e;
  border-radius: 0.2cqw;
  box-shadow: inset 0 0 0 0.06cqw #3a1400;
  background: linear-gradient(#594b50, #4e3438 18%, #401c24 45%, #552b32 92%, #471c26);
  font-family: 'Roboto', sans-serif;
  font-weight: 900;
  font-size: 1.45cqw;
  line-height: 1;
}

.win-count {
  width: 2.27cqw;
  text-align: right;
}

.win-icon {
  width: 1.49cqw;
  height: 1.49cqw;
  margin-left: 0.24cqw;
  object-fit: contain;
}

.win-amount {
  margin-left: auto;
}

.win-count,
.win-amount {
  background: linear-gradient(#f3dfad, #e9cf96 50%, #a07c45);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0.06cqw 0.06cqw rgb(0 0 0 / 0.75));
}

.win-row-enter-active {
  animation: win-row-drop 0.27s linear var(--delay, 0s) backwards;
}

@keyframes win-row-drop {
  0% {
    translate: 0 calc((13.02cqw - 2.5cqw - var(--slot) * 2.5cqw) * -1);
    animation-timing-function: cubic-bezier(0.4, 0, 0.9, 0.6);
  }
  38% {
    translate: 0 0;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
  }
  54% {
    translate: 0 -0.75cqw;
  }
  62% {
    translate: 0 -0.75cqw;
    animation-timing-function: ease-in-out;
  }
  100% {
    translate: 0 0;
  }
}

.win-row-move {
  transition: transform 0.2s ease-out;
}

.win-row-leave-active {
  animation: win-row-fall 0.32s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes win-row-fall {
  to {
    translate: 0 13.5cqw;
  }
}

.speed-toast {
  position: absolute;
  left: 36.5%;
  top: 37.5%;
  width: 27%;
  height: 21%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.3cqw;
  border-radius: 0.75cqw;
  background: rgb(18 6 16 / 0.82);
  z-index: 5;
}

.speed-toast svg {
  width: 4.3cqw;
}

.speed-toast path {
  fill: #9b999b;
}

.speed-toast path.lit {
  fill: #fff;
}

.speed-toast p {
  margin: 0;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 1.62cqw;
  color: #fff;
  letter-spacing: 0.01em;
}

.speed-toast p span {
  color: #f5ae31;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

.reels {
  position: absolute;
  left: 15.9375%;
  top: 9.63%;
  width: 68.07%;
  height: 77.04%;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  overflow: hidden;
}

.reel {
  display: grid;
  grid-template-rows: repeat(5, minmax(0, 1fr));
  min-height: 0;
}

.cell {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: visible;
}

.cell > .sym {
  position: absolute;
  max-width: none;
}

.cell > .sym.orb {
  inset: 0;
  margin: auto;
  width: 92%;
  height: 88%;
  object-fit: contain;
}

.mult {
  position: absolute;
  font-size: 2.5cqw;
  color: #fff6c0;
  -webkit-text-stroke: 0.18cqw #4a2300;
  paint-order: stroke fill;
  text-shadow: 0 0 0.6cqw rgb(255 220 120 / 0.8);
}

.cell.win::before {
  content: '';
  position: absolute;
  inset: 3%;
  border: 0.2cqw solid #4ff3ff;
  border-radius: 0.5cqw;
  box-shadow:
    0 0 0.6cqw #3ae8ff,
    inset 0 0 0.6cqw rgb(58 232 255 / 0.6);
  opacity: 0;
  pointer-events: none;
  z-index: 1;
}

.reels.highlight .cell.win::before {
  animation: win-outline 0.5s ease-in-out infinite alternate;
}

@keyframes win-outline {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

.reels.explode .cell.win {
  animation: win-explode var(--explode-ms) ease-out forwards;
}

.reels.explode .cell.win::after {
  content: '';
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #fffbe0 0%,
    #ffd86a 35%,
    rgb(255 170 40 / 0.6) 55%,
    transparent 70%
  );
  animation: win-burst var(--explode-ms) ease-out forwards;
  pointer-events: none;
}

@keyframes win-explode {
  30% {
    scale: 1.12;
    filter: brightness(2);
  }
  100% {
    scale: 0.4;
    opacity: 0;
  }
}

@keyframes win-burst {
  from {
    scale: 0.3;
    opacity: 1;
  }
  to {
    scale: 1.3;
    opacity: 0;
  }
}

.reels.tumble .cell {
  animation: fall var(--fall-ms) cubic-bezier(0.5, 0, 0.75, 0.6) backwards;
}

@keyframes fall {
  from {
    translate: 0 calc(var(--fall) * -100%);
  }
}

.reels.out .cell {
  animation: drop-out var(--out-ms) cubic-bezier(0.55, 0, 1, 0.45) var(--odelay) forwards;
}

.reels.in .cell {
  animation: drop-in var(--in-ms) linear var(--delay) backwards;
}

@keyframes drop-out {
  to {
    translate: 0 550%;
  }
}

@keyframes drop-in {
  0% {
    translate: 0 -550%;
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
  }
  82% {
    translate: 0 0;
    animation-timing-function: ease-out;
  }
  91% {
    translate: 0 -4%;
    animation-timing-function: ease-in;
  }
  100% {
    translate: 0 0;
  }
}

.logo {
  left: 85.208%;
  top: 7.037%;
  width: 14.792%;
}

.zeus {
  left: 83.83%;
  top: 28.75%;
  width: 19.8%;
}

.zeus-strike {
  left: 83.95%;
  top: 1.903%;
  width: 22.95%;
}

.zeus-light {
  left: 82.17%;
  top: 1.691%;
  width: 24.73%;
  mix-blend-mode: screen;
}

.buy,
.ante,
.info-box {
  left: 0;
  width: 15.208%;
}

.buy {
  top: 12.222%;
  font: inherit;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  pointer-events: auto;
}

.buy:disabled {
  cursor: default;
  filter: grayscale(0.85) brightness(0.65);
}

.ante {
  top: 27.963%;
}

.info-box {
  top: 57.407%;
}

.buy-text,
.ante-text {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.buy-text {
  left: 1.56cqw;
  top: 1.35cqw;
  width: 11.88cqw;
  height: 6.77cqw;
  gap: 0.2cqw;
}

.buy-title {
  font-size: 1.6cqw;
  line-height: 0.95;
  color: #5fd8ff;
  -webkit-text-stroke: 0.16cqw #0b1a4a;
  paint-order: stroke fill;
}

.buy-price {
  font-size: 2.6cqw;
  color: #ffd84a;
  -webkit-text-stroke: 0.2cqw #3a1d00;
  paint-order: stroke fill;
}

.ante-text {
  left: 1.88cqw;
  top: 2.6cqw;
  width: 11.46cqw;
  height: 11.46cqw;
  gap: 0.15cqw;
}

.ante-bet,
.ante-double {
  font-size: 2.1cqw;
  color: #fff;
  -webkit-text-stroke: 0.2cqw #1f154d;
  paint-order: stroke fill;
}

.ante-price {
  font-size: 2.3cqw;
  color: #f2df4a;
  -webkit-text-stroke: 0.2cqw #3a2400;
  paint-order: stroke fill;
}

.ante-small {
  font-size: 1.2cqw;
  line-height: 1.05;
  color: #fff;
  -webkit-text-stroke: 0.16cqw #1f154d;
  paint-order: stroke fill;
}

.toggle {
  display: flex;
  margin-top: 0.4cqw;
  padding: 0;
  border: 0.1cqw solid #4a2a00;
  border-radius: 0.25cqw;
  overflow: hidden;
  font-family: 'Oswald', sans-serif;
  font-weight: 700;
  font-size: 1.05cqw;
  line-height: 1.45cqw;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
}

.toggle span {
  padding: 0 0.55cqw;
}

.toggle .mark {
  background: #1fbf3a;
}

.toggle .state {
  background: #a30f1c;
}

.toggle.on .state,
.toggle.on .mark {
  background: #1fbf3a;
}

.back-btn {
  position: absolute;
  top: 24px;
  left: 22px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.62);
  cursor: pointer;
}

.back-btn:hover {
  background: rgb(0 0 0 / 0.75);
}

.back-btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
