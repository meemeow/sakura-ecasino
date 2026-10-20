import { onBeforeUnmount, readonly, ref } from 'vue'

/** The current time in ms, updated every second while the component is mounted (countdowns) */
export function useNow() {
  const now = ref(Date.now())
  const timer = setInterval(() => (now.value = Date.now()), 1000)
  onBeforeUnmount(() => clearInterval(timer))
  return readonly(now)
}
