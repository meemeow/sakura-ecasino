import { bezierEase } from '@/games/gates-of-olympus/engine/bigWin'

export const COLLECT = {
  fly: 530,
  hold: 330,
  slide: 210,
  hideX: 100,
  reveal: 70,
  slotLead: 80,
  absorb: 200,
  landOffset: 20,
  landDigitPx: 29,
}
const ABSORB_FRAMES = [
  { scale: 1, opacity: 1, offset: 0 },
  { scale: 0.6, opacity: 1, offset: 0.25 },
  { scale: 0.5, opacity: 0.9, offset: 0.4 },
  { scale: 0.38, opacity: 0, offset: 1 },
]
const PULSE_STEPS = 48
const SWELL = { to: 1.5, leave: 375, flyAt: 615, steps: 60 }
const ZOOM_EASE = [0.26, 0.02, 0.62, 0.58] as const
export const PILLAR_LAG_MS = 250

export type Point = { x: number; y: number }
type BoneSample = (seconds: number) => { x: number; y: number; scale: number }

const flyTransform = (x: number, y: number, scale: number) =>
  `translate(${x}px, ${y}px) scale(${scale})`

export const absorbFrames = (to: Point, landScale: number) =>
  ABSORB_FRAMES.map(({ scale, opacity, offset }) => ({
    transform: flyTransform(to.x, to.y, landScale * scale),
    opacity,
    offset,
  }))

export function orbFlight(
  from: Point,
  to: Point,
  landScale: number,
  px: number,
  bone: BoneSample | null,
) {
  const leave = bone ? SWELL.leave : 0
  const flyAt = bone ? SWELL.flyAt : 0
  const duration = flyAt + COLLECT.fly
  const held = bone
    ? Array.from({ length: PULSE_STEPS + 1 }, (_, i) => {
        const o = bone((SWELL.leave * i) / PULSE_STEPS / 1000)
        return {
          x: from.x + o.x * px,
          y: from.y - o.y * px,
          scale: o.scale,
          offset: (leave * i) / PULSE_STEPS / duration,
        }
      })
    : []
  const start = held.at(-1) ?? { x: from.x, y: from.y, scale: 1 }
  const swellAt = (time: number) => {
    if (time >= flyAt) {
      const k = Math.min(1, (time - flyAt) / COLLECT.fly)
      return SWELL.to + (landScale - SWELL.to) * k * k
    }
    const k = Math.max(0, (time - leave) / (flyAt - leave))
    return start.scale + (SWELL.to - start.scale) * k
  }
  const swell = Array.from({ length: SWELL.steps + 1 }, (_, i) => {
    const time = leave + ((duration - leave) * i) / SWELL.steps
    const move = time > flyAt ? bezierEase(ZOOM_EASE, (time - flyAt) / COLLECT.fly) : 0
    return {
      transform: flyTransform(
        start.x + (to.x - start.x) * move,
        start.y + (to.y - start.y) * move,
        swellAt(time),
      ),
      offset: Math.min(1, time / duration),
    }
  })
  return {
    duration,
    frames: [
      ...held
        .slice(0, -1)
        .map((k) => ({ transform: flyTransform(k.x, k.y, k.scale), offset: k.offset })),
      ...swell,
    ],
  }
}

export const pillarFlight = (from: Point, to: Point, landScale: number) =>
  Array.from({ length: SWELL.steps + 1 }, (_, i) => {
    const k = i / SWELL.steps
    const move = bezierEase(ZOOM_EASE, k)
    return {
      transform: flyTransform(
        from.x + (to.x - from.x) * move,
        from.y + (to.y - from.y) * move,
        1 + (landScale - 1) * k * k,
      ),
      offset: k,
    }
  })
