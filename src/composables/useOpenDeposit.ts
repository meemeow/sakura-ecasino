import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useNow } from '@/composables/useNow'
import { DEPOSIT_WINDOW_MINUTES, depositExpiresAt } from '@/constants/wallet'
import { depositState } from '@/services/wallet'
import { formatCountdown } from '@/utils/format'

export function useOpenDeposit() {
  const wallet = useWalletStore()
  const now = useNow()
  const openDeposit = computed(() => {
    const d = wallet.pendingDeposit
    if (!d || d.id !== wallet.profile?.pendingDepositId) return null
    const state = depositState(d, now.value)
    if (state !== 'pending' && state !== 'submitted') return null
    const expiresAt = depositExpiresAt(d) ?? now.value + DEPOSIT_WINDOW_MINUTES * 60_000
    return { deposit: d, state, timeLeft: formatCountdown(expiresAt - now.value) }
  })
  return openDeposit
}
