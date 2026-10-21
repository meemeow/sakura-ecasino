import { onBeforeUnmount, readonly, ref } from 'vue'

export function useNow() {
  const now = ref(Date.now())
  const timer = setInterval(() => (now.value = Date.now()), 1000)
  onBeforeUnmount(() => clearInterval(timer))
  return readonly(now)
}
