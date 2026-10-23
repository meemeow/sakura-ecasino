import { ORB_RIGS, type OrbRig } from '@/games/gates-of-olympus/winFx'
import type { SpineData } from '@/games/gates-of-olympus/spineLite'

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
