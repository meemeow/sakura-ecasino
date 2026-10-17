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
