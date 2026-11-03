import { computed, ref, type Ref } from 'vue'
import type { WindowKind } from '@/games/gates-of-olympus/components/FreeSpinsWindow.vue'
import { TRANSITION, pillarFxLevel } from '@/games/gates-of-olympus/engine/freeSpins'
import { MAX_WIN_X } from '@/games/gates-of-olympus/engine/symbols'
import { sleep } from '@/games/gates-of-olympus/engine/timing'

type FsWindow = { kind: WindowKind; amount: string; spins?: number; at: number }

export function useFreeSpins(bet: Ref<number>) {
  const freeMode = ref(false)
  const fsLeft = ref(0)
  const fsWon = ref(0)
  const totalMult = ref(0)
  const pillarAt = ref(0)
  const pillarBump = ref(0)
  const bonusActive = ref(false)
  const fsCompleted = ref(false)
  const fsLeftShown = ref(false)
  const tumbleGap = ref(false)

  const maxWin = computed(() => bet.value * MAX_WIN_X)
  const winCap = computed(() => maxWin.value - (freeMode.value ? fsWon.value : 0))

  const notice = computed(() =>
    tumbleGap.value
      ? null
      : freeMode.value || fsLeftShown.value
        ? `FREE SPINS LEFT ${fsLeft.value}`
        : fsCompleted.value
          ? 'FREE SPINS COMPLETED'
          : null,
  )

  function endFreeSpins() {
    if (freeMode.value) fsLeft.value = 0
  }

  function raisePillar(total: number) {
    if (pillarFxLevel(total) !== pillarFxLevel(totalMult.value) || !totalMult.value)
      pillarAt.value = performance.now()
    totalMult.value = total
    pillarBump.value++
  }

  const fsWindow = ref<FsWindow | null>(null)
  const transitionAt = ref<number | null>(null)
  const transitionDim = ref(false)
  let windowClosing: (() => void) | null = null
  let windowDone: (() => void) | null = null

  function showWindow(kind: WindowKind, amount: string, spins?: number) {
    const closing = new Promise<void>((resolve) => (windowClosing = resolve))
    const done = new Promise<void>((resolve) => (windowDone = resolve))
    fsWindow.value = { kind, amount, spins, at: performance.now() }
    return { closing, done }
  }

  function onWindowClosing() {
    windowClosing?.()
  }

  function onWindowDone() {
    fsWindow.value = null
    windowDone?.()
  }

  async function transition(swap: () => void) {
    transitionDim.value = true
    await sleep(TRANSITION.afterOut * 1000)
    transitionAt.value = performance.now()
    await sleep(TRANSITION.swapAt * 1000)
    swap()
    transitionDim.value = false
    await sleep((TRANSITION.length - TRANSITION.swapAt) * 1000)
    transitionAt.value = null
  }

  return {
    freeMode,
    fsLeft,
    fsWon,
    totalMult,
    pillarAt,
    pillarBump,
    bonusActive,
    fsCompleted,
    fsLeftShown,
    tumbleGap,
    maxWin,
    winCap,
    notice,
    endFreeSpins,
    raisePillar,
    fsWindow,
    transitionAt,
    transitionDim,
    showWindow,
    onWindowClosing,
    onWindowDone,
    transition,
  }
}

export type FreeSpins = ReturnType<typeof useFreeSpins>
