import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const KEYBOARD_MIN_HEIGHT = 120

export function useKeyboardInset() {
  const inset = ref(0)
  const visibleHeight = ref(window.innerHeight)
  const keyboardOpen = computed(() => inset.value > KEYBOARD_MIN_HEIGHT)

  function update() {
    const viewport = window.visualViewport
    if (!viewport || viewport.scale > 1.01) {
      inset.value = 0
      visibleHeight.value = window.innerHeight
      return
    }
    inset.value = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
    visibleHeight.value = Math.round(viewport.height)
  }

  onMounted(() => {
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
  })

  onBeforeUnmount(() => {
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })

  return { inset, visibleHeight, keyboardOpen }
}
