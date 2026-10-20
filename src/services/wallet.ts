// Callable Cloud Functions for deposits and withdrawals, and the player's side of a QR deposit.
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { Transaction } from '@/types'

/**
 * Opens a pending QR deposit (functions/src/deposits.ts). The server works out the bonus itself
 * and refuses with 'already-exists' while another deposit is still open.
 */
export async function createDeposit(amount: number, method: string, bonus: boolean) {
  const call = httpsCallable<{ amount: number; method: string; bonus: boolean }, { id: string }>(
    functions,
    'createDeposit',
  )
  return (await call({ amount, method, bonus })).data.id
}

/**
 * The player's proof of payment on their pending deposit: the amount they sent (must equal the
 * deposit) and the receipt's reference number. firestore.rules allow only these fields, only
 * before the deposit expires.
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

export type DepositState = 'pending' | 'submitted' | 'expired' | 'successful' | 'failed'

/**
 * Where a QR deposit stands for the player. Still 'pending' in Firestore past its expiresAt reads
 * as expired (the server closes it when the next deposit opens).
 */
export function depositState(tx: Transaction, now: number): DepositState {
  if (tx.status === 'successful' || tx.status === 'failed' || tx.status === 'expired')
    return tx.status
  if (tx.expiresAt && tx.expiresAt.toMillis() <= now) return 'expired'
  return tx.reference ? 'submitted' : 'pending'
}
