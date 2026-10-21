import gcashLogo from '@/assets/images/payments/gcash.png'
import mayaLogo from '@/assets/images/payments/maya.png'
import gcashQr from '@/assets/images/payments/qr-gcash.png'
import mayaQr from '@/assets/images/payments/qr-maya.png'

export type WalletMode = 'deposit' | 'withdraw'

export interface Preset {
  amount: number
  hot?: boolean
}

export interface Method {
  id: string
  label: string
  logo: string
  qr?: string
}

export const MAX_BALANCE = 9_999_999_999.99

export const DEPOSIT_WINDOW_MINUTES = 10

export function depositExpiresAt(tx: { createdAt?: { toMillis(): number } | null }) {
  return tx.createdAt ? tx.createdAt.toMillis() + DEPOSIT_WINDOW_MINUTES * 60_000 : null
}

export const MIN_DEPOSIT = 20
export const MAX_DEPOSIT = 50_000
export const WITHDRAW_DAILY_LIMIT = 50_000

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
