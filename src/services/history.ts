// Wallet history a page at a time, straight from Firestore: one query per page turned, newest
// first, continuing after the last row of the page before. WalletHistory.vue caches the pages
// it has fetched. Needs the (type, createdAt desc) index in firestore.indexes.json.
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

// "All" is every wallet type, leaving out bets and wins
const WALLET_TYPES = ['deposit', 'withdrawal', 'bonus']

function historyQuery(uid: string, filter: HistoryFilter) {
  return query(
    collection(db, 'users', uid, 'transactions'),
    filter === 'all' ? where('type', 'in', WALLET_TYPES) : where('type', '==', filter),
    orderBy('createdAt', 'desc'),
  )
}

/** One page of history. Pass the previous page's `last` to get the page after it. */
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

/** How many rows a filter has in all, for the page count (an aggregation: one read per 1,000) */
export async function countHistory(uid: string, filter: HistoryFilter) {
  return (await getCountFromServer(historyQuery(uid, filter))).data().count
}
