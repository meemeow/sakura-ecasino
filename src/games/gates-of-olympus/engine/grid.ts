import { COLS, ROWS } from '@/games/gates-of-olympus/engine/winFx'
import {
  FREE_SPINS,
  FS_ORB_WEIGHTS,
  FS_STACK,
  ORB_CHANCE,
  ORB_WEIGHTS,
  REFILL_STICKY,
  pickReels,
  scatterCount,
  triggerChance,
} from '@/games/gates-of-olympus/engine/freeSpins'
import { pickFrom, pickIndex, shuffled, type Random } from '@/games/gates-of-olympus/engine/random'
import {
  MULT_VALUES,
  PAYS,
  PAY_SYMBOLS,
  createKeys,
  findWins,
  multTier,
  payX,
  type Fresh,
  type Sym,
  type Win,
} from '@/games/gates-of-olympus/engine/symbols'
import { TUMBLE_FRAMES, eachCell, frameMs } from '@/games/gates-of-olympus/engine/timing'
import { formatPeso } from '@/utils/format'

type Weights<T> = [value: T, weight: number][]

const weightTotal = <T>(table: Weights<T>) => table.reduce((t, [, w]) => t + w, 0)

const PAY_TOTAL = weightTotal(PAY_SYMBOLS)
const ORB_WEIGHT_TOTAL = weightTotal(ORB_WEIGHTS)
const FS_ORB_WEIGHT_TOTAL = weightTotal(FS_ORB_WEIGHTS)

export const ALL_REELS = Array.from({ length: COLS }, (_, c) => c)

const OPENING_GRID = [
  ['yellow', 'yellow', 'purple', 'purple', 'blue'],
  ['ring', 'ring', 'purple', 'purple', 'crown'],
  ['blue', 'blue', 'hourglass', 'hourglass', 'red'],
  ['green', 'green', 'blue', 'blue', 'ring'],
  ['green', 'green', 'hourglass', 'hourglass', 'yellow'],
  ['yellow', 'yellow', 'purple', 'purple', 'green'],
]

export const countScatters = (g: Sym[][]) => g.flat().filter((sym) => sym.id === 'scatter').length

export const hasStrike = (g: Sym[][]) => g.some((col) => col.some((sym) => sym.strike))

export function winLabel(g: Sym[][], win: Win) {
  const cells = g.flatMap((col, c) =>
    col.flatMap((sym, r): [number, number][] => (sym.id === win.id ? [[c, r]] : [])),
  )
  const cx = cells.reduce((t, [c]) => t + c, 0) / cells.length
  const cy = cells.reduce((t, [, r]) => t + r, 0) / cells.length
  const distance = ([c, r]: [number, number]) => (c - cx) ** 2 + (r - cy) ** 2
  const [c, r] = cells.reduce((best, cell) => (distance(cell) < distance(best) ? cell : best))
  return { c, r, text: formatPeso(win.amount) }
}

export type SpinScript = { grid: Sym[][]; fresh: Fresh[]; pay: number; retrigger: boolean }
export type RoundPlan = { target: number; won: number; retriggers: number }
export type BaseSpin = { grid: Sym[][]; lateScatterReel: number | null }

const FS_CANDIDATES = 60
const FS_DEAD_CHANCE = 0.4
const FS_DRAWN_VALUES = 0.75
const FS_DEAD_ORB = 0.45
const FS_NEAR_MISS = 0.6

export type GridEngine = ReturnType<typeof createGridEngine>

