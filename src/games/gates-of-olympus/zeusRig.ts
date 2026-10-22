import { fetchRig, type LoadedRig } from '@/games/gates-of-olympus/orbRigs'

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
