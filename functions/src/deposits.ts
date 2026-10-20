import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  DEPOSIT_WINDOW_MINUTES,
  MAX_BALANCE,
  MAX_DEPOSIT,
  MIN_DEPOSIT,
  capCredit,
  reloadBonusFor,
  reloadBonusUsedToday,
  turnoverAfterDeposit,
  turnoverFor,
} from './limits.js'

// QR deposits, paid by the player scanning the admin's GCash or Maya QR:
//
// 1. createDeposit (callable) opens a pending deposit: amount, method and the Reload Bonus it
//    would get, with a DEPOSIT_WINDOW_MINUTES expiry. One at a time per player
//    (users/{uid}.pendingDepositId), so a bonus can't be stacked.
// 2. The player pays and adds `sentAmount` + `reference` to it (firestore.rules allow just that).
// 3. The admin checks the payment and sets `approvedAt` on the transaction in the Firebase
//    console, like users/{uid}.verifiedAt, or `rejectedAt` to turn it down.
// 4. onDepositDecision credits an approved deposit: balance, bonus, VIP total and turnover, in
//    one transaction.

const METHODS = ['GCash', 'Maya']

interface DepositDoc {
  type: string
  status: string
  amount: number
  bonus?: number
  method?: string
  expiresAt?: Timestamp
  approvedAt?: Timestamp
  rejectedAt?: Timestamp
}

interface UserDoc {
  balance?: number
  verifiedAt?: Timestamp
  lastReloadBonusAt?: Timestamp
  turnoverRequired?: number
  turnoverRemaining?: number
  pendingDepositId?: string | null
}

const isCentavos = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

export const createDeposit = onCall<{ amount: unknown; method: unknown; bonus: unknown }>(
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in to deposit.')

    const { amount, method, bonus: wantsBonus } = request.data ?? {}
    if (typeof amount !== 'number' || !Number.isFinite(amount) || !isCentavos(amount))
      throw new HttpsError('invalid-argument', 'Enter a valid amount.')
    if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT)
      throw new HttpsError(
        'invalid-argument',
        `Deposits are ₱${MIN_DEPOSIT} to ₱${MAX_DEPOSIT.toLocaleString('en-PH')}.`,
      )
    if (typeof method !== 'string' || !METHODS.includes(method))
      throw new HttpsError('invalid-argument', 'Choose GCash or Maya.')

    const db = getFirestore()
    const userRef = db.doc(`users/${uid}`)
    const txRef = userRef.collection('transactions').doc()

    await db.runTransaction(async (t) => {
      const user = ((await t.get(userRef)).data() ?? {}) as UserDoc
      if (!user.verifiedAt)
        throw new HttpsError('failed-precondition', 'Verify your account to deposit.')

      // One pending deposit at a time. One past its window counts as expired and is closed here.
      if (user.pendingDepositId) {
        const pendingRef = userRef.collection('transactions').doc(user.pendingDepositId)
        const pending = (await t.get(pendingRef)).data() as DepositDoc | undefined
        if (pending?.status === 'pending') {
          if (pending.expiresAt && pending.expiresAt.toMillis() > Date.now())
            throw new HttpsError('already-exists', 'Finish or wait out your pending deposit first.')
          t.update(pendingRef, { status: 'expired' })
        }
      }

      // Recomputed here, never taken from the client; checked again when it's approved
      const bonus =
        wantsBonus === true && !reloadBonusUsedToday(user.lastReloadBonusAt?.toDate())
          ? reloadBonusFor(amount)
          : 0
      if ((user.balance ?? 0) + amount + bonus > MAX_BALANCE)
        throw new HttpsError('failed-precondition', "Your balance can't go that high.")

      t.create(txRef, {
        type: 'deposit',
        status: 'pending',
        amount,
        bonus,
        method,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + DEPOSIT_WINDOW_MINUTES * 60_000),
      })
      t.set(userRef, { pendingDepositId: txRef.id }, { merge: true })
    })

    return { id: txRef.id }
  },
)

// Runs when the admin sets approvedAt (or rejectedAt) on a deposit in the console.
// Our own writes below don't touch those fields, so they never re-trigger the credit.
export const onDepositDecision = onDocumentUpdated(
  'users/{uid}/transactions/{txId}',
  async (event) => {
    const before = event.data?.before.data() as DepositDoc | undefined
    const after = event.data?.after.data() as DepositDoc | undefined
    if (!before || !after || after.type !== 'deposit') return

    const approved = !before.approvedAt && !!after.approvedAt
    const rejected = !before.rejectedAt && !!after.rejectedAt
    if (!approved && !rejected) return

    const { uid, txId } = event.params
    const db = getFirestore()
    const userRef = db.doc(`users/${uid}`)
    const txRef = userRef.collection('transactions').doc(txId)

    await db.runTransaction(async (t) => {
      const tx = (await t.get(txRef)).data() as DepositDoc | undefined
      const user = ((await t.get(userRef)).data() ?? {}) as UserDoc
      // Only an open deposit is decided, once. An expired one can still be approved late, for a
      // payment that did arrive.
      if (!tx || (tx.status !== 'pending' && tx.status !== 'expired')) return
      // Free the player to deposit again, unless they already have a newer pending one
      const ownsPending = user.pendingDepositId === txId

      if (rejected) {
        t.update(txRef, { status: 'failed' })
        if (ownsPending) t.update(userRef, { pendingDepositId: null })
        return
      }

      // The bonus only if today's hasn't been credited since this deposit was opened
      const bonus =
        (tx.bonus ?? 0) > 0 && !reloadBonusUsedToday(user.lastReloadBonusAt?.toDate())
          ? (tx.bonus ?? 0)
          : 0
      const balance = user.balance ?? 0
      const credit = capCredit(balance, tx.amount + bonus)

      t.update(userRef, {
        balance: balance + credit,
        totalDeposit: FieldValue.increment(tx.amount),
        ...turnoverAfterDeposit(user, turnoverFor(tx.amount, bonus)),
        ...(bonus > 0 ? { lastReloadBonusAt: FieldValue.serverTimestamp() } : {}),
        ...(ownsPending ? { pendingDepositId: null } : {}),
      })
      t.update(txRef, { status: 'successful', bonus })
      if (bonus > 0) {
        t.create(userRef.collection('transactions').doc(), {
          type: 'bonus',
          status: 'successful',
          amount: bonus,
          method: 'Reload Bonus',
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    })
  },
)
