const money = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const amount = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const whole = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('en-PH', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const monthYear = new Intl.DateTimeFormat('en-PH', { month: '2-digit', year: '2-digit' })

export const formatMoney = (value: number) => money.format(value)

export const formatAmount = (value: number) => amount.format(value)

export const formatPeso = (value: number) => currency.format(value)

export const formatWhole = (value: number) => whole.format(value)

export const formatCompact = (value: number) => compact.format(value)

export const formatDateTime = (date: Date) => dateTime.format(date)

export const formatMonthYear = (date: Date) => monthYear.format(date)

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
