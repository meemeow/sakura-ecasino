import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { useGameMenus } from '@/games/gates-of-olympus/composables/useGameMenus'
import { AUTOPLAY_GAP_MS, sleep } from '@/games/gates-of-olympus/engine/timing'

export type AutoplaySettings = { count: number; speed: number; skipScreens: boolean }

const TURBO = 2
const BLOCKED_RETRY_MS = 300

export function useAutoplay(
  menus: ReturnType<typeof useGameMenus>,
  speed: Ref<number>,
  controlsWin: Ref<number>,
  spin: () => Promise<void>,
) {
  const autoplay = ref(false)
  const autoLeft = ref(0)
  const skipScreens = ref(true)
  const autoCount = ref(100)

  function startAutoplay(settings: AutoplaySettings) {
    menus.autoplayMenu.value = false
    speed.value = settings.speed
    skipScreens.value = settings.skipScreens
    autoCount.value = settings.count
    autoLeft.value = settings.count
    autoplay.value = true
  }

  watch(autoplay, async (on) => {
    if (!on) return
    while (autoplay.value && autoLeft.value > 0) {
      if (menus.blocksSpin.value) {
        await sleep(BLOCKED_RETRY_MS)
        continue
      }
      autoLeft.value--
      await spin()
      if (speed.value !== TURBO || controlsWin.value) await sleep(AUTOPLAY_GAP_MS)
    }
    const ranOut = autoplay.value
    autoplay.value = false
    if (ranOut && !menus.modal.value) menus.autoplayMenu.value = true
  })

  onBeforeUnmount(() => (autoplay.value = false))

  return { autoplay, skipScreens, autoCount, startAutoplay }
}
