import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Kpi, StatusChip, StockChip } from '../components.jsx'
import { dayKey, fmtDateTime, int, money, moneyExact, todayKey } from '../lib/format.js'
import { PRESETS, delta, groupBy, presetRange, previousRange, stockState, summarize, topProducts, trendSeries } from '../lib/metrics.js'

export default function Dashboard({ sales, products, itemsBySale, productsById, customersById, go }) {
  const today = todayKey()
  const allMin = useMemo(() => sales.reduce((m, s) => { const k = dayKey(s.sale_date); return !m || k < m ? k : m }, null), [sales])
  const [preset, setPreset] = useState('ytd')
  const [custom, setCustom] = useState({ from: presetRange('30d', today).from, to: today })
  const range = preset === 'custom' ? custom : presetRange(preset, today, allMin)

  const cur = useMemo(() => summarize(sales, itemsBySale, range.from, range.to), [sales, itemsBySale, range.from, range.to])
  const prev = useMemo(() => {
    if (preset === 'all') return null
    const p = previousRange(range.from, range.to)
    return summarize(sales, itemsBySale, p.from, p.to)
  }, [sales, itemsBySale, range.from, range.to, preset])
  const trend = useMemo(() => trendSeries(cur.done, itemsBySale, range.from, range.to), [cur, itemsBySale, range])
  const top = useMemo(() => topProducts(cur.done, itemsBySale, productsById), [cur, itemsBySale, productsById])

  const active = products.filter((p) => p.is_active)
  const attention = active.filter((p) => stockState(p) !== 'ok').sort((a, b) => a.stock_quantity - b.stock_quantity)
  const stockValue = active.reduce((t, p) => t + p.stock_quantity * Number(p.unit_cost), 0)

  const byCat = useMemo(() => {
    const m = new Map()
    for (const s of cur.done) for (const it of itemsBySale.get(s.id) || []) {
      const c = productsById.get(it.product_id)?.category || 'Other'
      m.set(c, (m.get(c) || 0) + Number(it.line_total ?? it.quantity * it.unit_price))
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [cur, itemsBySale, productsById])
  const byPay = useMemo(() => {
    const g = groupBy(cur.done, (s) => s.payment_method)
    return [...g.entries()].map(([k, v]) => [k, v.reduce((t, s) => t + Number(s.total_amount), 0)]).sort((a, b) => b[1] - a[1])
  }, [cur])

  const recent = cur.rows.slice(0, 6)
  const maxCat = byCat[0]?.[1] || 1
  const maxPay = byPay[0]?.[1] || 1
  const maxTop = top[0]?.units || 1

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Business overview</h1>
          <p>Completed sales from {range.from} to {range.to}. Refunded, cancelled and pending orders are not counted as revenue.</p>
        </div>
      </div>

      <div className="filters">
        <div className="seg" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <button key={p.id} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="dates">
            <input className="input" type="date" aria-label="From" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} />
            to
            <input className="input" type="date" aria-label="To" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} />
          </div>
        )}
      </div>

      <div className="grid kpis">
        <Kpi label="Revenue" value={money(cur.revenue)} change={prev ? delta(cur.revenue, prev.revenue) : null} hint="All completed sales" />
        <Kpi label="Gross profit" value={money(cur.profit)} change={prev ? delta(cur.profit, prev.profit) : null} hint={cur.revenue ? `${((cur.profit / cur.revenue) * 100).toFixed(0)}% of revenue` : ' '} />
        <Kpi label="Orders" value={int(cur.orders)} change={prev ? delta(cur.orders, prev.orders) : null} />
        <Kpi label="Avg order value" value={money(cur.aov)} change={prev ? delta(cur.aov, prev.aov) : null} />
        <Kpi label="Units sold" value={int(cur.units)} change={prev ? delta(cur.units, prev.units) : null} />
        <Kpi label="Stock value (at cost)" value={money(stockValue)} hint={`${attention.length} of ${active.length} products need attention`} />
      </div>

      <div className="grid cols-2">
        <section className="panel">
          <h2>Revenue</h2>
          <div className="sub">Per {trend.grain}, completed sales</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trend.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24} />
                <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }}
                  formatter={(v, n) => [moneyExact(v), 'Revenue']}
                  labelFormatter={(l) => l}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev)" dot={trend.data.length <= 40 ? { r: 2.5, fill: 'var(--accent)' } : false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h2>Fast-selling products</h2>
          <div className="sub">By units sold in this period</div>
          {top.length === 0 ? <div className="empty">No completed sales in this range.</div> : top.map((p) => (
            <div className="bar-row" key={p.id}>
              <span className="name">{p.name}</span>
              <span className="num">{int(p.units)} units</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.units / maxTop) * 100}%` }} /></div>
            </div>
          ))}
        </section>
      </div>

      <div className="grid cols-3">
        <section className="panel">
          <h2>Revenue by category</h2>
          <div className="sub">Completed sales</div>
          {byCat.length === 0 ? <div className="empty">No data.</div> : byCat.map(([c, v]) => (
            <div className="bar-row" key={c}>
              <span className="name">{c}</span><span className="num">{money(v)}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(v / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Payment methods</h2>
          <div className="sub">Share of revenue</div>
          {byPay.length === 0 ? <div className="empty">No data.</div> : byPay.map(([c, v]) => (
            <div className="bar-row" key={c}>
              <span className="name">{c}</span><span className="num">{money(v)}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(v / maxPay) * 100}%` }} /></div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Order status</h2>
          <div className="sub">All orders in this period</div>
          {Object.entries(cur.byStatus).map(([s, n]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <StatusChip status={s} /><span className="num">{n}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 0 }}>
        <section className="panel">
          <h2>Recent orders</h2>
          <div className="sub">Latest in this period</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="r">Total</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{s.order_number}</td>
                    <td>{customersById.get(s.customer_id)?.full_name || 'Walk-in'}</td>
                    <td>{fmtDateTime(s.sale_date)}</td>
                    <td><StatusChip status={s.status} /></td>
                    <td className="r num">{moneyExact(s.total_amount)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan="5" className="empty">No orders in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Restock soon</h2>
          <div className="sub">At or below reorder level</div>
          {attention.length === 0 ? <div className="empty">Everything is above its reorder level.</div> : attention.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{p.supplier}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StockChip state={stockState(p)} />
                <div className="num" style={{ fontSize: 12 }}>{p.stock_quantity} / {p.reorder_level}</div>
              </div>
            </div>
          ))}
          <button className="btn sm" style={{ marginTop: 12 }} onClick={() => go('products')}>Open products</button>
        </section>
      </div>
    </>
  )
}
