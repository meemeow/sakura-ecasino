import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

const SPEED_TOAST_MS = 1000

export function useSpeedToast(speed: Ref<number>, suppressed: Ref<boolean>) {
  const speedToast = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(speed, () => {
    if (suppressed.value) return
    speedToast.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (speedToast.value = false), SPEED_TOAST_MS)
  })

  onBeforeUnmount(() => clearTimeout(timer))

  return speedToast
}
