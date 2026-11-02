import { COLS, ROWS, FX_FRAME_MS } from '@/games/gates-of-olympus/engine/winFx'
import type { Sym } from '@/games/gates-of-olympus/engine/symbols'

export type Speed = {
  outMs: number
  outEase: string
  outCol: number
  outRow: number
  inStart: number
  inMs: number
  inCol: number
  inRow: number[]
  landMs: number
  dealLead: number
  fxRate: number
}
const QUICK_DROP = {
  outMs: 194,
  outEase: 'linear',
  outCol: 0,
  outRow: 0,
  inStart: 114,
  inMs: 190,
  inCol: 0,
  inRow: [87, 70, 0, 0, 0],
  landMs: 175,
  dealLead: 680,
}
export const SPEEDS: Speed[] = [
  {
    outMs: 297,
    outEase: 'cubic-bezier(0.16, 0, 0.2, 0.12)',
    outCol: 99,
    outRow: 21,
    inStart: 755,
    inMs: 226,
    inCol: 152,
    inRow: [148, 111, 74, 37, 0],
    landMs: 175,
    dealLead: 520,
    fxRate: 1,
  },
  { ...QUICK_DROP, fxRate: 1 },
  { ...QUICK_DROP, fxRate: 0 },
]
export const SPEED_NAMES = ['NORMAL', 'QUICK', 'TURBO']
export const SLAM_DROP = SPEEDS[1]!

export const ZEUS_DEAL_LEAD = 520
export const ZEUS_SPIN_LAG = 75
export const ZEUS_FAST_HOLD = 1000
export const TURBO_BURST_LEAD = 140
export const STRIKE_HOLD = 350
export const TURBO_SCATTER_HOLD = 335
export const AUTOPLAY_GAP_MS = 250
export const BAR_COUNT_MS = 600
export const PAY_LINE_MS = 1500

export const TUMBLE_FRAMES = { col: 1, kept: 2, freshGap: 0.8, fresh: 2.4, row: 1.686, ramp: 1 }
export const frameMs = (frames: number) => frames * FX_FRAME_MS
export const fallMs = (rows: number) => frameMs(rows * TUMBLE_FRAMES.row + TUMBLE_FRAMES.ramp / 2)

export function fallEase(rows: number) {
  const r = frameMs(TUMBLE_FRAMES.ramp) / fallMs(rows)
  const at = (t: number) => (t < r ? (t * t) / (2 * r) : t - r / 2) / (1 - r / 2)
  return `linear(0, ${at(r / 2).toFixed(4)} ${(50 * r).toFixed(2)}%, ${at(r).toFixed(4)} ${(100 * r).toFixed(2)}%, 1)`
}

export const landsIn = (sym: Sym) => (sym.fallDelay ?? 0) + fallMs(sym.fall ?? 0)

export type CellTiming = { delay: number; ms: number }
export type DropPlan = {
  start: number
  deals: boolean
  out: (CellTiming & { ease: string })[][]
  in: CellTiming[][]
}

export function dropTimings(s: Speed, deals: boolean) {
  const lead = deals ? Math.max(0, s.dealLead - s.inStart) : 0
  return {
    out: (c: number, r: number) => ({
      delay: c * s.outCol + (ROWS - 1 - r) * s.outRow,
      ms: s.outMs,
      ease: s.outEase,
    }),
    in: (c: number, r: number) => ({
      delay: s.inStart + lead + c * s.inCol + s.inRow[r]!,
      ms: s.inMs,
    }),
  }
}

export const landAt = (plan: DropPlan, c: number, r: number) =>
  plan.start + plan.in[c]![r]!.delay + plan.in[c]![r]!.ms

export const dropEnd = (plan: DropPlan) =>
  plan.start + Math.max(...plan.in.flat().map((cell) => cell.delay + cell.ms))

export function retimePlan(plan: DropPlan, s: Speed, elapsed: number) {
  const at = dropTimings(s, plan.deals)
  plan.out = plan.out.map((col, c) =>
    col.map((cell, r) =>
      cell.delay > elapsed
        ? { ...at.out(c, r), delay: Math.max(at.out(c, r).delay, elapsed) }
        : cell,
    ),
  )
  plan.in = plan.in.map((col, c) =>
    col.map((cell, r) =>
      cell.delay > elapsed
        ? { ms: s.inMs, delay: Math.max(at.in(c, r).delay, elapsed + s.inRow[r]!) }
        : cell,
    ),
  )
}

export const eachCell = <T>(at: (c: number, r: number) => T) =>
  Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, (_, r) => at(c, r)))

export const strikeFlip = (key: number) => (Math.imul(key + 1, 2654435761) < 0 ? -1 : 1)

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function until(deadline: () => number) {
  for (let left = deadline() - performance.now(); left > 0; left = deadline() - performance.now())
    await sleep(Math.min(left, 20))
}
