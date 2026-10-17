import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()

// Cap concurrent instances per function for cost control.
setGlobalOptions({ maxInstances: 10, region: 'asia-southeast1' })

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
