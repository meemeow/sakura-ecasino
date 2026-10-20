import { onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'

interface CountUpOptions {
  /**
   * False while the number is still loading (e.g. the profile). Changes while loading, and the
   * jump to the first loaded value, show at once instead of counting, so opening the app doesn't
   * count every balance up from 0.
   */
  ready?: () => boolean
  /** Count up from 0 once the value is ready, e.g. totals when their page opens */
  fromZero?: boolean
  /** Length of one count, in ms */
  duration?: number
}

/**
 * A number for display that counts (ease-out) to `source` whenever it changes, like a balance
 * ticking up after a deposit or win. Format the result as usual; it moves through fractional
 * values on the way. Players with reduced motion get the new value straight away.
 */
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
      // Count once it was already showing a loaded value; fromZero also counts the first one
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
