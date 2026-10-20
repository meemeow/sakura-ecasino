import gcashLogo from '@/assets/images/payments/gcash.png'
import mayaLogo from '@/assets/images/payments/maya.png'
import gcashQr from '@/assets/images/payments/qr-gcash.png'
import mayaQr from '@/assets/images/payments/qr-maya.png'

// Amounts, bonuses and payment channels for the wallet page and its Deposit / Withdraw dialog.

export type WalletMode = 'deposit' | 'withdraw'

export interface Preset {
  amount: number
  hot?: boolean
}

export interface Method {
  id: string
  label: string
  logo: string
  /** QR players scan to pay a deposit (QR Ph, so most bank apps can pay it too) */
  qr?: string
}

/**
 * A QR deposit waits this long for the player to pay and submit the reference. Unapproved after
 * it, it shows as expired and the player can start another. Keep in sync with
 * functions/src/limits.ts.
 */
export const DEPOSIT_WINDOW_MINUTES = 10

/** Smallest and largest single deposit, in pesos. Keep in sync with functions/src/limits.ts. */
export const MIN_DEPOSIT = 20
export const MAX_DEPOSIT = 50_000
export const WITHDRAW_DAILY_LIMIT = 50_000

/**
 * Reload Bonus: 30% extra on a deposit, once per day (Philippine time). Keep in sync with
 * functions/src/limits.ts, which credits it.
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
 * Keep in sync with functions/src/limits.ts, which enforces it server-side.
 */
export const TURNOVER_DEPOSIT_MULTIPLIER = 1
export const TURNOVER_BONUS_MULTIPLIER = 10

/** Turnover a deposit adds, in pesos */
export function turnoverFor(deposit: number, bonus: number): number {
  return deposit * TURNOVER_DEPOSIT_MULTIPLIER + bonus * TURNOVER_BONUS_MULTIPLIER
}

// 8 quick amounts, a 4 x 2 grid like withdraw's (7 + Max); smaller deposits can be typed
export const DEPOSIT_PRESETS: Preset[] = [
  { amount: 100 },
  { amount: 200, hot: true },
  { amount: 500, hot: true },
  { amount: 1_000, hot: true },
  { amount: 5_000 },
  { amount: 10_000 },
  { amount: 25_000 },
  { amount: 50_000 },
]
export const WITHDRAW_PRESETS: Preset[] = [200, 500, 1_000, 5_000, 10_000, 25_000, 50_000].map(
  (amount) => ({ amount }),
)

export const DEPOSIT_METHODS: Method[] = [
  { id: 'gcash', label: 'GCash', logo: gcashLogo, qr: gcashQr },
  { id: 'maya', label: 'Maya', logo: mayaLogo, qr: mayaQr },
]
export const WITHDRAW_METHODS: Method[] = [
  { id: 'gcash', label: 'GCash', logo: gcashLogo },
  { id: 'maya', label: 'Maya', logo: mayaLogo },
]
