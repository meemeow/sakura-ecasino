import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { collection, doc, getDocFromServer, limit, orderBy, query } from 'firebase/firestore'
import { useCollection, useCurrentUser, useDocument } from 'vuefire'
import { db } from '@/firebase'
import type { Transaction, UserProfile } from '@/types'
import { vipStatus } from '@/constants/vip'
import { claimDeposit, closeRejectedDeposit, expireDeposit } from '@/services/wallet'
import { MAX_BALANCE, depositExpiresAt } from '@/constants/wallet'
import { localMobile, maskMobile } from '@/utils/format'

const isBet = (t: Transaction) => t.type === 'bet' || t.type === 'win'

export const useWalletStore = defineStore('wallet', () => {
  const user = useCurrentUser()
  const profile = useDocument<UserProfile>(() =>
    user.value ? doc(db, 'users', user.value.uid) : null,
  )
  const transactions = useCollection<Transaction>(() =>
    user.value
      ? query(
          collection(db, 'users', user.value.uid, 'transactions'),
          orderBy('createdAt', 'desc'),
          limit(100),
        )
      : null,
  )

  const balance = computed(() => Math.min(profile.value?.balance ?? 0, MAX_BALANCE))
  const displayName = computed(() => {
    if (profile.value?.displayName) return profile.value.displayName
    const local = localMobile(user.value?.phoneNumber)
    return local ? maskMobile(local) : user.value?.displayName || 'Player'
  })
  const pendingDepositDoc = useDocument<Transaction>(() =>
    user.value && profile.value?.pendingDepositId
      ? doc(db, 'users', user.value.uid, 'transactions', profile.value.pendingDepositId)
      : null,
  )
  const pendingDeposit = computed(() => {
    const d = pendingDepositDoc.value
    return d && d.id === profile.value?.pendingDepositId ? d : null
  })

  const watchedDepositId = ref<string | null>(null)
  watch(
    () => pendingDeposit.value?.id,
    (id) => {
      if (id) watchedDepositId.value = id
    },
    { immediate: true },
  )
  const depositNotice = ref<{
    id: string
    outcome: 'successful' | 'failed' | 'expired'
    amount: number
    bonus: number
    reference?: string
  } | null>(null)
  watch(
    () => transactions.value.find((t) => t.id === watchedDepositId.value),
    (tx) => {
      if (tx?.status !== 'successful' && tx?.status !== 'failed' && tx?.status !== 'expired') return
      watchedDepositId.value = null
      depositNotice.value = {
        id: tx.id,
        outcome: tx.status,
        amount: tx.amount,
        bonus: tx.creditedBonus ?? 0,
        reference: tx.reference,
      }
    },
    { deep: true },
  )
  function dismissDepositNotice() {
    depositNotice.value = null
  }
  const decidedDeposits = computed(() =>
    transactions.value.filter(
      (tx) =>
        tx.type === 'deposit' &&
        (tx.status === 'pending' || tx.status === 'expired') &&
        (tx.approvedAt || tx.rejectedAt),
    ),
  )
  const settling = new Set<string>()
  watch(
    decidedDeposits,
    (list) => {
      const uid = user.value?.uid
      if (!uid) return
      for (const tx of list) {
        if (settling.has(tx.id)) continue
        settling.add(tx.id)
        const done = tx.approvedAt
          ? claimDeposit(uid, tx.id)
          : closeRejectedDeposit(uid, tx.id, profile.value?.pendingDepositId === tx.id)
        done
          .catch((e) => console.warn(`Couldn't settle deposit ${tx.id}`, e))
          .finally(() => settling.delete(tx.id))
      }
    },
    { immediate: true },
  )

  const EXPIRY_GRACE_MS = 3000
  const EXPIRY_RETRY_MS = 10_000
  const undecidedDeposits = computed(() =>
    transactions.value.filter(
      (tx) =>
        tx.type === 'deposit' &&
        tx.status === 'pending' &&
        !tx.approvedAt &&
        !tx.rejectedAt &&
        depositExpiresAt(tx) !== null,
    ),
  )
  const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>()
  function scheduleExpiry(txId: string, delay: number) {
    expiryTimers.set(
      txId,
      setTimeout(() => {
        const uid = user.value?.uid
        if (!uid) return
        expireDeposit(uid, txId, profile.value?.pendingDepositId === txId).catch((e) => {
          console.warn(`Couldn't expire deposit ${txId}`, e)
          if (expiryTimers.has(txId)) scheduleExpiry(txId, EXPIRY_RETRY_MS)
        })
      }, delay),
    )
  }
  watch(
    undecidedDeposits,
    (list) => {
      const ids = new Set(list.map((tx) => tx.id))
      for (const [id, timer] of expiryTimers) {
        if (ids.has(id)) continue
        clearTimeout(timer)
        expiryTimers.delete(id)
      }
      for (const tx of list) {
        if (expiryTimers.has(tx.id)) continue
        scheduleExpiry(tx.id, Math.max(0, depositExpiresAt(tx)! + EXPIRY_GRACE_MS - Date.now()))
      }
    },
    { immediate: true },
  )

  const turnover = computed(() => {
    const required = profile.value?.turnoverRequired ?? 0
    const remaining = Math.max(0, profile.value?.turnoverRemaining ?? 0)
    return {
      required,
      remaining,
      met: remaining === 0,
      progress: required > 0 ? Math.min(1, 1 - remaining / required) : 1,
    }
  })
  const walletTxs = computed(() => transactions.value.filter((t) => !isBet(t)))
  const walletTxById = computed(() => new Map(walletTxs.value.map((t) => [t.id, t])))
  const bets = computed(() => transactions.value.filter(isBet))
  const vip = computed(() =>
    vipStatus(profile.value?.totalDeposit ?? 0, profile.value?.totalBet ?? 0),
  )

  const refreshing = ref(false)
  async function refreshBalance(): Promise<boolean> {
    if (refreshing.value || !user.value) return true
    refreshing.value = true
    const minSpin = new Promise((resolve) => setTimeout(resolve, 700))
    try {
      await Promise.all([getDocFromServer(doc(db, 'users', user.value.uid)), minSpin])
      return true
    } catch {
      await minSpin
      return false
    } finally {
      refreshing.value = false
    }
  }

  return {
    profile,
    balance,
    displayName,
    turnover,
    pendingDeposit,
    depositNotice,
    dismissDepositNotice,
    walletTxs,
    walletTxById,
    bets,
    vip,
    refreshing,
    refreshBalance,
  }
})
