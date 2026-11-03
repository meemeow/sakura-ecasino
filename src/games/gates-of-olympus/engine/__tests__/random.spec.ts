import { describe, expect, it } from 'vitest'
import { pickFrom, pickIndex, seededRandom } from '@/games/gates-of-olympus/engine/random'

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRandom(7)
    const b = seededRandom(7)
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
  })

  it('differs between seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)())
  })

  it('stays in [0, 1) and spreads evenly', () => {
    const random = seededRandom(99)
    const buckets = Array.from({ length: 10 }, () => 0)
    for (let i = 0; i < 100_000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      buckets[Math.floor(value * 10)]!++
    }
    for (const count of buckets) expect(count).toBeGreaterThan(9_500)
  })
})

describe('picking', () => {
  it('maps the random value onto an index', () => {
    expect(pickIndex(4, () => 0)).toBe(0)
    expect(pickIndex(4, () => 0.999)).toBe(3)
    expect(pickFrom(['a', 'b', 'c'], () => 0.5)).toBe('b')
    expect(pickFrom([], () => 0.5)).toBeUndefined()
  })
})
