import { describe, expect, it } from 'vitest'
import {
  MULT_VALUES,
  PAYS,
  createKeys,
  findWins,
  multTier,
  payX,
  type Sym,
} from '@/games/gates-of-olympus/engine/symbols'

const keys = createKeys()
const column = (...ids: string[]): Sym[] => ids.map((id) => ({ id, key: keys() }))

describe('payX', () => {
  it.each([
    [8, 2],
    [9, 2],
    [10, 1],
    [11, 1],
    [12, 0],
    [30, 0],
  ])('pays %i symbols from tier %i', (count, tier) => {
    expect(payX('crown', count)).toBe(PAYS.crown![tier])
  })
})

describe('findWins', () => {
  it('pays 8 or more of a kind anywhere, multiplied by the bet', () => {
    const grid = [
      column('red', 'red', 'red', 'blue', 'blue'),
      column('red', 'red', 'red', 'blue', 'green'),
      column('red', 'red', 'ring', 'blue', 'green'),
      column('scatter', 'scatter', 'scatter', 'scatter', 'yellow'),
      column('purple', 'purple', 'mgreen', 'yellow', 'yellow'),
      column('chalice', 'chalice', 'crown', 'yellow', 'green'),
    ]
    expect(findWins(grid, 2)).toEqual([{ id: 'red', count: 8, amount: 2 * PAYS.red![2] }])
  })

  it('never pays scatters or multiplier orbs as symbols', () => {
    const grid = Array.from({ length: 6 }, () =>
      column('scatter', 'scatter', 'mgreen', 'mred', 'mblue'),
    )
    expect(findWins(grid, 1)).toEqual([])
  })
})

describe('multTier', () => {
  it.each([
    [2, 'mgreen'],
    [8, 'mgreen'],
    [10, 'mblue'],
    [25, 'mblue'],
    [50, 'mpurple'],
    [100, 'mred'],
    [500, 'mred'],
    [1000, 'mdiamond'],
  ])('shows %ix as %s', (mult, id) => {
    expect(multTier(mult).id).toBe(id)
  })

  it('has a tier for every multiplier value', () => {
    for (const mult of MULT_VALUES) expect(multTier(mult).max).toBeGreaterThanOrEqual(mult)
  })
})

describe('createKeys', () => {
  it('counts independently per counter', () => {
    const a = createKeys()
    const b = createKeys()
    expect([a(), a(), a()]).toEqual([0, 1, 2])
    expect(b()).toBe(0)
  })
})
