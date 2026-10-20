import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { collection, doc, getDocFromServer, limit, orderBy, query } from 'firebase/firestore'
import { useCollection, useCurrentUser, useDocument } from 'vuefire'
import { db } from '@/firebase'
import type { Transaction, UserProfile } from '@/types'
import { vipLevels, vipStatus } from '@/vip/levels'

/**
 * Highest balance a player can hold. Keep in sync with functions/src/limits.ts, which
 * enforces it server-side (deposits, bonuses and payouts must never push past it).
 */
export const MAX_BALANCE = 9_999_999_999.99

const isBet = (t: Transaction) => t.type === 'bet' || t.type === 'win'

// Balance and transaction history (read from Firestore; writes go through Cloud Functions).
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
  // The open QR deposit, if any (users/{uid}.pendingDepositId, set by Cloud Functions). Whether
  // it's still payable or already expired is depositState() in services/wallet.ts.
  const pendingDeposit = useDocument<Transaction>(() =>
    user.value && profile.value?.pendingDepositId
      ? doc(db, 'users', user.value.uid, 'transactions', profile.value.pendingDepositId)
      : null,
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
    walletTxs,
    bets,
    vip,
    refreshing,
    refreshBalance,
  }
})
