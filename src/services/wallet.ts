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
} from '@/constants/wallet'
import type { Transaction, UserProfile } from '@/types'

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
    approvedAt: serverTimestamp(),
  })
}

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

export function closeRejectedDeposit(uid: string, txId: string, ownsPending: boolean) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid, 'transactions', txId), { status: 'failed' })
  if (ownsPending) batch.update(doc(db, 'users', uid), { pendingDepositId: null })
  return batch.commit()
}

export function expireDeposit(uid: string, txId: string, ownsPending: boolean) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', uid, 'transactions', txId), { status: 'expired' })
  if (ownsPending) batch.update(doc(db, 'users', uid), { pendingDepositId: null })
  return batch.commit()
}

export type DepositState = 'pending' | 'submitted' | 'expired' | 'successful' | 'failed'

export function depositState(tx: Transaction, now: number): DepositState {
  if (tx.status === 'successful' || tx.status === 'failed' || tx.status === 'expired')
    return tx.status
  if (tx.approvedAt) return 'submitted'
  if (tx.rejectedAt) return 'failed'
  const expiresAt = depositExpiresAt(tx)
  if (expiresAt !== null && expiresAt <= now) return 'expired'
  return tx.reference ? 'submitted' : 'pending'
}
