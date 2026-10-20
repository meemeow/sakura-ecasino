import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { collection, doc, getDocFromServer, limit, orderBy, query } from 'firebase/firestore'
import { useCollection, useCurrentUser, useDocument } from 'vuefire'
import { db } from '@/firebase'
import type { Transaction, UserProfile } from '@/types'
import { vipLevels, vipStatus } from '@/vip/levels'
import { claimDeposit, closeRejectedDeposit, expireDeposit } from '@/services/wallet'
import { depositExpiresAt } from '@/components/wallet/walletOptions'

/**
 * Highest balance a player can hold. Keep in sync with functions/src/limits.ts and
 * firestore.rules (maxBalance), which enforce it (deposits, bonuses and payouts must never push
 * past it).
 */
export const MAX_BALANCE = 9_999_999_999.99

const isBet = (t: Transaction) => t.type === 'bet' || t.type === 'win'

// Balance and transaction history, read from Firestore. Balance writes are checked by
// firestore.rules (QR deposits, see services/wallet.ts) or made by Cloud Functions.
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

  // Users without a profile doc yet (e.g. just signed up) have nothing to spend
  // Clamped as a last line of defense; the server cap is the real guarantee
  const balance = computed(() => Math.min(profile.value?.balance ?? 0, MAX_BALANCE))

  // TEMP layout preview: a big balance shown in the header/sidebar on the dev server only.
  // Display only; never use it for money logic. Set PREVIEW_BALANCE to null when done.
  const PREVIEW_BALANCE: number | null = null
  const displayBalance = computed(() =>
    Math.min(
      PREVIEW_BALANCE !== null && import.meta.env.DEV ? PREVIEW_BALANCE : balance.value,
      MAX_BALANCE,
    ),
  )
  // The open QR deposit, if any (users/{uid}.pendingDepositId, set by createDeposit). Whether
  // it's still payable or already expired is depositState() in services/wallet.ts.
  const pendingDepositDoc = useDocument<Transaction>(() =>
    user.value && profile.value?.pendingDepositId
      ? doc(db, 'users', user.value.uid, 'transactions', profile.value.pendingDepositId)
      : null,
  )
  // VueFire keeps the last doc when the source goes null, so only trust it while the profile
  // still points at it (crediting clears pendingDepositId)
  const pendingDeposit = computed(() => {
    const d = pendingDepositDoc.value
    return d && d.id === profile.value?.pendingDepositId ? d : null
  })

  // How the player's open deposit ended (credited, rejected or expired), kept here rather than
  // on the Wallet page so it's still waiting when they come back from another page (e.g. the
  // Pay page). The Wallet page shows it, then calls dismissDepositNotice(). Settling clears
  // pendingDepositId, so follow the deposit by id.
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
  // Deposits the admin has decided in the Firebase console (approvedAt / rejectedAt) are closed
  // by the player's own app as soon as it sees them: approved ones credited, rejected ones
  // marked failed. firestore.rules make sure that can only happen once, with exact amounts.
  // Offline players get theirs the next time they open the app.
  // VueFire updates the list in place when a doc changes, so watch the decided deposits
  // themselves rather than the array.
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
        // Leave it to retry on the next snapshot if it failed (e.g. offline)
        done
          .catch((e) => console.warn(`Couldn't settle deposit ${tx.id}`, e))
          .finally(() => settling.delete(tx.id))
      }
    },
    { immediate: true },
  )

  // Undecided deposits are marked expired when their window closes, which also frees the
  // player to open another. A few seconds' grace covers a device clock running ahead of the
  // server's (the rules check server time); a refused write tries again a little later.
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
      // Approved, rejected or already expired since: drop its timer
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

  // Turnover still to bet before withdrawing (written by Cloud Functions, see UserProfile).
  // progress is 0-1 through the current cycle; met once nothing is left.
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
  // Deposits, withdrawals and bonuses
  const walletTxs = computed(() => transactions.value.filter((t) => !isBet(t)))
  const bets = computed(() => transactions.value.filter(isBet))
  // TEMP layout preview: pretend to be this VIP level (0-50) on the dev server only.
  // Display only. Set PREVIEW_VIP to null when done.
  const PREVIEW_VIP: number | null = null
  const vip = computed(() => {
    if (PREVIEW_VIP !== null && import.meta.env.DEV) {
      const lvl = vipLevels[PREVIEW_VIP]!
      return vipStatus(lvl.minDeposit, lvl.minBet)
    }
    return vipStatus(profile.value?.totalDeposit ?? 0, profile.value?.totalBet ?? 0)
  })

  // Refresh button: force a read from the server, skipping the local cache. The live
  // listener above then picks up anything newer, so balance updates everywhere at once.
  // Spins for at least 700ms so a fast response still reads as "checked".
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
    displayBalance,
    turnover,
    pendingDeposit,
    depositNotice,
    dismissDepositNotice,
    walletTxs,
    bets,
    vip,
    refreshing,
    refreshBalance,
  }
})
