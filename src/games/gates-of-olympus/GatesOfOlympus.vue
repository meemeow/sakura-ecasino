<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import GameControls from '@/games/GameControls.vue'
import GameLoader from '@/games/GameLoader.vue'
import BetMenu from '@/games/BetMenu.vue'
import GameRules from '@/games/gates-of-olympus/GameRules.vue'
import AutoplaySettings from '@/games/gates-of-olympus/AutoplaySettings.vue'
import WinEffects from '@/games/gates-of-olympus/WinEffects.vue'
import StrikeEffects from '@/games/gates-of-olympus/StrikeEffects.vue'
import BuyFreeSpins from '@/games/gates-of-olympus/BuyFreeSpins.vue'
import BuyFeaturePopup from '@/games/gates-of-olympus/BuyFeaturePopup.vue'
import AnteBet from '@/games/gates-of-olympus/AnteBet.vue'
import MultiplierLabel from '@/games/gates-of-olympus/MultiplierLabel.vue'
import OrbWinEffects from '@/games/gates-of-olympus/OrbWinEffects.vue'
import OrbLanding from '@/games/gates-of-olympus/OrbLanding.vue'
import CellSpine, {
  CELL_LIGHT,
  type CellPlace,
  type CellSwell,
  swellScale,
} from '@/games/gates-of-olympus/CellSpine.vue'
import ZeusSpine from '@/games/gates-of-olympus/ZeusSpine.vue'
import MaxWinLabel from '@/games/gates-of-olympus/MaxWinLabel.vue'
import TumbleNumber from '@/games/gates-of-olympus/TumbleNumber.vue'
import TumbleWinTitle from '@/games/gates-of-olympus/TumbleWinTitle.vue'
import TopMessage, { type TopMessagePart } from '@/games/gates-of-olympus/TopMessage.vue'
import BigWin from '@/games/gates-of-olympus/BigWin.vue'
import StageSpine from '@/games/gates-of-olympus/StageSpine.vue'
import FreeSpinsPanel from '@/games/gates-of-olympus/FreeSpinsPanel.vue'
import FreeSpinsWindow, { type WindowKind } from '@/games/gates-of-olympus/FreeSpinsWindow.vue'
import {
  FREE_SPINS,
  FS_WINDOW,
  ORB_CHANCE,
  ORB_WEIGHTS,
  FS_ORB_WEIGHTS,
  FS_STACK,
  REFILL_STICKY,
  PILLAR,
  SCATTER_RIG,
  TRANSITION,
  pickReels,
  pickRoundTarget,
  pillarFxLevel,
  scatterCount,
  triggerChance,
} from '@/games/gates-of-olympus/freeSpins'
import {
  BIG_WIN,
  BIG_WIN_FONT,
  COIN,
  bezierEase,
  bigWinTier,
  type BigWinTier,
} from '@/games/gates-of-olympus/bigWin'
import {
  BUY_POPUP_RIG,
  COLS,
  ROWS,
  FX_FRAME_MS,
  FX_SHEETS,
  SYMBOL_RIGS,
  ORB_RIGS,
  STAGE,
  STRIKE_FX,
  UI_PX,
  WIN_FX,
  type OrbRig,
  type OrbWin,
  type Strike,
  type StrikeBolt,
  type WinFx,
} from '@/games/gates-of-olympus/winFx'
import { MULT_GLYPH_CAP, MULT_GLYPH_EM } from '@/games/gates-of-olympus/multGlyphs'
import { boneOffset } from '@/games/gates-of-olympus/spineLite'
import { loadRig, loadSpine } from '@/games/gates-of-olympus/orbRigs'
import { loadZeus } from '@/games/gates-of-olympus/zeusRig'
import { useLoopingMusic } from '@/composables/useLoopingMusic'
import { publicUrl } from '@/utils/publicUrl'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/roboto/900.css'
import { formatPeso } from '@/utils/format'

const ASSET = publicUrl('/slots/gates-of-olympus-1000')
const TUMBLE_PLATE = { scale: 640.63 / 596, titleBaseline: 28.3 }
const UI = [
  'board-shadow',
  'board-back',
  'board-front',
  'logo',
  'buy-free-spins',
  'buy-free-spins-glow',
  'ante-bet',
  'ante-bet-glow',
  'ante-slider',
  'ante-knob',
  'ante-tick',
  'ante-arrow',
  'history-back',
  'history-frame',
]
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
  land: string
  bolt: StrikeBolt
}
const WINGED_LABEL: LabelAnchor = [0.5374, 0.5045, 0.2494]
const wingsSpine = (tier: string) => ({
  win: { rig: 'wings' as const, anim: `gool_wild_multiplier_win_${tier}` },
  land: `gool_wild_multiplier_landing_${tier}`,
})
const MULT_TIERS: MultTier[] = [
  {
    max: 8,
    id: 'mgreen',
    art: [-23.14, -36.95, 136.07, 169.64],
    label: WINGED_LABEL,
    ...wingsSpine('2X'),
    bolt: { variant: 0 },
  },
  {
    max: 25,
    id: 'mblue',
    art: [-29.55, -44.48, 148.04, 184.56],
    label: WINGED_LABEL,
    ...wingsSpine('10X'),
    bolt: { variant: 1 },
  },
  {
    max: 50,
    id: 'mpurple',
    art: [-32.75, -48.26, 154.03, 192.03],
    label: WINGED_LABEL,
    ...wingsSpine('100X'),
    bolt: { variant: 2, sparks: 'small' },
  },
  {
    max: 500,
    id: 'mred',
    art: [-40.62, -57.5, 168.72, 210.34],
    label: WINGED_LABEL,
    ...wingsSpine('500X'),
    bolt: { variant: 3, sparks: 'tall', shake: true },
  },
  {
    max: 1000,
    id: 'mdiamond',
    art: [-33.14, -57.5, 163.46, 197.59],
    label: [0.5112, 0.5363, 0.2506],
    labelShadow: 0.6,
    win: { rig: 'diamond', anim: 'gaoo_1000_multiplier_win' },
    land: 'gaoo_1000_multiplier_land',
    bolt: { variant: 3, sparks: 'tall', shake: true },
  },
]
const multTier = (mult: number) => MULT_TIERS.find((tier) => mult <= tier.max) ?? MULT_TIERS.at(-1)!
const MULT_ORBS = MULT_TIERS.map((tier) => tier.id)
const MULT_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000]
const PAY_TOTAL = PAY_SYMBOLS.reduce((t, [, w]) => t + w, 0)
const ORB_WEIGHT_TOTAL = ORB_WEIGHTS.reduce((t, [, w]) => t + w, 0)

function plainSymbol(): Omit<Sym, 'key'> {
  let w = Math.random() * PAY_TOTAL
  for (const [id, weight] of PAY_SYMBOLS) if ((w -= weight) < 0) return { id }
  return { id: 'blue' }
}

function pickOrbValue() {
  let w = Math.random() * ORB_WEIGHT_TOTAL
  for (const [mult, weight] of ORB_WEIGHTS) if ((w -= weight) < 0) return mult
  return ORB_WEIGHTS[0]![0]
}

const orbReels = new Set<number>()
function pickSymbol(c: number, refill = false): Omit<Sym, 'key'> {
  const stacks = orbReels.has(c) && (!refill || orbReels.size < COLS)
  if (!stacks && Math.random() < ORB_CHANCE) {
    orbReels.add(c)
    const mult = pickOrbValue()
    return { id: multTier(mult).id, mult, strike: true }
  }
  return plainSymbol()
}
function randomGrid() {
  orbReels.clear()
  return Array.from({ length: COLS }, (_, c) =>
    Array.from({ length: ROWS }, (): Sym => ({ ...pickSymbol(c), key: nextKey++ })),
  )
}

