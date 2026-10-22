<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import GameControls from '@/games/GameControls.vue'
import GameLoader from '@/games/GameLoader.vue'
import BetMenu from '@/games/BetMenu.vue'
import GameRules from '@/games/gates-of-olympus/GameRules.vue'
import AutoplaySettings from '@/games/gates-of-olympus/AutoplaySettings.vue'
import WinEffects from '@/games/gates-of-olympus/WinEffects.vue'
import StrikeEffects from '@/games/gates-of-olympus/StrikeEffects.vue'
import MultiplierLabel from '@/games/gates-of-olympus/MultiplierLabel.vue'
import OrbWinEffects from '@/games/gates-of-olympus/OrbWinEffects.vue'
import ZeusSpine from '@/games/gates-of-olympus/ZeusSpine.vue'
import TumbleNumber from '@/games/gates-of-olympus/TumbleNumber.vue'
import {
  COLS,
  ROWS,
  FX_FRAME_MS,
  FX_SHEETS,
  ORB_RIGS,
  STRIKE_FX,
  WIN_FX,
  type BoltGlow,
  type OrbRig,
  type OrbWin,
  type Strike,
  type WinFx,
} from '@/games/gates-of-olympus/winFx'
import { boneOffset } from '@/games/gates-of-olympus/spineLite'
import { loadRig } from '@/games/gates-of-olympus/orbRigs'
import { loadZeus } from '@/games/gates-of-olympus/zeusRig'
import { useLoopingMusic } from '@/composables/useLoopingMusic'
import { publicUrl } from '@/utils/publicUrl'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/roboto/900.css'
import { formatMoney, formatPeso } from '@/utils/format'

const ASSET = publicUrl('/slots/gates-of-olympus-1000')
const UI = ['board', 'logo', 'buy-free-spins', 'ante-bet', 'info-box']
type Sym = {
  id: string
  mult?: number
  key: number
  win?: boolean
  fall?: number
  fallDelay?: number
  strike?: boolean
  collected?: boolean
}
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
type Box = [left: number, top: number, width: number, height: number]
type LabelAnchor = [x: number, y: number, em: number]
type MultTier = {
  max: number
  id: string
  art: Box
  label: LabelAnchor
  labelShadow?: number
  win: { rig: OrbRig; anim: string }
  boltGlow: BoltGlow
  flashColor: string
}
const WINGED_LABEL: LabelAnchor = [0.5374, 0.5045, 0.2494]
const wingsWin = (tier: string) => ({
  rig: 'wings' as const,
  anim: `gool_wild_multiplier_win_${tier}`,
})
const MULT_TIERS: MultTier[] = [
  {
    max: 8,
    id: 'mgreen',
    art: [-23.14, -36.95, 136.07, 169.64],
    label: WINGED_LABEL,
    win: wingsWin('2X'),
    boltGlow: { red: 'rgb(21 161 14)', blue: 'rgb(21 161 14)' },
    flashColor: 'rgb(135 240 70)',
  },
  {
    max: 25,
    id: 'mblue',
    art: [-29.55, -44.48, 148.04, 184.56],
    label: WINGED_LABEL,
    win: wingsWin('10X'),
    boltGlow: { red: 'rgb(48 77 161)', blue: 'rgb(48 77 161)' },
    flashColor: 'rgb(110 150 200)',
  },
  {
    max: 50,
    id: 'mpurple',
    art: [-32.75, -48.26, 154.03, 192.03],
    label: WINGED_LABEL,
    win: wingsWin('100X'),
    boltGlow: { red: 'rgb(255 0 0)', blue: 'rgb(0 0 255)' },
    flashColor: 'rgb(195 100 205)',
  },
  {
    max: 500,
    id: 'mred',
    art: [-40.62, -57.5, 168.72, 210.34],
    label: WINGED_LABEL,
    win: wingsWin('500X'),
    boltGlow: { red: 'rgb(161 40 24)', blue: 'rgb(161 40 24)' },
    flashColor: 'rgb(235 110 90)',
  },
  {
    max: 1000,
    id: 'mdiamond',
    art: [-33.14, -57.5, 163.46, 197.59],
    label: [0.5112, 0.5363, 0.2506],
    labelShadow: 0.6,
    win: { rig: 'diamond', anim: 'gaoo_1000_multiplier_win' },
    boltGlow: { red: 'rgb(161 53 71)', blue: 'rgb(161 53 71)' },
    flashColor: 'rgb(230 140 180)',
  },
]
const multTier = (mult: number) => MULT_TIERS.find((tier) => mult <= tier.max) ?? MULT_TIERS.at(-1)!
const MULT_ORBS = MULT_TIERS.map((tier) => tier.id)
const MULT_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000]
const PAY_TOTAL = PAY_SYMBOLS.reduce((t, [, w]) => t + w, 0)

function pickSymbol(): Omit<Sym, 'key'> {
  const r = Math.random()
  if (r < 0.012) return { id: 'scatter' }
  if (r < 0.022) {
    const mult =
      MULT_VALUES[
        Math.min(MULT_VALUES.length - 1, Math.floor(Math.random() ** 2.5 * MULT_VALUES.length))
      ]!
    return { id: multTier(mult).id, mult, strike: true }
  }
  let w = Math.random() * PAY_TOTAL
  for (const [id, weight] of PAY_SYMBOLS) if ((w -= weight) < 0) return { id }
  return { id: 'blue' }
}
const randomSymbol = (): Sym => ({ ...pickSymbol(), key: nextKey++ })
const randomGrid = () =>
  Array.from({ length: COLS }, () => Array.from({ length: ROWS }, randomSymbol))

