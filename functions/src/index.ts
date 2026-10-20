import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()

// Cap concurrent instances per function for cost control.
setGlobalOptions({ maxInstances: 10, region: 'asia-southeast1' })

// QR deposits don't use functions: on the Spark plan the player's app writes each step and
// firestore.rules check it (see src/services/wallet.ts). Move them here when the project goes
// to Blaze with a payment provider.

// Wallet callables (deposit, withdraw) and game callables (placeBet) are
// exported from here. Every balance change must happen in a Firestore
// transaction inside a function — clients can never write `balance`.
//
// VIP: in that same transaction, a deposit must also do
// `totalDeposit: FieldValue.increment(amount)` and a bet `totalBet: FieldValue.increment(stake)`
// on users/{uid}. The client derives the VIP level from these (src/vip/levels.ts).
//
// Balance cap: no credit may push `balance` past MAX_BALANCE (₱9,999,999,999.99, see
// ./limits.ts). Deposits over the cap are rejected; payouts are capped with capCredit().
//
// Deposit amount: reject anything below MIN_DEPOSIT (₱20) or above MAX_DEPOSIT (₱50,000), see
// ./limits.ts; the client stops at the same limits.
//
// Reload Bonus (./limits.ts): a deposit that asks for it gets reloadBonusFor(amount) only if
// !reloadBonusUsedToday(user.lastReloadBonusAt), checked in the transaction, which then sets
// lastReloadBonusAt to the server time and writes the bonus as its own 'bonus' transaction.
// Never trust the client's bonus amount; recompute it here.
//
// Turnover (./limits.ts), in the same transactions, read-then-write since it never goes below 0:
// - deposit: set turnoverAfterDeposit(user, turnoverFor(amount, bonus)) on users/{uid}
// - placeBet: set turnoverRemaining = turnoverAfterBet(user.turnoverRemaining, stake)
// - withdraw: reject with failed-precondition while turnoverRemaining > 0. The client blocks
//   it too (WalletFlowDialog), but only this check counts.
