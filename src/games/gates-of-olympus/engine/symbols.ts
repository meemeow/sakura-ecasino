import type { CellPlace } from '@/games/gates-of-olympus/components/CellSpine.vue'
import {
  ORB_RIGS,
  SYMBOL_RIGS,
  type OrbRig,
  type StrikeBolt,
} from '@/games/gates-of-olympus/engine/winFx'

export type Sym = {
  id: string
  mult?: number
  key: number
  win?: boolean
  fall?: number
  fallDelay?: number
  strike?: boolean
  collected?: boolean
}
export type Fresh = Omit<Sym, 'key'>

export function createKeys() {
  let next = 0
  return () => next++
}

export const PAY_SYMBOLS: [id: string, weight: number][] = [
  ['crown', 4],
  ['hourglass', 5],
  ['ring', 6],
  ['chalice', 7],
  ['red', 9],
  ['purple', 10],
  ['yellow', 11],
  ['green', 12],
  ['blue', 13],
]

export const PAYS: Record<string, [number, number, number]> = {
  crown: [50, 25, 10],
  hourglass: [25, 10, 2.5],
  ring: [15, 5, 2],
  chalice: [12, 2, 1.5],
  red: [10, 1.5, 1],
  purple: [8, 1.2, 0.8],
  yellow: [5, 1, 0.5],
  green: [4, 0.9, 0.4],
  blue: [2, 0.75, 0.25],
}
export const payX = (id: string, n: number) => PAYS[id]![n >= 12 ? 0 : n >= 10 ? 1 : 2]

export const MAX_WIN_X = 15000

export type Win = { id: string; count: number; amount: number }

export function findWins(g: Sym[][], bet: number): Win[] {
  const counts = new Map<string, number>()
  for (const col of g)
    for (const sym of col) if (PAYS[sym.id]) counts.set(sym.id, (counts.get(sym.id) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n >= 8)
    .map(([id, n]) => ({ id, count: n, amount: bet * payX(id, n) }))
}

type Box = [left: number, top: number, width: number, height: number]
type LabelAnchor = [x: number, y: number, em: number]
export type MultTier = {
  max: number
  id: string
  art: Box
  label: LabelAnchor
  labelShadow?: number
  win: { rig: OrbRig; anim: string }
  land: string
  bolt: StrikeBolt
}
const WINGED_LABEL: LabelAnchor = [0.5374, 0.5045, 0.2494]
const wingsSpine = (tier: string) => ({
  win: { rig: 'wings' as const, anim: `gool_wild_multiplier_win_${tier}` },
  land: `gool_wild_multiplier_landing_${tier}`,
})
export const MULT_TIERS: MultTier[] = [
  {
    max: 8,
    id: 'mgreen',
    art: [-23.14, -36.95, 136.07, 169.64],
    label: WINGED_LABEL,
    ...wingsSpine('2X'),
    bolt: { variant: 0 },
  },
  {
    max: 25,
    id: 'mblue',
    art: [-29.55, -44.48, 148.04, 184.56],
    label: WINGED_LABEL,
    ...wingsSpine('10X'),
    bolt: { variant: 1 },
  },
  {
    max: 50,
    id: 'mpurple',
    art: [-32.75, -48.26, 154.03, 192.03],
    label: WINGED_LABEL,
    ...wingsSpine('100X'),
    bolt: { variant: 2, sparks: 'small' },
  },
  {
    max: 500,
    id: 'mred',
    art: [-40.62, -57.5, 168.72, 210.34],
    label: WINGED_LABEL,
    ...wingsSpine('500X'),
    bolt: { variant: 3, sparks: 'tall', shake: true },
  },
  {
    max: 1000,
    id: 'mdiamond',
    art: [-33.14, -57.5, 163.46, 197.59],
    label: [0.5112, 0.5363, 0.2506],
    labelShadow: 0.6,
    win: { rig: 'diamond', anim: 'gaoo_1000_multiplier_win' },
    land: 'gaoo_1000_multiplier_land',
    bolt: { variant: 3, sparks: 'tall', shake: true },
  },
]
export const multTier = (mult: number) =>
  MULT_TIERS.find((tier) => mult <= tier.max) ?? MULT_TIERS.at(-1)!
export const MULT_ORBS = MULT_TIERS.map((tier) => tier.id)
export const MULT_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000]

export const REEL_ART: Record<string, Box> = {
  yellow: [20.75, 14.08, 58.73, 71.04],
  green: [21.79, 10.24, 55.58, 79.28],
  red: [20.23, 10.85, 58.28, 80.1],
  blue: [22.25, 10.63, 55.15, 80.85],
  crown: [7.61, -1.68, 85.12, 103.3],
  hourglass: [12.07, -6.28, 74.58, 107.31],
  ring: [13.29, -2.61, 72.86, 103.6],
  chalice: [12.9, -3.66, 72.58, 101.27],
  purple: [22.85, 8.76, 53.86, 82.94],
  scatter: [-1.97, -10.34, 104.96, 110.75],
}

export const artBox = ([l, t, w, h]: Box) => ({
  left: `${l}%`,
  top: `${t}%`,
  width: `${w}%`,
  height: `${h}%`,
})

export const symArt = (sym: Sym) => (sym.mult ? multTier(sym.mult).art : REEL_ART[sym.id])

type RigFit = { origin: readonly [number, number]; unitPx: number; spriteWidth: number }

const rigPlace = ([l, t, w, h]: Box, { origin, unitPx, spriteWidth }: RigFit): CellPlace => ({
  x: (l + w * origin[0]) / 100,
  y: (t + h * origin[1]) / 100,
  unit: ((w / 100) * unitPx) / spriteWidth,
})

export const symbolPlace = (id: string) => rigPlace(REEL_ART[id]!, SYMBOL_RIGS[id]!)

export const orbRigPlace = (tier: MultTier) => rigPlace(tier.art, ORB_RIGS[tier.win.rig])

export const orbPlace = (mult: number) => orbRigPlace(multTier(mult))

export const labelStyle = (mult: number) => {
  const {
    art: [l, t, w, h],
    label: [x, y, em],
  } = multTier(mult)
  return { left: `${l + w * x}%`, top: `${t + h * y}%`, '--mult-em': `${w * em}%` }
}

export const labelOrigin = (mult: number) => {
  const { left, top } = labelStyle(mult)
  return `${left} ${top}`
}

export const tierVars = (tier: MultTier) => ({ zIndex: MULT_TIERS.indexOf(tier) + 1 })

export type WinRow = Win & { key: number; order: number; max?: boolean }
