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
