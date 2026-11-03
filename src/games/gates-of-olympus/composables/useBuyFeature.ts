import { computed, type Ref } from 'vue'
import type { useDemoCredit } from '@/games/gates-of-olympus/composables/useDemoCredit'
import type { useGameMenus } from '@/games/gates-of-olympus/composables/useGameMenus'
import { formatPeso } from '@/utils/format'

const BUY_COST_X = 100
export const ANTE_STAKE_X = 1.25

type BuyDeps = {
  menus: ReturnType<typeof useGameMenus>
  credit: ReturnType<typeof useDemoCredit>
  bet: Ref<number>
  ante: Ref<boolean>
  playing: Ref<boolean>
  autoplay: Ref<boolean>
  spinBought: () => void
}

export function useBuyFeature({
  menus,
  credit,
  bet,
  ante,
  playing,
  autoplay,
  spinBought,
}: BuyDeps) {
  const { buyPopup, buyClosing } = menus
  const buyCost = computed(() => bet.value * BUY_COST_X)
  const buyPrice = computed(() => formatPeso(buyCost.value))
  const canBuy = computed(() => !ante.value && credit.credit.value >= buyCost.value)
  const antePrice = computed(() => formatPeso(bet.value * ANTE_STAKE_X))
  let confirmed = false

  function openBuy() {
    if (playing.value || autoplay.value || !canBuy.value) return
    buyClosing.value = false
    buyPopup.value = true
  }

  function answerBuy(buy: boolean) {
    confirmed = buy && canBuy.value
    if (confirmed) credit.addCredit(-buyCost.value)
    buyClosing.value = true
    buyPopup.value = false
  }

  function buyClosed() {
    buyClosing.value = false
    if (!confirmed) return
    confirmed = false
    spinBought()
  }

  return { buyPrice, canBuy, antePrice, openBuy, answerBuy, buyClosed }
}