function quietGrid() {
  const g = Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, (): Sym => ({ ...plainSymbol(), key: nextKey++ })),
  )
  const count = (id: string) => g.flat().filter((sym) => sym.id === id).length
  for (;;) {
    const over = PAY_SYMBOLS.find(([id]) => count(id) >= 8)?.[0]
    if (!over) return g
    const cells = g.flatMap((col, c) =>
      col.flatMap((sym, r): [number, number][] => (sym.id === over ? [[c, r]] : [])),
    )
    const [c, r] = cells[Math.floor(Math.random() * cells.length)]!
    const room = PAY_SYMBOLS.filter(([id]) => count(id) < 7)
    g[c]![r] = { id: room[Math.floor(Math.random() * room.length)]![0], key: nextKey++ }
  }
}

function placeScatters(g: Sym[][], reels: number[]) {
  for (const c of reels) {
    const col = g[c]!
    const rows = col.flatMap((sym, r) => (sym.mult || sym.id === 'scatter' ? [] : [r]))
    const r = rows[Math.floor(Math.random() * rows.length)]
    if (r !== undefined) col[r] = { id: 'scatter', key: nextKey++ }
  }
  return g
}

const ALL_REELS = Array.from({ length: COLS }, (_, c) => c)
const countScatters = (g: Sym[][]) => g.flat().filter((sym) => sym.id === 'scatter').length
const payX = (id: string, n: number) => PAYS[id]![n >= 12 ? 0 : n >= 10 ? 1 : 2]
type Fresh = Omit<Sym, 'key'>
type SpinScript = { grid: Sym[][]; fresh: Fresh[]; pay: number; retrigger: boolean }

function simulateTumbles(start: Sym[][]) {
  const fresh: Fresh[] = []
  let ids = start.map((col) => col.map((sym) => sym.id))
  let base = 0
  for (;;) {
    const counts = new Map<string, number>()
    for (const col of ids)
      for (const id of col) if (PAYS[id]) counts.set(id, (counts.get(id) ?? 0) + 1)
    const won = [...counts].filter(([, n]) => n >= 8)
    if (!won.length) break
    base += won.reduce((t, [id, n]) => t + payX(id, n), 0)
    const gone = new Set(won.map(([id]) => id))
    ids = ids.map((col) => {
      const kept = col.filter((id) => !gone.has(id))
      const added = Array.from({ length: ROWS - kept.length }, plainSymbol)
      fresh.push(...added)
      return [...added.map((sym) => sym.id), ...kept]
    })
  }
  return { fresh, base }
}

function orbValues(count: number, sum: number) {
  const values: number[] = []
  let left = Math.max(sum, 2 * count)
  for (let i = count; i > 0; i--) {
    const room = left - 2 * (i - 1)
    const fits = MULT_VALUES.filter((v) => v <= room)
    const pick = i === 1 ? fits.at(-1)! : fits[Math.floor(Math.random() * fits.length)]!
    values.push(pick)
    left -= pick
  }
  return values
}

const FS_CANDIDATES = 60
const FS_DEAD_CHANCE = 0.4
const FS_DRAWN_VALUES = 0.75
const FS_DEAD_ORB = 0.45
const FS_NEAR_MISS = 0.6
const FS_ORB_WEIGHT_TOTAL = FS_ORB_WEIGHTS.reduce((t, [, w]) => t + w, 0)

function drawFsOrb() {
  let w = Math.random() * FS_ORB_WEIGHT_TOTAL
  for (const [mult, weight] of FS_ORB_WEIGHTS) if ((w -= weight) < 0) return mult
  return FS_ORB_WEIGHTS[0]![0]
}

function stackedGrid() {
  return Array.from({ length: COLS }, () => {
    const col: Sym[] = []
    for (let r = 0; r < ROWS; r++) {
      const above = col[r - 1]
      const id = above && Math.random() < FS_STACK ? above.id : plainSymbol().id
      col.push({ id, key: nextKey++ })
    }
    return col
  })
}

function nearMiss(grid: Sym[][]): [number, number] | null {
  const id = plainSymbol().id
  const c = Math.floor(Math.random() * COLS)
  const run = 2 + Math.floor(Math.random() * 2)
  const top = Math.floor(Math.random() * (ROWS - run))
  for (let r = top; r < top + run; r++) grid[c]![r] = { id, key: nextKey++ }
  const others = grid
    .flatMap((col, cc) => col.map((sym, rr): [number, number, string] => [cc, rr, sym.id]))
    .filter(([cc, rr]) => cc !== c || rr < top || rr > top + run)
  const have = () => grid.flat().filter((sym) => sym.id === id).length
  for (const [cc, rr, symId] of others.sort(() => Math.random() - 0.5)) {
    if (have() >= 7) break
    if (symId !== id) grid[cc]![rr] = { id, key: nextKey++ }
  }
  while (have() > 7) {
    const extra = others.find(([cc, rr]) => grid[cc]![rr]!.id === id)
    if (!extra) break
    grid[extra[0]]![extra[1]] = { ...plainSymbol(), key: nextKey++ }
  }
  return have() === 7 ? [c, top + run] : null
}

function freeSpinCandidate(prior: number, aim: number, retrigger: boolean): SpinScript {
  const grid = stackedGrid()
  const cells = eachCell((c, r): [number, number] => [c, r])
    .flat()
    .sort(() => Math.random() - 0.5)
  if (aim > 0 && Math.random() < 0.85) {
    const id = plainSymbol().id
    const count = 8 + Math.floor(Math.random() ** 2 * 6)
    for (const [c, r] of cells.splice(0, count)) grid[c]![r] = { id, key: nextKey++ }
  }
  const orbCount =
    aim > 0
      ? Math.random() < 0.6
        ? 1 + Math.floor(Math.random() * 3)
        : 0
      : Math.random() < FS_DEAD_ORB
        ? 1
        : 0
  const miss = aim <= 0 && orbCount && Math.random() < FS_NEAR_MISS ? nearMiss(grid) : null
  const orbCells = miss
    ? [miss]
    : cells
        .filter(([c, r]) => grid[c]![r]!.id !== 'scatter')
        .filter(([c], i, open) => open.findIndex(([other]) => other === c) === i)
        .slice(0, orbCount)
  for (const [c, r] of orbCells)
    grid[c]![r] = { id: 'mgreen', mult: 2, strike: true, key: nextKey++ }
  if (retrigger) {
    for (const c of pickReels(FREE_SPINS.retriggerAt, ALL_REELS)) {
      const rows = grid[c]!.flatMap((sym, r) => (sym.mult ? [] : [r]))
      grid[c]![rows[Math.floor(Math.random() * rows.length)]!] = { id: 'scatter', key: nextKey++ }
    }
  }
  const { fresh, base } = simulateTumbles(grid)
  const values =
    Math.random() < FS_DRAWN_VALUES || !(base > 0 && orbCells.length)
      ? orbCells.map(drawFsOrb)
      : orbValues(orbCells.length, aim / base - prior)
  orbCells.forEach(([c, r], i) => {
    const mult = values[i]!
    grid[c]![r] = { id: multTier(mult).id, mult, strike: true, key: grid[c]![r]!.key }
  })
  const sum = values.reduce((t, v) => t + v, 0)
  const pay = base > 0 && sum > 0 ? base * (prior + sum) : base
  return { grid, fresh, pay, retrigger }
}

type RoundPlan = { target: number; won: number; retriggers: number }

