import { describe, expect, it } from 'vitest'
import {
  FREE_SPINS,
  pickReels,
  pickRoundTarget,
  pillarFxLevel,
  pillarLevel,
  scatterCount,
  triggerChance,
} from '@/games/gates-of-olympus/engine/freeSpins'
import { seededRandom } from '@/games/gates-of-olympus/engine/random'
import { MAX_WIN_X } from '@/games/gates-of-olympus/engine/symbols'

describe('triggerChance', () => {
  it('is about 1 in 494 without the ante and 1 in 220 with it', () => {
    expect(1 / triggerChance(false)).toBeCloseTo(494, -1)
    expect(1 / triggerChance(true)).toBeCloseTo(220, -1)
  })
})

describe('scatterCount', () => {
  it.each([
    [0, 4],
    [0.899, 4],
    [0.9, 5],
    [0.98, 5],
    [0.995, 6],
  ])('a trigger with roll %f lands %i scatters', (roll, count) => {
    expect(scatterCount(true, () => roll)).toBe(count)
  })

  it.each([
    [0, 3],
    [0.049, 3],
    [0.05, 2],
    [0.199, 2],
    [0.2, 1],
    [0.499, 1],
    [0.5, 0],
  ])('a teaser with roll %f lands %i scatters', (roll, count) => {
    expect(scatterCount(false, () => roll)).toBe(count)
  })
})

describe('pickReels', () => {
  it('picks distinct reels from the pool', () => {
    const random = seededRandom(3)
    for (let i = 0; i < 200; i++) {
      const picked = pickReels(4, [0, 1, 2, 3, 4, 5], random)
      expect(picked).toHaveLength(4)
      expect(new Set(picked).size).toBe(4)
      for (const reel of picked) expect(reel).toBeGreaterThanOrEqual(0)
    }
  })

  it('stops when the pool runs out', () => {
    expect(pickReels(6, FREE_SPINS.buyReels, seededRandom(1)).sort()).toEqual(FREE_SPINS.buyReels)
  })
})

describe('pickRoundTarget', () => {
  it('awards the max win on the rarest roll', () => {
    expect(pickRoundTarget(MAX_WIN_X, () => 0)).toBe(MAX_WIN_X)
  })

  it('keeps targets inside the bands', () => {
    const random = seededRandom(11)
    const targets = Array.from({ length: 20_000 }, () => pickRoundTarget(MAX_WIN_X, random))
    for (const target of targets) {
      expect(target).toBeGreaterThanOrEqual(7)
      expect(target).toBeLessThan(MAX_WIN_X)
    }
    const small = targets.filter((target) => target < 200).length / targets.length
    expect(small).toBeGreaterThan(0.94)
    expect(small).toBeLessThan(0.96)
  })
})

describe('pillar levels', () => {
  it.each([
    [0, 0, 0],
    [9, 0, 0],
    [10, 1, 2],
    [29, 2, 2],
    [30, 3, 4],
    [50, 4, 4],
    [100, 5, 5],
    [5000, 5, 5],
  ])('a %ix total sits at level %i with fx level %i', (total, level, fx) => {
    expect(pillarLevel(total)).toBe(level)
    expect(pillarFxLevel(total)).toBe(fx)
  })
})
