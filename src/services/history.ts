import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Transaction } from '@/types'

export type HistoryFilter = 'all' | 'deposit' | 'withdrawal' | 'bonus'
export type HistoryRow = Transaction & { id: string }

const WALLET_TYPES = ['deposit', 'withdrawal', 'bonus']

function historyQuery(uid: string, filter: HistoryFilter) {
  return query(
    collection(db, 'users', uid, 'transactions'),
    filter === 'all' ? where('type', 'in', WALLET_TYPES) : where('type', '==', filter),
    orderBy('createdAt', 'desc'),
  )
}

export async function fetchHistoryPage(
  uid: string,
  filter: HistoryFilter,
  size: number,
  after?: QueryDocumentSnapshot,
) {
  const base = historyQuery(uid, filter)
  const snap = await getDocs(
    after ? query(base, startAfter(after), limit(size)) : query(base, limit(size)),
  )
  return {
    rows: snap.docs.map((d) => ({ ...(d.data() as Transaction), id: d.id })),
    last: snap.docs.at(-1),
  }
}

export async function countHistory(uid: string, filter: HistoryFilter) {
  return (await getCountFromServer(historyQuery(uid, filter))).data().count
}