function scriptFreeSpin(plan: RoundPlan, spinsLeft: number) {
  const room = plan.target - plan.won
  const last = spinsLeft <= 1
  const aim =
    room <= 0.01
      ? 0
      : last
        ? room
        : Math.random() < FS_DEAD_CHANCE
          ? 0
          : Math.min(room, (room / spinsLeft) * Math.exp((Math.random() - 0.5) * 2.4))
  const retrigger =
    plan.retriggers < FREE_SPINS.maxRetriggers && Math.random() < FREE_SPINS.retriggerChance
  let best: SpinScript | null = null
  let bestScore = Infinity
  for (let i = 0; i < FS_CANDIDATES; i++) {
    const candidate = freeSpinCandidate(totalMult.value, aim, retrigger)
    const score =
      Math.abs(candidate.pay - aim) + (candidate.pay > room + 0.01 ? 1e6 + candidate.pay : 0)
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }
  if (best?.retrigger) plan.retriggers++
  return best!
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
let freshQueue: Fresh[] | null = null
const landsIn = (sym: Sym) => (sym.fallDelay ?? 0) + fallMs(sym.fall ?? 0)

function refillSymbol(c: number): Omit<Sym, 'key'> {
  const pool = grid.value.flat().filter((sym) => PAYS[sym.id] && !sym.win)
  if (pool.length && Math.random() < REFILL_STICKY)
    return { id: pool[Math.floor(Math.random() * pool.length)]!.id }
  return pickSymbol(c, true)
}

function dropColumn(col: Sym[], c: number): Sym[] {
  const kept = col.filter((sym) => !sym.win)
  const n = ROWS - kept.length
  const fresh = Array.from({ length: n }, (): Sym => ({
    ...(freshQueue?.shift() ?? refillSymbol(c)),
    key: nextKey++,
    fall: n,
  }))
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
const orbLandings = ref(new Map<number, number>())
type ScatterFx = {
  anim: string
  at: number
  rate?: number
  hold?: number
  swell?: CellSwell
}
const scatterFx = ref(new Map<number, ScatterFx>())
const symbolWins = ref(new Map<number, number>())
const cellLightEl = ref<HTMLElement | null>(null)
provide(CELL_LIGHT, cellLightEl)

function markLandings(
  g: Sym[][],
  at: (c: number, r: number) => number,
  moved?: (sym: Sym) => boolean,
) {
  g.forEach((col, c) =>
    col.forEach((sym, r) => {
      if (moved && !moved(sym)) return
      if (sym.mult) orbLandings.value.set(sym.key, at(c, r))
      if (sym.id === 'scatter')
        scatterFx.value.set(sym.key, { anim: SCATTER_RIG.landing, at: at(c, r) })
    }),
  )
}

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
  markLandings(grid.value, (c, r) => landAt(plan, c, r))
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
const strikeFlip = (key: number) => (Math.imul(key + 1, 2654435761) < 0 ? -1 : 1)
let strikesSettleAt = 0

function queueStrikes(g: Sym[][], landsAt: (c: number, r: number) => number) {
  strikes.value = g.flatMap((col, c) =>
    col.flatMap((sym, r) =>
      sym.strike && sym.mult
        ? [
            {
              c,
              r,
              bolt: multTier(sym.mult).bolt,
              flip: strikeFlip(sym.key),
              landAt: landsAt(c, r),
            },
          ]
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
let slam: (() => void) | null = null
const SLAM_DROP = SPEEDS[1]!

function slamStop() {
  if (playing.value && !spinSpeed.value) slam?.()
}

const SLAM_IGNORE = 'button, a, input, .menu-layer, .backdrop, .band'

function onStageClick(e: MouseEvent) {
  const box = stageEl.value?.getBoundingClientRect()
  const inStage =
    !!box &&
    e.clientX >= box.left &&
    e.clientX <= box.right &&
    e.clientY >= box.top &&
    e.clientY <= box.bottom
  const onControl = e.composedPath().some((el) => el instanceof Element && el.matches(SLAM_IGNORE))
  if (e.button === 0 && inStage && !onControl) slamStop()
}

async function spinReels(next: Sym[][]) {
  if (reelsBusy) return false
  reelsBusy = true
  const deals = hasStrike(next)
  if (deals) chargeZeus(ZEUS_SPIN_LAG)
  const at = dropTimings(sp.value, deals)
  dropPlan.value = { start: performance.now(), deals, out: eachCell(at.out), in: eachCell(at.in) }
  const plan = dropPlan.value
  leaving.value = grid.value
  grid.value = next
  reelState.value = 'in'
  if (deals) queueStrikes(next, (c, r) => landAt(plan, c, r))
  markLandings(next, (c, r) => landAt(plan, c, r))
  retime = retimeDrop
  slam = () => retimeDrop(SLAM_DROP)
  await until(
    () =>
      plan.start +
      Math.max(...plan.in.flat().map((cell) => cell.delay + cell.ms)) +
      sp.value.landMs +
      40,
  )
  retime = slam = null
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
const freeMode = ref(false)
const fsLeft = ref(0)
const fsWon = ref(0)
const totalMult = ref(0)
const pillarAt = ref(0)
const pillarBump = ref(0)
const bonusActive = ref(false)
const fsCompleted = ref(false)
const fsLeftShown = ref(false)
const tumbleGap = ref(false)
const notice = computed(() =>
  tumbleGap.value
    ? null
    : freeMode.value || fsLeftShown.value
      ? `FREE SPINS LEFT ${fsLeft.value}`
      : fsCompleted.value
        ? 'FREE SPINS COMPLETED'
        : null,
)
const winOffset = ref(0)
const winCap = computed(() => maxWin.value - (freeMode.value ? fsWon.value : 0))
type PayLine = { count: number; icon: string; amount: number }
const PAY_LINE_MS = 1500
const payLines = ref<PayLine[]>([])
const payIndex = ref(0)
const payLine = computed(() =>
  payLines.value.length && !(freeMode.value && !sp.value.fxRate)
    ? payLines.value[payIndex.value % payLines.value.length]!
    : null,
)
const payTimer = setInterval(() => payIndex.value++, PAY_LINE_MS)
onBeforeUnmount(() => {
  clearInterval(payTimer)
  stopAnticipation()
})

const TOP_MESSAGES: TopMessagePart[][] = [
  ['WIN UP TO 15000 X BET'],
  ['SYMBOLS PAY ANYWHERE ON THE SCREEN'],
  ['4X', { icon: 'scatter' }, 'WINS FREE SPINS'],
  ['HIT', { icon: 'orb' }, 'TO MULTIPLY TUMBLE WIN'],
]
const FREE_TOP_MESSAGES: TopMessagePart[][] = [
  ['WIN UP TO 15000 X BET'],
  ['SYMBOLS PAY ANYWHERE ON THE SCREEN'],
  ['3X', { icon: 'scatter' }, 'RETRIGGERS THE FEATURE'],
  ['HIT', { icon: 'orb' }, 'TO MULTIPLY TUMBLE WIN'],
]
const topMessages = computed(() => (freeMode.value ? FREE_TOP_MESSAGES : TOP_MESSAGES))
const topMessage = ref(0)
const topTimer = setInterval(() => {
  if (tumbleWin.value === 0) topMessage.value = (topMessage.value + 1) % topMessages.value.length
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
  return { c, r, text: formatPeso(win.amount) }
}

const BAR_COUNT_MS = 600
let countFrame = 0
let controlsFrame = 0
const controlsWin = ref(0)

function countUp(shown: Ref<number>, target: number, rate: number, frame: (id: number) => void) {
  if (!rate || !target) {
    shown.value = target
    return
  }
  const from = shown.value
  const begin = performance.now()
  const length = BAR_COUNT_MS / rate
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - begin) / length))
    shown.value = Math.round((from + (target - from) * k) * 100) / 100
    if (k < 1) frame(requestAnimationFrame(step))
  }
  frame(requestAnimationFrame(step))
}

let winTarget = 0

function countTumbleWin(
  target: number,
  rate: number,
  controlsRate: number | null = sp.value.fxRate ? 1 : 0,
) {
  winTarget = target
  cancelAnimationFrame(countFrame)
  countUp(tumbleWin, target, rate, (id) => (countFrame = id))
  if (controlsRate === null) return
  cancelAnimationFrame(controlsFrame)
  countUp(controlsWin, winOffset.value + target, controlsRate, (id) => (controlsFrame = id))
}

const stake = computed(() => (ante.value ? bet.value * 1.25 : bet.value))
const countFinal = (target: number) =>
  countTumbleWin(target, 0, bigWinTier(target, stake.value) ? null : 1)

const bigWin = ref<{ tier: BigWinTier; amount: number; at: number; fast: boolean } | null>(null)
let bigWinEnded: (() => void) | null = null

async function playBigWin(amount: number) {
  const tier = bigWinTier(amount, stake.value)
  if (!tier) return
  await sleep(BIG_WIN.leadMs)
  const at = performance.now()
  const fast = spinSpeed.value > 0
  const from = fast ? winOffset.value + amount : controlsWin.value
  const to = winOffset.value + amount
  cancelAnimationFrame(controlsFrame)
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - at) / 1000 / tier.seconds))
    controlsWin.value = Math.round((from + (to - from) * k) * 100) / 100
    if (k < 1) controlsFrame = requestAnimationFrame(step)
  }
  controlsFrame = requestAnimationFrame(step)
  bigWin.value = { tier, amount, at, fast }
  await new Promise<void>((resolve) => (bigWinEnded = resolve))
}

