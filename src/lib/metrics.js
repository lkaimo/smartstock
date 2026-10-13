import { addDays, dayKey, diffDays, fmtKey } from './format.js'

export const PRESETS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

export function presetRange(id, today, allMin) {
  switch (id) {
    case '7d': return { from: addDays(today, -6), to: today }
    case '30d': return { from: addDays(today, -29), to: today }
    case '90d': return { from: addDays(today, -89), to: today }
    case 'ytd': return { from: `${today.slice(0, 4)}-01-01`, to: today }
    case 'all': return { from: allMin || addDays(today, -365), to: today }
    default: return null
  }
}

// Revenue counts completed sales only. Gross profit = net sales (subtotal - discount) - cost of goods.
export function summarize(sales, itemsBySale, from, to) {
  const rows = sales.filter((s) => {
    const k = dayKey(s.sale_date)
    return k >= from && k <= to
  })
  const done = rows.filter((s) => s.status === 'completed')
  let revenue = 0, cogs = 0, net = 0, units = 0
  for (const s of done) {
    revenue += Number(s.total_amount)
    net += Number(s.subtotal) - Number(s.discount)
    for (const it of itemsBySale.get(s.id) || []) {
      cogs += it.quantity * Number(it.unit_cost)
      units += it.quantity
    }
  }
  const byStatus = { completed: 0, pending: 0, cancelled: 0, refunded: 0 }
  rows.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1 })
  return {
    rows, done, revenue, units, byStatus,
    orders: done.length,
    profit: net - cogs,
    aov: done.length ? revenue / done.length : 0,
  }
}

export function delta(cur, prev) {
  if (!prev) return null
  return (cur - prev) / prev
}

export function previousRange(from, to) {
  const n = diffDays(from, to) + 1
  const pTo = addDays(from, -1)
  return { from: addDays(pTo, -(n - 1)), to: pTo }
}

function bucketOf(key, grain) {
  if (grain === 'day') return key
  if (grain === 'month') return key.slice(0, 7) + '-01'
  const d = new Date(`${key}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday start
  return addDays(key, -dow)
}

export function trendSeries(done, itemsBySale, from, to) {
  const span = diffDays(from, to) + 1
  const grain = span <= 45 ? 'day' : span <= 150 ? 'week' : 'month'
  const map = new Map()
  // pre-fill empty buckets so gaps show as zero
  let k = bucketOf(from, grain)
  while (k <= to) {
    map.set(k, { key: k, revenue: 0, orders: 0 })
    k = grain === 'day' ? addDays(k, 1)
      : grain === 'week' ? addDays(k, 7)
      : (() => { const d = new Date(`${k}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 10) })()
  }
  for (const s of done) {
    const b = map.get(bucketOf(dayKey(s.sale_date), grain))
    if (b) { b.revenue += Number(s.total_amount); b.orders += 1 }
  }
  const label = (key) => grain === 'month' ? fmtKey(key, { month: 'short', year: '2-digit' }) : fmtKey(key)
  return {
    grain,
    data: [...map.values()].map((b) => ({ ...b, label: label(b.key) })),
  }
}

export function topProducts(done, itemsBySale, productsById, limit = 6) {
  const m = new Map()
  for (const s of done) {
    for (const it of itemsBySale.get(s.id) || []) {
      const p = productsById.get(it.product_id)
      const cur = m.get(it.product_id) || { id: it.product_id, name: p?.name || 'Removed product', category: p?.category, units: 0, revenue: 0 }
      cur.units += it.quantity
      cur.revenue += Number(it.line_total ?? it.quantity * it.unit_price)
      m.set(it.product_id, cur)
    }
  }
  return [...m.values()].sort((a, b) => b.units - a.units).slice(0, limit)
}

export function groupBy(list, fn) {
  const m = new Map()
  for (const x of list) {
    const k = fn(x)
    m.set(k, [...(m.get(k) || []), x])
  }
  return m
}

export const stockState = (p) =>
  p.stock_quantity === 0 ? 'out' : p.stock_quantity <= p.reorder_level ? 'low' : 'ok'
