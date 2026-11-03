import { describe, expect, it } from 'vitest'
import { fromIsoDate, latestBirthdate, toIsoDate, todayInManila } from '@/utils/birthdate'

describe('todayInManila', () => {
  it('uses the Philippine date, 8 hours ahead of UTC', () => {
    expect(todayInManila(new Date('2026-11-02T15:59:00Z'))).toEqual({ y: 2026, m: 11, d: 2 })
    expect(todayInManila(new Date('2026-11-02T16:00:00Z'))).toEqual({ y: 2026, m: 11, d: 3 })
  })
})

describe('latestBirthdate', () => {
  it('is today in Manila, 21 years back', () => {
    expect(toIsoDate(latestBirthdate(new Date('2026-11-02T16:30:00Z')))).toBe('2005-11-03')
  })

  it('rolls a 29 February birthday onto 1 March in common years', () => {
    expect(toIsoDate(latestBirthdate(new Date('2025-02-28T16:00:00Z')))).toBe('2004-03-01')
  })
})

describe('ISO dates', () => {
  it('round-trip local calendar dates', () => {
    expect(toIsoDate(new Date(2004, 1, 29))).toBe('2004-02-29')
    expect(fromIsoDate('2004-02-29')).toEqual(new Date(2004, 1, 29))
    expect(fromIsoDate('')).toBeNull()
  })
})
