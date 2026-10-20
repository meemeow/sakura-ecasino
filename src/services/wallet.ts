// The player's side of a QR deposit. On the Spark plan there are no Cloud Functions, so the
// player's app writes every step and firestore.rules check each one field by field: opening it,
// adding the proof of payment, and crediting it once the admin has set approvedAt in the console.
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '@/firebase'
import {
  depositExpiresAt,
  reloadBonusUsedToday,
  turnoverAfterDeposit,
  turnoverFor,
} from '@/components/wallet/walletOptions'
import type { Transaction, UserProfile } from '@/types'

/**
 * Opens a pending QR deposit and points users/{uid}.pendingDepositId at it, in one write.
 * firestore.rules refuse it (permission-denied) unless the account is verified, the amount and
 * method are allowed, the bonus is exactly 30% or 0 (and today's isn't used), the balance cap
 * holds, and no other deposit is still open. Returns the deposit's id.
 */
export async function createDeposit(uid: string, amount: number, method: string, bonus: number) {
  const txRef = doc(collection(db, 'users', uid, 'transactions'))
  const batch = writeBatch(db)
  batch.set(txRef, {
    type: 'deposit',
    status: 'pending',
    amount,
    bonus,
    method,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid), { pendingDepositId: txRef.id })
  await batch.commit()
  return txRef.id
}

/**
 * The player's proof of payment on their pending deposit: the amount they sent (must equal the
 * deposit) and the receipt's reference number. firestore.rules allow only these fields, only
 * within the deposit's window.
 */
export function submitDepositProof(
  uid: string,
  txId: string,
  sentAmount: number,
  reference: string,
) {
  return updateDoc(doc(db, 'users', uid, 'transactions', txId), {
    sentAmount,
    reference,
    submittedAt: serverTimestamp(),
  })
}

/**
 * Credits a deposit the admin has approved (approvedAt set in the console): balance, Reload
 * Bonus (only if none was credited today), VIP deposit total and turnover, and closes it. One
 * transaction, so it happens once or not at all. firestore.rules check every number, so the
 * arithmetic below is written in the same order as theirs.
 */
export function claimDeposit(uid: string, txId: string) {
  const userRef = doc(db, 'users', uid) as DocumentReference<UserProfile>
  const txRef = doc(db, 'users', uid, 'transactions', txId) as DocumentReference<Transaction>
  return runTransaction(db, async (t) => {
    const tx = (await t.get(txRef)).data()
    const user = (await t.get(userRef)).data()
    if (!tx || !user || !tx.approvedAt || (tx.status !== 'pending' && tx.status !== 'expired'))
      return

    const bonus = reloadBonusUsedToday(user.lastReloadBonusAt?.toDate()) ? 0 : (tx.bonus ?? 0)
    t.update(txRef, { status: 'successful', creditedBonus: bonus })
    t.update(userRef, {
      balance: (user.balance ?? 0) + tx.amount + bonus,
      totalDeposit: (user.totalDeposit ?? 0) + tx.amount,
      ...turnoverAfterDeposit(user, turnoverFor(tx.amount, bonus)),
      ...(bonus > 0 ? { lastReloadBonusAt: serverTimestamp() } : {}),
      ...(user.pendingDepositId === txId ? { pendingDepositId: null } : {}),
      claimedDepositId: txId,
    })
    // The bonus as its own history entry, at a fixed id so it can only be written once
    if (bonus > 0) {
      t.set(doc(db, 'users', uid, 'transactions', `${txId}_bonus`), {
        type: 'bonus',
        status: 'successful',
        amount: bonus,
        method: 'Reload Bonus',
        createdAt: serverTimestamp(),
      })
    }
  })
}

/** Closes a deposit the admin rejected (rejectedAt set in the console), freeing the player */
export function closeRejectedDeposit(uid: string, txId: string, ownsPending: boolean) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid, 'transactions', txId), { status: 'failed' })
  if (ownsPending) batch.update(doc(db, 'users', uid), { pendingDepositId: null })
  return batch.commit()
}

/** Marks an undecided deposit expired once its window has closed, freeing the player */
export function expireDeposit(uid: string, txId: string, ownsPending: boolean) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid, 'transactions', txId), { status: 'expired' })
  if (ownsPending) batch.update(doc(db, 'users', uid), { pendingDepositId: null })
  return batch.commit()
}

export type DepositState = 'pending' | 'submitted' | 'expired' | 'successful' | 'failed'

/** Where a QR deposit stands for the player. Still 'pending' past its window reads as expired. */
export function depositState(tx: Transaction, now: number): DepositState {
  if (tx.status === 'successful' || tx.status === 'failed' || tx.status === 'expired')
    return tx.status
  // Approved or rejected in the console, before the app has closed it
  if (tx.approvedAt) return 'submitted'
  if (tx.rejectedAt) return 'failed'
  const expiresAt = depositExpiresAt(tx)
  if (expiresAt !== null && expiresAt <= now) return 'expired'
  return tx.reference ? 'submitted' : 'pending'
}
