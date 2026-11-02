<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import GameControls from '@/games/shared/GameControls.vue'
import GameLoader from '@/games/shared/GameLoader.vue'
import BetMenu from '@/games/shared/BetMenu.vue'
import AnteBet from '@/games/gates-of-olympus/components/AnteBet.vue'
import AutoplaySettings from '@/games/gates-of-olympus/components/AutoplaySettings.vue'
import BigWin from '@/games/gates-of-olympus/components/BigWin.vue'
import BuyFeaturePopup from '@/games/gates-of-olympus/components/BuyFeaturePopup.vue'
import BuyFreeSpins from '@/games/gates-of-olympus/components/BuyFreeSpins.vue'
import CellSpine, {
  CELL_LIGHT,
  type CellSwell,
  swellScale,
} from '@/games/gates-of-olympus/components/CellSpine.vue'
import FreeSpinsPanel from '@/games/gates-of-olympus/components/FreeSpinsPanel.vue'
import FreeSpinsWindow, {
  type WindowKind,
} from '@/games/gates-of-olympus/components/FreeSpinsWindow.vue'
import GameRules from '@/games/gates-of-olympus/components/GameRules.vue'
import MaxWinLabel from '@/games/gates-of-olympus/components/MaxWinLabel.vue'
import MultiplierLabel from '@/games/gates-of-olympus/components/MultiplierLabel.vue'
import OrbLanding from '@/games/gates-of-olympus/components/OrbLanding.vue'
import OrbWinEffects from '@/games/gates-of-olympus/components/OrbWinEffects.vue'
import SpeedToast from '@/games/gates-of-olympus/components/SpeedToast.vue'
import StageSpine from '@/games/gates-of-olympus/components/StageSpine.vue'
import StrikeEffects from '@/games/gates-of-olympus/components/StrikeEffects.vue'
import TopMessage from '@/games/gates-of-olympus/components/TopMessage.vue'
import TumbleNumber from '@/games/gates-of-olympus/components/TumbleNumber.vue'
import TumbleWinTitle from '@/games/gates-of-olympus/components/TumbleWinTitle.vue'
import WinEffects from '@/games/gates-of-olympus/components/WinEffects.vue'
import WinList from '@/games/gates-of-olympus/components/WinList.vue'
import ZeusSpine from '@/games/gates-of-olympus/components/ZeusSpine.vue'
import { ASSET, MUSIC, loadGameAssets, loadStages } from '@/games/gates-of-olympus/engine/assets'
import { BIG_WIN, bigWinTier, type BigWinTier } from '@/games/gates-of-olympus/engine/bigWin'
import {
  COLLECT,
  PILLAR_LAG_MS,
  absorbFrames,
  orbFlight,
  pillarFlight,
  type Point,
} from '@/games/gates-of-olympus/engine/collect'
import {
  FREE_SPINS,
  FS_WINDOW,
  PILLAR,
  SCATTER_RIG,
  TRANSITION,
  pickReels,
  pickRoundTarget,
  pillarFxLevel,
  scatterCount,
  triggerChance,
} from '@/games/gates-of-olympus/engine/freeSpins'
import {
  ALL_REELS,
  countScatters,
  dropColumn,
  hasStrike,
  openingGrid,
  placeScatters,
  quietGrid,
  randomGrid,
  scriptFreeSpin,
  winLabel,
  type RoundPlan,
  type SpinScript,
} from '@/games/gates-of-olympus/engine/grid'
import {
  artBox,
  findWins,
  labelOrigin,
  labelStyle,
  multTier,
  newKey,
  orbPlace,
  orbRigPlace,
  symArt,
  symbolPlace,
  tierVars,
  type Fresh,
  type Sym,
  type WinRow,
} from '@/games/gates-of-olympus/engine/symbols'
import {
  AUTOPLAY_GAP_MS,
  BAR_COUNT_MS,
  PAY_LINE_MS,
  SLAM_DROP,
  SPEEDS,
  STRIKE_HOLD,
  TURBO_BURST_LEAD,
  TURBO_SCATTER_HOLD,
  ZEUS_DEAL_LEAD,
  ZEUS_FAST_HOLD,
  ZEUS_SPIN_LAG,
  dropEnd,
  dropTimings,
  eachCell,
  fallEase,
  fallMs,
  landAt,
  landsIn,
  retimePlan,
  sleep,
  strikeFlip,
  until,
  type DropPlan,
  type Speed,
} from '@/games/gates-of-olympus/engine/timing'
import {
  FREE_TOP_MESSAGES,
  TOP_MESSAGES,
  TOP_MESSAGE_MS,
} from '@/games/gates-of-olympus/engine/topMessages'
import {
  ORB_RIGS,
  STAGE,
  SYMBOL_RIGS,
  UI_PX,
  WIN_FX,
  type OrbWin,
  type Strike,
  type WinFx,
} from '@/games/gates-of-olympus/engine/winFx'
import { loadRig } from '@/games/gates-of-olympus/spine/rigs'
import { boneOffset } from '@/games/gates-of-olympus/spine/spineLite'
import { MULT_GLYPH_CAP, MULT_GLYPH_EM } from '@/games/gates-of-olympus/text/multGlyphs'
import { useCountUp } from '@/composables/useCountUp'
import { useLoopingMusic } from '@/composables/useLoopingMusic'
import { formatPeso } from '@/utils/format'
import { publicUrl } from '@/utils/publicUrl'

