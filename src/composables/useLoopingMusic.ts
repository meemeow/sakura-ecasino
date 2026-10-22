import { onBeforeUnmount, ref } from 'vue'

export function useLoopingMusic(url: string, volume = 0.5) {
  const ctx = new AudioContext()
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  let source: AudioBufferSourceNode | null = null
  let stopped = false

  const blocked = ref(ctx.state === 'suspended')
  ctx.onstatechange = () => (blocked.value = ctx.state === 'suspended')

  const ready: Promise<AudioBuffer | null> = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .catch(() => null)

  const unlockEvents = ['click', 'keydown', 'touchend'] as const
  function removeUnlock() {
    unlockEvents.forEach((e) => window.removeEventListener(e, resume))
  }
  function resume() {
    ctx.resume().then(removeUnlock, () => {})
  }
  if (blocked.value) unlockEvents.forEach((e) => window.addEventListener(e, resume))

  async function play() {
    const buffer = await ready
    if (!buffer || stopped || source) return
    if (blocked.value) resume()
    source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    gain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime)
    source.start()
  }

  function stop() {
    stopped = true
    removeUnlock()
    source?.stop()
    ctx.close()
  }

  let muted = false
  function apply() {
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime)
  }

  function setMuted(m: boolean) {
    muted = m
    apply()
  }

  function setVolume(v: number) {
    volume = v
    apply()
  }

  onBeforeUnmount(stop)

  return { ready, blocked, play, stop, setMuted, setVolume }
}
