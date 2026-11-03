import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import {
  FREE_TOP_MESSAGES,
  TOP_MESSAGES,
  TOP_MESSAGE_MS,
} from '@/games/gates-of-olympus/engine/topMessages'

export function useTopMessages(freeMode: Ref<boolean>, tumbleWin: Ref<number>) {
  const topMessages = computed(() => (freeMode.value ? FREE_TOP_MESSAGES : TOP_MESSAGES))
  const topMessage = ref(0)
  const timer = setInterval(() => {
    if (tumbleWin.value === 0) topMessage.value = (topMessage.value + 1) % topMessages.value.length
  }, TOP_MESSAGE_MS)
  onBeforeUnmount(() => clearInterval(timer))

  const shownTopMessage = computed(
    () => topMessages.value[topMessage.value % topMessages.value.length]!,
  )

  return { topMessage, shownTopMessage }
}
