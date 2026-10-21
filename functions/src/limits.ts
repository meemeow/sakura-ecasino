export const MAX_BALANCE = 9_999_999_999.99

export function capCredit(balance: number, amount: number): number {
  return Math.max(0, Math.min(amount, MAX_BALANCE - balance))
}

export const MIN_DEPOSIT = 20
export const MAX_DEPOSIT = 50_000

export const DEPOSIT_WINDOW_MINUTES = 10

export const RELOAD_BONUS_PERCENT = 30
export const RELOAD_BONUS_RATE = RELOAD_BONUS_PERCENT / 100

export function reloadBonusFor(amount: number): number {
  return Math.round(amount * RELOAD_BONUS_PERCENT) / 100
}

export function phDay(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

export function reloadBonusUsedToday(lastAt: Date | undefined, now = new Date()): boolean {
  return !!lastAt && phDay(lastAt) === phDay(now)
}

export const TURNOVER_DEPOSIT_MULTIPLIER = 1
export const TURNOVER_BONUS_MULTIPLIER = 10

export function turnoverFor(deposit: number, bonus: number): number {
  return deposit * TURNOVER_DEPOSIT_MULTIPLIER + bonus * TURNOVER_BONUS_MULTIPLIER
}

export function turnoverAfterDeposit(
  current: { turnoverRequired?: number; turnoverRemaining?: number },
  added: number,
): { turnoverRequired: number; turnoverRemaining: number } {
  const remaining = Math.max(0, current.turnoverRemaining ?? 0)
  const required = remaining > 0 ? (current.turnoverRequired ?? 0) : 0
  return { turnoverRequired: required + added, turnoverRemaining: remaining + added }
}

export function turnoverAfterBet(remaining: number | undefined, stake: number): number {
  return Math.max(0, (remaining ?? 0) - stake)
}