function stopBigWinCount() {
  cancelAnimationFrame(controlsFrame)
  if (bigWin.value) controlsWin.value = winOffset.value + bigWin.value.amount
}

function endBigWin() {
  bigWin.value = null
  bigWinEnded?.()
  bigWinEnded = null
}

function finishCounts() {
  cancelAnimationFrame(countFrame)
  cancelAnimationFrame(controlsFrame)
  tumbleWin.value = winTarget
  controlsWin.value = winOffset.value + winTarget
}

let lateScatterReel: number | null = null

function dropLateScatter(refill: Sym[][]) {
  if (lateScatterReel === null) return
  const c = lateScatterReel
  const fresh = grid.value[c]!.filter((sym) => sym.win).length
  if (!fresh) return
  const r = Math.floor(Math.random() * fresh)
  refill[c]![r] = { ...refill[c]![r]!, id: 'scatter', mult: undefined, strike: false }
  lateScatterReel = null
}

function withLateScatter(g: Sym[][], reels: number[]) {
  lateScatterReel = null
  const late = Math.random() < FREE_SPINS.lateScatterShare
  if (reels.length !== FREE_SPINS.triggerAt || !late) return placeScatters(g, reels)
  const early = reels.slice(0, -1)
  placeScatters(g, early)
  const ids = new Set(findWins(g).map((w) => w.id))
  const open = ALL_REELS.filter((c) => !early.includes(c) && g[c]!.some((sym) => ids.has(sym.id)))
  if (!open.length) return placeScatters(g, reels.slice(-1))
  lateScatterReel = open[Math.floor(Math.random() * open.length)]!
  return g
}

let anticipating: number[] = []
let anticipationRelease: ReturnType<typeof setTimeout> | undefined

function anticipate() {
  if (anticipating.length) return
  anticipating = grid.value.flat().flatMap((sym) => (sym.id === 'scatter' ? [sym.key] : []))
  const at = performance.now()
  for (const key of anticipating)
    scatterFx.value.set(key, {
      anim: SCATTER_RIG.anticipation,
      at,
      rate: SCATTER_RIG.anticipationRate,
      hold: SCATTER_RIG.anticipationPeak,
      swell: {
        at,
        ms: SCATTER_RIG.anticipationDropMs - SCATTER_RIG.anticipationReleaseMs,
        from: 1,
        to: SCATTER_RIG.anticipationSwell,
        easeOut: true,
      },
    })
}

function stopAnticipation() {
  clearTimeout(anticipationRelease)
  const { anticipationPeak: peak, anticipationReleaseMs: releaseMs } = SCATTER_RIG
  const rate = ((1 - peak) * 1000) / releaseMs
  const at = performance.now() - (peak / rate) * 1000
  const now = performance.now()
  for (const key of anticipating) {
    const fx = scatterFx.value.get(key)
    if (fx?.hold === undefined) continue
    const grown = swellScale(fx.swell, now)
    scatterFx.value.set(key, {
      anim: SCATTER_RIG.anticipation,
      at,
      rate,
      swell: { at: now, ms: releaseMs, from: grown, to: 1 },
    })
  }
  anticipating = []
}

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
    const refill = grid.value.map(dropColumn)
    dropLateScatter(refill)
    const deals = hasStrike(refill)
    total = Math.min(winCap.value, total + wins.reduce((t, w) => t + w.amount, 0))
    payLines.value = wins.map((w) => ({
      count: w.count,
      icon: `${ASSET}/reel/${w.id}.webp`,
      amount: w.amount,
    }))
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
    if (t.fxRate) {
      reelState.value = 'highlight'
      for (const sym of grid.value.flat())
        if (sym.win && SYMBOL_RIGS[sym.id]) symbolWins.value.set(sym.key, fx.start)
    }
    retime = (s) => {
      if (s.fxRate) return
      const turboStart = performance.now() - (WIN_FX.burstAt - TURBO_BURST_LEAD) / rate
      if (turboStart >= fx.start) return
      fx.start = turboStart
      fx.border = false
      reelState.value = 'idle'
      symbolWins.value.clear()
    }
    await until(burstAt)
    retime = null
    reelState.value = 'explode'
    if (!freeMode.value && countScatters(grid.value) === FREE_SPINS.triggerAt - 1) {
      anticipate()
      anticipationRelease = setTimeout(
        stopAnticipation,
        SCATTER_RIG.anticipationDropMs - SCATTER_RIG.anticipationReleaseMs,
      )
      await sleep(
        Math.max(0, SCATTER_RIG.anticipationDropMs - (WIN_FX.tumbleAt - WIN_FX.burstAt) / rate),
      )
    }
    const turbo = !sp.value.fxRate
    const beforeDeal = turbo ? 0 : Math.max(0, WIN_FX.tumbleAt - WIN_FX.burstAt - ZEUS_DEAL_LEAD)
    await sleep(beforeDeal / rate)
    if (deals) chargeZeus()
    await sleep((WIN_FX.tumbleAt - WIN_FX.burstAt - beforeDeal) / rate)
    winRows.value = [
      ...wins.map((w, i) => ({ ...w, key: nextKey++, order: wins.length - 1 - i })),
      ...winRows.value,
    ]
    symbolWins.value.clear()
    grid.value = refill
    if (freeMode.value && sp.value.fxRate) {
      payLines.value = []
      tumbleGap.value = true
    }
    reelState.value = 'tumble'
    const refillAt = performance.now()
    if (deals) queueStrikes(refill, (c, r) => refillAt + landsIn(refill[c]![r]!))
    markLandings(
      refill,
      (c, r) => refillAt + landsIn(refill[c]![r]!),
      (sym) => !!sym.fall && !anticipating.includes(sym.key),
    )
    await sleep(Math.max(...refill.flat().map(landsIn)) + t.landMs + 40)
    await waitForStrikes()
    if (deals) zeus.value?.release()
    reelState.value = 'idle'
    if (total >= winCap.value) break
  }
  tumbleGap.value = false
  stopAnticipation()
  return total
}

function endFreeSpins() {
  if (freeMode.value) fsLeft.value = 0
}

