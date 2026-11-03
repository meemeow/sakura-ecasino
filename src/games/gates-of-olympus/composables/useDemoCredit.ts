import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useCountUp } from '@/composables/useCountUp'

export const DEMO_CREDIT = 100000
export const REFILL_BELOW = 10000
export const REFILL_MS = 2000

export const toCentavos = (amount: number) => Math.round(amount * 100) / 100

export function useDemoCredit(playing: Ref<boolean>, paused: Ref<boolean>) {
  const credit = ref(DEMO_CREDIT)
  const refilling = ref(false)
  const shownCredit = useCountUp(() => credit.value, {
    ready: () => refilling.value,
    duration: REFILL_MS,
  })
  let refillTimer: ReturnType<typeof setTimeout> | undefined

  const addCredit = (amount: number) => {
    credit.value = toCentavos(credit.value + amount)
  }

  watch([credit, playing, paused], async () => {
    if (playing.value) refilling.value = false
    if (playing.value || paused.value || refilling.value || credit.value >= REFILL_BELOW) return
    refilling.value = true
    await nextTick()
    addCredit(DEMO_CREDIT)
    clearTimeout(refillTimer)
    refillTimer = setTimeout(() => (refilling.value = false), REFILL_MS)
  })

  onBeforeUnmount(() => clearTimeout(refillTimer))

  return { credit, shownCredit, addCredit }
}