const FORCE_SPIN_WIN = true
const FORCE_TEST_ORBS = true
const FORCE_MAX_WIN = true
const FORCE_TUMBLES = 10
const TEST_ORBS = [
  [0, 4, 6],
  [1, 2, 12],
  [2, 4, 50],
  [3, 1, 250],
  [4, 3, 1000],
] as const
function spinGrid() {
  const g = randomGrid()
  if (!FORCE_SPIN_WIN) return g
  const orbs = FORCE_TEST_ORBS ? TEST_ORBS : []
  const orbCells = new Set(orbs.map(([c, r]) => `${c}-${r}`))
  const id = FORCE_MAX_WIN
    ? 'crown'
    : PAY_SYMBOLS[Math.floor(Math.random() * PAY_SYMBOLS.length)]![0]
  const want = FORCE_MAX_WIN ? 12 : 8 + Math.floor(Math.random() * 3)
  const cells = g
    .flatMap((col, c) => col.map((sym, r): [number, number, string] => [c, r, sym.id]))
    .filter(([c, r]) => !orbCells.has(`${c}-${r}`))
  const have = cells.filter(([, , symId]) => symId === id).length
  const spots = cells.filter(([, , symId]) => symId !== id).sort(() => Math.random() - 0.5)
  for (const [c, r] of spots.slice(0, Math.max(0, want - have))) g[c]![r] = { id, key: nextKey++ }
  for (const [c, r, mult] of orbs)
    g[c]![r] = { id: multTier(mult).id, mult, strike: true, key: nextKey++ }
  return g
}

const OPENING_GRID = [
  ['yellow', 'yellow', 'purple', 'purple', 'blue'],
  ['ring', 'ring', 'purple', 'purple', 'crown'],
  ['blue', 'blue', 'hourglass', 'hourglass', 'red'],
  ['green', 'green', 'blue', 'blue', 'ring'],
  ['green', 'green', 'hourglass', 'hourglass', 'yellow'],
  ['yellow', 'yellow', 'purple', 'purple', 'green'],
]

const grid = ref<Sym[][]>(OPENING_GRID.map((col) => col.map((id) => ({ id, key: nextKey++ }))))
const leaving = ref<Sym[][] | null>(null)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const reelState = ref<'idle' | 'in' | 'highlight' | 'explode' | 'tumble'>('idle')
let reelsBusy = false

type Speed = {
  outMs: number
  outEase: string
  outCol: number
  outRow: number
  inStart: number
  inMs: number
  inCol: number
  inRow: number[]
  landMs: number
  dealLead: number
  fxRate: number
}
const QUICK_DROP = {
  outMs: 194,
  outEase: 'linear',
  outCol: 0,
  outRow: 0,
  inStart: 114,
  inMs: 190,
  inCol: 0,
  inRow: [87, 70, 0, 0, 0],
  landMs: 175,
  dealLead: 680,
}
const SPEEDS: Speed[] = [
  {
    outMs: 297,
    outEase: 'cubic-bezier(0.16, 0, 0.2, 0.12)',
    outCol: 99,
    outRow: 21,
    inStart: 755,
    inMs: 226,
    inCol: 152,
    inRow: [148, 111, 74, 37, 0],
    landMs: 175,
    dealLead: 520,
    fxRate: 1,
  },
  { ...QUICK_DROP, fxRate: 1 },
  { ...QUICK_DROP, fxRate: 0 },
]
const TUMBLE_FRAMES = { col: 1, kept: 2, freshGap: 0.8, fresh: 2.4, row: 1.686, ramp: 1 }
const frameMs = (frames: number) => frames * FX_FRAME_MS
const fallMs = (rows: number) => frameMs(rows * TUMBLE_FRAMES.row + TUMBLE_FRAMES.ramp / 2)
function fallEase(rows: number) {
  const r = frameMs(TUMBLE_FRAMES.ramp) / fallMs(rows)
  const at = (t: number) => (t < r ? (t * t) / (2 * r) : t - r / 2) / (1 - r / 2)
  return `linear(0, ${at(r / 2).toFixed(4)} ${(50 * r).toFixed(2)}%, ${at(r).toFixed(4)} ${(100 * r).toFixed(2)}%, 1)`
}
const landsIn = (sym: Sym) => (sym.fallDelay ?? 0) + fallMs(sym.fall ?? 0)

function dropColumn(col: Sym[], c: number): Sym[] {
  const kept = col.filter((sym) => !sym.win)
  const n = ROWS - kept.length
  const fresh = Array.from({ length: n }, (): Sym => ({ ...randomSymbol(), fall: n }))
  const settled = kept.map((sym, i): Sym => ({
    ...sym,
    strike: false,
    fall: n + i - col.indexOf(sym),
  }))
  let at = c * TUMBLE_FRAMES.col
  for (const sym of [...settled].reverse().filter((sym) => sym.fall)) {
    sym.fallDelay = frameMs(at)
    at += TUMBLE_FRAMES.kept
  }
  at += TUMBLE_FRAMES.freshGap
  for (const sym of [...fresh].reverse()) {
    sym.fallDelay = frameMs(at)
    at += TUMBLE_FRAMES.fresh
  }
  return [...fresh, ...settled]
}
const spinSpeed = ref(0)
const sp = computed(() => SPEEDS[spinSpeed.value]!)
const reelVars = computed(() => ({
  '--land-ms': `${sp.value.landMs}ms`,
  '--pop-ms': `${WIN_FX.popLength / (sp.value.fxRate || 1)}ms`,
  '--vanish-ms': `${WIN_FX.vanishLength / (sp.value.fxRate || 1)}ms`,
}))
const tierVars = (tier: MultTier) => ({
  '--orb-flash': tier.flashColor,
  zIndex: MULT_TIERS.indexOf(tier) + 1,
})
type CellTiming = { delay: number; ms: number }
type DropPlan = {
  start: number
  deals: boolean
  out: (CellTiming & { ease: string })[][]
  in: CellTiming[][]
}
const dropPlan = ref<DropPlan | null>(null)

