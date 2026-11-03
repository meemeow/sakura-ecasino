import { describe, expect, it } from 'vitest'
import { bigWinTier } from '@/games/gates-of-olympus/engine/bigWin'

describe('bigWinTier', () => {
  it.each([
    [74.99, null],
    [75, 'nice'],
    [149.99, 'nice'],
    [150, 'mega'],
    [225, 'superb'],
    [300, 'sensational'],
    [1_000_000, 'sensational'],
  ])('a ₱%f win on a ₱5 stake is %s', (win, name) => {
    expect(bigWinTier(win, 5)?.name ?? null).toBe(name)
  })

  it('scales with the stake, ante included', () => {
    expect(bigWinTier(75, 6.25)).toBeNull()
    expect(bigWinTier(93.75, 6.25)?.name).toBe('nice')
  })
})
