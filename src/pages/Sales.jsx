import { Fragment, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { Field, Modal, StatusChip, canEditCatalog, canSell } from '../components.jsx'
import { dayKey, fmtDateTime, int, moneyExact } from '../lib/format.js'

const PAY = ['Cash', 'Credit Card', 'GCash', 'Bank Transfer']
const STATUSES = ['completed', 'pending', 'cancelled', 'refunded']

export default function Sales({ sales, customers, products, itemsBySale, productsById, customersById, role, reload }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState(null)

  const list = useMemo(() => sales.filter((s) =>
    (status === 'all' || s.status === status) &&
    `${s.order_number} ${customersById.get(s.customer_id)?.full_name || 'walk-in'}`.toLowerCase().includes(q.toLowerCase())), [sales, status, q, customersById])

  async function changeStatus(id, next) {
    setErr(null)
    const { error } = await supabase.rpc('inventory_set_sale_status', { p_sale: id, p_status: next })
    if (error) setErr(error.message); else reload()
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Sales</h1><p>Every order. Recording a sale deducts stock automatically.</p></div>
        {canSell(role) && <button className="btn primary" onClick={() => setCreating(true)}>Record sale</button>}
      </div>
      {err && <div className="notice err">{err}</div>}
      <div className="filters">
        <input className="input" placeholder="Search order or customer" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th className="r">Total</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <Fragment key={s.id}>
                  <tr className="clickable" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <td className="num">{s.order_number}</td>
                    <td>{fmtDateTime(s.sale_date)}</td>
                    <td>{customersById.get(s.customer_id)?.full_name || 'Walk-in'}</td>
                    <td>{s.payment_method}</td>
                    <td><StatusChip status={s.status} /></td>
                    <td className="r num">{moneyExact(s.total_amount)}</td>
                  </tr>
                  {open === s.id && (
                    <tr className="sub-row"><td colSpan="6">
                      <table>
                        <thead><tr><th>Product</th><th className="r">Qty</th><th className="r">Unit price</th><th className="r">Line total</th></tr></thead>
                        <tbody>
                          {(itemsBySale.get(s.id) || []).map((it) => (
                            <tr key={it.id}>
                              <td>{productsById.get(it.product_id)?.name || 'Removed product'}</td>
                              <td className="r num">{it.quantity}</td>
                              <td className="r num">{moneyExact(it.unit_price)}</td>
                              <td className="r num">{moneyExact(it.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
                        <span style={{ color: 'var(--ink-2)' }}>Subtotal {moneyExact(s.subtotal)} · Discount {moneyExact(s.discount)} · Tax {moneyExact(s.tax)}{s.notes ? ` · ${s.notes}` : ''}</span>
                        {canEditCatalog(role) && (
                          <label>Status{' '}
                            <select className="select" value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)}>
                              {STATUSES.map((x) => <option key={x}>{x}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
              {list.length === 0 && <tr><td colSpan="6" className="empty">No orders match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {creating && <SaleForm customers={customers} products={products.filter((p) => p.is_active)} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}
    </>
  )
}

function SaleForm({ customers, products, onClose, onSaved }) {
  const [customer, setCustomer] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const byId = new Map(products.map((p) => [p.id, p]))

  const subtotal = lines.reduce((t, l) => t + (byId.get(l.product_id)?.unit_price || 0) * (Number(l.quantity) || 0), 0)
  const total = Math.max(0, subtotal - (Number(discount) || 0))
  const setLine = (i, patch) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function submit(e) {
    e.preventDefault()
    const items = lines.filter((l) => l.product_id).map((l) => ({ product_id: l.product_id, quantity: parseInt(l.quantity, 10) }))
    if (!items.length) return setErr('Choose at least one product.')
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('inventory_record_sale', {
      p_customer: customer || null, p_payment: payment, p_discount: Number(discount) || 0, p_notes: notes || null, p_items: items,
    })
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }

  return (
    <Modal title="Record sale" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field id="cust" label="Customer">
          <select id="cust" className="select" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            <option value="">Walk-in</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </Field>
        <Field id="pay" label="Payment method">
          <select id="pay" className="select" value={payment} onChange={(e) => setPayment(e.target.value)}>{PAY.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
        {lines.map((l, i) => {
          const p = byId.get(l.product_id)
          return (
            <div className="cart-line" key={i}>
              <select className="select" aria-label={`Product ${i + 1}`} value={l.product_id} onChange={(e) => setLine(i, { product_id: e.target.value })}>
                <option value="">Select product…</option>
                {products.map((x) => <option key={x.id} value={x.id} disabled={x.stock_quantity === 0}>{x.name} — {moneyExact(x.unit_price)} ({x.stock_quantity} in stock)</option>)}
              </select>
              <input className="input" type="number" min="1" max={p?.stock_quantity || undefined} aria-label={`Quantity ${i + 1}`} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <button type="button" className="btn sm" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Remove</button>
            </div>
          )
        })}
        <div className="field full"><button type="button" className="btn sm" style={{ justifySelf: 'start', width: 'fit-content' }} onClick={() => setLines([...lines, { product_id: '', quantity: 1 }])}>Add another product</button></div>
        <Field id="disc" label="Discount (₱)"><input id="disc" className="input" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
        <Field id="notes" label="Notes"><input id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="totals">
          <span style={{ color: 'var(--ink-2)' }}>Subtotal <span className="num">{moneyExact(subtotal)}</span></span>
          <strong style={{ fontSize: 18 }}>Total <span className="num">{moneyExact(total)}</span></strong>
        </div>
        {err && <div className="notice err field full" style={{ margin: 0 }}>{err}</div>}
        <div className="actions field full" style={{ flexDirection: 'row' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Recording…' : 'Record sale'}</button>
        </div>
      </form>
    </Modal>
  )
}