function dropTimings(s: Speed, deals: boolean) {
  const lead = deals ? Math.max(0, s.dealLead - s.inStart) : 0
  return {
    out: (c: number, r: number) => ({
      delay: c * s.outCol + (ROWS - 1 - r) * s.outRow,
      ms: s.outMs,
      ease: s.outEase,
    }),
    in: (c: number, r: number) => ({
      delay: s.inStart + lead + c * s.inCol + s.inRow[r]!,
      ms: s.inMs,
    }),
  }
}

const eachCell = <T,>(at: (c: number, r: number) => T) =>
  Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, (_, r) => at(c, r)))

const landAt = (plan: DropPlan, c: number, r: number) =>
  plan.start + plan.in[c]![r]!.delay + plan.in[c]![r]!.ms

function retimeDrop(s: Speed) {
  const plan = dropPlan.value
  if (!plan) return
  const elapsed = performance.now() - plan.start
  const at = dropTimings(s, plan.deals)
  plan.out = plan.out.map((col, c) =>
    col.map((cell, r) =>
      cell.delay > elapsed
        ? { ...at.out(c, r), delay: Math.max(at.out(c, r).delay, elapsed) }
        : cell,
    ),
  )
  plan.in = plan.in.map((col, c) =>
    col.map((cell, r) =>
      cell.delay > elapsed
        ? { ms: s.inMs, delay: Math.max(at.in(c, r).delay, elapsed + s.inRow[r]!) }
        : cell,
    ),
  )
  if (plan.deals) queueStrikes(grid.value, (c, r) => landAt(plan, c, r))
}

const cellVars = (c: number, r: number, sym: Sym) => ({
  ...(dropPlan.value && {
    '--odelay': `${dropPlan.value.out[c]![r]!.delay}ms`,
    '--out-ms': `${dropPlan.value.out[c]![r]!.ms}ms`,
    '--out-ease': dropPlan.value.out[c]![r]!.ease,
    '--delay': `${dropPlan.value.in[c]![r]!.delay}ms`,
    '--in-ms': `${dropPlan.value.in[c]![r]!.ms}ms`,
  }),
  '--fall': sym.fall ?? 0,
  ...(sym.fall && {
    '--fall-delay': `${sym.fallDelay ?? 0}ms`,
    '--fall-ms': `${fallMs(sym.fall)}ms`,
    '--fall-ease': fallEase(sym.fall),
  }),
  ...(sym.mult && tierVars(multTier(sym.mult))),
})
const reelLayers = computed(() => [
  ...(leaving.value ? [{ name: 'leaving', cols: leaving.value, state: 'out' }] : []),
  { name: 'current', cols: grid.value, state: reelState.value },
])

const ZEUS_DEAL_LEAD = 520
const ZEUS_SPIN_LAG = 75
const ZEUS_FAST_HOLD = 1000
const zeus = ref<InstanceType<typeof ZeusSpine> | null>(null)
function chargeZeus(delayMs = 0) {
  if (spinSpeed.value) zeus.value?.charge(0, ZEUS_FAST_HOLD)
  else zeus.value?.charge(delayMs)
}
const TURBO_BURST_LEAD = 140
const hasStrike = (g: Sym[][]) => g.some((col) => col.some((sym) => sym.strike))
const strikes = ref<Strike[]>([])

const STRIKE_HOLD = 350
let strikesSettleAt = 0

function queueStrikes(g: Sym[][], landsAt: (c: number, r: number) => number) {
  strikes.value = g.flatMap((col, c) =>
    col.flatMap((sym, r) =>
      sym.strike && sym.mult
        ? [{ c, r, glow: multTier(sym.mult).boltGlow, landAt: landsAt(c, r) }]
        : [],
    ),
  )
  strikesSettleAt = Math.max(0, ...strikes.value.map((strike) => strike.landAt + STRIKE_HOLD))
}

async function until(deadline: () => number) {
  for (let left = deadline() - performance.now(); left > 0; left = deadline() - performance.now())
    await sleep(Math.min(left, 20))
}

const waitForStrikes = () => until(() => strikesSettleAt)
let retime: ((s: Speed) => void) | null = null

