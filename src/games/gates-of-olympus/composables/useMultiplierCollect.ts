import { computed, nextTick, ref, type Ref } from 'vue'
import { ASSET } from '@/games/gates-of-olympus/engine/assets'
import {
  COLLECT,
  absorbFrames,
  orbFlight,
  pillarFlight,
  type Point,
} from '@/games/gates-of-olympus/engine/collect'
import { PILLAR } from '@/games/gates-of-olympus/engine/freeSpins'
import { multTier, orbRigPlace, type Sym } from '@/games/gates-of-olympus/engine/symbols'
import { sleep } from '@/games/gates-of-olympus/engine/timing'
import { ORB_RIGS, STAGE, UI_PX, type OrbWin } from '@/games/gates-of-olympus/engine/winFx'
import { loadRig } from '@/games/gates-of-olympus/spine/rigs'
import { boneOffset } from '@/games/gates-of-olympus/spine/spineLite'
import { MULT_GLYPH_CAP, MULT_GLYPH_EM } from '@/games/gates-of-olympus/text/multGlyphs'

type Flyer = { key: number; text: string; em: number; shadow?: number }
export type Orb = { c: number; r: number; mult: number }

export function useMultiplierCollect(
  stageEl: Ref<HTMLElement | null>,
  grid: Ref<Sym[][]>,
  newKey: () => number,
) {
  const flyers = ref<Flyer[]>([])
  const multShown = ref(0)
  const multSlot = ref(0)
  const multGhost = ref(0)

  const orbWins = ref<OrbWin[]>([])
  const winningCells = computed(() => new Set(orbWins.value.map((win) => `${win.c}-${win.r}`)))
  const endOrbWin = (id: number) => {
    orbWins.value = orbWins.value.filter((win) => win.id !== id)
  }

  async function mergeTally() {
    const bar = stageEl.value?.querySelector('.tumble-amount.split:not(.ghost)')
    const [base, x, mult] = ['.ta-base', '.ta-x', '.ta-mult'].map((q) =>
      bar?.querySelector<HTMLElement>(q),
    )
    if (!bar || !base || !x || !mult) return
    const center = (el: Element) => {
      const box = el.getBoundingClientRect()
      return box.left + box.width / 2
    }
    const mid = center(bar)
    const toMiddle = (el: HTMLElement) =>
      el.animate([{ translate: '0 0' }, { translate: `${mid - center(el)}px 0` }], {
        duration: COLLECT.slide,
        easing: 'cubic-bezier(0.4, 0.05, 0.8, 0.95)',
        fill: 'forwards',
      }).finished
    sleep(COLLECT.hideX).then(() => (x.style.visibility = 'hidden'))
    await Promise.all([toMiddle(base), toMiddle(mult)])
    await sleep(COLLECT.reveal)
  }

  function stagePoint(el: Element | null | undefined) {
    const stage = stageEl.value?.getBoundingClientRect()
    const box = el?.getBoundingClientRect()
    if (!stage || !box) return null
    return { x: box.left + box.width / 2 - stage.left, y: box.top + box.height / 2 - stage.top }
  }

  function ghostSlot(designPx: number) {
    const slot = stagePoint(stageEl.value?.querySelector('.tumble-amount.ghost .ta-mult'))
    return slot && { x: slot.x + COLLECT.landOffset * designPx, y: slot.y }
  }

  const landScaleFor = (em: number, designPx: number) =>
    (COLLECT.landDigitPx * designPx) / ((MULT_GLYPH_CAP / MULT_GLYPH_EM) * em || 1)

  async function absorbFlyer(
    el: HTMLElement,
    flight: Animation,
    to: Point,
    landScale: number,
    next: number,
  ) {
    await flight.finished
    multShown.value = Math.max(multShown.value, next)
    await el.animate(absorbFrames(to, landScale), { duration: COLLECT.absorb, fill: 'forwards' })
      .finished
  }

  async function collectOrb({ c, r, mult }: Orb, released: () => void) {
    const tier = multTier(mult)
    const rig = ORB_RIGS[tier.win.rig]
    const loaded = await loadRig(ASSET, tier.win.rig).catch((error) => {
      console.warn('orb win rig', error)
      return null
    })
    const cell = stageEl.value?.querySelector(`[data-cell="${c}-${r}"]`)
    const cellWidth = cell?.getBoundingClientRect().width ?? 0
    const orbWidth = cell?.querySelector('.sym')?.getBoundingClientRect().width ?? 0
    const from = stagePoint(cell?.querySelector('.mult'))
    const place = orbRigPlace(tier)
    if (loaded)
      orbWins.value = [
        ...orbWins.value,
        {
          id: newKey(),
          c,
          r,
          rig: tier.win.rig,
          anim: tier.win.anim,
          at: performance.now(),
          rate: 1,
          ...place,
        },
      ]
    const key = newKey()
    const em = orbWidth * tier.label[2]
    flyers.value = [...flyers.value, { key, text: `${mult}x`, em, shadow: tier.labelShadow }]
    multGhost.value += mult
    const next = multGhost.value
    await nextTick()
    const designPx = (stageEl.value?.getBoundingClientRect().width ?? 0) / STAGE.w
    const to = ghostSlot(designPx)
    const landScale = landScaleFor(em, designPx)
    grid.value = grid.value.map((col, cc) =>
      col.map((sym, rr) => (cc === c && rr === r ? { ...sym, collected: true } : sym)),
    )
    const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
    if (el && from && to) {
      const bone = loaded
        ? (seconds: number) => boneOffset(loaded.data, tier.win.anim, seconds, rig.numberBone)
        : null
      const { duration, frames } = orbFlight(from, to, landScale, place.unit * cellWidth, bone)
      const flight = el.animate(frames, { duration, fill: 'forwards' })
      sleep(loaded ? rig.nextAt * 1000 : 0).then(released)
      sleep(duration - COLLECT.slotLead).then(() => {
        if (!multShown.value) multSlot.value = next
      })
      await absorbFlyer(el, flight, to, landScale, next)
    } else multShown.value = Math.max(multShown.value, next)
    released()
    flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
  }

  async function flyFromPillar(mult: number) {
    const stage = stageEl.value?.getBoundingClientRect()
    if (!stage) return
    const designPx = stage.width / STAGE.w
    const from = { x: PILLAR.value[0] * designPx, y: PILLAR.value[1] * designPx }
    const em = 72 * UI_PX * designPx
    const key = newKey()
    flyers.value = [...flyers.value, { key, text: `${mult}x`, em }]
    multGhost.value += mult
    const next = multGhost.value
    await nextTick()
    const to = ghostSlot(designPx)
    const landScale = landScaleFor(em, designPx)
    const el = stageEl.value?.querySelector<HTMLElement>(`[data-flyer="${key}"]`)
    if (el && to) {
      const flight = el.animate(pillarFlight(from, to, landScale), {
        duration: COLLECT.fly,
        fill: 'forwards',
      })
      sleep(COLLECT.fly - COLLECT.slotLead).then(() => {
        if (!multShown.value) multSlot.value = next
      })
      await absorbFlyer(el, flight, to, landScale, next)
    } else multShown.value = Math.max(multShown.value, next)
    flyers.value = flyers.value.filter((flyer) => flyer.key !== key)
  }

  async function collectOrbs(orbs: Orb[], prior: number) {
    if (prior) await flyFromPillar(prior)
    const landings = []
    for (const orb of orbs) {
      let released = () => {}
      const leaves = new Promise<void>((resolve) => (released = resolve))
      landings.push(collectOrb(orb, released))
      await leaves
    }
    await Promise.all(landings)
    await sleep(COLLECT.hold)
    await mergeTally()
    multShown.value = multSlot.value = multGhost.value = 0
  }

  return { flyers, multShown, multSlot, multGhost, orbWins, winningCells, endOrbWin, collectOrbs }
}
