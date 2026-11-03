import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatCountdown,
  formatMoney,
  formatPeso,
  formatWhole,
  localMobile,
  maskMobile,
} from '@/utils/format'

describe('number formats', () => {
  it('formats pesos with two decimals and grouping', () => {
    expect(formatPeso(1234.5)).toBe('₱1,234.50')
    expect(formatPeso(0)).toBe('₱0.00')
  })

  it('formats money, amounts and whole numbers', () => {
    expect(formatMoney(1000)).toBe('1,000.00')
    expect(formatAmount(12.5)).toBe('12.5')
    expect(formatAmount(12.345)).toBe('12.35')
    expect(formatWhole(1234.6)).toBe('1,235')
  })
})

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [-5000, '0:00'],
    [1, '0:01'],
    [59_001, '1:00'],
    [61_000, '1:01'],
    [600_000, '10:00'],
  ])('%i ms shows %s', (ms, shown) => {
    expect(formatCountdown(ms)).toBe(shown)
  })
})

describe('mobile numbers', () => {
  it('turns E.164 into the local 09 form', () => {
    expect(localMobile('+639171234567')).toBe('09171234567')
    expect(localMobile(null)).toBe('')
    expect(localMobile(undefined)).toBe('')
  })

  it('masks the middle digits', () => {
    expect(maskMobile('09171234567')).toBe('0917***4567')
    expect(maskMobile('09171234567', '•••')).toBe('0917•••4567')
  })
})