async function spinReels() {
  if (reelsBusy) return false
  reelsBusy = true
  const next = spinGrid()
  const deals = hasStrike(next)
  if (deals) chargeZeus(ZEUS_SPIN_LAG)
  const at = dropTimings(sp.value, deals)
  dropPlan.value = { start: performance.now(), deals, out: eachCell(at.out), in: eachCell(at.in) }
  const plan = dropPlan.value
  leaving.value = grid.value
  grid.value = next
  reelState.value = 'in'
  if (deals) queueStrikes(next, (c, r) => landAt(plan, c, r))
  retime = retimeDrop
  await until(
    () =>
      plan.start +
      Math.max(...plan.in.flat().map((cell) => cell.delay + cell.ms)) +
      sp.value.landMs +
      40,
  )
  retime = null
  await waitForStrikes()
  if (deals) zeus.value?.release()
  dropPlan.value = null
  leaving.value = null
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
const MAX_WIN_X = 15000
const maxWin = computed(() => bet.value * MAX_WIN_X)
const maxed = ref(false)

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
const WIN_ROWS_SHOWN = 4
const winRows = ref<(Win & { key: number; order: number; max?: boolean })[]>([])
const shownWinRows = computed(() => winRows.value.slice(0, WIN_ROWS_SHOWN))
const WIN_ROW_GAP_EM = 0.5
function fitWinRow(el: unknown) {
  if (!(el instanceof HTMLElement)) return
  el.style.removeProperty('--fit')
  const style = getComputedStyle(el)
  const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const parts = [...el.children].map((child) => {
    const { marginLeft, marginRight } = getComputedStyle(child)
    const margins = child.classList.contains('win-amount') ? 0 : parseFloat(marginLeft)
    return child.getBoundingClientRect().width + margins + parseFloat(marginRight)
  })
  const need = parts.reduce((t, w) => t + w, 0) + parseFloat(style.fontSize) * WIN_ROW_GAP_EM
  if (need > room) el.style.setProperty('--fit', (room / need).toFixed(4))
}
const winFx = ref<WinFx | null>(null)

function winLabel(g: Sym[][], win: Win) {
  const cells = g.flatMap((col, c) =>
    col.flatMap((sym, r): [number, number][] => (sym.id === win.id ? [[c, r]] : [])),
  )
  const cx = cells.reduce((t, [c]) => t + c, 0) / cells.length
  const cy = cells.reduce((t, [, r]) => t + r, 0) / cells.length
  const distance = ([c, r]: [number, number]) => (c - cx) ** 2 + (r - cy) ** 2
  const [c, r] = cells.reduce((best, cell) => (distance(cell) < distance(best) ? cell : best))
  return { c, r, text: formatMoney(win.amount) }
}

const BAR_COUNT = { delay: 80, length: 450 }
let countFrame = 0
let controlsFrame = 0
const controlsWin = ref(0)

function countUp(shown: Ref<number>, target: number, rate: number, frame: (id: number) => void) {
  if (!rate || !target) {
    shown.value = target
    return
  }
  const from = shown.value
  const begin = performance.now() + BAR_COUNT.delay / rate
  const length = BAR_COUNT.length / rate
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - begin) / length))
    shown.value = Math.round((from + (target - from) * k) * 100) / 100
    if (k < 1) frame(requestAnimationFrame(step))
  }
  frame(requestAnimationFrame(step))
}

let winTarget = 0

function countTumbleWin(target: number, rate: number) {
  winTarget = target
  cancelAnimationFrame(countFrame)
  countUp(tumbleWin, target, rate, (id) => (countFrame = id))
  cancelAnimationFrame(controlsFrame)
  countUp(controlsWin, target, sp.value.fxRate ? 1 : 0, (id) => (controlsFrame = id))
}

function finishCounts() {
  cancelAnimationFrame(countFrame)
  cancelAnimationFrame(controlsFrame)
  tumbleWin.value = controlsWin.value = winTarget
}

function forceRefill(refill: Sym[][], before: Sym[][], win: boolean) {
  const kept = new Set(before.flat().map((sym) => sym.key))
  const fresh = refill.flat().filter((sym) => !kept.has(sym.key) && PAYS[sym.id])
  const counts = new Map(Object.keys(PAYS).map((id) => [id, 0]))
  for (const sym of refill.flat()) if (PAYS[sym.id]) counts.set(sym.id, counts.get(sym.id)! + 1)
  const byCount = () => [...counts].sort((a, b) => a[1] - b[1]).map(([id]) => id)
  const swap = (sym: Sym, id: string) => {
    counts.set(sym.id, counts.get(sym.id)! - 1)
    counts.set(id, counts.get(id)! + 1)
    sym.id = id
  }
  if (win) {
    const id = byCount().at(-1)!
    for (const sym of fresh) if (counts.get(id)! < 8 && sym.id !== id) swap(sym, id)
    return
  }
  for (const sym of fresh) if (counts.get(sym.id)! >= 8) swap(sym, byCount()[0]!)
}

async function tumble() {
  let total = 0
  let explosions = 0
  for (;;) {
    const wins = findWins(grid.value)
    if (!wins.length) break
    const t = sp.value
    const ids = new Set(wins.map((w) => w.id))
    grid.value = grid.value.map((col) =>
      col.map((sym) => (ids.has(sym.id) ? { ...sym, win: true } : sym)),
    )
    const refill = grid.value.map(dropColumn)
    if (FORCE_SPIN_WIN && FORCE_TUMBLES)
      forceRefill(refill, grid.value, ++explosions < FORCE_TUMBLES)
    const deals = hasStrike(refill)
    total = Math.min(maxWin.value, total + wins.reduce((t, w) => t + w.amount, 0))
    countTumbleWin(total, t.fxRate)
    const rate = t.fxRate || 1
    const burstIn = t.fxRate ? WIN_FX.burstAt : TURBO_BURST_LEAD
    winFx.value = {
      id: nextKey++,
      cells: grid.value.flatMap((col, c) =>
        col.flatMap((sym, r): [number, number][] => (sym.win ? [[c, r]] : [])),
      ),
      labels: wins.map((w) => winLabel(grid.value, w)),
      rate,
      start: performance.now() - (WIN_FX.burstAt - burstIn) / rate,
      border: !!t.fxRate,
    }
    const fx = winFx.value
    const burstAt = () => fx.start + WIN_FX.burstAt / rate
    if (t.fxRate) reelState.value = 'highlight'
    retime = (s) => {
      if (s.fxRate) return
      const turboStart = performance.now() - (WIN_FX.burstAt - TURBO_BURST_LEAD) / rate
      if (turboStart >= fx.start) return
      fx.start = turboStart
      fx.border = false
      reelState.value = 'idle'
    }
    await until(burstAt)
    retime = null
    reelState.value = 'explode'
    const turbo = !sp.value.fxRate
    const beforeDeal = turbo ? 0 : Math.max(0, WIN_FX.tumbleAt - WIN_FX.burstAt - ZEUS_DEAL_LEAD)
    await sleep(beforeDeal / rate)
    if (deals) chargeZeus()
    await sleep((WIN_FX.tumbleAt - WIN_FX.burstAt - beforeDeal) / rate)
    winRows.value = [
      ...wins.map((w, i) => ({ ...w, key: nextKey++, order: wins.length - 1 - i })),
      ...winRows.value,
    ]
    grid.value = refill
    reelState.value = 'tumble'
    const refillAt = performance.now()
    if (deals) queueStrikes(refill, (c, r) => refillAt + landsIn(refill[c]![r]!))
    await sleep(Math.max(...refill.flat().map(landsIn)) + t.landMs + 40)
    await waitForStrikes()
    if (deals) zeus.value?.release()
    reelState.value = 'idle'
    if (total >= maxWin.value) break
  }
  return total
}

