import { computed, onBeforeUnmount, ref } from 'vue'
import type { PromoSlides } from '@/composables/usePromoSlides'

const SWIPE_DISTANCE = 50
const FLICK_DISTANCE = 16
const FLICK_SPEED = 0.4
const AXIS_LOCK_DISTANCE = 8
const SHEET_CLOSE_DISTANCE = 110
const SHEET_FLICK_DISTANCE = 24
const SHEET_SETTLE_MS = 250

type DragStart = {
  x: number
  y: number
  lastY: number
  lastTime: number
  speedY: number
  time: number
  pointer: number
  axis: 'x' | 'y' | null
  content: HTMLElement | null
  sheet: HTMLElement | null
}

export function useSheetSwipe(slides: PromoSlides, close: () => void) {
  const dragX = ref(0)
  const dragging = ref(false)
  const dragStyle = computed(() => ({
    '--drag-x': `${dragX.value}px`,
    '--drag-fade': 1 - Math.min(Math.abs(dragX.value) / 240, 0.6),
  }))
  const sheetQuery = window.matchMedia('(max-width: 560px)')
  const sheetY = ref(0)
  const sheetSettling = ref(false)
  const sheetStyle = computed(() =>
    sheetY.value || sheetSettling.value
      ? {
          translate: `0 ${sheetY.value}px`,
          transition: sheetSettling.value ? `translate ${SHEET_SETTLE_MS}ms ease` : 'none',
        }
      : undefined,
  )
  let sheetTimer: number | undefined
  let dragStart: DragStart | null = null

  function onDragStart(e: PointerEvent) {
    if (e.button !== 0 || (e.target as Element).closest('button')) return
    const hero = e.currentTarget as HTMLElement
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      lastY: e.clientY,
      lastTime: e.timeStamp,
      speedY: 0,
      time: e.timeStamp,
      pointer: e.pointerId,
      axis: null,
      content: hero.closest('.p-dialog-content'),
      sheet: hero.closest('.p-dialog'),
    }
    hero.setPointerCapture(e.pointerId)
    dragging.value = true
    slides.stopSlides()
  }

  function dragSheet(e: PointerEvent) {
    const drag = dragStart!
    let delta = e.clientY - drag.lastY
    drag.speedY = delta / Math.max(e.timeStamp - drag.lastTime, 1)
    drag.lastY = e.clientY
    drag.lastTime = e.timeStamp
    const content = drag.content
    if (delta > 0) {
      const scrolled = Math.min(content?.scrollTop ?? 0, delta)
      if (content) content.scrollTop -= scrolled
      sheetY.value += delta - scrolled
    } else {
      const lifted = Math.min(sheetY.value, -delta)
      sheetY.value -= lifted
      delta += lifted
      if (content) content.scrollTop -= delta
    }
  }

  function onDragMove(e: PointerEvent) {
    if (dragStart?.pointer !== e.pointerId) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (!dragStart.axis) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_DISTANCE) return
      dragStart.axis = Math.abs(dy) > Math.abs(dx) && sheetQuery.matches ? 'y' : 'x'
      dragStart.lastY = e.clientY
      dragStart.lastTime = e.timeStamp
      return
    }
    if (dragStart.axis === 'x') dragX.value = dx
    else dragSheet(e)
  }

  function settleSheet(to: number, then?: () => void) {
    sheetSettling.value = true
    sheetY.value = to
    window.clearTimeout(sheetTimer)
    sheetTimer = window.setTimeout(() => {
      sheetSettling.value = false
      then?.()
    }, SHEET_SETTLE_MS)
  }

  function resetSheet() {
    window.clearTimeout(sheetTimer)
    sheetSettling.value = false
    sheetY.value = 0
  }

  function onDragEnd(e: PointerEvent) {
    if (dragStart?.pointer !== e.pointerId) return
    const { axis, sheet, speedY } = dragStart
    const dx = e.clientX - dragStart.x
    const speed = Math.abs(dx) / Math.max(e.timeStamp - dragStart.time, 1)
    const released = e.type === 'pointerup'
    dragStart = null
    dragging.value = false
    dragX.value = 0

    if (axis === 'y') {
      const closing =
        released &&
        (sheetY.value > SHEET_CLOSE_DISTANCE ||
          (sheetY.value > SHEET_FLICK_DISTANCE && speedY > FLICK_SPEED))
      if (closing) settleSheet(sheet?.offsetHeight ?? window.innerHeight, close)
      else settleSheet(0)
      slides.startSlides()
      return
    }

    const swiped =
      released &&
      axis === 'x' &&
      (Math.abs(dx) > SWIPE_DISTANCE || (Math.abs(dx) > FLICK_DISTANCE && speed > FLICK_SPEED))
    if (swiped) slides.showSlide(slides.slide.value + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev')
    else slides.startSlides()
  }

  onBeforeUnmount(() => window.clearTimeout(sheetTimer))

  return { dragging, dragStyle, sheetStyle, resetSheet, onDragStart, onDragMove, onDragEnd }
}