function showMaxWin() {
  maxed.value = true
  finalPop.value = true
  countFinal(winCap.value)
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
const multSlot = ref(0)
const multGhost = ref(0)

const COLLECT = {
  fly: 530,
  hold: 330,
  slide: 210,
  hideX: 100,
  reveal: 70,
  slotLead: 80,
  absorb: 200,
  landOffset: 20,
  landDigitPx: 29,
}
const ABSORB_FRAMES = [
  { scale: 1, opacity: 1, offset: 0 },
  { scale: 0.6, opacity: 1, offset: 0.25 },
  { scale: 0.5, opacity: 0.9, offset: 0.4 },
  { scale: 0.38, opacity: 0, offset: 1 },
]
const PULSE_STEPS = 48
const SWELL = { to: 1.5, leave: 375, flyAt: 615, steps: 60 }
const ZOOM_EASE = [0.26, 0.02, 0.62, 0.58] as const
const orbWins = ref<OrbWin[]>([])
const winningCells = computed(() => new Set(orbWins.value.map((win) => `${win.c}-${win.r}`)))
const endOrbWin = (id: number) => {
  orbWins.value = orbWins.value.filter((win) => win.id !== id)
}
const finalPop = ref(false)

async function mergeTally() {
  const bar = stageEl.value?.querySelector('.tumble-amount.split:not(.ghost)')
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
      duration: COLLECT.slide,
      easing: 'cubic-bezier(0.4, 0.05, 0.8, 0.95)',
      fill: 'forwards',
    }).finished
  sleep(COLLECT.hideX).then(() => (x.style.visibility = 'hidden'))
  await Promise.all([toMiddle(base), toMiddle(mult)])
  await sleep(COLLECT.reveal)
}

function stagePoint(el: Element | null | undefined) {
  const stage = stageEl.value?.getBoundingClientRect()
  const box = el?.getBoundingClientRect()
  if (!stage || !box) return null
  return { x: box.left + box.width / 2 - stage.left, y: box.top + box.height / 2 - stage.top }
}

async function collectOrb(c: number, r: number, mult: number, released: () => void) {
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
        rate: 1,
        x: (l + w * rig.origin[0]) / 100,
        y: (t + h * rig.origin[1]) / 100,
        unit,
      },
    ]
  const key = nextKey++
  const em = orbWidth * tier.label[2]
  flyers.value = [...flyers.value, { key, text: `${mult}x`, em, shadow: tier.labelShadow }]
  multGhost.value += mult
  const next = multGhost.value
  await nextTick()
  const slot = stagePoint(stageEl.value?.querySelector('.tumble-amount.ghost .ta-mult'))
  const designPx = (stageEl.value?.getBoundingClientRect().width ?? 0) / STAGE.w
  const to = slot && { x: slot.x + COLLECT.landOffset * designPx, y: slot.y }
  const landScale = (COLLECT.landDigitPx * designPx) / ((MULT_GLYPH_CAP / MULT_GLYPH_EM) * em || 1)
  grid.value = grid.value.map((col, cc) =>
    col.map((sym, rr) => (cc === c && rr === r ? { ...sym, collected: true } : sym)),
  )
  const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
  if (el && from && to) {
    const at = (x: number, y: number, scale: number) => `translate(${x}px, ${y}px) scale(${scale})`
    const leave = loaded ? SWELL.leave : 0
    const flyAt = loaded ? SWELL.flyAt : 0
    const total = flyAt + COLLECT.fly
    const px = unit * cellWidth
    const steps = loaded ? PULSE_STEPS : 0
    const held = Array.from({ length: steps + 1 }, (_, i) => {
      const o = boneOffset(
        loaded!.data,
        tier.win.anim,
        (SWELL.leave * i) / steps / 1000,
        rig.numberBone,
      )
      return {
        x: from.x + o.x * px,
        y: from.y - o.y * px,
        scale: o.scale,
        offset: (leave * i) / steps / total,
      }
    })
    const start = held.at(-1) ?? { x: from.x, y: from.y, scale: 1 }
    const swellAt = (time: number) => {
      if (time >= flyAt) {
        const k = Math.min(1, (time - flyAt) / COLLECT.fly)
        return SWELL.to + (landScale - SWELL.to) * k * k
      }
      const k = Math.max(0, (time - leave) / (flyAt - leave))
      return start.scale + (SWELL.to - start.scale) * k
    }
    const swell = Array.from({ length: SWELL.steps + 1 }, (_, i) => {
      const time = leave + ((total - leave) * i) / SWELL.steps
      const move = time > flyAt ? bezierEase(ZOOM_EASE, (time - flyAt) / COLLECT.fly) : 0
      return {
        transform: at(
          start.x + (to.x - start.x) * move,
          start.y + (to.y - start.y) * move,
          swellAt(time),
        ),
        offset: Math.min(1, time / total),
      }
    })
    const flight = el.animate(
      [
        ...held.slice(0, -1).map((k) => ({ transform: at(k.x, k.y, k.scale), offset: k.offset })),
        ...swell,
      ],
      { duration: total, fill: 'forwards' },
    )
    sleep(loaded ? rig.nextAt * 1000 : 0).then(released)
    sleep(total - COLLECT.slotLead).then(() => {
      if (!multShown.value) multSlot.value = next
    })
    await flight.finished
    multShown.value = Math.max(multShown.value, next)
    await el.animate(
      ABSORB_FRAMES.map(({ scale, opacity, offset }) => ({
        transform: at(to.x, to.y, landScale * scale),
        opacity,
        offset,
      })),
      { duration: COLLECT.absorb, fill: 'forwards' },
    ).finished
  } else multShown.value = Math.max(multShown.value, next)
  released()
  flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
}

async function flyFromPillar(mult: number) {
  const stage = stageEl.value?.getBoundingClientRect()
  if (!stage) return
  const designPx = stage.width / STAGE.w
  const from = { x: PILLAR.value[0] * designPx, y: PILLAR.value[1] * designPx }
  const em = 72 * UI_PX * designPx
  const key = nextKey++
  flyers.value = [...flyers.value, { key, text: `${mult}x`, em }]
  multGhost.value += mult
  const next = multGhost.value
  await nextTick()
  const slot = stagePoint(stageEl.value?.querySelector('.tumble-amount.ghost .ta-mult'))
  const to = slot && { x: slot.x + COLLECT.landOffset * designPx, y: slot.y }
  const landScale = (COLLECT.landDigitPx * designPx) / ((MULT_GLYPH_CAP / MULT_GLYPH_EM) * em || 1)
  const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
  if (el && to) {
    const at = (x: number, y: number, scale: number) => `translate(${x}px, ${y}px) scale(${scale})`
    const frames = Array.from({ length: SWELL.steps + 1 }, (_, i) => {
      const k = i / SWELL.steps
      const move = bezierEase(ZOOM_EASE, k)
      return {
        transform: at(
          from.x + (to.x - from.x) * move,
          from.y + (to.y - from.y) * move,
          1 + (landScale - 1) * k * k,
        ),
        offset: k,
      }
    })
    const flight = el.animate(frames, { duration: COLLECT.fly, fill: 'forwards' })
    sleep(COLLECT.fly - COLLECT.slotLead).then(() => {
      if (!multShown.value) multSlot.value = next
    })
    await flight.finished
    multShown.value = Math.max(multShown.value, next)
    await el.animate(
      ABSORB_FRAMES.map(({ scale, opacity, offset }) => ({
        transform: at(to.x, to.y, landScale * scale),
        opacity,
        offset,
      })),
      { duration: COLLECT.absorb, fill: 'forwards' },
    ).finished
  } else multShown.value = Math.max(multShown.value, next)
  flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
}

const PILLAR_LAG_MS = 250

function raisePillar(total: number) {
  if (pillarFxLevel(total) !== pillarFxLevel(totalMult.value) || !totalMult.value)
    pillarAt.value = performance.now()
  totalMult.value = total
  pillarBump.value++
}

