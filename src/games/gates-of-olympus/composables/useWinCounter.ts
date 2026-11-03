import { onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue'
import { BIG_WIN, bigWinTier, type BigWinTier } from '@/games/gates-of-olympus/engine/bigWin'
import { BAR_COUNT_MS, sleep, type Speed } from '@/games/gates-of-olympus/engine/timing'

type BigWinShown = { tier: BigWinTier; amount: number; at: number; fast: boolean }

function countUp(shown: Ref<number>, target: number, rate: number, frame: (id: number) => void) {
  if (!rate || !target) {
    shown.value = target
    return
  }
  const from = shown.value
  const begin = performance.now()
  const length = BAR_COUNT_MS / rate
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - begin) / length))
    shown.value = Math.round((from + (target - from) * k) * 100) / 100
    if (k < 1) frame(requestAnimationFrame(step))
  }
  frame(requestAnimationFrame(step))
}

export function useWinCounter(sp: ComputedRef<Speed>, fast: () => boolean, stake: Ref<number>) {
  const tumbleWin = ref(0)
  const controlsWin = ref(0)
  const winOffset = ref(0)
  let target = 0
  let countFrame = 0
  let controlsFrame = 0

  const currentWin = () => target

  function countControls(value: number, rate: number) {
    cancelAnimationFrame(controlsFrame)
    countUp(controlsWin, value, rate, (id) => (controlsFrame = id))
  }

  function countTumbleWin(
    value: number,
    rate: number,
    controlsRate: number | null = sp.value.fxRate ? 1 : 0,
  ) {
    target = value
    cancelAnimationFrame(countFrame)
    countUp(tumbleWin, value, rate, (id) => (countFrame = id))
    if (controlsRate === null) return
    countControls(winOffset.value + value, controlsRate)
  }

  const countFinal = (value: number) =>
    countTumbleWin(value, 0, bigWinTier(value, stake.value) ? null : 1)

  function addPay(pay: number, cap: number) {
    target = Math.min(cap, target + pay)
    countControls(winOffset.value + target, 1)
  }

  const stopTumbleCount = () => cancelAnimationFrame(countFrame)

  function finishCounts() {
    cancelAnimationFrame(countFrame)
    cancelAnimationFrame(controlsFrame)
    tumbleWin.value = target
    controlsWin.value = winOffset.value + target
  }

  const bigWin = ref<BigWinShown | null>(null)
  let bigWinEnded: (() => void) | null = null

  async function playBigWin(amount: number) {
    const tier = bigWinTier(amount, stake.value)
    if (!tier) return
    await sleep(BIG_WIN.leadMs)
    const at = performance.now()
    const quick = fast()
    const from = quick ? winOffset.value + amount : controlsWin.value
    const to = winOffset.value + amount
    cancelAnimationFrame(controlsFrame)
    const step = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - at) / 1000 / tier.seconds))
      controlsWin.value = Math.round((from + (to - from) * k) * 100) / 100
      if (k < 1) controlsFrame = requestAnimationFrame(step)
    }
    controlsFrame = requestAnimationFrame(step)
    bigWin.value = { tier, amount, at, fast: quick }
    await new Promise<void>((resolve) => (bigWinEnded = resolve))
  }

  function stopBigWinCount() {
    cancelAnimationFrame(controlsFrame)
    if (bigWin.value) controlsWin.value = winOffset.value + bigWin.value.amount
  }

  function endBigWin() {
    bigWin.value = null
    bigWinEnded?.()
    bigWinEnded = null
  }

  onBeforeUnmount(() => {
    cancelAnimationFrame(countFrame)
    cancelAnimationFrame(controlsFrame)
  })

  return {
    tumbleWin,
    controlsWin,
    winOffset,
    currentWin,
    countTumbleWin,
    countFinal,
    addPay,
    stopTumbleCount,
    finishCounts,
    bigWin,
    playBigWin,
    stopBigWinCount,
    endBigWin,
  }
}

export type WinCounter = ReturnType<typeof useWinCounter>
