import { onBeforeUnmount } from 'vue'
import { swellScale } from '@/games/gates-of-olympus/components/CellSpine.vue'
import type { Reels } from '@/games/gates-of-olympus/composables/useReels'
import { SCATTER_RIG } from '@/games/gates-of-olympus/engine/freeSpins'
import { sleep } from '@/games/gates-of-olympus/engine/timing'
import { WIN_FX } from '@/games/gates-of-olympus/engine/winFx'

export function useScatterAnticipation({ grid, scatterFx }: Reels) {
  let anticipating: number[] = []
  let release: ReturnType<typeof setTimeout> | undefined

  function anticipate() {
    if (anticipating.length) return
    anticipating = grid.value.flat().flatMap((sym) => (sym.id === 'scatter' ? [sym.key] : []))
    const at = performance.now()
    for (const key of anticipating)
      scatterFx.value.set(key, {
        anim: SCATTER_RIG.anticipation,
        at,
        rate: SCATTER_RIG.anticipationRate,
        hold: SCATTER_RIG.anticipationPeak,
        swell: {
          at,
          ms: SCATTER_RIG.anticipationDropMs - SCATTER_RIG.anticipationReleaseMs,
          from: 1,
          to: SCATTER_RIG.anticipationSwell,
          easeOut: true,
        },
      })
  }

  function stopAnticipation() {
    clearTimeout(release)
    const { anticipationPeak: peak, anticipationReleaseMs: releaseMs } = SCATTER_RIG
    const rate = ((1 - peak) * 1000) / releaseMs
    const at = performance.now() - (peak / rate) * 1000
    const now = performance.now()
    for (const key of anticipating) {
      const fx = scatterFx.value.get(key)
      if (fx?.hold === undefined) continue
      const grown = swellScale(fx.swell, now)
      scatterFx.value.set(key, {
        anim: SCATTER_RIG.anticipation,
        at,
        rate,
        swell: { at: now, ms: releaseMs, from: grown, to: 1 },
      })
    }
    anticipating = []
  }

  async function holdRefill(rate: number) {
    anticipate()
    release = setTimeout(
      stopAnticipation,
      SCATTER_RIG.anticipationDropMs - SCATTER_RIG.anticipationReleaseMs,
    )
    await sleep(
      Math.max(0, SCATTER_RIG.anticipationDropMs - (WIN_FX.tumbleAt - WIN_FX.burstAt) / rate),
    )
  }

  const isHeld = (key: number) => anticipating.includes(key)

  onBeforeUnmount(stopAnticipation)

  return { holdRefill, stopAnticipation, isHeld }
}

export type ScatterAnticipation = ReturnType<typeof useScatterAnticipation>
