import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as wallet from '@/constants/wallet'
import * as limits from '../../../functions/src/limits'

const {
  MAX_BALANCE,
  MIN_DEPOSIT,
  MAX_DEPOSIT,
  DEPOSIT_WINDOW_MINUTES,
  RELOAD_BONUS_PERCENT,
  TURNOVER_DEPOSIT_MULTIPLIER,
  TURNOVER_BONUS_MULTIPLIER,
  depositExpiresAt,
  phDay,
  reloadBonusFor,
  reloadBonusUsedToday,
  turnoverAfterDeposit,
  turnoverFor,
} = wallet

describe('reload bonus', () => {
  it('is 30% rounded to the centavo the way the rules compute it', () => {
    expect(reloadBonusFor(100)).toBe(30)
    expect(reloadBonusFor(20)).toBe(6)
    expect(reloadBonusFor(33.33)).toBe(10)
    expect(reloadBonusFor(20.15)).toBe(6.05)
    for (const amount of [20, 20.01, 99.99, 123.45, 1234.56, 49_999.99, 50_000])
      expect(reloadBonusFor(amount)).toBe(Math.round(amount * 30) / 100)
  })

  it('resets on the Philippine calendar day', () => {
    expect(phDay(new Date('2026-11-02T15:59:59Z'))).toBe('2026-11-02')
    expect(phDay(new Date('2026-11-02T16:00:00Z'))).toBe('2026-11-03')
    const now = new Date('2026-11-03T01:00:00Z')
    expect(reloadBonusUsedToday(undefined, now)).toBe(false)
    expect(reloadBonusUsedToday(new Date('2026-11-02T16:30:00Z'), now)).toBe(true)
    expect(reloadBonusUsedToday(new Date('2026-11-02T15:30:00Z'), now)).toBe(false)
  })
})

describe('turnover', () => {
  it('needs 1x the deposit and 10x the bonus', () => {
    expect(turnoverFor(100, 30)).toBe(400)
    expect(turnoverFor(100, 0)).toBe(100)
  })

  it('starts a new cycle when nothing was left', () => {
    expect(turnoverAfterDeposit({ turnoverRequired: 500, turnoverRemaining: 0 }, 100)).toEqual({
      turnoverRequired: 100,
      turnoverRemaining: 100,
    })
    expect(turnoverAfterDeposit({}, 100)).toEqual({ turnoverRequired: 100, turnoverRemaining: 100 })
    expect(turnoverAfterDeposit({ turnoverRequired: 500, turnoverRemaining: -20 }, 100)).toEqual({
      turnoverRequired: 100,
      turnoverRemaining: 100,
    })
  })

  it('adds to an unfinished cycle', () => {
    expect(turnoverAfterDeposit({ turnoverRequired: 500, turnoverRemaining: 50 }, 100)).toEqual({
      turnoverRequired: 600,
      turnoverRemaining: 150,
    })
  })

  it('floors bets at zero remaining', () => {
    expect(limits.turnoverAfterBet(50, 20)).toBe(30)
    expect(limits.turnoverAfterBet(10, 20)).toBe(0)
    expect(limits.turnoverAfterBet(undefined, 20)).toBe(0)
  })
})

describe('deposit window', () => {
  it('expires the window after the configured minutes', () => {
    const createdAt = { toMillis: () => 1_000_000 }
    expect(depositExpiresAt({ createdAt })).toBe(1_000_000 + DEPOSIT_WINDOW_MINUTES * 60_000)
    expect(depositExpiresAt({ createdAt: null })).toBeNull()
  })
})

describe('never credits past the cap', () => {
  it('clamps credits to the room left under MAX_BALANCE', () => {
    expect(limits.capCredit(0, 100)).toBe(100)
    expect(limits.capCredit(MAX_BALANCE - 50, 100)).toBe(50)
    expect(limits.capCredit(MAX_BALANCE, 100)).toBe(0)
    expect(limits.capCredit(0, -5)).toBe(0)
  })
})

describe('limits stay in sync across client, functions and rules', () => {
  const rules = readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8')

  it('matches functions/src/limits.ts', () => {
    expect(limits.MAX_BALANCE).toBe(MAX_BALANCE)
    expect(limits.MIN_DEPOSIT).toBe(MIN_DEPOSIT)
    expect(limits.MAX_DEPOSIT).toBe(MAX_DEPOSIT)
    expect(limits.DEPOSIT_WINDOW_MINUTES).toBe(DEPOSIT_WINDOW_MINUTES)
    expect(limits.RELOAD_BONUS_PERCENT).toBe(RELOAD_BONUS_PERCENT)
    expect(limits.TURNOVER_DEPOSIT_MULTIPLIER).toBe(TURNOVER_DEPOSIT_MULTIPLIER)
    expect(limits.TURNOVER_BONUS_MULTIPLIER).toBe(TURNOVER_BONUS_MULTIPLIER)
    for (const amount of [20, 123.45, 50_000])
      expect(limits.reloadBonusFor(amount)).toBe(reloadBonusFor(amount))
  })

  it('matches firestore.rules', () => {
    expect(rules).toContain(`return ${MAX_BALANCE};`)
    expect(rules).toContain(`amount >= ${MIN_DEPOSIT} && amount <= ${MAX_DEPOSIT}`)
    expect(rules).toContain(`duration.value(${DEPOSIT_WINDOW_MINUTES}, 'm')`)
    expect(rules).toContain(`math.round(amount * ${RELOAD_BONUS_PERCENT}.0)) / 100.0`)
    expect(rules).toContain(
      `amount * ${TURNOVER_DEPOSIT_MULTIPLIER}.0 + bonus * ${TURNOVER_BONUS_MULTIPLIER}.0`,
    )
    const methods = wallet.DEPOSIT_METHODS.map((method) => `'${method.label}'`).join(', ')
    expect(rules).toContain(`d.method in [${methods}]`)
  })
})
