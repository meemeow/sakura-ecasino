export type GradientStops = readonly (readonly [color: string, at: number])[]
export type LabelPaint = string | GradientStops
export type LabelShadow = { color: string; size: number; dy: number }
export type LabelLayer = {
  fill: LabelPaint
  stroke: LabelPaint
  outline: number
  shadow?: LabelShadow
}

const NAVY = '#0A002F'
const PLUM = '#26032F'
const GOLD: GradientStops = [
  ['#F9FD48', 0.195],
  ['#F5A700', 0.885],
]
const GOLD_RIM: GradientStops = [
  ['#FFFFFF', 0.195],
  ['#F8FC9E', 0.885],
]
const navyShadow: LabelShadow = { color: NAVY, size: 3.6, dy: 1.2 }
const plumShadow: LabelShadow = { color: PLUM, size: 3.6, dy: 1.2 }

export const SCROLL_TEXT: LabelLayer[] = [
  { fill: NAVY, stroke: NAVY, outline: 1.2, shadow: navyShadow },
  { fill: '#FFFFFF', stroke: '#0B009F', outline: 1.2, shadow: navyShadow },
]

export const SCROLL_PRICE: LabelLayer[] = [
  { fill: '#FFFFFF', stroke: NAVY, outline: 3.3, shadow: navyShadow },
  { fill: GOLD, stroke: GOLD_RIM, outline: 1.2, shadow: navyShadow },
]

export const BUY_TITLE: LabelLayer[] = [
  {
    fill: [
      ['#00F2FE', 0.21],
      ['#4FACFE', 0.9],
    ],
    stroke: '#1A0017',
    outline: 1.8,
  },
]

export const BUY_PRICE: LabelLayer[] = [
  {
    fill: '#FFFFFF',
    stroke: [
      [PLUM, 0.195],
      ['#2A0637', 0.885],
    ],
    outline: 3.3,
    shadow: plumShadow,
  },
  { fill: GOLD, stroke: GOLD_RIM, outline: 1.2, shadow: plumShadow },
]

export const SLIDER_TEXT: LabelLayer[] = [{ fill: '#FFFFFF', stroke: 'none', outline: 0 }]

export const POPUP_TITLE: LabelLayer[] = [
  { fill: 'none', stroke: '#1A0017', outline: 3 },
  {
    fill: [
      ['#BBFAFF', 0.195],
      ['#006EA6', 0.885],
    ],
    stroke: [
      ['#FFFFFF', 0.195],
      ['#5CFFFF', 0.885],
    ],
    outline: 1.5,
  },
]

const priceShadow: LabelShadow = { color: '#0000005A', size: 7.2, dy: 0 }

export const POPUP_PRICE: LabelLayer[] = [
  { fill: 'none', stroke: '#000000', outline: 1.5, shadow: priceShadow },
  {
    fill: [
      ['#FAFA40', 0.195],
      ['#F6AC00', 0.885],
    ],
    stroke: [
      ['#FFFFFF', 0.195],
      ['#F8FC9D', 0.885],
    ],
    outline: 1.5,
    shadow: priceShadow,
  },
]

const panelShadow: LabelShadow = { color: '#090B48', size: 1.5, dy: 0 }

export const PANEL_TITLE: LabelLayer[] = [
  { fill: '#FFFFFF', stroke: '#090B48', outline: 2.7, shadow: panelShadow },
  { fill: GOLD, stroke: GOLD_RIM, outline: 1.2, shadow: panelShadow },
]

export const PANEL_COUNT: LabelLayer[] = [
  { fill: '#FFFFFF', stroke: '#090B48', outline: 2.7, shadow: panelShadow },
  {
    fill: [
      ['#FFFFFF', 0.195],
      ['#0081FF', 0.885],
    ],
    stroke: [
      ['#FFFFFF', 0.195],
      ['#89DBFF', 0.885],
    ],
    outline: 1.2,
    shadow: panelShadow,
  },
]

export const PILLAR_VALUE: LabelLayer[] = [
  {
    fill: '#0C000A',
    stroke: '#0C000AAB',
    outline: 3,
    shadow: { color: '#0C000A', size: 12, dy: 0 },
  },
  {
    fill: '#0C000A',
    stroke: '#0C000A',
    outline: 3,
    shadow: { color: '#0C000A', size: 7.2, dy: 0 },
  },
  { fill: GOLD, stroke: GOLD_RIM, outline: 1.5 },
]

const softShadow = (outline: number): LabelLayer => ({
  fill: '#0000003F',
  stroke: '#0000003F',
  outline,
  shadow: { color: '#000000', size: 1.5, dy: 0 },
})

export const WINDOW_TEXT: LabelLayer[] = [
  softShadow(5.25),
  softShadow(3.9375),
  softShadow(2.625),
  softShadow(1.3125),
  {
    fill: [
      ['#EDA02A', 0.21],
      ['#EAD12C', 0.54],
      ['#EB922C', 0.885],
    ],
    stroke: '#DED647',
    outline: 0.75,
  },
]

export const PRESS_TEXT: LabelLayer[] = [
  {
    fill: '#00000051',
    stroke: '#00000051',
    outline: 3,
    shadow: { color: '#000000', size: 1.5, dy: 0 },
  },
  {
    fill: '#00000051',
    stroke: '#00000051',
    outline: 1.5,
    shadow: { color: '#000000', size: 1.5, dy: 0 },
  },
  { fill: '#FFFFFF', stroke: 'none', outline: 0 },
]