function showMaxWin() {
  maxed.value = true
  countTumbleWin(maxWin.value, 0)
  winRows.value = [
    { id: '', count: 0, amount: maxWin.value, key: nextKey++, order: 0, max: true },
    ...winRows.value,
  ]
}

const playing = ref(false)
const stageEl = ref<HTMLElement | null>(null)
type Flyer = { key: number; text: string; em: number; shadow?: number }
const flyers = ref<Flyer[]>([])
const multShown = ref(0)

const COLLECT = { fly: 350, gap: 350, hold: 700, xFade: 80, slide: 200 }
const PULSE_STEPS = 14
const orbWins = ref<OrbWin[]>([])
const winningCells = computed(() => new Set(orbWins.value.map((win) => `${win.c}-${win.r}`)))
const endOrbWin = (id: number) => {
  orbWins.value = orbWins.value.filter((win) => win.id !== id)
}
const finalPop = ref(false)

async function mergeTally(rate: number) {
  const bar = stageEl.value?.querySelector('.tumble-amount.split')
  const [base, x, mult] = ['.ta-base', '.ta-x', '.ta-mult'].map((q) =>
    bar?.querySelector<HTMLElement>(q),
  )
  if (!bar || !base || !x || !mult) return
  const center = (el: Element) => {
    const box = el.getBoundingClientRect()
    return box.left + box.width / 2
  }
  const mid = center(bar)
  const toMiddle = (el: HTMLElement) =>
    el.animate([{ translate: '0 0' }, { translate: `${mid - center(el)}px 0` }], {
      duration: COLLECT.slide / rate,
      delay: (COLLECT.xFade * 0.4) / rate,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished
  x.animate(
    [
      { scale: 1, opacity: 1 },
      { scale: 0, opacity: 0 },
    ],
    {
      duration: COLLECT.xFade / rate,
      easing: 'ease-in',
      fill: 'forwards',
    },
  )
  await Promise.all([toMiddle(base), toMiddle(mult)])
}

function stagePoint(el: Element | null | undefined) {
  const stage = stageEl.value?.getBoundingClientRect()
  const box = el?.getBoundingClientRect()
  if (!stage || !box) return null
  return { x: box.left + box.width / 2 - stage.left, y: box.top + box.height / 2 - stage.top }
}

async function collectOrb(c: number, r: number, mult: number, rate: number, released: () => void) {
  const tier = multTier(mult)
  const rig = ORB_RIGS[tier.win.rig]
  const loaded = await loadRig(ASSET, tier.win.rig).catch((error) => {
    console.warn('orb win rig', error)
    return null
  })
  const cell = stageEl.value?.querySelector(`[data-cell="${c}-${r}"]`)
  const cellWidth = cell?.getBoundingClientRect().width ?? 0
  const orbWidth = cell?.querySelector('.sym')?.getBoundingClientRect().width ?? 0
  const from = stagePoint(cell?.querySelector('.mult'))
  const [l, t, w, h] = tier.art
  const unit = ((w / 100) * rig.unitPx) / rig.spriteWidth
  if (loaded)
    orbWins.value = [
      ...orbWins.value,
      {
        id: nextKey++,
        c,
        r,
        rig: tier.win.rig,
        anim: tier.win.anim,
        at: performance.now(),
        rate,
        x: (l + w * rig.origin[0]) / 100,
        y: (t + h * rig.origin[1]) / 100,
        unit,
      },
    ]
  const key = nextKey++
  flyers.value = [
    ...flyers.value,
    { key, text: `${mult}x`, em: orbWidth * tier.label[2], shadow: tier.labelShadow },
  ]
  await nextTick()
  const to = stagePoint(stageEl.value?.querySelector('.tumble-amount'))
  grid.value = grid.value.map((col, cc) =>
    col.map((sym, rr) => (cc === c && rr === r ? { ...sym, collected: true } : sym)),
  )
  const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
  if (el && from && to) {
    const at = (x: number, y: number, scale: number) => `translate(${x}px, ${y}px) scale(${scale})`
    const pulse = loaded ? (rig.release * 1000) / rate : 0
    const fly = COLLECT.fly / rate
    const total = pulse + fly
    const px = unit * cellWidth
    const steps = loaded ? PULSE_STEPS : 0
    const held = Array.from({ length: steps + 1 }, (_, i) => {
      const o = boneOffset(loaded!.data, tier.win.anim, (rig.release * i) / steps, rig.numberBone)
      return {
        x: from.x + o.x * px,
        y: from.y - o.y * px,
        scale: o.scale,
        offset: (pulse * i) / steps / total,
      }
    })
    const release = held.at(-1) ?? { x: from.x, y: from.y, scale: 1 }
    const flight = el.animate(
      [
        ...held.slice(0, -1).map((k) => ({ transform: at(k.x, k.y, k.scale), offset: k.offset })),
        {
          transform: at(release.x, release.y, release.scale),
          offset: pulse / total,
          easing: 'ease-in',
        },
        { transform: at(to.x, to.y, 0.5) },
      ],
      { duration: total, fill: 'forwards' },
    )
    sleep(pulse).then(released)
    await flight.finished
  }
  released()
  flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
  multShown.value += mult
}

async function collectMultipliers(total: number) {
  const rate = sp.value.fxRate || 1
  const orbs = grid.value.flatMap((col, c) =>
    col.flatMap((sym, r) => (sym.mult ? [{ c, r, mult: sym.mult }] : [])),
  )
  const sum = orbs.reduce((acc, orb) => acc + orb.mult, 0)
  const capped = total * sum >= maxWin.value
  if (rate) {
    const landings = []
    for (const { c, r, mult } of orbs) {
      let released = () => {}
      const leaves = new Promise<void>((resolve) => (released = resolve))
      landings.push(collectOrb(c, r, mult, rate, released))
      await leaves
      await sleep(COLLECT.gap / rate)
    }
    await Promise.all(landings)
    await sleep(COLLECT.hold / rate)
    await mergeTally(rate)
  }
  cancelAnimationFrame(countFrame)
  multShown.value = 0
  if (capped) {
    countTumbleWin(total, 0)
    showMaxWin()
    return
  }
  finalPop.value = !!rate
  countTumbleWin(total * sum, 0)
}

async function onSpin() {
  if (rulesOpen.value || autoplayMenu.value || playing.value) return
  playing.value = true
  spinSpeed.value = speed.value
  countTumbleWin(0, 0)
  finalPop.value = false
  maxed.value = false
  winRows.value = []
  try {
    if (!(await spinReels())) return
    const total = await tumble()
    if (total >= maxWin.value) showMaxWin()
    else if (total && grid.value.flat().some((sym) => sym.mult)) await collectMultipliers(total)
  } finally {
    playing.value = false
  }
}

const REEL_ART: Record<string, [number, number, number, number]> = {
  yellow: [20.75, 14.08, 58.73, 71.04],
  green: [21.79, 10.24, 55.58, 79.28],
  red: [20.23, 10.85, 58.28, 80.1],
  blue: [22.25, 10.63, 55.15, 80.85],
  crown: [7.61, -1.68, 85.12, 103.3],
  hourglass: [12.07, -6.28, 74.58, 107.31],
  ring: [13.29, -2.61, 72.86, 103.6],
  chalice: [12.9, -3.66, 72.58, 101.27],
  purple: [22.85, 8.76, 53.86, 82.94],
  scatter: [-1.97, -10.34, 104.96, 110.75],
}
const artBox = ([l, t, w, h]: [number, number, number, number]) => ({
  left: `${l}%`,
  top: `${t}%`,
  width: `${w}%`,
  height: `${h}%`,
})
const symArt = (sym: Sym) => (sym.mult ? multTier(sym.mult).art : REEL_ART[sym.id])
const labelStyle = (mult: number) => {
  const {
    art: [l, t, w, h],
    label: [x, y, em],
  } = multTier(mult)
  return { left: `${l + w * x}%`, top: `${t + h * y}%`, '--mult-em': `${w * em}%` }
}

const PRELOAD = [
  'background.webp',
  ...Object.values(FX_SHEETS).map((sheet) => sheet.file),
  STRIKE_FX.light,
  STRIKE_FX.red,
  STRIKE_FX.blue,
  'ui/tumble-win.webp',
  'ui/tumble-digits.webp',
  ...UI.map((n) => `ui/${n}.webp`),
  ...Object.keys(REEL_ART).map((n) => `reel/${n}.webp`),
  ...MULT_ORBS.map((n) => `reel/${n}.webp`),
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
watch(speed, (value) => {
  if (playing.value) {
    spinSpeed.value = value
    if (!sp.value.fxRate) finishCounts()
    retime?.(sp.value)
  }
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
    loadZeus(ASSET),
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
}

onMounted(preload)
onBeforeUnmount(() => {
  cancelAnimationFrame(countFrame)
  cancelAnimationFrame(controlsFrame)
  autoplay.value = false
  clearTimeout(speedToastTimer)
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

    <div ref="stageEl" class="stage">
      <ZeusSpine ref="zeus" :asset="ASSET" />
      <img class="ui board" :src="`${ASSET}/ui/board.webp`" alt="" draggable="false" />
      <StrikeEffects :strikes="strikes" :asset="ASSET" layer="back" />

      <div
        v-for="layer in reelLayers"
        :key="layer.name"
        class="reels"
        :class="layer.state"
        :style="reelVars"
      >
        <div v-for="(col, c) in layer.cols" :key="c" class="reel">
          <div
            v-for="(sym, r) in col"
            :key="sym.key"
            class="cell"
            :data-cell="`${c}-${r}`"
            :class="{
              win: sym.win,
              orb: sym.mult,
              drop: sym.fall,
              winning: layer.name === 'current' && winningCells.has(`${c}-${r}`),
            }"
            :style="cellVars(c, r, sym)"
          >
            <img
              v-if="symArt(sym)"
              class="sym"
              :src="`${ASSET}/reel/${sym.id}.webp`"
              :style="artBox(symArt(sym)!)"
              alt=""
              draggable="false"
            />
            <MultiplierLabel
              v-if="sym.mult && !sym.collected"
              class="mult"
              :text="`${sym.mult}x`"
              :shadow="multTier(sym.mult).labelShadow"
              :style="labelStyle(sym.mult)"
            />
            <span
              v-if="sym.strike && sym.mult"
              class="orb-flash"
              :style="{
                ...artBox(multTier(sym.mult).art),
                '--orb-mask': `url(${ASSET}/reel/${sym.id}.webp)`,
              }"
            />
          </div>
        </div>
      </div>
      <StrikeEffects :strikes="strikes" :asset="ASSET" layer="front" />
      <OrbWinEffects :wins="orbWins" :asset="ASSET" @done="endOrbWin" />
      <WinEffects :fx="winFx" :asset="ASSET" />
      <div
        v-for="flyer in flyers"
        :key="flyer.key"
        :data-flyer="flyer.key"
        class="mult-fly"
        :style="{ '--mult-em': `${flyer.em}px` }"
      >
        <MultiplierLabel class="mult" :text="flyer.text" :shadow="flyer.shadow" />
      </div>
      <img
        class="ui logo"
        :src="`${ASSET}/ui/logo.webp`"
        alt="Gates of Olympus 1000"
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
          :ref="fitWinRow"
          class="win-row"
          :class="{ max: row.max }"
          :style="{ '--slot': shownWinRows.length - 1 - i, '--delay': `${row.order * 120}ms` }"
        >
          <span v-if="row.max" class="win-max">MAX WIN</span>
          <template v-else>
            <span class="win-count">{{ row.count }}</span>
            <img class="win-icon" :src="`${ASSET}/reel/${row.id}.webp`" alt="" draggable="false" />
          </template>
          <span class="win-amount">{{ formatPeso(row.amount) }}</span>
        </div>
      </TransitionGroup>

      <Transition name="top-win">
        <div v-if="tumbleWin > 0" key="win" class="ui tumble-win">
          <img :src="`${ASSET}/ui/tumble-win.webp`" alt="" draggable="false" />
          <span v-if="multShown" key="split" class="tumble-amount split">
            <TumbleNumber class="ta-base" :text="formatPeso(tumbleWin)" :asset="ASSET" />
            <TumbleNumber class="ta-x" text="x" :asset="ASSET" />
            <TumbleNumber
              :key="multShown"
              class="ta-mult bump"
              :text="String(multShown)"
              :asset="ASSET"
            />
          </span>
          <span v-else key="plain" class="tumble-amount" :class="{ 'final-pop': finalPop }">
            <span v-if="maxed" class="ta-max">MAX WIN</span>
            <TumbleNumber :text="formatPeso(tumbleWin)" :asset="ASSET" />
          </span>
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

    <div v-if="autoplayMenu" class="stage menu-layer">
      <AutoplaySettings
        v-model:speed="speed"
        @close="autoplayMenu = false"
        @start="startAutoplay"
      />
    </div>

    <div v-if="rulesOpen" class="stage menu-layer">
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
      :win="controlsWin"
      @spin="onSpin"
      @info="rulesOpen = !rulesOpen"
      @sound-ready="music.play()"
    />
    <button type="button" class="back-btn" aria-label="Back to lobby" @click="goBack">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" />
        <path d="M15.5 11H6.5M10.5 7 6.5 11l4 4" />
      </svg>
    </button>
    <template v-if="betMenu">
      <div class="backdrop menu-layer" @click="betMenu = false" />
      <div class="stage menu-layer">
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

.menu-layer {
  z-index: 10;
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
  left: 33.594%;
  top: 0;
  width: 32.8125%;
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
  transition: opacity 0.25s linear;
}

.top-swap-enter-from,
.top-swap-leave-to,
.top-win-enter-from,
.top-win-leave-to {
  opacity: 0;
}

.mult-fly {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 6;
  pointer-events: none;
}

.tumble-amount.split {
  gap: 0.28em;
}

.ta-mult.bump {
  animation: amount-bump 0.25s ease-out;
}

.ta-max {
  margin-right: 0.35em;
  background: linear-gradient(#fdffb0, #e9fb3b 55%, #cde41c);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0.14cqw 0 #b9255e) drop-shadow(0 0 0.12cqw rgb(0 0 0 / 0.8));
}

.tumble-amount.final-pop {
  animation: amount-final 220ms linear;
}

@keyframes amount-final {
  50% {
    scale: 1.25;
  }
}

@keyframes amount-bump {
  40% {
    scale: 1.15;
    filter: brightness(1.6);
  }
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
  display: flex;
  justify-content: center;
  align-items: center;
}

.win-list {
  --row: 2.72cqw;
  --line: 0.052cqw;
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
  height: var(--row);
  padding: calc(var(--line) * 5) 0.5cqw var(--line) 0;
  box-sizing: border-box;
  white-space: nowrap;
  background:
    linear-gradient(
        #4f3f22 0 var(--line),
        #a68e23 0 calc(var(--line) * 2),
        #602517 0 calc(var(--line) * 3),
        #a68e23 0 calc(var(--line) * 4),
        #752c22 0 calc(var(--line) * 5),
        transparent 0 calc(100% - var(--line)),
        #3a1425 0
      )
      no-repeat,
    linear-gradient(
        90deg,
        rgb(0 0 0 / 0.42),
        rgb(0 0 0 / 0.12) 6%,
        transparent 12% 88%,
        rgb(0 0 0 / 0.12) 94%,
        rgb(0 0 0 / 0.42)
      )
      no-repeat,
    linear-gradient(
      #5c4c4d,
      #574446 8%,
      #513237 19%,
      #47262b 30%,
      #472326 38%,
      #4d272b 50%,
      #552c2f 62%,
      #593032 78%
    );
  font-family: 'Roboto', sans-serif;
  font-weight: 900;
  font-size: calc(1.41cqw * var(--fit, 1));
  line-height: 1;
}

.win-row.max {
  padding-left: 0.42cqw;
  background:
    linear-gradient(#695b1e 0 var(--line), #a46c23 0 calc(var(--line) * 2), transparent 0) no-repeat,
    linear-gradient(
      #d01000,
      #c20500 8%,
      #b20305 18%,
      #a50401 28%,
      #9c0400 42%,
      #a40401 55%,
      #b30900 72%,
      #bb0b00 85%,
      #a00500
    );
  font-size: calc(1.24cqw * var(--fit, 1));
}

.win-count {
  width: 1.6em;
  text-align: right;
}

.win-icon {
  width: 1.06em;
  height: 1.06em;
  margin-left: 0.17em;
  object-fit: contain;
}

.win-max,
.win-amount {
  margin-left: auto;
}

.win-max {
  margin: 0;
}

.win-max,
.win-count,
.win-amount {
  background: linear-gradient(
    #c89d4f 15%,
    #f0daa2 33%,
    #fff1c1 42%,
    #ffe9a4 50%,
    #fadc8f 56%,
    #e3bd68 65%,
    #c8973c 75%,
    #bd8829 86%
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 0.05cqw rgb(60 6 4 / 0.95))
    drop-shadow(0 0.07cqw 0.08cqw rgb(0 0 0 / 0.55));
}

.win-row-enter-active {
  animation: win-row-drop 0.27s linear var(--delay, 0s) backwards;
}

@keyframes win-row-drop {
  0% {
    translate: 0 calc((13.02cqw - var(--row) - var(--slot) * var(--row)) * -1);
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
  top: 10.141%;
  width: 68.07%;
  height: 76.014%;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  clip-path: inset(-0.673% 0);
  isolation: isolate;
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

.cell.winning > .sym {
  visibility: hidden;
}

.reels.in .cell.orb {
  --strike-delay: var(--delay);
  --strike-fall: var(--in-ms);
}

.reels.tumble .cell.orb {
  --strike-delay: var(--fall-delay);
  --strike-fall: var(--fall-ms);
}

.orb-flash {
  position: absolute;
  background: var(--orb-flash);
  mask: var(--orb-mask) center / 100% 100% no-repeat;
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: 0;
}

.reels:is(.in, .tumble) .orb-flash {
  animation: orb-flash 208ms linear calc(var(--strike-delay) + var(--strike-fall)) forwards;
}

@keyframes orb-flash {
  0% {
    opacity: 0.6;
  }
  5%,
  70% {
    opacity: 1;
  }
  75% {
    opacity: 0.3;
  }
  85% {
    opacity: 0.15;
  }
  100% {
    opacity: 0;
  }
}

.mult {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.reels.highlight .cell.win {
  animation: win-pop var(--pop-ms) linear forwards;
}

@keyframes win-pop {
  16% {
    scale: 1.08;
  }
  26% {
    scale: 1.13;
  }
  34% {
    scale: 1.17;
  }
  56% {
    scale: 1.18;
  }
  66% {
    scale: 1.2;
  }
  76% {
    scale: 1.23;
  }
  90% {
    scale: 1.23;
  }
  92% {
    scale: 1.19;
  }
  94% {
    scale: 1.17;
  }
  96% {
    scale: 1.15;
  }
  98% {
    scale: 1.11;
  }
  100% {
    scale: 1;
  }
}

.reels.explode .cell.win {
  animation: win-vanish var(--vanish-ms) linear forwards;
}

@keyframes win-vanish {
  25% {
    opacity: 1;
  }
  37.6% {
    opacity: 0.88;
  }
  50% {
    opacity: 0.48;
  }
  58.4% {
    opacity: 0.42;
  }
  66.8% {
    opacity: 0.27;
  }
  75.2% {
    opacity: 0.19;
  }
  83.2% {
    opacity: 0.12;
  }
  91.6% {
    opacity: 0.06;
  }
  100% {
    opacity: 0;
  }
}

.reels.tumble .cell.drop {
  animation:
    fall var(--fall-ms) var(--fall-ease) var(--fall-delay) backwards,
    land var(--land-ms) calc(var(--fall-delay) + var(--fall-ms));
}

@keyframes fall {
  from {
    translate: 0 calc(var(--fall) * -100%);
  }
}

.reels.out .cell {
  animation: drop-out var(--out-ms) var(--out-ease) var(--odelay) forwards;
}

.reels.in .cell {
  animation:
    drop-in var(--in-ms) linear var(--delay) backwards,
    land var(--land-ms) calc(var(--delay) + var(--in-ms));
}

@keyframes drop-out {
  to {
    translate: 0 550%;
  }
}

@keyframes drop-in {
  from {
    translate: 0 -550%;
  }
}

@keyframes land {
  0% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.3, 0.6, 0.5, 1);
  }
  40% {
    transform: translateY(12%);
    animation-timing-function: ease-in-out;
  }
  100% {
    transform: translateY(0);
  }
}

.logo {
  left: 85.208%;
  top: 7.037%;
  width: 14.792%;
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
  --px: calc(min(100vw, 100vh * 16 / 9) / 1689);
  position: absolute;
  top: calc(24 * var(--px));
  left: calc(22 * var(--px));
  display: grid;
  place-items: center;
  width: calc(30 * var(--px));
  height: calc(30 * var(--px));
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
  width: calc(22 * var(--px));
  height: calc(22 * var(--px));
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
