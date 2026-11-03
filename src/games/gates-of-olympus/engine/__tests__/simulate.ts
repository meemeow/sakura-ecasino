import type { GridEngine } from '@/games/gates-of-olympus/engine/grid'
import { findWins, type Sym } from '@/games/gates-of-olympus/engine/symbols'

export function settle(engine: GridEngine, start: Sym[][], lateScatterReel: number | null) {
  let grid = start
  let late = lateScatterReel
  let paid = 0
  let tumbles = 0
  for (;;) {
    const wins = findWins(grid, 1)
    if (!wins.length) break
    tumbles++
    paid += wins.reduce((t, w) => t + w.amount, 0)
    const ids = new Set(wins.map((w) => w.id))
    const board = grid.map((col) =>
      col.map((sym) => (ids.has(sym.id) ? { ...sym, win: true } : sym)),
    )
    const refill = board.map((col, c) => engine.dropColumn(col, c, board, null))
    late = engine.dropLateScatter(refill, board, late)
    grid = refill
  }
  const orbs = grid.flat().reduce((t, sym) => t + (sym.mult ?? 0), 0)
  return { grid, tumbles, paid, pay: paid && orbs ? paid * orbs : paid, late }
}
