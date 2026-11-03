import { ref, type Ref } from 'vue'
import type { useDemoCredit } from '@/games/gates-of-olympus/composables/useDemoCredit'
import type { FreeSpins } from '@/games/gates-of-olympus/composables/useFreeSpins'
import type { useGameMenus } from '@/games/gates-of-olympus/composables/useGameMenus'
import type { useMultiplierCollect } from '@/games/gates-of-olympus/composables/useMultiplierCollect'
import type { Reels } from '@/games/gates-of-olympus/composables/useReels'
import type { ScatterAnticipation } from '@/games/gates-of-olympus/composables/useScatterAnticipation'
import type { Tumbles } from '@/games/gates-of-olympus/composables/useTumbles'
import type { WinCounter } from '@/games/gates-of-olympus/composables/useWinCounter'
import { ASSET } from '@/games/gates-of-olympus/engine/assets'
import { PILLAR_LAG_MS } from '@/games/gates-of-olympus/engine/collect'
import {
  FREE_SPINS,
  FS_WINDOW,
  SCATTER_RIG,
  pickRoundTarget,
} from '@/games/gates-of-olympus/engine/freeSpins'
import {
  countScatters,
  type GridEngine,
  type RoundPlan,
  type SpinScript,
} from '@/games/gates-of-olympus/engine/grid'
import { MAX_WIN_X } from '@/games/gates-of-olympus/engine/symbols'
import { TURBO_SCATTER_HOLD, sleep } from '@/games/gates-of-olympus/engine/timing'
import { formatPeso } from '@/utils/format'

type SpinFlowDeps = {
  engine: GridEngine
  reels: Reels
  anticipation: ScatterAnticipation
  wins: WinCounter
  freeSpins: FreeSpins
  collect: ReturnType<typeof useMultiplierCollect>
  tumbles: Tumbles
  credit: ReturnType<typeof useDemoCredit>
  menus: ReturnType<typeof useGameMenus>
  playing: Ref<boolean>
  speed: Ref<number>
  bet: Ref<number>
  ante: Ref<boolean>
  stake: Ref<number>
}

