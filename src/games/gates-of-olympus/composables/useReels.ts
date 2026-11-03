import { computed, provide, ref } from 'vue'
import { CELL_LIGHT, type CellSwell } from '@/games/gates-of-olympus/components/CellSpine.vue'
import type ZeusSpine from '@/games/gates-of-olympus/components/ZeusSpine.vue'
import { SCATTER_RIG } from '@/games/gates-of-olympus/engine/freeSpins'
import { hasStrike, type GridEngine } from '@/games/gates-of-olympus/engine/grid'
import { multTier, tierVars, type Sym } from '@/games/gates-of-olympus/engine/symbols'
import {
  SLAM_DROP,
  SPEEDS,
  STRIKE_HOLD,
  ZEUS_FAST_HOLD,
  ZEUS_SPIN_LAG,
  dropEnd,
  dropTimings,
  eachCell,
  fallEase,
  fallMs,
  landAt,
  retimePlan,
  strikeFlip,
  until,
  type DropPlan,
  type Speed,
} from '@/games/gates-of-olympus/engine/timing'
import { WIN_FX, type Strike } from '@/games/gates-of-olympus/engine/winFx'

export type ReelState = 'idle' | 'in' | 'highlight' | 'explode' | 'tumble'

export type ScatterFx = {
  anim: string
  at: number
  rate?: number
  hold?: number
  swell?: CellSwell
}

type LandsAt = (c: number, r: number) => number

export function useReels(engine: GridEngine) {
  const grid = ref<Sym[][]>(engine.openingGrid())
  const leaving = ref<Sym[][] | null>(null)
  const reelState = ref<ReelState>('idle')
  let busy = false

  const spinSpeed = ref(0)
  const sp = computed(() => SPEEDS[spinSpeed.value]!)
  const reelVars = computed(() => ({
    '--land-ms': `${sp.value.landMs}ms`,
    '--pop-ms': `${WIN_FX.popLength / (sp.value.fxRate || 1)}ms`,
    '--vanish-ms': `${WIN_FX.vanishLength / (sp.value.fxRate || 1)}ms`,
  }))

  const dropPlan = ref<DropPlan | null>(null)
  const orbLandings = ref(new Map<number, number>())
  const scatterFx = ref(new Map<number, ScatterFx>())
  const symbolWins = ref(new Map<number, number>())
  const cellLightEl = ref<HTMLElement | null>(null)
  provide(CELL_LIGHT, cellLightEl)

  function markLandings(g: Sym[][], at: LandsAt, moved?: (sym: Sym) => boolean) {
    g.forEach((col, c) =>
      col.forEach((sym, r) => {
        if (moved && !moved(sym)) return
        if (sym.mult) orbLandings.value.set(sym.key, at(c, r))
        if (sym.id === 'scatter')
          scatterFx.value.set(sym.key, { anim: SCATTER_RIG.landing, at: at(c, r) })
      }),
    )
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

  const releaseZeus = () => zeus.value?.release()

  const strikes = ref<Strike[]>([])
  let strikesSettleAt = 0

  function queueStrikes(g: Sym[][], landsAt: LandsAt) {
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

  const onRetime = (handler: ((s: Speed) => void) | null) => {
    retime = handler
  }
  const retimeTo = (s: Speed) => retime?.(s)

  function slamStop() {
    if (!spinSpeed.value) slam?.()
  }

  function retimeDrop(s: Speed) {
    const plan = dropPlan.value
    if (!plan) return
    retimePlan(plan, s, performance.now() - plan.start)
    if (plan.deals) queueStrikes(grid.value, (c, r) => landAt(plan, c, r))
    markLandings(grid.value, (c, r) => landAt(plan, c, r))
  }

  async function spinReels(next: Sym[][]) {
    if (busy) return false
    busy = true
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
    if (deals) releaseZeus()
    dropPlan.value = null
    leaving.value = null
    reelState.value = 'idle'
    busy = false
    return true
  }

  return {
    grid,
    reelState,
    spinSpeed,
    sp,
    reelVars,
    orbLandings,
    scatterFx,
    symbolWins,
    cellLightEl,
    cellVars,
    reelLayers,
    zeus,
    chargeZeus,
    releaseZeus,
    strikes,
    queueStrikes,
    waitForStrikes,
    markLandings,
    onRetime,
    retimeTo,
    slamStop,
    spinReels,
  }
}

export type Reels = ReturnType<typeof useReels>
