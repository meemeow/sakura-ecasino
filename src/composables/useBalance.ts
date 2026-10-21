import { useToast } from 'primevue/usetoast'
import { useCountUp } from '@/composables/useCountUp'
import { useWalletStore } from '@/stores/wallet'

export function useBalance() {
  const wallet = useWalletStore()
  const toast = useToast()

  const shownBalance = useCountUp(() => wallet.balance, {
    fromZero: true,
    duration: 1500,
    ready: () => wallet.profile !== undefined,
  })

  async function refreshBalance() {
    if (await wallet.refreshBalance()) return
    toast.add({
      severity: 'error',
      summary: "Couldn't refresh balance",
      detail: 'Check your connection and try again.',
      life: 3000,
    })
  }

  return { shownBalance, refreshBalance }
}
