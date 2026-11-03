import { computed, onBeforeUnmount, ref } from 'vue'
import { promotions } from '@/data/promotions'

export const SLIDE_MS = 5000

export type SlideDirection = 'next' | 'prev'

export function usePromoSlides() {
  const slide = ref(0)
  const slideRun = ref(0)
  const swipe = ref<SlideDirection | null>(null)
  const offer = computed(() => promotions[slide.value]!)
  const offerTransition = computed(() => (swipe.value ? `auth-swipe-${swipe.value}` : 'auth-swap'))
  const artTransition = computed(() =>
    swipe.value ? `auth-swipe-${swipe.value}` : 'auth-crossfade',
  )
  let slideTimer: number | undefined

  function stopSlides() {
    window.clearInterval(slideTimer)
  }

  function startSlides() {
    stopSlides()
    slideRun.value++
    slideTimer = window.setInterval(() => {
      swipe.value = null
      slide.value = (slide.value + 1) % promotions.length
      slideRun.value++
    }, SLIDE_MS)
  }

  function showSlide(i: number, direction: SlideDirection | null) {
    swipe.value = direction
    slide.value = (i + promotions.length) % promotions.length
    startSlides()
  }

  function goToSlide(i: number) {
    if (i === slide.value) return startSlides()
    showSlide(i, i > slide.value ? 'next' : 'prev')
  }

  onBeforeUnmount(stopSlides)

  return {
    slide,
    slideRun,
    offer,
    offerTransition,
    artTransition,
    startSlides,
    stopSlides,
    showSlide,
    goToSlide,
  }
}

export type PromoSlides = ReturnType<typeof usePromoSlides>
