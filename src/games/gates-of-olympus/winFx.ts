export const STAGE = { w: 1920, h: 1080 }

export const COLS = 6
export const ROWS = 5

export const FX_FRAME_MS = 1000 / 47.97

export const WIN_FX = {
  borderFrames: 71,
  burstAt: 1642,
  burstFrames: 28,
  tumbleAt: 2225,
  popLength: 1042,
  vanishLength: 250,
}

export type HermiteKey = [time: number, value: number, inTangent: number, outTangent: number]
export const WIN_AMOUNT = {
  ms: 1250,
  fontSize: 84,
  uiPx: 1080 / 999,
  drop: 60,
  rise: [
    [0, 0, 265.5584, 265.5584],
    [0.1666667, 40, 156.9231, 156.9231],
    [1.25, 120, 43.9049, 43.9049],
  ] as HermiteKey[],
  scale: [
    [0, 0.5, 0, 7.2],
    [0.0833333, 1.1, 0, 0],
    [0.3333333, 0.95, -0.3818182, -0.3818182],
    [1.25, 0.8, -0.1636363, 0],
  ] as HermiteKey[],
  alpha: [
    [0, 0, 0, 40],
    [0.025, 1, 40, 0],
    [0.5, 1, 0, -2],
    [1, 0, -2, 0],
  ] as HermiteKey[],
}

export function hermite(keys: HermiteKey[], t: number) {
  if (t <= keys[0]![0]) return keys[0]![1]
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0, , out0] = keys[i]!
    const [t1, v1, in1] = keys[i + 1]!
    if (t > t1) continue
    const dt = t1 - t0
    const s = (t - t0) / dt
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * v0 +
      (s3 - 2 * s2 + s) * dt * out0 +
      (-2 * s3 + 3 * s2) * v1 +
      (s3 - s2) * dt * in1
    )
  }
  return keys.at(-1)![1]
}

export const FX_SOURCE_CELL = { w: 191.5, h: 145.4 }
export const FX_BOARD_CLIP = { x: 0.245, y: 0.2221 }

export const FX_SHEETS = {
  border: { file: 'fx/border.webp', w: 264, h: 218, cols: 9 },
  explode: { file: 'fx/explode.webp', w: 576, h: 436, cols: 7 },
}

export const STRIKE_FX = {
  frames: 16,
  landFrame: 7.5,
  frontFrom: 7,
  w: 460,
  h: 860,
  cols: 8,
  anchor: { x: 230, y: 744 },
  impact: { rx: 235, ry: 115 },
  light: 'fx/strike-light.webp',
  red: 'fx/strike-red.webp',
  blue: 'fx/strike-blue.webp',
}

export const STRIKE_CANVAS = { top: 0.6671, bottom: 0.5, side: 1, clip: { x: 0.245, y: 0.2221 } }

export type BoltGlow = { red: string; blue: string }
export type Strike = { c: number; r: number; glow: BoltGlow; landAt: number }

export const ORB_RIGS = {
  wings: {
    file: 'fx/mult-wings',
    numberBone: 'bone5',
    bodyBone: 'bone',
    release: 0.8,
    nextAt: 0.68,
    unitPx: 0.2505,
    spriteWidth: 326,
    origin: [0.5344, 0.5092],
  },
  diamond: {
    file: 'fx/mult-diamond',
    numberBone: 'multiplier_number',
    bodyBone: 'multiplier',
    release: 0.7333,
    nextAt: 0.62,
    unitPx: 0.5,
    spriteWidth: 329,
    origin: [0.5106, 0.5351],
  },
} as const
export type OrbRig = keyof typeof ORB_RIGS

type SymbolRig = {
  file: string
  anim: string
  unitPx: number
  spriteWidth: number
  origin: readonly [number, number]
}
export const SYMBOL_RIGS: Record<string, SymbolRig> = {
  red: {
    file: 'fx/sym-red',
    anim: 'gool_lv_1_orange',
    unitPx: 0.3301,
    spriteWidth: 288,
    origin: [0.5057, 0.4814],
  },
  purple: {
    file: 'fx/sym-purple',
    anim: 'gool_lv_2_purple',
    unitPx: 0.3303,
    spriteWidth: 264,
    origin: [0.4952, 0.4778],
  },
  yellow: {
    file: 'fx/sym-yellow',
    anim: 'gool_lv_3_yellow',
    unitPx: 0.3301,
    spriteWidth: 292,
    origin: [0.5044, 0.4815],
  },
  green: {
    file: 'fx/sym-green',
    anim: 'gool_lv_4_green',
    unitPx: 0.33,
    spriteWidth: 271,
    origin: [0.5067, 0.4887],
  },
  blue: {
    file: 'fx/sym-blue',
    anim: 'gool_lv_5_blue',
    unitPx: 0.33,
    spriteWidth: 270,
    origin: [0.5092, 0.4797],
  },
  crown: {
    file: 'fx/sym-crown',
    anim: 'gool_hv_1',
    unitPx: 0.3299,
    spriteWidth: 346,
    origin: [0.5018, 0.4931],
  },
  hourglass: {
    file: 'fx/sym-hourglass',
    anim: 'gool_hv_2',
    unitPx: 0.3299,
    spriteWidth: 314,
    origin: [0.5211, 0.5657],
  },
  ring: {
    file: 'fx/sym-ring',
    anim: 'gool_hv_3',
    unitPx: 0.3302,
    spriteWidth: 300,
    origin: [0.5098, 0.5452],
  },
  chalice: {
    file: 'fx/sym-chalice',
    anim: 'gool_hv_4',
    unitPx: 0.3297,
    spriteWidth: 299,
    origin: [0.4897, 0.5132],
  },
}
export type OrbWin = {
  id: number
  c: number
  r: number
  rig: OrbRig
  anim: string
  at: number
  rate: number
  x: number
  y: number
  unit: number
}

export type WinLabel = { c: number; r: number; text: string }
export type WinFx = {
  id: number
  cells: [number, number][]
  labels: WinLabel[]
  rate: number
  start: number
  border: boolean
}