export function useSpinFlow(deps: SpinFlowDeps) {
  const { engine, reels, anticipation, wins, freeSpins, collect, tumbles, credit, menus } = deps
  const { playing, speed, bet, ante, stake } = deps
  const { grid, sp, spinSpeed, scatterFx } = reels
  const { tumbleWin, controlsWin, winOffset } = wins
  const { freeMode, fsLeft, fsWon, totalMult, bonusActive, fsCompleted, fsLeftShown } = freeSpins
  const { maxWin, winCap } = freeSpins
  const { payLines, payIndex, winRows } = tumbles

  const maxed = ref(false)
  const finalPop = ref(false)

  function showMaxWin() {
    maxed.value = true
    finalPop.value = true
    wins.countFinal(winCap.value)
    winRows.value = [
      { id: '', count: 0, amount: maxWin.value, key: engine.newKey(), order: 0, max: true },
      ...winRows.value,
    ]
  }

  async function collectMultipliers(total: number) {
    const orbs = grid.value.flatMap((col, c) =>
      col.flatMap((sym, r) => (sym.mult ? [{ c, r, mult: sym.mult }] : [])),
    )
    const sum = orbs.reduce((acc, orb) => acc + orb.mult, 0)
    const prior = freeMode.value ? totalMult.value : 0
    const product = total * (prior + sum)
    const capped = product >= winCap.value
    if (capped) freeSpins.endFreeSpins()
    await collect.collectOrbs(orbs, prior)
    wins.stopTumbleCount()
    if (freeMode.value) sleep(PILLAR_LAG_MS).then(() => freeSpins.raisePillar(prior + sum))
    if (capped) {
      wins.countTumbleWin(total, 0)
      showMaxWin()
      return
    }
    finalPop.value = true
    wins.countFinal(product)
  }

  async function playScatterWin(count: number) {
    anticipation.stopAnticipation()
    const scatters = grid.value.flat().filter((sym) => sym.id === 'scatter')
    for (let play = 0; play < SCATTER_RIG.winPlays; play++) {
      const at = performance.now()
      for (const sym of scatters) scatterFx.value.set(sym.key, { anim: SCATTER_RIG.win, at })
      if (play === 0) {
        const pay = (FREE_SPINS.scatterPays[count] ?? 0) * bet.value
        if (pay) {
          payLines.value = [{ count, icon: `${ASSET}/ui/info-scatter.webp`, amount: pay }]
          payIndex.value = 0
          wins.addPay(pay, winCap.value)
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

  async function playSpin(script: SpinScript, lateScatterReel: number | null = null) {
    anticipation.stopAnticipation()
    spinSpeed.value = speed.value
    wins.countTumbleWin(0, 0)
    finalPop.value = false
    maxed.value = false
    winRows.value = []
    payLines.value = []
    if (!(await reels.spinReels(script.grid))) return null
    const total = await tumbles.tumble([...script.fresh], lateScatterReel)
    if (total >= winCap.value) {
      freeSpins.endFreeSpins()
      showMaxWin()
    } else if (total && grid.value.flat().some((sym) => sym.mult)) await collectMultipliers(total)
    const scatters = countScatters(grid.value)
    const triggers = scatters >= (freeMode.value ? FREE_SPINS.retriggerAt : FREE_SPINS.triggerAt)
    if (triggers) await playScatterWin(scatters)
    else if (scatters && !total && !sp.value.fxRate) await sleep(TURBO_SCATTER_HOLD)
    await wins.playBigWin(wins.currentWin())
    return { win: wins.currentWin(), triggers }
  }

  async function runFreeSpins() {
    bonusActive.value = true
    payLines.value = []
    fsLeft.value = FREE_SPINS.award
    fsLeftShown.value = true
    const intro = freeSpins.showWindow('start', String(FREE_SPINS.award))
    await intro.closing
    await freeSpins.transition(() => {
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
    const plan: RoundPlan = {
      target: pickRoundTarget(MAX_WIN_X, engine.random),
      won: 0,
      retriggers: 0,
    }
    let played = 0
    while (fsLeft.value > 0 && fsWon.value < maxWin.value) {
      await sleep(FREE_SPINS.spinGapMs)
      fsLeft.value--
      played++
      const result = await playSpin(engine.scriptFreeSpin(plan, fsLeft.value + 1, totalMult.value))
      const won = result?.win ?? 0
      plan.won += won / bet.value
      fsWon.value += won
      winOffset.value += won
      if (maxed.value) break
      if (result?.triggers) {
        const extra = freeSpins.showWindow('additional', `+${FREE_SPINS.retrigger}`)
        await extra.done
        fsLeft.value += FREE_SPINS.retrigger
      }
    }
    const roundWin = winOffset.value
    credit.addCredit(fsWon.value)
    const summary = freeSpins.showWindow('result', formatPeso(roundWin), played)
    await summary.closing
    await freeSpins.transition(() => {
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
    if (menus.blocksSpin.value || playing.value) return
    if (!bought) {
      if (credit.credit.value < stake.value) return
      credit.addCredit(-stake.value)
    }
    menus.betMenu.value = false
    playing.value = true
    winOffset.value = 0
    fsCompleted.value = false
    bonusActive.value = bought
    try {
      const { grid: next, lateScatterReel } = engine.baseSpin(ante.value, bought)
      const result = await playSpin(
        { grid: next, fresh: [], pay: 0, retrigger: false },
        lateScatterReel,
      )
      if (!result) return
      credit.addCredit(result.win)
      if (result.triggers) await runFreeSpins()
    } finally {
      playing.value = false
    }
  }

  return { maxed, finalPop, onSpin }
}
