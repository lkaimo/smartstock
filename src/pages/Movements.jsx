import { useMemo, useState } from 'react'
import { StatusChip } from '../components.jsx'
import { fmtDateTime, int } from '../lib/format.js'

// Stock movement history is derived from sale items: completed sales take stock out of inventory.
export default function Movements({ sales, items, productsById }) {
  const [product, setProduct] = useState('all')
  const [status, setStatus] = useState('completed')

  const saleById = useMemo(() => new Map(sales.map((s) => [s.id, s])), [sales])
  const rows = useMemo(() => items
    .map((it) => ({ it, sale: saleById.get(it.sale_id) }))
    .filter((r) => r.sale && (product === 'all' || r.it.product_id === product) && (status === 'all' || r.sale.status === status))
    .sort((a, b) => (a.sale.sale_date < b.sale.sale_date ? 1 : -1))
    .slice(0, 300), [items, saleById, product, status])

  const products = [...productsById.values()].sort((a, b) => a.name.localeCompare(b.name))
  const out = rows.reduce((t, r) => t + r.it.quantity, 0)

  return (
    <>
      <div className="page-head">
        <div><h1>Stock movements</h1><p>Units that left inventory through sales, newest first (showing up to 300 lines).</p></div>
      </div>
      <div className="filters">
        <select className="select" aria-label="Product" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="all">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select" aria-label="Sale status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="completed">Completed sales</option>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <span className="chip mute num">{int(out)} units across {rows.length} lines</span>
      </div>
      <section className="panel"><div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Order</th><th>Sale status</th><th className="r">Change</th></tr></thead>
          <tbody>
            {rows.map(({ it, sale }) => (
              <tr key={it.id}>
                <td>{fmtDateTime(sale.sale_date)}</td>
                <td>{productsById.get(it.product_id)?.name || 'Removed product'}</td>
                <td className="num">{sale.order_number}</td>
                <td><StatusChip status={sale.status} /></td>
                <td className="r num" style={{ color: sale.status === 'completed' ? 'var(--bad)' : 'var(--ink-3)' }}>−{it.quantity}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty">No movements for this filter.</td></tr>}
          </tbody>
        </table>
      </div></section>
    </>
  )
}
