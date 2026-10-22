import { ORB_RIGS, type OrbRig } from '@/games/gates-of-olympus/winFx'
import type { SpineData } from '@/games/gates-of-olympus/spineLite'

export type LoadedRig = { data: SpineData; image: HTMLImageElement }

const cache = new Map<OrbRig, Promise<LoadedRig>>()

export function loadRig(asset: string, rig: OrbRig) {
  let loading = cache.get(rig)
  if (!loading) {
    const base = `${asset}/${ORB_RIGS[rig].file}`
    loading = Promise.all([
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
    loading.catch(() => cache.delete(rig))
    cache.set(rig, loading)
  }
  return loading
}
