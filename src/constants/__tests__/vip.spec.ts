import { describe, expect, it } from 'vitest'
import { MAX_VIP_LEVEL, vipLevels, vipStatus } from '@/constants/vip'

describe('vip levels', () => {
  it('raise both requirements at every level', () => {
    expect(vipLevels).toHaveLength(MAX_VIP_LEVEL + 1)
    vipLevels.forEach((level, i) => {
      expect(level.level).toBe(i)
      if (!i) return
      expect(level.minDeposit).toBeGreaterThan(vipLevels[i - 1]!.minDeposit)
      expect(level.minBet).toBeGreaterThan(vipLevels[i - 1]!.minBet)
    })
  })
})

describe('vipStatus', () => {
  const first = vipLevels[1]!
  const second = vipLevels[2]!

  it('starts new players at level 0', () => {
    const status = vipStatus(0, 0)
    expect(status.current.level).toBe(0)
    expect(status.next?.level).toBe(1)
    expect(status.progress).toBe(0)
  })

  it('needs both the deposit and the bet minimum', () => {
    expect(vipStatus(first.minDeposit, first.minBet - 1).current.level).toBe(0)
    expect(vipStatus(first.minDeposit - 1, first.minBet).current.level).toBe(0)
    expect(vipStatus(first.minDeposit, first.minBet).current.level).toBe(1)
  })

  it('reports progress as the lagging requirement', () => {
    const deposit = (first.minDeposit + second.minDeposit) / 2
    const bet = first.minBet + (second.minBet - first.minBet) / 4
    const status = vipStatus(deposit, bet)
    expect(status.current.level).toBe(1)
    expect(status.depositProgress).toBeCloseTo(0.5)
    expect(status.betProgress).toBeCloseTo(0.25)
    expect(status.progress).toBeCloseTo(0.25)
  })

  it('caps at the top level with full progress', () => {
    const top = vipLevels[MAX_VIP_LEVEL]!
    const status = vipStatus(top.minDeposit * 10, top.minBet * 10)
    expect(status.current.level).toBe(MAX_VIP_LEVEL)
    expect(status.next).toBeNull()
    expect(status.progress).toBe(1)
  })
})
