import { onBeforeUnmount, onMounted } from 'vue'

// Drag to scroll a horizontal strip with the mouse (touch already swipes natively).
// A drag that moves more than a few pixels swallows the click, so it never activates an item.
// Letting go mid-drag keeps the strip sliding with momentum, slowing to a stop.
// While dragging or gliding the element gets a 'dragging' class, for cursor and scroll-behavior.
export function useDragScroll(getViewport: () => HTMLElement | null | undefined) {
  let viewport: HTMLElement | null = null
  let startX = 0
  let startScroll = 0
  let pressed = false
  let dragged = false
  const DRAG_THRESHOLD = 5

  // Momentum: velocity in px per ms, sampled while dragging
  const FRICTION = 0.95 // per 16ms frame
  const MIN_VELOCITY = 0.02
  let velocity = 0
  let lastX = 0
  let lastTime = 0
  let glideFrame = 0

  function stopGlide() {
    cancelAnimationFrame(glideFrame)
    glideFrame = 0
  }

  function glide() {
    if (!viewport) return
    let prev = performance.now()
    const step = (now: number) => {
      if (!viewport) return
      const dt = Math.min(now - prev, 32)
      prev = now
      const before = viewport.scrollLeft
      viewport.scrollLeft -= velocity * dt
      velocity *= Math.pow(FRICTION, dt / 16)
      // Stop when slow enough, or when an edge stops the scroll
      if (Math.abs(velocity) < MIN_VELOCITY || viewport.scrollLeft === before) {
        viewport.classList.remove('dragging')
        glideFrame = 0
        return
      }
      glideFrame = requestAnimationFrame(step)
    }
    glideFrame = requestAnimationFrame(step)
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !viewport) return
    stopGlide() // grabbing a gliding strip catches it
    viewport.classList.remove('dragging')
    pressed = true
    dragged = false
    startX = lastX = e.clientX
    lastTime = performance.now()
    velocity = 0
    startScroll = viewport.scrollLeft
  }

  function onPointerMove(e: PointerEvent) {
    if (!pressed || !viewport) return
    const dx = e.clientX - startX
    if (!dragged && Math.abs(dx) > DRAG_THRESHOLD) {
      dragged = true
      viewport.classList.add('dragging')
    }
    if (!dragged) return
    viewport.scrollLeft = startScroll - dx

    // Smoothed velocity of the last few moves
    const now = performance.now()
    const dt = now - lastTime
    if (dt > 0) velocity = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * velocity
    lastX = e.clientX
    lastTime = now
  }

  function onPointerUp() {
    if (!pressed) return
    pressed = false
    // Paused before letting go: no throw
    if (dragged && performance.now() - lastTime < 80 && Math.abs(velocity) > MIN_VELOCITY) {
      glide() // keeps 'dragging' (instant scrolling) until the glide ends
    } else {
      viewport?.classList.remove('dragging')
    }
  }

  // Runs before the item's own click handler (capture phase)
  function onClickCapture(e: MouseEvent) {
    if (!dragged) return
    e.preventDefault()
    e.stopPropagation()
    dragged = false
  }

  onMounted(() => {
    viewport = getViewport() ?? null
    viewport?.addEventListener('pointerdown', onPointerDown)
    viewport?.addEventListener('click', onClickCapture, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  })

  onBeforeUnmount(() => {
    stopGlide()
    viewport?.removeEventListener('pointerdown', onPointerDown)
    viewport?.removeEventListener('click', onClickCapture, true)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  })
}
