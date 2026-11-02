import { ORB_RIGS, type OrbRig } from '@/games/gates-of-olympus/engine/winFx'
import type { SpineData } from '@/games/gates-of-olympus/spine/spineLite'

export type LoadedRig = { data: SpineData; image: HTMLImageElement }

export function fetchRig(base: string): Promise<LoadedRig> {
  return Promise.all([
    fetch(`${base}.json`).then((res) => {
      if (!res.ok) throw new Error(`${base}.json ${res.status}`)
      return res.json() as Promise<SpineData>
    }),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = `${base}.webp`
    }),
  ]).then(([data, image]) => ({ data, image }))
}

const cache = new Map<string, Promise<LoadedRig>>()

export function loadSpine(asset: string, file: string) {
  let loading = cache.get(file)
  if (!loading) {
    loading = fetchRig(`${asset}/${file}`)
    loading.catch(() => cache.delete(file))
    cache.set(file, loading)
  }
  return loading
}

export const loadRig = (asset: string, rig: OrbRig) => loadSpine(asset, ORB_RIGS[rig].file)

export const ZEUS = {
  origin: { x: 1773.596, y: 562.636 },
  scale: 0.8257353,
  box: { x: 1280, y: 40, w: 990, h: 1040 },
  idle: 'zeus_idle',
  charging: 'zeus_super_charging_wild',
  transition: 'gool_zeus_transition',
  swapAfterMs: (17 / 60) * 1000,
}

export type ZeusRigs = { zeus: LoadedRig; transition: LoadedRig }

let loading: Promise<ZeusRigs> | null = null

export function loadZeus(asset: string) {
  if (!loading) {
    loading = Promise.all([
      fetchRig(`${asset}/fx/zeus`),
      fetchRig(`${asset}/fx/zeus-transition`),
    ]).then(([zeus, transition]) => ({ zeus, transition }))
    loading.catch(() => (loading = null))
  }
  return loading
}