const TUMBLE_PLATE = { scale: 640.63 / 596, titleBaseline: 28.3 }

const grid = ref<Sym[][]>(openingGrid())
const leaving = ref<Sym[][] | null>(null)
const reelState = ref<'idle' | 'in' | 'highlight' | 'explode' | 'tumble'>('idle')
let reelsBusy = false
let freshQueue: Fresh[] | null = null

const spinSpeed = ref(0)
const sp = computed(() => SPEEDS[spinSpeed.value]!)
const reelVars = computed(() => ({
  '--land-ms': `${sp.value.landMs}ms`,
  '--pop-ms': `${WIN_FX.popLength / (sp.value.fxRate || 1)}ms`,
  '--vanish-ms': `${WIN_FX.vanishLength / (sp.value.fxRate || 1)}ms`,
}))
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

function retimeDrop(s: Speed) {
  const plan = dropPlan.value
  if (!plan) return
  retimePlan(plan, s, performance.now() - plan.start)
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

const zeus = ref<InstanceType<typeof ZeusSpine> | null>(null)
function chargeZeus(delayMs = 0) {
  if (spinSpeed.value) zeus.value?.charge(0, ZEUS_FAST_HOLD)
  else zeus.value?.charge(delayMs)
}
const strikes = ref<Strike[]>([])
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

const waitForStrikes = () => until(() => strikesSettleAt)
let retime: ((s: Speed) => void) | null = null
let slam: (() => void) | null = null

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
  await until(() => dropEnd(plan) + sp.value.landMs + 40)
  retime = slam = null
  await waitForStrikes()
  if (deals) zeus.value?.release()
  dropPlan.value = null
  leaving.value = null
  reelState.value = 'idle'
  reelsBusy = false
  return true
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

const topMessages = computed(() => (freeMode.value ? FREE_TOP_MESSAGES : TOP_MESSAGES))
const topMessage = ref(0)
const topTimer = setInterval(() => {
  if (tumbleWin.value === 0) topMessage.value = (topMessage.value + 1) % topMessages.value.length
}, TOP_MESSAGE_MS)
onBeforeUnmount(() => clearInterval(topTimer))
const WIN_ROWS_SHOWN = 4
const winRows = ref<WinRow[]>([])
const shownWinRows = computed(() => winRows.value.slice(0, WIN_ROWS_SHOWN))
const winFx = ref<WinFx | null>(null)

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
  const ids = new Set(findWins(g, bet.value).map((w) => w.id))
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
    const wins = findWins(grid.value, bet.value)
    if (!wins.length) break
    const t = sp.value
    const ids = new Set(wins.map((w) => w.id))
    grid.value = grid.value.map((col) =>
      col.map((sym) => (ids.has(sym.id) ? { ...sym, win: true } : sym)),
    )
    const refill = grid.value.map((col, c) => dropColumn(col, c, grid.value, freshQueue))
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
      id: newKey(),
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
      ...wins.map((w, i) => ({ ...w, key: newKey(), order: wins.length - 1 - i })),
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
    { id: '', count: 0, amount: maxWin.value, key: newKey(), order: 0, max: true },
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

function ghostSlot(designPx: number) {
  const slot = stagePoint(stageEl.value?.querySelector('.tumble-amount.ghost .ta-mult'))
  return slot && { x: slot.x + COLLECT.landOffset * designPx, y: slot.y }
}

const landScaleFor = (em: number, designPx: number) =>
  (COLLECT.landDigitPx * designPx) / ((MULT_GLYPH_CAP / MULT_GLYPH_EM) * em || 1)

async function absorbFlyer(
  el: HTMLElement,
  flight: Animation,
  to: Point,
  landScale: number,
  next: number,
) {
  await flight.finished
  multShown.value = Math.max(multShown.value, next)
  await el.animate(absorbFrames(to, landScale), { duration: COLLECT.absorb, fill: 'forwards' })
    .finished
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
  const place = orbRigPlace(tier)
  if (loaded)
    orbWins.value = [
      ...orbWins.value,
      {
        id: newKey(),
        c,
        r,
        rig: tier.win.rig,
        anim: tier.win.anim,
        at: performance.now(),
        rate: 1,
        ...place,
      },
    ]
  const key = newKey()
  const em = orbWidth * tier.label[2]
  flyers.value = [...flyers.value, { key, text: `${mult}x`, em, shadow: tier.labelShadow }]
  multGhost.value += mult
  const next = multGhost.value
  await nextTick()
  const designPx = (stageEl.value?.getBoundingClientRect().width ?? 0) / STAGE.w
  const to = ghostSlot(designPx)
  const landScale = landScaleFor(em, designPx)
  grid.value = grid.value.map((col, cc) =>
    col.map((sym, rr) => (cc === c && rr === r ? { ...sym, collected: true } : sym)),
  )
  const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
  if (el && from && to) {
    const bone = loaded
      ? (seconds: number) => boneOffset(loaded.data, tier.win.anim, seconds, rig.numberBone)
      : null
    const { duration, frames } = orbFlight(from, to, landScale, place.unit * cellWidth, bone)
    const flight = el.animate(frames, { duration, fill: 'forwards' })
    sleep(loaded ? rig.nextAt * 1000 : 0).then(released)
    sleep(duration - COLLECT.slotLead).then(() => {
      if (!multShown.value) multSlot.value = next
    })
    await absorbFlyer(el, flight, to, landScale, next)
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
  const key = newKey()
  flyers.value = [...flyers.value, { key, text: `${mult}x`, em }]
  multGhost.value += mult
  const next = multGhost.value
  await nextTick()
  const to = ghostSlot(designPx)
  const landScale = landScaleFor(em, designPx)
  const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
  if (el && to) {
    const flight = el.animate(pillarFlight(from, to, landScale), {
      duration: COLLECT.fly,
      fill: 'forwards',
    })
    sleep(COLLECT.fly - COLLECT.slotLead).then(() => {
      if (!multShown.value) multSlot.value = next
    })
    await absorbFlyer(el, flight, to, landScale, next)
  } else multShown.value = Math.max(multShown.value, next)
  flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
}

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
  else if (scatters && !total && !sp.value.fxRate) await sleep(TURBO_SCATTER_HOLD)
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
    const result = await playSpin(scriptFreeSpin(plan, fsLeft.value + 1, totalMult.value))
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
    const grid = bought ? placeScatters(quietGrid(), picked) : withLateScatter(randomGrid(), picked)
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

const music = useLoopingMusic(MUSIC, 0.5)

const DEMO_CREDIT = 100000
const REFILL_BELOW = 10000
const credit = ref(DEMO_CREDIT)
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
const autoCount = ref(100)

function startAutoplay(settings: { count: number; speed: number; skipScreens: boolean }) {
  autoplayMenu.value = false
  speed.value = settings.speed
  skipScreens.value = settings.skipScreens
  autoCount.value = settings.count
  autoLeft.value = settings.count
  autoplay.value = true
}

watch(autoplay, async (on) => {
  if (!on) return
  while (autoplay.value && autoLeft.value > 0) {
    if (rulesOpen.value || autoplayMenu.value || buyBlocking.value) {
      await sleep(300)
      continue
    }
    autoLeft.value--
    await onSpin()
    if (speed.value !== 2 || controlsWin.value) await sleep(AUTOPLAY_GAP_MS)
  }
  const ranOut = autoplay.value
  autoplay.value = false
  if (ranOut && !modal.value) autoplayMenu.value = true
})

const speed = ref(0)
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

const REFILL_MS = 2000
const refilling = ref(false)
const shownCredit = useCountUp(() => credit.value, {
  ready: () => refilling.value,
  duration: REFILL_MS,
})
let refillTimer: ReturnType<typeof setTimeout> | undefined

watch([credit, playing, buyBlocking], async () => {
  if (playing.value) refilling.value = false
  if (playing.value || buyBlocking.value || refilling.value || credit.value >= REFILL_BELOW) return
  refilling.value = true
  await nextTick()
  credit.value = Math.round((credit.value + DEMO_CREDIT) * 100) / 100
  clearTimeout(refillTimer)
  refillTimer = setTimeout(() => (refilling.value = false), REFILL_MS)
})

const loading = ref(true)
const loadProgress = ref(0)

async function preload() {
  const assets = loadGameAssets(music.ready)
  const started = Date.now()
  const reach = (ms: number) => sleep(Math.max(0, ms - (Date.now() - started)))
  for (const [ms, progress] of loadStages()) {
    await reach(ms)
    if (progress === 1) await assets
    loadProgress.value = progress
  }
  await sleep(250)
  loading.value = false
}

onMounted(preload)
onBeforeUnmount(() => {
  cancelAnimationFrame(countFrame)
  cancelAnimationFrame(controlsFrame)
  clearTimeout(refillTimer)
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

      <WinList :rows="shownWinRows" :asset="ASSET" />
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

      <SpeedToast :show="speedToast" :speed="speed" />
    </div>

    <div v-if="autoplayMenu" class="stage menu-layer menu-in autoplay-in">
      <AutoplaySettings
        v-model:speed="speed"
        :count="autoCount"
        :skip-screens="skipScreens"
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
      :credit="shownCredit"
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
