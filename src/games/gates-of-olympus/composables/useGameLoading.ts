import { onMounted, ref } from 'vue'
import { loadGameAssets, loadStages } from '@/games/gates-of-olympus/engine/assets'
import { sleep } from '@/games/gates-of-olympus/engine/timing'

export function useGameLoading(musicReady: Promise<unknown>) {
  const loading = ref(true)
  const loadProgress = ref(0)

  async function preload() {
    const assets = loadGameAssets(musicReady)
    const started = Date.now()
    const reach = (ms: number) => sleep(Math.max(0, ms - (Date.now() - started)))
    for (const [ms, progress] of loadStages()) {
      await reach(ms)
      if (progress === 1) await assets
      loadProgress.value = progress
    }
    await sleep(250)
    loading.value = false
  }

  onMounted(preload)

  return { loading, loadProgress }
}
