import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FREE_SPINS } from '@/games/gates-of-olympus/engine/freeSpins'
import {
  ALL_REELS,
  countScatters,
  createGridEngine,
  type RoundPlan,
} from '@/games/gates-of-olympus/engine/grid'
import { seededRandom } from '@/games/gates-of-olympus/engine/random'
import { findWins, type Sym } from '@/games/gates-of-olympus/engine/symbols'
import { COLS, ROWS } from '@/games/gates-of-olympus/engine/winFx'
import { settle } from '@/games/gates-of-olympus/engine/__tests__/simulate'

const seeded = (seed: number) => createGridEngine(seededRandom(seed))
const scatterReels = (g: Sym[][]) =>
  g.flatMap((col, c) => col.filter((sym) => sym.id === 'scatter').map(() => c))

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    throw new Error('the engine must use its injected random source')
  })
})
afterEach(() => vi.restoreAllMocks())

describe('grids', () => {
  it('are 6 reels of 5 rows with unique keys', () => {
    const engine = seeded(1)
    for (const grid of [engine.openingGrid(), engine.randomGrid(), engine.quietGrid()]) {
      expect(grid).toHaveLength(COLS)
      for (const col of grid) expect(col).toHaveLength(ROWS)
    }
    const keys = [engine.openingGrid(), engine.randomGrid()].flat(2).map((sym) => sym.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('repeat exactly for the same seed', () => {
    const run = (seed: number) => {
      const engine = seeded(seed)
      return Array.from({ length: 50 }, () => engine.baseSpin(false, false))
    }
    expect(run(5)).toEqual(run(5))
    expect(run(5)).not.toEqual(run(6))
  })

  it('quiet grids hold no orbs and no paying cluster', () => {
    for (let seed = 0; seed < 200; seed++) {
      const grid = seeded(seed).quietGrid()
      expect(grid.flat().some((sym) => sym.mult)).toBe(false)
      expect(findWins(grid, 1)).toEqual([])
    }
  })
})

describe('baseSpin', () => {
  it('lands a bought round as exactly 4 scatters on reels 2 to 5 and nothing else that pays', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { grid, lateScatterReel } = seeded(seed).baseSpin(false, true)
      expect(scatterReels(grid).sort()).toEqual(FREE_SPINS.buyReels)
      expect(lateScatterReel).toBeNull()
      expect(findWins(grid, 1)).toEqual([])
    }
  })

  it('places at most one scatter per reel', () => {
    const engine = seeded(2)
    for (let spin = 0; spin < 3000; spin++) {
      const reels = scatterReels(engine.baseSpin(spin % 2 === 0, false).grid)
      expect(new Set(reels).size).toBe(reels.length)
    }
  })

  it('holds back the 4th scatter only for a winning reel that has none', () => {
    let held = 0
    for (let seed = 0; seed < 400 && held < 5; seed++) {
      const engine = seeded(seed)
      for (let spin = 0; spin < 600; spin++) {
        const { grid, lateScatterReel } = engine.baseSpin(true, false)
        if (lateScatterReel === null) continue
        held++
        expect(countScatters(grid)).toBe(FREE_SPINS.triggerAt - 1)
        expect(scatterReels(grid)).not.toContain(lateScatterReel)
        const ids = new Set(findWins(grid, 1).map((w) => w.id))
        expect(grid[lateScatterReel]!.some((sym) => ids.has(sym.id))).toBe(true)
        const { grid: settled, late } = settle(engine, grid, lateScatterReel)
        expect(late).toBeNull()
        expect(countScatters(settled)).toBe(FREE_SPINS.triggerAt)
      }
    }
    expect(held).toBeGreaterThan(0)
  })
})

describe('dropColumn', () => {
  it('removes winners, keeps the rest in order and drops fresh symbols on top', () => {
    const engine = seeded(4)
    const ids = ['red', 'blue', 'red', 'green', 'red']
    const col: Sym[] = ids.map((id) => ({ id, key: engine.newKey(), win: id === 'red' }))
    const board = ALL_REELS.map((c) => (c === 0 ? col : engine.randomGrid()[c]!))
    const dropped = engine.dropColumn(col, 0, board, null)
    expect(dropped).toHaveLength(ROWS)
    expect(dropped.slice(3).map((sym) => sym.key)).toEqual([col[1]!.key, col[3]!.key])
    expect(dropped.slice(0, 3).every((sym) => sym.fall === 3)).toBe(true)
    expect(dropped.some((sym) => sym.win)).toBe(false)
    expect(dropped[3]!.fall).toBe(2)
    expect(dropped[4]!.fall).toBe(1)
  })

  it('takes queued symbols before drawing new ones', () => {
    const engine = seeded(4)
    const col: Sym[] = ['red', 'red', 'blue', 'blue', 'blue'].map((id) => ({
      id,
      key: engine.newKey(),
      win: id === 'red',
    }))
    const queue = [{ id: 'crown' }, { id: 'ring' }, { id: 'chalice' }]
    const dropped = engine.dropColumn(col, 0, [col], queue)
    expect(dropped.slice(0, 2).map((sym) => sym.id)).toEqual(['crown', 'ring'])
    expect(queue).toEqual([{ id: 'chalice' }])
  })
})

describe('scriptFreeSpin', () => {
  function playRound(seed: number, target: number) {
    const engine = seeded(seed)
    const plan: RoundPlan = { target, won: 0, retriggers: 0 }
    let spins = FREE_SPINS.award
    let played = 0
    while (played < spins) {
      const script = engine.scriptFreeSpin(plan, spins - played, 0)
      played++
      plan.won += script.pay
      if (script.retrigger) spins += FREE_SPINS.retrigger
      expect(script.grid).toHaveLength(COLS)
      if (script.retrigger) expect(countScatters(script.grid)).toBe(FREE_SPINS.retriggerAt)
    }
    return { plan, played }
  }

  it('caps retriggers', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { plan, played } = playRound(seed, 50)
      expect(plan.retriggers).toBeLessThanOrEqual(FREE_SPINS.maxRetriggers)
      expect(played).toBe(FREE_SPINS.award + plan.retriggers * FREE_SPINS.retrigger)
    }
  })

  it('steers the round towards its target', () => {
    for (const target of [20, 80, 300]) {
      const ratios = Array.from(
        { length: 30 },
        (_, seed) => playRound(seed, target).plan.won / target,
      )
      const mean = ratios.reduce((t, r) => t + r, 0) / ratios.length
      expect(mean).toBeGreaterThan(0.6)
      expect(mean).toBeLessThan(1.4)
    }
  })
})

describe('base game math', () => {
  it('stays on the fitted model', () => {
    const engine = seeded(2026)
    const spins = 20_000
    let won = 0
    let paid = 0
    let triggers = 0
    let orbSpins = 0
    for (let spin = 0; spin < spins; spin++) {
      const { grid, lateScatterReel } = engine.baseSpin(true, false)
      if (grid.flat().some((sym) => sym.mult)) orbSpins++
      const result = settle(engine, grid, lateScatterReel)
      if (result.pay) won++
      paid += result.pay
      if (countScatters(result.grid) >= FREE_SPINS.triggerAt) triggers++
    }
    const summary = {
      hitRate: +(won / spins).toFixed(3),
      payback: +(paid / spins / 1.25).toFixed(3),
      triggers,
      orbSpins,
    }
    expect(summary).toMatchInlineSnapshot(`
      {
        "hitRate": 0.265,
        "orbSpins": 761,
        "payback": 0.315,
        "triggers": 91,
      }
    `)
  })
})
