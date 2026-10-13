const TZ = 'Asia/Manila'

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
const pesoExact = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-PH')

export const money = (v) => peso.format(Number(v || 0))
export const moneyExact = (v) => pesoExact.format(Number(v || 0))
export const int = (v) => num.format(Number(v || 0))
export const pct = (v) => `${(Number(v || 0) * 100).toFixed(1)}%`

// yyyy-mm-dd in Manila time
export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })
export const todayKey = () => dayKey(new Date())

export const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export const diffDays = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000)

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export const fmtKey = (key, opts = { month: 'short', day: 'numeric' }) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'UTC', ...opts })
