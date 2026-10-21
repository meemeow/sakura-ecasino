const K = 1_000
const M = 1_000_000
const B = 1_000_000_000

// prettier-ignore
const BET_REQUIREMENTS = [
  15 * K, 40 * K, 100 * K, 250 * K, 500 * K, 1 * M, 2 * M, 3 * M, 4 * M, 5 * M,
  6 * M, 8 * M, 10 * M, 12 * M, 14 * M, 16 * M, 18 * M, 21 * M, 24 * M, 27 * M,
  30 * M, 35 * M, 40 * M, 45 * M, 50 * M, 60 * M, 70 * M, 80 * M, 90 * M, 100 * M,
  110 * M, 120 * M, 140 * M, 160 * M, 180 * M, 200 * M, 230 * M, 260 * M, 290 * M, 320 * M,
  350 * M, 400 * M, 450 * M, 500 * M, 600 * M, 700 * M, 800 * M, 900 * M, 1 * B, 2 * B,
]

const DEPOSIT_STEP = 100

export const MAX_VIP_LEVEL = BET_REQUIREMENTS.length

export interface VipChip {
  face: [string, string, string]
  edge: string
  notches: number
  notch: string
  inlay: [string, string]
  trim: string
  petal: [string, string]
  ornate: boolean
}

export interface VipRank {
  name: string
  light: string
  dark: string
  ink: string
  chip: VipChip
}

const MEMBER: VipRank = {
  name: 'Member',
  light: '#c3c9d8',
  dark: '#5b6378',
  ink: '#1b1f2b',
  chip: {
    face: ['#d9dee9', '#8f98ad', '#4d556a'],
    edge: '#2c3242',
    notches: 0,
    notch: '#2c3242',
    inlay: ['#3a4256', '#1b2030'],
    trim: '#aab2c5',
    petal: ['#e7ebf3', '#9aa3b8'],
    ornate: false,
  },
}
const RANKS: VipRank[] = [
  {
    name: 'Sprout',
    light: '#a9f0c8',
    dark: '#1f9a62',
    ink: '#03311b',
    chip: {
      face: ['#c9f7dc', '#4cc78a', '#16714a'],
      edge: '#0b3d27',
      notches: 4,
      notch: '#0d3524',
      inlay: ['#16523a', '#0a2619'],
      trim: '#9ff0c4',
      petal: ['#f2fff6', '#9fe8bf'],
      ornate: false,
    },
  },
  {
    name: 'Bud',
    light: '#ffc8b0',
    dark: '#c2573c',
    ink: '#4a1404',
    chip: {
      face: ['#ffe0d0', '#e88a68', '#9c3a22'],
      edge: '#55190b',
      notches: 6,
      notch: '#3d1208',
      inlay: ['#5c2216', '#2a0d07'],
      trim: '#ffc2a6',
      petal: ['#fff3ee', '#ffb59a'],
      ornate: false,
    },
  },
  {
    name: 'Blossom',
    light: '#ffc2da',
    dark: '#e0457f',
    ink: '#4d0322',
    chip: {
      face: ['#ffe1ee', '#ff7aae', '#b8235e'],
      edge: '#5e0a2c',
      notches: 8,
      notch: '#3f0820',
      inlay: ['#5a1436', '#28061a'],
      trim: '#ffb8d4',
      petal: ['#ffffff', '#ffa3c8'],
      ornate: false,
    },
  },
  {
    name: 'Moonlit',
    light: '#ddd6ff',
    dark: '#6a55d6',
    ink: '#1a0f52',
    chip: {
      face: ['#f1eeff', '#a395f0', '#4d3aa8'],
      edge: '#211659',
      notches: 8,
      notch: '#170f40',
      inlay: ['#2b2466', '#0f0b2e'],
      trim: '#e4ddff',
      petal: ['#ffffff', '#c9c0ff'],
      ornate: true,
    },
  },
  {
    name: 'Onyx',
    light: '#ffe27a',
    dark: '#c98a00',
    ink: '#3a2300',
    chip: {
      face: ['#5a5f72', '#232736', '#07090f'],
      edge: '#000000',
      notches: 8,
      notch: '#e0a92a',
      inlay: ['#26305a', '#0c1122'],
      trim: '#ffe27a',
      petal: ['#fff1a8', '#ffb800'],
      ornate: true,
    },
  },
]
export const LEVELS_PER_RANK = 10

const SAKURA_CHIP: VipChip = {
  face: ['#fff1a8', '#ffc83d', '#c27a00'],
  edge: '#6b3a00',
  notches: 8,
  notch: '#0c1122',
  inlay: ['#26305a', '#0c1122'],
  trim: '#ffe27a',
  petal: ['#fff1a8', '#ffb800'],
  ornate: true,
}

export function chipFor(level: number): VipChip {
  return level >= MAX_VIP_LEVEL ? SAKURA_CHIP : rankFor(level).chip
}

export function petalsFor(level: number): { full: number; bud: boolean } {
  if (level === 0) return { full: 0, bud: false }
  const step = ((level - 1) % LEVELS_PER_RANK) + 1
  return { full: Math.floor(step / 2), bud: step % 2 === 1 }
}

export interface VipLevel {
  level: number
  rank: VipRank
  minDeposit: number
  minBet: number
}

export function rankFor(level: number): VipRank {
  return level === 0 ? MEMBER : RANKS[Math.ceil(level / LEVELS_PER_RANK) - 1]!
}

export const vipRanks = RANKS

export const vipLevels: VipLevel[] = [
  { level: 0, rank: MEMBER, minDeposit: 0, minBet: 0 },
  ...BET_REQUIREMENTS.map((minBet, i) => ({
    level: i + 1,
    rank: rankFor(i + 1),
    minDeposit: (i + 1) * DEPOSIT_STEP,
    minBet,
  })),
]

export interface VipStatus {
  current: VipLevel
  next: VipLevel | null
  depositProgress: number
  betProgress: number
  progress: number
}

function between(value: number, from: number, to: number) {
  return Math.min(1, Math.max(0, (value - from) / (to - from)))
}

export function vipStatus(totalDeposit: number, totalBet: number): VipStatus {
  let level = 0
  while (
    level < MAX_VIP_LEVEL &&
    totalDeposit >= vipLevels[level + 1]!.minDeposit &&
    totalBet >= vipLevels[level + 1]!.minBet
  ) {
    level++
  }

  const current = vipLevels[level]!
  const next = vipLevels[level + 1] ?? null
  if (!next) return { current, next, depositProgress: 1, betProgress: 1, progress: 1 }

  const depositProgress = between(totalDeposit, current.minDeposit, next.minDeposit)
  const betProgress = between(totalBet, current.minBet, next.minBet)
  return {
    current,
    next,
    depositProgress,
    betProgress,
    progress: Math.min(depositProgress, betProgress),
  }
}