export function createGridEngine(random: Random = Math.random, newKey = createKeys()) {
  function weighted<T>(table: Weights<T>, total: number, fallback: T) {
    let w = random() * total
    for (const [value, weight] of table) if ((w -= weight) < 0) return value
    return fallback
  }

  const plainSymbol = (): Fresh => ({ id: weighted(PAY_SYMBOLS, PAY_TOTAL, 'blue') })
  const pickOrbValue = () => weighted(ORB_WEIGHTS, ORB_WEIGHT_TOTAL, ORB_WEIGHTS[0]![0])
  const drawFsOrb = () => weighted(FS_ORB_WEIGHTS, FS_ORB_WEIGHT_TOTAL, FS_ORB_WEIGHTS[0]![0])

  const openingGrid = (): Sym[][] =>
    OPENING_GRID.map((col) => col.map((id) => ({ id, key: newKey() })))

  const orbReels = new Set<number>()

  function pickSymbol(c: number, refill = false): Fresh {
    const stacks = orbReels.has(c) && (!refill || orbReels.size < COLS)
    if (!stacks && random() < ORB_CHANCE) {
      orbReels.add(c)
      const mult = pickOrbValue()
      return { id: multTier(mult).id, mult, strike: true }
    }
    return plainSymbol()
  }

  function randomGrid() {
    orbReels.clear()
    return Array.from({ length: COLS }, (_, c) =>
      Array.from({ length: ROWS }, (): Sym => ({ ...pickSymbol(c), key: newKey() })),
    )
  }

  function quietGrid() {
    const g = Array.from({ length: COLS }, () =>
      Array.from({ length: ROWS }, (): Sym => ({ ...plainSymbol(), key: newKey() })),
    )
    const count = (id: string) => g.flat().filter((sym) => sym.id === id).length
    for (;;) {
      const over = PAY_SYMBOLS.find(([id]) => count(id) >= 8)?.[0]
      if (!over) return g
      const cells = g.flatMap((col, c) =>
        col.flatMap((sym, r): [number, number][] => (sym.id === over ? [[c, r]] : [])),
      )
      const [c, r] = pickFrom(cells, random)!
      const room = PAY_SYMBOLS.filter(([id]) => count(id) < 7)
      g[c]![r] = { id: pickFrom(room, random)![0], key: newKey() }
    }
  }

  function placeScatters(g: Sym[][], reels: number[]) {
    for (const c of reels) {
      const col = g[c]!
      const rows = col.flatMap((sym, r) => (sym.mult || sym.id === 'scatter' ? [] : [r]))
      const r = pickFrom(rows, random)
      if (r !== undefined) col[r] = { id: 'scatter', key: newKey() }
    }
    return g
  }

  function withLateScatter(g: Sym[][], reels: number[]): BaseSpin {
    const late = random() < FREE_SPINS.lateScatterShare
    if (reels.length !== FREE_SPINS.triggerAt || !late)
      return { grid: placeScatters(g, reels), lateScatterReel: null }
    const early = reels.slice(0, -1)
    placeScatters(g, early)
    const ids = new Set(findWins(g, 1).map((w) => w.id))
    const open = ALL_REELS.filter((c) => !early.includes(c) && g[c]!.some((sym) => ids.has(sym.id)))
    if (!open.length) return { grid: placeScatters(g, reels.slice(-1)), lateScatterReel: null }
    return { grid: g, lateScatterReel: pickFrom(open, random)! }
  }

  function baseSpin(ante: boolean, bought: boolean): BaseSpin {
    const trigger = bought || random() < triggerChance(ante)
    const reels = bought ? FREE_SPINS.buyReels : ALL_REELS
    const count = bought ? FREE_SPINS.triggerAt : scatterCount(trigger, random)
    const picked = pickReels(count, reels, random)
    if (bought) return { grid: placeScatters(quietGrid(), picked), lateScatterReel: null }
    return withLateScatter(randomGrid(), picked)
  }

  function dropLateScatter(refill: Sym[][], board: Sym[][], reel: number | null) {
    if (reel === null) return null
    const fresh = board[reel]!.filter((sym) => sym.win).length
    if (!fresh) return reel
    const r = pickIndex(fresh, random)
    refill[reel]![r] = { ...refill[reel]![r]!, id: 'scatter', mult: undefined, strike: false }
    return null
  }

  function refillSymbol(board: Sym[][], c: number): Fresh {
    const pool = board.flat().filter((sym) => PAYS[sym.id] && !sym.win)
    if (pool.length && random() < REFILL_STICKY) return { id: pickFrom(pool, random)!.id }
    return pickSymbol(c, true)
  }

  function dropColumn(col: Sym[], c: number, board: Sym[][], queue: Fresh[] | null): Sym[] {
    const kept = col.filter((sym) => !sym.win)
    const n = ROWS - kept.length
    const fresh = Array.from({ length: n }, (): Sym => ({
      ...(queue?.shift() ?? refillSymbol(board, c)),
      key: newKey(),
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
      const pick = i === 1 ? fits.at(-1)! : pickFrom(fits, random)!
      values.push(pick)
      left -= pick
    }
    return values
  }

  function stackedGrid() {
    return Array.from({ length: COLS }, () => {
      const col: Sym[] = []
      for (let r = 0; r < ROWS; r++) {
        const above = col[r - 1]
        const id = above && random() < FS_STACK ? above.id : plainSymbol().id
        col.push({ id, key: newKey() })
      }
      return col
    })
  }

  function nearMiss(grid: Sym[][]): [number, number] | null {
    const id = plainSymbol().id
    const c = pickIndex(COLS, random)
    const run = 2 + pickIndex(2, random)
    const top = pickIndex(ROWS - run, random)
    for (let r = top; r < top + run; r++) grid[c]![r] = { id, key: newKey() }
    const others = grid
      .flatMap((col, cc) => col.map((sym, rr): [number, number, string] => [cc, rr, sym.id]))
      .filter(([cc, rr]) => cc !== c || rr < top || rr > top + run)
    const have = () => grid.flat().filter((sym) => sym.id === id).length
    for (const [cc, rr, symId] of shuffled(others, random)) {
      if (have() >= 7) break
      if (symId !== id) grid[cc]![rr] = { id, key: newKey() }
    }
    while (have() > 7) {
      const extra = others.find(([cc, rr]) => grid[cc]![rr]!.id === id)
      if (!extra) break
      grid[extra[0]]![extra[1]] = { ...plainSymbol(), key: newKey() }
    }
    return have() === 7 ? [c, top + run] : null
  }

  function freeSpinCandidate(prior: number, aim: number, retrigger: boolean): SpinScript {
    const grid = stackedGrid()
    const cells = shuffled(eachCell((c, r): [number, number] => [c, r]).flat(), random)
    if (aim > 0 && random() < 0.85) {
      const id = plainSymbol().id
      const count = 8 + Math.floor(random() ** 2 * 6)
      for (const [c, r] of cells.splice(0, count)) grid[c]![r] = { id, key: newKey() }
    }
    const orbCount =
      aim > 0 ? (random() < 0.6 ? 1 + pickIndex(3, random) : 0) : random() < FS_DEAD_ORB ? 1 : 0
    const miss = aim <= 0 && orbCount && random() < FS_NEAR_MISS ? nearMiss(grid) : null
    const orbCells = miss
      ? [miss]
      : cells
          .filter(([c, r]) => grid[c]![r]!.id !== 'scatter')
          .filter(([c], i, open) => open.findIndex(([other]) => other === c) === i)
          .slice(0, orbCount)
    for (const [c, r] of orbCells)
      grid[c]![r] = { id: 'mgreen', mult: 2, strike: true, key: newKey() }
    if (retrigger) {
      for (const c of pickReels(FREE_SPINS.retriggerAt, ALL_REELS, random)) {
        const rows = grid[c]!.flatMap((sym, r) => (sym.mult ? [] : [r]))
        grid[c]![pickFrom(rows, random)!] = { id: 'scatter', key: newKey() }
      }
    }
    const { fresh, base } = simulateTumbles(grid)
    const values =
      random() < FS_DRAWN_VALUES || !(base > 0 && orbCells.length)
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

  function scriptFreeSpin(plan: RoundPlan, spinsLeft: number, prior: number) {
    const room = plan.target - plan.won
    const last = spinsLeft <= 1
    const aim =
      room <= 0.01
        ? 0
        : last
          ? room
          : random() < FS_DEAD_CHANCE
            ? 0
            : Math.min(room, (room / spinsLeft) * Math.exp((random() - 0.5) * 2.4))
    const retrigger =
      plan.retriggers < FREE_SPINS.maxRetriggers && random() < FREE_SPINS.retriggerChance
    let best: SpinScript | null = null
    let bestScore = Infinity
    for (let i = 0; i < FS_CANDIDATES; i++) {
      const candidate = freeSpinCandidate(prior, aim, retrigger)
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

  return {
    random,
    newKey,
    openingGrid,
    randomGrid,
    quietGrid,
    placeScatters,
    baseSpin,
    dropLateScatter,
    dropColumn,
    scriptFreeSpin,
  }
}
