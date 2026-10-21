import { onBeforeUnmount, ref } from 'vue'

// Gapless looping background music via the Web Audio API (an <audio loop> element
// leaves a small gap/click at the loop point with MP3 files).
// Browsers only allow sound after the user has interacted with the page. Arriving from
// the lobby counts, but on a direct load or refresh the audio stays locked until the next
// click or key press; `blocked` is true meanwhile so the UI can show the sound as off.
export function useLoopingMusic(url: string, volume = 0.5) {
  const ctx = new AudioContext()
  const gain = ctx.createGain()
  gain.gain.value = 0
  gain.connect(ctx.destination)

  let source: AudioBufferSourceNode | null = null
  let stopped = false

  const blocked = ref(ctx.state === 'suspended')
  ctx.onstatechange = () => (blocked.value = ctx.state === 'suspended')

  // Download and decode up front, so it can be awaited alongside other assets
  const ready: Promise<AudioBuffer | null> = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .catch(() => null)

  // click rather than pointerdown: window listeners run after the clicked element's own
  // handler, so a first click on the sound button still sees the sound as blocked
  const unlockEvents = ['click', 'keydown', 'touchend'] as const
  function removeUnlock() {
    unlockEvents.forEach((e) => window.removeEventListener(e, resume))
  }
  function resume() {
    ctx.resume().then(removeUnlock, () => {})
  }
  if (blocked.value) unlockEvents.forEach((e) => window.addEventListener(e, resume))

  async function play(fadeMs = 800) {
    const buffer = await ready
    if (!buffer || stopped || source) return
    source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    source.start()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeMs / 1000)
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
    gain.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05)
  }

  function setMuted(m: boolean) {
    muted = m
    apply()
  }

  // 0..1
  function setVolume(v: number) {
    volume = v
    apply()
  }

  onBeforeUnmount(stop)

  return { ready, blocked, play, stop, setMuted, setVolume }
}
