import { describe, expect, it } from 'vitest'
import {
  SLAM_DROP,
  SPEEDS,
  dropEnd,
  dropTimings,
  eachCell,
  fallMs,
  landAt,
  retimePlan,
  strikeFlip,
  type DropPlan,
} from '@/games/gates-of-olympus/engine/timing'
import { COLS, ROWS } from '@/games/gates-of-olympus/engine/winFx'

const planFor = (speed = SPEEDS[0]!, deals = false): DropPlan => {
  const at = dropTimings(speed, deals)
  return { start: 1000, deals, out: eachCell(at.out), in: eachCell(at.in) }
}

describe('drop timings', () => {
  it('drops reels left to right and the bottom row first', () => {
    const plan = planFor()
    expect(plan.in).toHaveLength(COLS)
    expect(plan.in[1]![ROWS - 1]!.delay).toBeGreaterThan(plan.in[0]![ROWS - 1]!.delay)
    expect(plan.in[0]![0]!.delay).toBeGreaterThan(plan.in[0]![ROWS - 1]!.delay)
  })

  it('holds a quick drop for Zeus on a dealing spin', () => {
    expect(landAt(planFor(SPEEDS[1], true), 0, 0)).toBeGreaterThan(landAt(planFor(SPEEDS[1]), 0, 0))
  })

  it('ends when the last cell lands', () => {
    const plan = planFor()
    const last = Math.max(...eachCell((c, r) => landAt(plan, c, r)).flat())
    expect(dropEnd(plan)).toBe(last)
  })

  it('makes quick and turbo drops shorter than normal', () => {
    expect(dropEnd(planFor(SPEEDS[1]))).toBeLessThan(dropEnd(planFor(SPEEDS[0])))
    expect(dropEnd(planFor(SPEEDS[2]))).toBe(dropEnd(planFor(SPEEDS[1])))
  })
})

describe('retimePlan', () => {
  it('speeds up only the cells that have not started', () => {
    const plan = planFor()
    const before = structuredClone(plan)
    const elapsed = 300
    retimePlan(plan, SLAM_DROP, elapsed)
    plan.in.forEach((col, c) =>
      col.forEach((cell, r) => {
        const old = before.in[c]![r]!
        if (old.delay <= elapsed) expect(cell).toEqual(old)
        else {
          expect(cell.delay).toBeGreaterThanOrEqual(elapsed)
          expect(cell.delay + cell.ms).toBeLessThanOrEqual(old.delay + old.ms)
        }
      }),
    )
    expect(dropEnd(plan)).toBeLessThan(dropEnd(before))
  })
})

describe('falls', () => {
  it('take longer the further a symbol falls', () => {
    for (let rows = 1; rows < ROWS; rows++) expect(fallMs(rows + 1)).toBeGreaterThan(fallMs(rows))
  })

  it('flip strike bolts deterministically by key', () => {
    const flips = Array.from({ length: 100 }, (_, key) => strikeFlip(key))
    expect(new Set(flips)).toEqual(new Set([-1, 1]))
    expect(Array.from({ length: 100 }, (_, key) => strikeFlip(key))).toEqual(flips)
  })
})
