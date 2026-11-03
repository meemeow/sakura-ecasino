export type Random = () => number

export function seededRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pickIndex = (length: number, random: Random) => Math.floor(random() * length)

export const pickFrom = <T>(items: readonly T[], random: Random) =>
  items[pickIndex(items.length, random)]

export const shuffled = <T>(items: T[], random: Random) => items.sort(() => random() - 0.5)
