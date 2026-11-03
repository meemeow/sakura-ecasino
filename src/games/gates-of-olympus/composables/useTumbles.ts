import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import type { FreeSpins } from '@/games/gates-of-olympus/composables/useFreeSpins'
import type { Reels } from '@/games/gates-of-olympus/composables/useReels'
import type { ScatterAnticipation } from '@/games/gates-of-olympus/composables/useScatterAnticipation'
import type { WinCounter } from '@/games/gates-of-olympus/composables/useWinCounter'
import { ASSET } from '@/games/gates-of-olympus/engine/assets'
import { FREE_SPINS } from '@/games/gates-of-olympus/engine/freeSpins'
import {
  countScatters,
  hasStrike,
  winLabel,
  type GridEngine,
} from '@/games/gates-of-olympus/engine/grid'
import { findWins, type Fresh, type WinRow } from '@/games/gates-of-olympus/engine/symbols'
import {
  PAY_LINE_MS,
  TURBO_BURST_LEAD,
  ZEUS_DEAL_LEAD,
  landsIn,
  sleep,
  until,
} from '@/games/gates-of-olympus/engine/timing'
import { SYMBOL_RIGS, WIN_FX, type WinFx } from '@/games/gates-of-olympus/engine/winFx'

export type PayLine = { count: number; icon: string; amount: number }

const WIN_ROWS_SHOWN = 4

type TumbleDeps = {
  engine: GridEngine
  reels: Reels
  anticipation: ScatterAnticipation
  wins: WinCounter
  freeSpins: FreeSpins
  bet: Ref<number>
}

export function useTumbles({ engine, reels, anticipation, wins, freeSpins, bet }: TumbleDeps) {
  const { grid, reelState, sp, symbolWins } = reels
  const { freeMode, winCap, tumbleGap } = freeSpins

  const payLines = ref<PayLine[]>([])
  const payIndex = ref(0)
  const payLine = computed(() =>
    payLines.value.length && !(freeMode.value && !sp.value.fxRate)
      ? payLines.value[payIndex.value % payLines.value.length]!
      : null,
  )
  const payTimer = setInterval(() => payIndex.value++, PAY_LINE_MS)
  onBeforeUnmount(() => clearInterval(payTimer))

  const winRows = ref<WinRow[]>([])
  const shownWinRows = computed(() => winRows.value.slice(0, WIN_ROWS_SHOWN))
  const winFx = ref<WinFx | null>(null)

  async function tumble(fresh: Fresh[] | null, lateScatterReel: number | null) {
    let late = lateScatterReel
    let total = 0
    for (;;) {
      const found = findWins(grid.value, bet.value)
      if (!found.length) break
      const t = sp.value
      const ids = new Set(found.map((w) => w.id))
      grid.value = grid.value.map((col) =>
        col.map((sym) => (ids.has(sym.id) ? { ...sym, win: true } : sym)),
      )
      const refill = grid.value.map((col, c) => engine.dropColumn(col, c, grid.value, fresh))
      late = engine.dropLateScatter(refill, grid.value, late)
      const deals = hasStrike(refill)
      total = Math.min(winCap.value, total + found.reduce((t, w) => t + w.amount, 0))
      payLines.value = found.map((w) => ({
        count: w.count,
        icon: `${ASSET}/reel/${w.id}.webp`,
        amount: w.amount,
      }))
      wins.countTumbleWin(total, t.fxRate)
      const rate = t.fxRate || 1
      const burstIn = t.fxRate ? WIN_FX.burstAt : TURBO_BURST_LEAD
      winFx.value = {
        id: engine.newKey(),
        cells: grid.value.flatMap((col, c) =>
          col.flatMap((sym, r): [number, number][] => (sym.win ? [[c, r]] : [])),
        ),
        labels: found.map((w) => winLabel(grid.value, w)),
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
      reels.onRetime((s) => {
        if (s.fxRate) return
        const turboStart = performance.now() - (WIN_FX.burstAt - TURBO_BURST_LEAD) / rate
        if (turboStart >= fx.start) return
        fx.start = turboStart
        fx.border = false
        reelState.value = 'idle'
        symbolWins.value.clear()
      })
      await until(burstAt)
      reels.onRetime(null)
      reelState.value = 'explode'
      if (!freeMode.value && countScatters(grid.value) === FREE_SPINS.triggerAt - 1)
        await anticipation.holdRefill(rate)
      const turbo = !sp.value.fxRate
      const beforeDeal = turbo ? 0 : Math.max(0, WIN_FX.tumbleAt - WIN_FX.burstAt - ZEUS_DEAL_LEAD)
      await sleep(beforeDeal / rate)
      if (deals) reels.chargeZeus()
      await sleep((WIN_FX.tumbleAt - WIN_FX.burstAt - beforeDeal) / rate)
      winRows.value = [
        ...found.map((w, i) => ({ ...w, key: engine.newKey(), order: found.length - 1 - i })),
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
      if (deals) reels.queueStrikes(refill, (c, r) => refillAt + landsIn(refill[c]![r]!))
      reels.markLandings(
        refill,
        (c, r) => refillAt + landsIn(refill[c]![r]!),
        (sym) => !!sym.fall && !anticipation.isHeld(sym.key),
      )
      await sleep(Math.max(...refill.flat().map(landsIn)) + t.landMs + 40)
      await reels.waitForStrikes()
      if (deals) reels.releaseZeus()
      reelState.value = 'idle'
      if (total >= winCap.value) break
    }
    tumbleGap.value = false
    anticipation.stopAnticipation()
    return total
  }

  return { payLines, payIndex, payLine, winRows, shownWinRows, winFx, tumble }
}

export type Tumbles = ReturnType<typeof useTumbles>
