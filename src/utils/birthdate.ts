import { MIN_AGE } from '@/constants/personalDetails'

const manilaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayInManila(now = new Date()) {
  const parts = manilaDate.formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

export function latestBirthdate(now = new Date()) {
  const { y, m, d } = todayInManila(now)
  return new Date(y - MIN_AGE, m - 1, d)
}

export function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromIsoDate(iso: string) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d)
}
