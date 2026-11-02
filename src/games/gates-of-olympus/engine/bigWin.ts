import type { Glyph } from '@/games/gates-of-olympus/text/tumbleFont'

export type BigWinTier = {
  name: 'nice' | 'mega' | 'superb' | 'sensational'
  from: number
  seconds: number
  coins: CoinEmitter[]
}

export type CoinEmitter = {
  rate: number
  life: number
  draw: (p: CoinRandom, age: number) => [x: number, y: number, scale: number, spin: number]
}

export type CoinRandom = (slot: number) => number

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const between = (r: number, [a, b]: readonly [number, number]) => lerp(a, b, r)
const DEG = Math.PI / 180

export const COIN = {
  file: 'fx/coins.webp',
  frame: { w: 289, h: 302 },
  columns: 6,
  frames: 18,
  fps: 24,
  scale: 0.5606,
  startTilt: 30,
  spin: 90,
}

const tilted = (p: CoinRandom, age: number, spins: boolean) =>
  (between(p(1), [-COIN.startTilt, COIN.startTilt]) +
    (spins ? between(p(2), [-COIN.spin, COIN.spin]) * age : 0)) *
  DEG

const TOSS = {
  life: 1,
  x: 960,
  y: 1034.6,
  radius: 131,
  cone: 20,
  speed: 2407,
  gravity: 5297,
}

const toss = (rate: number): CoinEmitter => ({
  rate,
  life: TOSS.life,
  draw: (p, age) => {
    const r = Math.sqrt(p(3))
    const around = p(4) * 2 * Math.PI
    const lean = TOSS.cone * r * DEG
    const vx = TOSS.speed * Math.sin(lean) * Math.cos(around)
    const vy = -TOSS.speed * Math.cos(lean)
    return [
      TOSS.x + TOSS.radius * r * Math.cos(around) + vx * age,
      TOSS.y + vy * age + (TOSS.gravity * age * age) / 2,
      COIN.scale,
      tilted(p, age, true),
    ]
  },
})

const FALL = {
  life: 1.83,
  x: [-203, 2123] as const,
  y: [-72, 117] as const,
  vx: [-54, 54] as const,
  vy: [1188, 1296] as const,
  shrink: 0.0108,
}

const fall: CoinEmitter = {
  rate: 30,
  life: FALL.life,
  draw: (p, age) => [
    between(p(3), FALL.x) + between(p(5), FALL.vx) * age,
    between(p(4), FALL.y) + between(p(6), FALL.vy) * age,
    COIN.scale * (1 - FALL.shrink * age),
    tilted(p, age, false),
  ],
}

const THROW = {
  life: 0.8,
  x: [-203, 2123] as const,
  y: [1010, 1106] as const,
  vx: [-60, 65] as const,
  unit: 1620,
  start: [-0.5445, -0.7186] as const,
  rise: [1.5445, 1.5723] as const,
}

const smoothArea = (k: number) => k ** 3 - k ** 4 / 2

const rise: CoinEmitter = {
  rate: 20,
  life: THROW.life,
  draw: (p, age) => {
    const r = p(5)
    const k = age / THROW.life
    const v = between(r, THROW.start) * k + between(r, THROW.rise) * smoothArea(k)
    return [
      between(p(3), THROW.x) + between(p(6), THROW.vx) * age,
      between(p(4), THROW.y) + THROW.life * THROW.unit * v,
      COIN.scale,
      tilted(p, age, true),
    ]
  },
}

const SIDE = {
  life: 0.7,
  x: 15.5,
  y: [36, 900] as const,
  vx: [540, 810] as const,
  vy: [1080, 2160] as const,
}

const side = (dir: 1 | -1): CoinEmitter => ({
  rate: 7,
  life: SIDE.life,
  draw: (p, age) => [
    960 + dir * (SIDE.x - 960) + dir * between(p(5), SIDE.vx) * age,
    between(p(4), SIDE.y) + between(p(6), SIDE.vy) * age,
    COIN.scale,
    between(p(2), [-COIN.spin, COIN.spin]) * age * DEG,
  ],
})

