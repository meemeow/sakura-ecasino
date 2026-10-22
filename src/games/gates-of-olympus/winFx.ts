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
  amountLength: 1140,
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
    release: 0.4667,
    unitPx: 0.2505,
    spriteWidth: 326,
    origin: [0.5363, 0.5092],
  },
  diamond: {
    file: 'fx/mult-diamond',
    numberBone: 'multiplier_number',
    release: 0.4333,
    unitPx: 0.5,
    spriteWidth: 329,
    origin: [0.5106, 0.5351],
  },
} as const
export type OrbRig = keyof typeof ORB_RIGS
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
export type WinFx = { id: number; cells: [number, number][]; labels: WinLabel[]; rate: number }