async function collectMultipliers(total: number) {
  const orbs = grid.value.flatMap((col, c) =>
    col.flatMap((sym, r) => (sym.mult ? [{ c, r, mult: sym.mult }] : [])),
  )
  const sum = orbs.reduce((acc, orb) => acc + orb.mult, 0)
  const prior = freeMode.value ? totalMult.value : 0
  const product = total * (prior + sum)
  const capped = product >= winCap.value
  if (capped) endFreeSpins()
  if (prior) await flyFromPillar(prior)
  const landings = []
  for (const { c, r, mult } of orbs) {
    let released = () => {}
    const leaves = new Promise<void>((resolve) => (released = resolve))
    landings.push(collectOrb(c, r, mult, released))
    await leaves
  }
  await Promise.all(landings)
  await sleep(COLLECT.hold)
  await mergeTally()
  cancelAnimationFrame(countFrame)
  multShown.value = multSlot.value = multGhost.value = 0
  if (freeMode.value) sleep(PILLAR_LAG_MS).then(() => raisePillar(prior + sum))
  if (capped) {
    countTumbleWin(total, 0)
    showMaxWin()
    return
  }
  finalPop.value = true
  countFinal(product)
}

async function playScatterWin(count: number) {
  stopAnticipation()
  const scatters = grid.value.flat().filter((sym) => sym.id === 'scatter')
  for (let play = 0; play < SCATTER_RIG.winPlays; play++) {
    const at = performance.now()
    for (const sym of scatters) scatterFx.value.set(sym.key, { anim: SCATTER_RIG.win, at })
    if (play === 0) {
      const pay = (FREE_SPINS.scatterPays[count] ?? 0) * bet.value
      if (pay) {
        payLines.value = [{ count, icon: `${ASSET}/ui/info-scatter.webp`, amount: pay }]
        payIndex.value = 0
        winTarget = Math.min(winCap.value, winTarget + pay)
        cancelAnimationFrame(controlsFrame)
        countUp(controlsWin, winOffset.value + winTarget, 1, (id) => (controlsFrame = id))
      }
    }
    if (play < SCATTER_RIG.winPlays - 1) await sleep(SCATTER_RIG.winSec * 1000)
    else {
      await sleep(SCATTER_RIG.winSec * 1000 - FS_WINDOW.leftLineMs)
      payLines.value = []
      await sleep(FS_WINDOW.leftLineMs)
    }
  }
}

async function playSpin(script?: SpinScript) {
  stopAnticipation()
  spinSpeed.value = speed.value
  countTumbleWin(0, 0)
  finalPop.value = false
  maxed.value = false
  winRows.value = []
  payLines.value = []
  const next = script?.grid ?? randomGrid()
  freshQueue = script ? [...script.fresh] : null
  if (!(await spinReels(next))) return null
  const total = await tumble()
  freshQueue = null
  if (total >= winCap.value) {
    endFreeSpins()
    showMaxWin()
  } else if (total && grid.value.flat().some((sym) => sym.mult)) await collectMultipliers(total)
  const scatters = countScatters(grid.value)
  const triggers = scatters >= (freeMode.value ? FREE_SPINS.retriggerAt : FREE_SPINS.triggerAt)
  if (triggers) await playScatterWin(scatters)
  await playBigWin(winTarget)
  return { win: winTarget, triggers }
}

const fsWindow = ref<{ kind: WindowKind; amount: string; spins?: number; at: number } | null>(null)
const transitionAt = ref<number | null>(null)
const transitionDim = ref(false)
let windowClosing: (() => void) | null = null
let windowDone: (() => void) | null = null

function showWindow(kind: WindowKind, amount: string, spins?: number) {
  const closing = new Promise<void>((resolve) => (windowClosing = resolve))
  const done = new Promise<void>((resolve) => (windowDone = resolve))
  fsWindow.value = { kind, amount, spins, at: performance.now() }
  return { closing, done }
}

function onWindowClosing() {
  windowClosing?.()
}

function onWindowDone() {
  fsWindow.value = null
  windowDone?.()
}

async function transition(swap: () => void) {
  transitionDim.value = true
  await sleep(TRANSITION.afterOut * 1000)
  transitionAt.value = performance.now()
  await sleep(TRANSITION.swapAt * 1000)
  swap()
  transitionDim.value = false
  await sleep((TRANSITION.length - TRANSITION.swapAt) * 1000)
  transitionAt.value = null
}

async function runFreeSpins() {
  bonusActive.value = true
  payLines.value = []
  fsLeft.value = FREE_SPINS.award
  fsLeftShown.value = true
  const intro = showWindow('start', String(FREE_SPINS.award))
  await intro.closing
  await transition(() => {
    freeMode.value = true
    fsLeftShown.value = false
    bonusActive.value = false
    fsLeft.value = FREE_SPINS.award
    fsWon.value = 0
    totalMult.value = 0
    payLines.value = []
    tumbleWin.value = 0
    winRows.value = []
  })
  await intro.done
  winOffset.value = controlsWin.value
  const plan: RoundPlan = { target: pickRoundTarget(MAX_WIN_X), won: 0, retriggers: 0 }
  let played = 0
  while (fsLeft.value > 0 && fsWon.value < maxWin.value) {
    await sleep(FREE_SPINS.spinGapMs)
    fsLeft.value--
    played++
    const result = await playSpin(scriptFreeSpin(plan, fsLeft.value + 1))
    const won = result?.win ?? 0
    plan.won += won / bet.value
    fsWon.value += won
    winOffset.value += won
    if (maxed.value) break
    if (result?.triggers) {
      const extra = showWindow('additional', `+${FREE_SPINS.retrigger}`)
      await extra.done
      fsLeft.value += FREE_SPINS.retrigger
    }
  }
  const roundWin = winOffset.value
  credit.value = Math.round((credit.value + fsWon.value) * 100) / 100
  const summary = showWindow('result', formatPeso(roundWin), played)
  await summary.closing
  await transition(() => {
    freeMode.value = false
    totalMult.value = 0
    fsLeft.value = 0
    payLines.value = []
    tumbleWin.value = 0
  })
  await summary.done
  fsCompleted.value = true
  winOffset.value = 0
  controlsWin.value = roundWin
}

