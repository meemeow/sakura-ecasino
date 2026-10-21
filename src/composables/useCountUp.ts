import { onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'

interface CountUpOptions {
  ready?: () => boolean
  fromZero?: boolean
  duration?: number
}

export function useCountUp(source: () => number, options: CountUpOptions = {}) {
  const { ready = () => true, fromZero = false, duration = 700 } = options
  const display = ref(fromZero ? 0 : source())
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0

  function countTo(target: number) {
    cancelAnimationFrame(frame)
    const from = display.value
    if (reducedMotion.matches || from === target) {
      display.value = target
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      display.value = t < 1 ? from + (target - from) * (1 - (1 - t) ** 3) : target
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  }

  watch(
    () => [source(), ready()] as const,
    ([value, isReady], [, wasReady]) => {
      if (isReady && (wasReady || fromZero)) countTo(value)
      else {
        cancelAnimationFrame(frame)
        display.value = value
      }
    },
  )

  onMounted(() => {
    if (fromZero && ready()) countTo(source())
  })
  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return readonly(display)
}
