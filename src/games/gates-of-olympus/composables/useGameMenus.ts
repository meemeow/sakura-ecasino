import { computed, ref } from 'vue'

export type GameMenu = 'autoplay' | 'rules' | 'bet' | 'buy'

export function useGameMenus() {
  const modal = ref<GameMenu | null>(null)

  function menuFlag(name: GameMenu) {
    return computed({
      get: () => modal.value === name,
      set: (open) => {
        if (open) modal.value = name
        else if (modal.value === name) modal.value = null
      },
    })
  }

  const autoplayMenu = menuFlag('autoplay')
  const rulesOpen = menuFlag('rules')
  const betMenu = menuFlag('bet')
  const buyPopup = menuFlag('buy')
  const buyClosing = ref(false)
  const buyBlocking = computed(() => buyPopup.value || buyClosing.value)
  const blocksSpin = computed(() => rulesOpen.value || autoplayMenu.value || buyBlocking.value)

  return { modal, autoplayMenu, rulesOpen, betMenu, buyPopup, buyClosing, buyBlocking, blocksSpin }
}
