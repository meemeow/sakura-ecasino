/**
 * Highest balance a player can hold. Keep in sync with MAX_BALANCE in src/stores/wallet.ts.
 *
 * Every function that adds to `balance` (deposit, bonus, bet payout) must check this inside
 * its Firestore transaction and refuse the change (or, for payouts, cap the credit) when
 * `balance + amount` would exceed it. Use `capCredit` so the rule lives in one place.
 */
export const MAX_BALANCE = 9_999_999_999.99

/** How much of `amount` can be credited to `balance` without passing MAX_BALANCE */
export function capCredit(balance: number, amount: number): number {
  return Math.max(0, Math.min(amount, MAX_BALANCE - balance))
}

/**
 * Smallest and largest single deposit, in pesos. Keep in sync with
 * src/components/wallet/walletOptions.ts. The deposit function rejects anything outside them.
 */
export const MIN_DEPOSIT = 20
export const MAX_DEPOSIT = 50_000

/**
 * A QR deposit waits this long for payment. Unapproved after it, it counts as expired and the
 * player may start another; an admin can still approve it late if the money did arrive.
 * Keep in sync with src/components/wallet/walletOptions.ts.
 */
export const DEPOSIT_WINDOW_MINUTES = 10

/**
 * Reload Bonus: 30% extra on a deposit, once per day (Philippine time). Keep in sync with
 * src/components/wallet/walletOptions.ts, which shows it to the player.
 */
export const RELOAD_BONUS_RATE = 0.3

/** Reload Bonus on a deposit of `amount`, in pesos, rounded to the centavo */
export function reloadBonusFor(amount: number): number {
  return Math.round(amount * RELOAD_BONUS_RATE * 100) / 100
}

/** The Philippine calendar day of `date` as 'YYYY-MM-DD'; the bonus resets at PH midnight */
export function phDay(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

/** Whether today's Reload Bonus has been used, from users/{uid}.lastReloadBonusAt */
export function reloadBonusUsedToday(lastAt: Date | undefined, now = new Date()): boolean {
  return !!lastAt && phDay(lastAt) === phDay(now)
}

/**
 * Turnover: before withdrawing, a player must bet 1x each deposit plus 10x its Reload Bonus.
 * Keep in sync with src/components/wallet/walletOptions.ts, which shows it to the player.
 */
export const TURNOVER_DEPOSIT_MULTIPLIER = 1
export const TURNOVER_BONUS_MULTIPLIER = 10

/** Turnover a deposit adds, in pesos */
export function turnoverFor(deposit: number, bonus: number): number {
  return deposit * TURNOVER_DEPOSIT_MULTIPLIER + bonus * TURNOVER_BONUS_MULTIPLIER
}

/**
 * users/{uid} turnover fields after a deposit. A finished cycle (nothing left to bet) starts
 * over, so the progress bar measures only what this deposit asks for.
 */
export function turnoverAfterDeposit(
  current: { turnoverRequired?: number; turnoverRemaining?: number },
  added: number,
): { turnoverRequired: number; turnoverRemaining: number } {
  const remaining = Math.max(0, current.turnoverRemaining ?? 0)
  const required = remaining > 0 ? (current.turnoverRequired ?? 0) : 0
  return { turnoverRequired: required + added, turnoverRemaining: remaining + added }
}

/** turnoverRemaining after a bet of `stake`; never below 0 */
export function turnoverAfterBet(remaining: number | undefined, stake: number): number {
  return Math.max(0, (remaining ?? 0) - stake)
}
