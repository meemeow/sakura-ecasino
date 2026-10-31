import { BIG_WIN_FONT } from '@/games/gates-of-olympus/bigWin'
import type { Glyph } from '@/games/gates-of-olympus/tumbleFont'
import { uiPoint } from '@/games/gates-of-olympus/winFx'

export const FREE_SPINS = {
  award: 15,
  retrigger: 5,
  triggerAt: 4,
  retriggerAt: 3,
  buyReels: [1, 2, 3, 4],
  scatterPays: { 4: 3, 5: 5, 6: 100 } as Record<number, number>,
  retriggerChance: 0.02,
  maxRetriggers: 4,
  spinGapMs: 400,
}

const ANTE_TRIGGER = 1 - (2 / 3) ** (1 / 100)
export const triggerChance = (ante: boolean) => (ante ? ANTE_TRIGGER : ANTE_TRIGGER / 2)

const TRIGGER_SCATTERS: [count: number, weight: number][] = [
  [4, 0.9],
  [5, 0.09],
  [6, 0.01],
]
const TEASE_SCATTERS: [count: number, chance: number][] = [
  [3, 0.02],
  [2, 0.08],
  [1, 0.25],
]

export function scatterCount(trigger: boolean, rand = Math.random) {
  const r = rand()
  if (trigger) {
    let left = r
    for (const [count, weight] of TRIGGER_SCATTERS) if ((left -= weight) < 0) return count
    return FREE_SPINS.triggerAt
  }
  let left = r
  for (const [count, chance] of TEASE_SCATTERS) if ((left -= chance) < 0) return count
  return 0
}

export function pickReels(count: number, from: number[], rand = Math.random) {
  const pool = [...from]
  const picked: number[] = []
  while (picked.length < count && pool.length)
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!)
  return picked
}

const BANDS: [chance: number, low: number, high: number][] = [
  [0.988, 2, 200],
  [0.01, 201, 1000],
  [0.002, 1001, 14999],
]
const MAX_WIN_CHANCE = 1e-7
const BAND_SKEW = 1.3

export function pickRoundTarget(maxX: number, rand = Math.random) {
  if (rand() < MAX_WIN_CHANCE) return maxX
  let r = rand()
  for (const [chance, low, high] of BANDS) {
    if ((r -= chance) < 0) return low * (high / low) ** (rand() ** BAND_SKEW)
  }
  return BANDS[0]![1]
}

export const PILLAR_LEVELS = [0, 10, 20, 30, 50, 100]
export const PILLAR_LEVEL_SCALES = [1, 1.02, 1.04, 1.06, 1.1, 1.15]
export const pillarLevel = (total: number) =>
  PILLAR_LEVELS.reduce((level, from, i) => (total >= from ? i : level), 0)

export const PILLAR = {
  center: uiPoint(-756, -21.6),
  sprite: [326 * 0.7692308, 1102 * 0.7692308] as const,
  title: uiPoint(-756, 407.1),
  value: uiPoint(-757.8, 311.4),
  valueSquash: [0.864, 0.96] as const,
  valueWidth: 140,
  titleWidth: 198,
  fx: { x: 143.1625, y: 197.0043, scale: 0.8303 },
  left: {
    center: uiPoint(-756, 26.4),
    sprite: [275 * 0.7692308, 180 * 0.7692308] as const,
    title: uiPoint(-756, 48.9),
    value: uiPoint(-756, -6.3),
  },
}

export const FS_WINDOW = {
  banner: { file: 'fx/fs-banner', x: 960, y: 472.8491, scale: 1.0794 },
  inSec: 0.6333,
  loopSec: 2.6667,
  outSec: 0.4667,
  autoStart: 3.6667,
  autoResult: 6.6333,
  autoAdditional: 3.3,
  dim: 0.8,
  title: { left: 246, top: 216.67, width: 1452, height: 348 },
  youWon: 479.7,
  amount: 607.7,
  spins: 750.7,
  press: 833.7,
  textIn: [0.1, 0.3] as const,
  titleIn: [0, 0.2] as const,
  out: [0, 0.25] as const,
}

export const TRANSITION = {
  file: 'fx/transition',
  anim: 'gool_transition',
  x: 960,
  y: 540,
  scale: 1.08,
  afterOut: 0.2167,
  swapAt: 0.3,
  length: 0.7,
}

export const SCATTER_RIG = {
  fg: 'fx/scatter-fg',
  bg: 'fx/scatter-bg',
  place: { x: 0.4975, y: 0.4827, unit: 0.5397 / 217.82 },
  landing: 'gool_scatter_landing',
  win: 'gool_scatter_win',
  winSec: 1.5,
  winPlays: 2,
}

export const FS_FONT = {
  ...BIG_WIN_FONT,
  file: 'ui/fs-digits.webp',
  glyphs: { ...BIG_WIN_FONT.glyphs, '+': [471, 421, 113, 113, -24, 17, 65] } as Record<
    string,
    Glyph
  >,
}
