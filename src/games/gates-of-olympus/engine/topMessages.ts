export type TopMessageIcon = 'scatter' | 'orb'
export type TopMessagePart = string | { icon: TopMessageIcon }

export const TOP_MESSAGES: TopMessagePart[][] = [
  ['WIN UP TO 15000 X BET'],
  ['SYMBOLS PAY ANYWHERE ON THE SCREEN'],
  ['4X', { icon: 'scatter' }, 'WINS FREE SPINS'],
  ['HIT', { icon: 'orb' }, 'TO MULTIPLY TUMBLE WIN'],
]

export const FREE_TOP_MESSAGES: TopMessagePart[][] = [
  ['WIN UP TO 15000 X BET'],
  ['SYMBOLS PAY ANYWHERE ON THE SCREEN'],
  ['3X', { icon: 'scatter' }, 'RETRIGGERS THE FEATURE'],
  ['HIT', { icon: 'orb' }, 'TO MULTIPLY TUMBLE WIN'],
]

export const TOP_MESSAGE_MS = 15000
