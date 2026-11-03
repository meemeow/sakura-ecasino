import { computed, ref, watch } from 'vue'
import { MUSIC } from '@/games/gates-of-olympus/engine/assets'
import { useLoopingMusic } from '@/composables/useLoopingMusic'

export function useGameAudio() {
  const music = useLoopingMusic(MUSIC, 0.5)
  const muted = ref(false)
  const volume = ref(50)

  watch(muted, (m) => music.setMuted(m))
  watch(volume, (v) => music.setVolume(v / 100))

  const shownMuted = computed({
    get: () => muted.value || music.blocked.value,
    set: (m) => (muted.value = m),
  })

  return { music, volume, shownMuted }
}
