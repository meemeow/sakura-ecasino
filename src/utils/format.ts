const money = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const amount = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

export const formatMoney = (value: number) => money.format(value)

export const formatAmount = (value: number) => amount.format(value)

export const formatPeso = (value: number) => currency.format(value)

export function formatCountdown(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function localMobile(e164: string | null | undefined) {
  return e164 ? `0${e164.slice(3)}` : ''
}

export function maskMobile(local: string, mask = '***') {
  return `${local.slice(0, 4)}${mask}${local.slice(-4)}`
}
