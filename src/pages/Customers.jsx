import { useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { Field, Modal, canSell } from '../components.jsx'
import { fmtDate, int, money } from '../lib/format.js'

export default function Customers({ customers, sales, role, reload }) {
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    const agg = new Map()
    for (const s of sales) {
      if (s.status !== 'completed' || !s.customer_id) continue
      const a = agg.get(s.customer_id) || { orders: 0, spend: 0, last: null }
      a.orders += 1; a.spend += Number(s.total_amount)
      if (!a.last || s.sale_date > a.last) a.last = s.sale_date
      agg.set(s.customer_id, a)
    }
    return customers
      .map((c) => ({ ...c, ...(agg.get(c.id) || { orders: 0, spend: 0, last: null }) }))
      .filter((c) => `${c.full_name} ${c.email || ''} ${c.city} ${c.customer_code}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.spend - a.spend)
  }, [customers, sales, q])

  return (
    <>
      <div className="page-head">
        <div><h1>Customers</h1><p>Lifetime spend counts completed orders only.</p></div>
        {canSell(role) && <button className="btn primary" onClick={() => setAdding(true)}>Add customer</button>}
      </div>
      <div className="filters"><input className="input" placeholder="Search customers" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <section className="panel"><div className="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Contact</th><th>City</th><th className="r">Orders</th><th className="r">Lifetime spend</th><th>Last order</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="num">{c.customer_code}</td><td>{c.full_name}</td>
                <td>{c.email || '–'}<div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{c.phone}</div></td>
                <td>{c.city}</td><td className="r num">{int(c.orders)}</td><td className="r num">{money(c.spend)}</td>
                <td>{c.last ? fmtDate(c.last) : '–'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7" className="empty">No customers match.</td></tr>}
          </tbody>
        </table>
      </div></section>
      {adding && <CustomerForm count={customers.length} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </>
  )
}

function CustomerForm({ count, onClose, onSaved }) {
  const [f, setF] = useState({ full_name: '', email: '', phone: '', city: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr(null)
    const { error } = await supabase.from('inventory_customers').insert({
      customer_code: `CUST-${String(count + 1).padStart(4, '0')}-${Math.floor(Math.random() * 90 + 10)}`,
      full_name: f.full_name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null, city: f.city.trim(),
    })
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <Field id="cn" label="Full name" full><input id="cn" className="input" required value={f.full_name} onChange={set('full_name')} /></Field>
        <Field id="ce" label="Email"><input id="ce" className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field id="cp" label="Phone"><input id="cp" className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field id="cc" label="City" full><input id="cc" className="input" required value={f.city} onChange={set('city')} /></Field>
        {err && <div className="notice err field full" style={{ margin: 0 }}>{err}</div>}
        <div className="actions field full" style={{ flexDirection: 'row' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>
        </div>
      </form>
    </Modal>
  )
}
