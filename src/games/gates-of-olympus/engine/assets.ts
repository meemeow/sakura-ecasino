import { BIG_WIN, BIG_WIN_FONT, COIN } from '@/games/gates-of-olympus/engine/bigWin'
import { FS_WINDOW, SCATTER_RIG, TRANSITION } from '@/games/gates-of-olympus/engine/freeSpins'
import { MULT_ORBS, REEL_ART } from '@/games/gates-of-olympus/engine/symbols'
import {
  BUY_POPUP_RIG,
  FX_SHEETS,
  STRIKE_FX,
  SYMBOL_RIGS,
} from '@/games/gates-of-olympus/engine/winFx'
import { loadRig, loadSpine, loadZeus } from '@/games/gates-of-olympus/spine/rigs'
import { publicUrl } from '@/utils/publicUrl'

export const ASSET = publicUrl('/slots/gates-of-olympus-1000')
export const MUSIC = `${ASSET}/gates-of-olympus-1000-bgm.m4a`

const UI = [
  'board-shadow',
  'board-back',
  'board-front',
  'logo',
  'buy-free-spins',
  'buy-free-spins-glow',
  'ante-bet',
  'ante-bet-glow',
  'ante-slider',
  'ante-knob',
  'ante-tick',
  'ante-arrow',
  'history-back',
  'history-frame',
]

const PRELOAD = [
  'background.webp',
  ...Object.values(FX_SHEETS).map((sheet) => sheet.file),
  STRIKE_FX.file,
  'ui/tumble-win.webp',
  'ui/tumble-digits.webp',
  ...UI.map((n) => `ui/${n}.webp`),
  ...Object.keys(REEL_ART).map((n) => `reel/${n}.webp`),
  ...MULT_ORBS.map((n) => `reel/${n}.webp`),
  'ui/info-scatter.webp',
  'ui/info-orb.webp',
  COIN.file,
  BIG_WIN_FONT.file,
  'free-background.webp',
  'ui/pillar.webp',
  'ui/fs-left.webp',
  'ui/fs-congratulations.webp',
  'ui/fs-digits.webp',
]

const FREE_SPINS_RIGS = [
  FS_WINDOW.banner.file,
  TRANSITION.file,
  'fx/pillar-over',
  'fx/pillar-under',
  SCATTER_RIG.fg,
  SCATTER_RIG.bg,
]

const loadImage = (file: string) =>
  new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = `${ASSET}/${file}`
  })

const optional = (loading: Promise<unknown>) => loading.catch(() => {})

export const loadGameAssets = (music: Promise<unknown>) =>
  Promise.all([
    music,
    loadZeus(ASSET),
    ...(['wings', 'diamond'] as const).map((rig) => optional(loadRig(ASSET, rig))),
    ...Object.values(SYMBOL_RIGS).map((rig) => optional(loadSpine(ASSET, rig.file))),
    optional(loadSpine(ASSET, BUY_POPUP_RIG)),
    optional(loadSpine(ASSET, BIG_WIN.rig)),
    ...FREE_SPINS_RIGS.map((file) => optional(loadSpine(ASSET, file))),
    ...PRELOAD.map(loadImage),
  ])

const LOAD_MS = 2500

export function loadStages(): [ms: number, progress: number][] {
  const stages: [number, number][] = []
  let t = 120 + Math.random() * 200
  let p = 0
  while (p < 0.93) {
    const r = Math.random()
    if (r < 0.15) t += 350 + Math.random() * 350
    else if (r < 0.5) t += 30 + Math.random() * 60
    else t += 110 + Math.random() * 180
    p += r > 0.85 ? 0.12 + Math.random() * 0.14 : 0.015 + Math.random() * 0.07
    stages.push([t, Math.min(p, 0.97)])
  }
  const last = stages[stages.length - 1]![0]
  const fit = (LOAD_MS - 260) / last
  return [...stages.map(([ms, v]): [number, number] => [ms * fit, v]), [LOAD_MS, 1]]
}