const shower = [fall, fall, rise, rise, side(-1), side(-1), side(1), side(1)]

export const BIG_WIN_TIERS: BigWinTier[] = [
  { name: 'nice', from: 15, seconds: 12, coins: [toss(9), toss(9)] },
  { name: 'mega', from: 30, seconds: 20, coins: [toss(18), toss(18)] },
  { name: 'superb', from: 45, seconds: 30, coins: shower },
  { name: 'sensational', from: 60, seconds: 40, coins: shower },
]

export const bigWinTier = (win: number, stake: number) =>
  [...BIG_WIN_TIERS].reverse().find((tier) => win >= tier.from * stake) ?? null

export const BIG_WIN = {
  rig: 'fx/bigwin',
  leadMs: 217,
  inSec: 1.1667,
  loopSec: 1.6667,
  outSec: 0.8333,
  outAfter: 1.1667,
  hideAfter: 1.9833,
  doneAfter: 2.1,
  fast: { stopAt: 0.8, outAfter: 0.5 },
  rigLag: 1 / 60,
  animatorLag: 1 / 60,
  spineUi: 0.999,
  slide: { ui: 99, in: [0.8333, 1.1667], out: [0.1333, 0.5] },
  dim: { alpha: 177 / 255, floor: 1 / 255, in: [0, 0.4333], out: [0.3333, 0.8333] },
  label: {
    in: [0.4333, 0.6667],
    out: [0.3, 0.5],
    floor: 1 / 255,
    bone: 'bone',
    offset: [-10.8, 8.1],
    rotation: 0.3845,
    width: 651,
  },
  pulse: [
    [0, 1],
    [0.0833, 1.3],
    [0.5, 1],
    [0.5833, 1.3],
    [1, 1],
    [1.0833, 1.3],
    [1.5, 1],
  ],
} as const

export const BIG_WIN_FONT = {
  file: 'ui/bigwin-digits.webp',
  size: 129,
  atlas: { w: 720, h: 600 },
  glyphs: {
    ' ': [647, 271, 63, 61, -31, 98, 24],
    ',': [585, 408, 81, 92, -29, 59, 26],
    '.': [585, 501, 76, 76, -25, 59, 26],
    '0': [234, 151, 115, 135, -25, 1, 65],
    '1': [0, 289, 111, 134, -22, 1, 65],
    '2': [577, 136, 112, 134, -25, 1, 65],
    '3': [350, 151, 111, 135, -24, 1, 65],
    '4': [123, 423, 121, 133, -28, 2, 65],
    '5': [353, 0, 111, 138, -22, -2, 65],
    '6': [0, 153, 116, 135, -25, 1, 65],
    '7': [245, 423, 114, 133, -24, 2, 65],
    '8': [589, 0, 117, 135, -26, 1, 65],
    '9': [117, 153, 116, 135, -26, 1, 65],
    '₱': [400, 287, 123, 133, -29, 2, 65],
  } as Record<string, Glyph>,
}

const smooth = (k: number) => {
  const q = Math.min(1, Math.max(0, k))
  return q * q * (3 - 2 * q)
}

export const ramp = (t: number, [from, to]: readonly [number, number]) =>
  smooth((t - from) / (to - from))

export function bezierEase([x1, y1, x2, y2]: readonly [number, number, number, number], x: number) {
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (at(x1, x2, mid) < x) lo = mid
    else hi = mid
  }
  return at(y1, y2, (lo + hi) / 2)
}

export const linearRamp = (t: number, [from, to]: readonly [number, number]) =>
  Math.min(1, Math.max(0, (t - from) / (to - from)))

export function pulseScale(t: number) {
  const keys = BIG_WIN.pulse
  if (t <= 0 || t >= keys[keys.length - 1]![0]) return 1
  let i = 0
  while (keys[i + 1]![0] <= t) i++
  const [t0, v0] = keys[i]!
  const [t1, v1] = keys[i + 1]!
  return lerp(v0, v1, smooth((t - t0) / (t1 - t0)))
}