async function onSpin(bought = false) {
  if (rulesOpen.value || autoplayMenu.value || buyBlocking.value || playing.value) return
  if (!bought) {
    if (credit.value < stake.value) return
    credit.value = Math.round((credit.value - stake.value) * 100) / 100
  }
  betMenu.value = false
  playing.value = true
  winOffset.value = 0
  fsCompleted.value = false
  bonusActive.value = bought
  try {
    const trigger = bought || Math.random() < triggerChance(ante.value)
    const reels = bought ? FREE_SPINS.buyReels : ALL_REELS
    const count = bought ? FREE_SPINS.triggerAt : scatterCount(trigger)
    const picked = pickReels(count, reels)
    lateScatterReel = null
    const grid = bought
      ? placeScatters(quietGrid(), picked)
      : withLateScatter(randomGrid(), picked)
    const result = await playSpin({ grid, fresh: [], pay: 0, retrigger: false })
    if (!result) return
    credit.value = Math.round((credit.value + result.win) * 100) / 100
    if (result.triggers) {
      await runFreeSpins()
    }
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
const symbolPlace = (id: string): CellPlace => {
  const [l, t, w, h] = REEL_ART[id]!
  const { origin, unitPx, spriteWidth } = SYMBOL_RIGS[id]!
  return {
    x: (l + w * origin[0]) / 100,
    y: (t + h * origin[1]) / 100,
    unit: ((w / 100) * unitPx) / spriteWidth,
  }
}
const orbPlace = (mult: number): CellPlace => {
  const {
    art: [l, t, w, h],
    win: { rig },
  } = multTier(mult)
  const { origin, unitPx, spriteWidth } = ORB_RIGS[rig]
  return {
    x: (l + w * origin[0]) / 100,
    y: (t + h * origin[1]) / 100,
    unit: ((w / 100) * unitPx) / spriteWidth,
  }
}
const labelOrigin = (mult: number) => {
  const { left, top } = labelStyle(mult)
  return `${left} ${top}`
}
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
  STRIKE_FX.file,
  'ui/tumble-win.webp',
  'ui/tumble-digits.webp',
  ...UI.map((n) => `ui/${n}.webp`),
  ...Object.keys(REEL_ART).map((n) => `reel/${n}.webp`),
  ...MULT_ORBS.map((n) => `reel/${n}.webp`),
  'ui/info-scatter.webp',
  'ui/info-orb.webp',
  COIN.file,
  BIG_WIN_FONT.file,
  'free-background.webp',
  'ui/pillar.webp',
  'ui/fs-left.webp',
  'ui/fs-congratulations.webp',
  'ui/fs-digits.webp',
]
const FREE_SPINS_RIGS = [
  FS_WINDOW.banner.file,
  TRANSITION.file,
  'fx/pillar-over',
  'fx/pillar-under',
  SCATTER_RIG.fg,
  SCATTER_RIG.bg,
]

const music = useLoopingMusic(`${ASSET}/gates-of-olympus-1000-bgm.m4a`, 0.5)

const credit = ref(100000)
const bet = ref(5)
const muted = ref(false)
const autoplay = ref(false)

type GameModal = 'autoplay' | 'rules' | 'bet' | 'buy'
const modal = ref<GameModal | null>(null)
function modalFlag(name: GameModal) {
  return computed({
    get: () => modal.value === name,
    set: (open) => {
      if (open) modal.value = name
      else if (modal.value === name) modal.value = null
    },
  })
}
const autoplayMenu = modalFlag('autoplay')
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
    if (rulesOpen.value || autoplayMenu.value || buyBlocking.value) {
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
const rulesOpen = modalFlag('rules')
const betMenu = modalFlag('bet')
const buyPopup = modalFlag('buy')
const buyClosing = ref(false)
const buyBlocking = computed(() => buyPopup.value || buyClosing.value)

function openBuy() {
  if (playing.value || autoplay.value || !canBuy.value) return
  buyClosing.value = false
  buyPopup.value = true
}

let buyConfirmed = false

function answerBuy(buy: boolean) {
  buyConfirmed = buy && canBuy.value
  if (buyConfirmed) credit.value = Math.round((credit.value - buyCost.value) * 100) / 100
  buyClosing.value = true
  buyPopup.value = false
}

function buyClosed() {
  buyClosing.value = false
  if (!buyConfirmed) return
  buyConfirmed = false
  void onSpin(true)
}
const volume = ref(50)
watch(muted, (m) => music.setMuted(m))
const shownMuted = computed({
  get: () => muted.value || music.blocked.value,
  set: (m) => (muted.value = m),
})
watch(volume, (v) => music.setVolume(v / 100))

const ante = ref(false)
const buyCost = computed(() => bet.value * 100)
const buyPrice = computed(() => formatPeso(buyCost.value))
const canBuy = computed(() => !ante.value && credit.value >= buyCost.value)
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
    ...(['wings', 'diamond'] as const).map((rig) => loadRig(ASSET, rig).catch(() => {})),
    ...Object.values(SYMBOL_RIGS).map((rig) => loadSpine(ASSET, rig.file).catch(() => {})),
    loadSpine(ASSET, BUY_POPUP_RIG).catch(() => {}),
    loadSpine(ASSET, BIG_WIN.rig).catch(() => {}),
    ...FREE_SPINS_RIGS.map((file) => loadSpine(ASSET, file).catch(() => {})),
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
  <div v-else class="game" @click="onStageClick">
    <div class="scenery">
      <img
        v-if="!freeMode"
        class="background"
        :src="`${ASSET}/background.webp`"
        alt=""
        draggable="false"
      />
      <img
        v-else
        class="background free"
        :src="`${ASSET}/free-background.webp`"
        alt=""
        draggable="false"
      />
    </div>

    <div ref="stageEl" class="stage">
      <ZeusSpine ref="zeus" :asset="ASSET" />
      <img
        class="ui board-shadow"
        :src="`${ASSET}/ui/board-shadow.webp`"
        alt=""
        draggable="false"
      />
      <img class="ui board-back" :src="`${ASSET}/ui/board-back.webp`" alt="" draggable="false" />

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
              'spine-win': layer.name === 'current' && symbolWins.has(sym.key),
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
            <CellSpine
              v-if="layer.name === 'current' && symbolWins.has(sym.key)"
              :file="SYMBOL_RIGS[sym.id]!.file"
              :anim="SYMBOL_RIGS[sym.id]!.anim"
              :at="symbolWins.get(sym.key)!"
              :place="symbolPlace(sym.id)"
              :asset="ASSET"
            />
            <template
              v-if="sym.id === 'scatter' && layer.name === 'current' && scatterFx.has(sym.key)"
            >
              <CellSpine
                v-for="file in [SCATTER_RIG.bg, SCATTER_RIG.fg]"
                :key="file"
                :file="file"
                :anim="scatterFx.get(sym.key)!.anim"
                :at="scatterFx.get(sym.key)!.at"
                :rate="scatterFx.get(sym.key)!.rate"
                :hold="scatterFx.get(sym.key)!.hold"
                :swell="scatterFx.get(sym.key)!.swell"
                :place="SCATTER_RIG.place"
                :asset="ASSET"
                free
              />
            </template>
            <OrbLanding
              v-if="sym.mult && layer.name === 'current' && orbLandings.has(sym.key)"
              :rig="multTier(sym.mult).win.rig"
              :anim="multTier(sym.mult).land"
              :at="orbLandings.get(sym.key)!"
              :place="orbPlace(sym.mult)"
              :origin="labelOrigin(sym.mult)"
              :asset="ASSET"
              @done="orbLandings.delete(sym.key)"
            >
              <MultiplierLabel
                class="mult"
                :text="`${sym.mult}x`"
                :shadow="multTier(sym.mult).labelShadow"
                :style="labelStyle(sym.mult)"
              />
            </OrbLanding>
            <MultiplierLabel
              v-else-if="sym.mult && !sym.collected"
              class="mult"
              :text="`${sym.mult}x`"
              :shadow="multTier(sym.mult).labelShadow"
              :style="labelStyle(sym.mult)"
            />
          </div>
        </div>
      </div>
      <img class="ui board-front" :src="`${ASSET}/ui/board-front.webp`" alt="" draggable="false" />
      <div ref="cellLightEl" class="cell-light" />
      <StrikeEffects :strikes="strikes" :asset="ASSET" :shake="stageEl" />
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

      <FreeSpinsPanel
        v-if="freeMode"
        :asset="ASSET"
        :total="totalMult"
        :left="fsLeft"
        :level-at="pillarAt"
        :bump-key="pillarBump"
      />
      <template v-else>
        <BuyFreeSpins
          :asset="ASSET"
          :price="buyPrice"
          :disabled="!canBuy || playing"
          :hidden="buyPopup"
          :active="bonusActive"
          @buy="openBuy"
        />
        <AnteBet v-model="ante" :asset="ASSET" :price="antePrice" :locked="bonusActive" />
      </template>

      <img
        class="ui history-back"
        :src="`${ASSET}/ui/history-back.webp`"
        alt=""
        draggable="false"
      />

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
      <img
        class="ui history-frame"
        :src="`${ASSET}/ui/history-frame.webp`"
        alt=""
        draggable="false"
      />

      <Transition name="top-win">
        <div v-if="tumbleWin > 0" key="win" class="ui tumble-win">
          <img class="tumble-plate" :src="`${ASSET}/ui/tumble-win.webp`" alt="" draggable="false" />
          <TumbleWinTitle :scale="TUMBLE_PLATE.scale" :baseline="TUMBLE_PLATE.titleBaseline" />
          <span v-if="multGhost" class="tumble-amount split ghost" aria-hidden="true">
            <TumbleNumber :text="formatPeso(tumbleWin)" :asset="ASSET" />
            <TumbleNumber text="x" :asset="ASSET" />
            <TumbleNumber class="ta-mult" :text="String(multGhost)" :asset="ASSET" />
          </span>
          <span v-if="multShown || multSlot" key="split" class="tumble-amount split">
            <TumbleNumber class="ta-base" :text="formatPeso(tumbleWin)" :asset="ASSET" />
            <TumbleNumber class="ta-x" text="x" :asset="ASSET" />
            <TumbleNumber
              :key="multShown"
              class="ta-mult"
              :class="multShown ? 'bump' : 'reserved'"
              :text="String(multShown || multSlot)"
              :asset="ASSET"
            />
          </span>
          <span v-else key="plain" class="tumble-amount" :class="{ 'final-pop': finalPop }">
            <MaxWinLabel v-if="maxed" />
            <TumbleNumber :text="formatPeso(tumbleWin)" :asset="ASSET" />
          </span>
        </div>
        <div v-else key="info" class="top-info">
          <Transition name="top-swap">
            <TopMessage
              :key="topMessage"
              class="top-msg"
              :parts="topMessages[topMessage % topMessages.length]!"
              :asset="ASSET"
              :scale="TUMBLE_PLATE.scale"
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

    <div v-if="autoplayMenu" class="stage menu-layer menu-in autoplay-in">
      <AutoplaySettings
        v-model:speed="speed"
        @close="autoplayMenu = false"
        @start="startAutoplay"
      />
    </div>

    <div v-if="rulesOpen" class="stage menu-layer menu-in rules-in">
      <GameRules :bet="bet" @close="rulesOpen = false" />
    </div>

    <BuyFeaturePopup
      v-if="buyBlocking"
      :asset="ASSET"
      :price="buyPrice"
      @answer="answerBuy"
      @closed="buyClosed"
    />

    <div v-if="transitionDim" class="transition-dim" :style="{ opacity: FS_WINDOW.dim }" />
    <FreeSpinsWindow
      v-if="fsWindow"
      :key="fsWindow.at"
      :asset="ASSET"
      :kind="fsWindow.kind"
      :amount="fsWindow.amount"
      :spins="fsWindow.spins"
      :at="fsWindow.at"
      :wait-for-click="fsWindow.kind !== 'additional' && !autoplay"
      @closing="onWindowClosing"
      @done="onWindowDone"
    />
    <GameControls
      v-model:bet="bet"
      v-model:muted="shownMuted"
      v-model:volume="volume"
      v-model:autoplay="autoplay"
      v-model:speed="speed"
      @autoplay-menu="autoplayMenu = true"
      @bet-menu="betMenu = true"
      :credit="credit"
      :stake="stake"
      :busy="playing"
      :bet-menu-open="betMenu"
      :win="controlsWin"
      :pay-line="payLine"
      :notice="notice"
      @spin="onSpin"
      @stop="slamStop"
      @info="rulesOpen = !rulesOpen"
      @sound-ready="music.play()"
      @volume-open="modal = null"
    />
    <BigWin
      v-if="bigWin"
      :asset="ASSET"
      :tier="bigWin.tier"
      :amount="bigWin.amount"
      :at="bigWin.at"
      :fast="bigWin.fast"
      @stop="stopBigWinCount"
      @done="endBigWin"
    />
    <div v-if="transitionAt" class="transition">
      <StageSpine
        :asset="ASSET"
        :file="TRANSITION.file"
        :anim="TRANSITION.anim"
        :at="transitionAt"
        :x="TRANSITION.x"
        :y="TRANSITION.y"
        :scale="TRANSITION.scale"
      />
    </div>
    <button type="button" class="back-btn" aria-label="Back to lobby" @click="goBack">
      <svg viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="10" />
        <path d="M15.5 11H6.5M10.5 7 6.5 11l4 4" />
      </svg>
    </button>
    <template v-if="betMenu">
      <div class="backdrop menu-layer" @click="betMenu = false" />
      <div class="stage menu-layer menu-in">
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

.scenery,
.stage {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(100vw, 100vh * 16 / 9);
  height: min(100vh, 100vw * 9 / 16);
}

.scenery {
  pointer-events: none;
}

.background {
  position: absolute;
  left: -34.4513%;
  top: -37.1491%;
  width: 168.8672%;
  height: 141.7361%;
  max-width: none;
}

.stage {
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

.menu-in {
  transform-origin: 77.85% 43.81%;
  animation:
    fade-in 195ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    menu-shrink 165ms cubic-bezier(0, 0, 0.58, 1);
}

.autoplay-in {
  transform-origin: 50.12% 44.45%;
  animation:
    fade-in 155ms cubic-bezier(0.42, 0, 1, 1),
    menu-shrink 125ms linear;
}

.rules-in {
  transform-origin: 50.12% 44.45%;
}

@keyframes menu-shrink {
  from {
    scale: 1.2;
  }
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

.background.free {
  left: -26.1172%;
  top: -22.1961%;
  width: 152.8036%;
  height: 122.5496%;
}

.transition-dim {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: #000;
  pointer-events: none;
}

.transition {
  position: absolute;
  inset: 0;
  z-index: 9;
  pointer-events: none;
}

.board-shadow {
  left: 14.386%;
  top: 6.957%;
  width: 71.171%;
}

.board-back {
  left: 15.456%;
  top: 9.009%;
  width: 69.032%;
}

.board-front {
  left: 13.063%;
  top: 4.905%;
  width: 73.874%;
}

.board-shadow,
.board-back,
.board-front,
.reels,
.cell-light,
.tumble-win {
  translate: calc(var(--shake-x, 0) * 1cqw / 19.2) calc(var(--shake-y, 0) * 1cqw / 19.2);
}

.tumble-win {
  left: 33.594%;
  top: 0;
  width: 32.8125%;
  aspect-ratio: 633 / 102;
  z-index: 4;
}

.ui > img.tumble-plate {
  position: absolute;
  left: -0.2594cqw;
  top: -0.2073cqw;
  width: 33.3661cqw;
  max-width: none;
}

.top-info {
  position: absolute;
  left: 0;
  right: 0;
  top: -1.6458cqw;
  display: grid;
  place-items: center;
  z-index: 4;
}

.top-msg {
  grid-area: 1 / 1;
  display: block;
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

.tumble-amount.ghost,
.ta-mult.reserved {
  visibility: hidden;
}

.ta-mult.bump {
  animation: amount-bump 190ms;
}

.tumble-amount.final-pop {
  animation: amount-final 240ms ease-in-out;
}

@keyframes amount-final {
  37% {
    scale: 1.47;
  }
}

@keyframes amount-bump {
  0% {
    animation-timing-function: ease-out;
  }
  37% {
    scale: 1.45;
    animation-timing-function: ease-in-out;
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

.cell-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
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

.cell.winning > .sym,
.cell:has(> .cell-spine.drawn) > .sym {
  visibility: hidden;
}

.mult {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}

.reels.highlight .cell.win:not(.spine-win) {
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

.history-back {
  left: -0.253%;
  top: 56.166%;
  width: 15.372%;
}

.history-frame {
  left: 0.45%;
  top: 58.168%;
  width: 13.964%;
}

.back-btn {
  --px: calc(min(100vw, 100vh * 16 / 9) / 1689);
  position: absolute;
  z-index: 9;
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
