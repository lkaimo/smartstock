import { useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { Field, Modal, StockChip, canEditCatalog } from '../components.jsx'
import { int, money, moneyExact } from '../lib/format.js'
import { groupBy, stockState } from '../lib/metrics.js'

const EMPTY = { sku: '', name: '', category: '', supplier: '', unit_cost: '', unit_price: '', stock_quantity: 0, reorder_level: 5, is_active: true }

export default function Products({ products, role, reload }) {
  const [tab, setTab] = useState('products')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [stock, setStock] = useState('all')
  const [editing, setEditing] = useState(null)
  const canEdit = canEditCatalog(role)

  const cats = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products])
  const list = products.filter((p) =>
    (cat === 'all' || p.category === cat) &&
    (stock === 'all' || stockState(p) === stock || (stock === 'attention' && stockState(p) !== 'ok')) &&
    `${p.name} ${p.sku} ${p.supplier}`.toLowerCase().includes(q.toLowerCase()))

  const suppliers = useMemo(() => {
    const g = groupBy(products, (p) => p.supplier || 'Unassigned')
    return [...g.entries()].map(([name, ps]) => ({
      name, count: ps.length,
      value: ps.reduce((t, p) => t + p.stock_quantity * Number(p.unit_cost), 0),
      low: ps.filter((p) => stockState(p) !== 'ok').length,
      cats: [...new Set(ps.map((p) => p.category))].join(', '),
    })).sort((a, b) => b.value - a.value)
  }, [products])

  return (
    <>
      <div className="page-head">
        <div><h1>Products & suppliers</h1><p>Catalog, stock levels and who supplies what.</p></div>
        {canEdit && <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>Add product</button>}
      </div>

      <div className="filters">
        <div className="seg">
          <button aria-pressed={tab === 'products'} onClick={() => setTab('products')}>Products</button>
          <button aria-pressed={tab === 'suppliers'} onClick={() => setTab('suppliers')}>Suppliers</button>
        </div>
        {tab === 'products' && (
          <>
            <input className="input" placeholder="Search name, SKU or supplier" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="all">All categories</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="select" aria-label="Stock level" value={stock} onChange={(e) => setStock(e.target.value)}>
              <option value="all">Any stock level</option>
              <option value="attention">Needs attention</option>
              <option value="low">Low</option>
              <option value="out">Out of stock</option>
              <option value="ok">In stock</option>
            </select>
          </>
        )}
      </div>

      <section className="panel">
        <div className="table-wrap">
          {tab === 'products' ? (
            <table>
              <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Supplier</th><th className="r">Cost</th><th className="r">Price</th><th className="r">Margin</th><th className="r">Stock</th><th>Level</th>{canEdit && <th />}</tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} style={p.is_active ? null : { opacity: 0.55 }}>
                    <td className="num">{p.sku}</td>
                    <td>{p.name}{!p.is_active && <span className="chip mute" style={{ marginLeft: 6 }}>inactive</span>}</td>
                    <td>{p.category}</td><td>{p.supplier}</td>
                    <td className="r num">{moneyExact(p.unit_cost)}</td>
                    <td className="r num">{moneyExact(p.unit_price)}</td>
                    <td className="r num">{p.unit_price > 0 ? `${(((p.unit_price - p.unit_cost) / p.unit_price) * 100).toFixed(0)}%` : '–'}</td>
                    <td className="r num">{int(p.stock_quantity)} <span style={{ color: 'var(--ink-3)' }}>/ {p.reorder_level}</span></td>
                    <td><StockChip state={stockState(p)} /></td>
                    {canEdit && <td><button className="btn sm" onClick={() => setEditing({ ...p })}>Edit</button></td>}
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan="10" className="empty">No products match.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>Supplier</th><th>Categories</th><th className="r">Products</th><th className="r">Stock value</th><th className="r">Need restock</th></tr></thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td><td>{s.cats}</td>
                    <td className="r num">{s.count}</td><td className="r num">{money(s.value)}</td>
                    <td className="r">{s.low ? <span className="chip warn">{s.low}</span> : <span className="chip good">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {editing && <ProductForm initial={editing} suppliers={suppliers.map((s) => s.name)} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function ProductForm({ initial, suppliers, cats, onClose, onSaved }) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function save(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    const row = {
      sku: f.sku.trim(), name: f.name.trim(), category: f.category.trim(), supplier: f.supplier.trim(),
      unit_cost: Number(f.unit_cost), unit_price: Number(f.unit_price),
      stock_quantity: parseInt(f.stock_quantity, 10), reorder_level: parseInt(f.reorder_level, 10), is_active: f.is_active,
    }
    const { error } = f.id
      ? await supabase.from('inventory_products').update(row).eq('id', f.id)
      : await supabase.from('inventory_products').insert(row)
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }

  return (
    <Modal title={f.id ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={save} className="form">
        <Field id="sku" label="SKU"><input id="sku" className="input" required value={f.sku} onChange={set('sku')} /></Field>
        <Field id="pname" label="Name"><input id="pname" className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field id="cat" label="Category">
          <input id="cat" className="input" required list="cats" value={f.category} onChange={set('category')} />
          <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field id="sup" label="Supplier">
          <input id="sup" className="input" required list="sups" value={f.supplier} onChange={set('supplier')} />
          <datalist id="sups">{suppliers.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field id="cost" label="Unit cost (₱)"><input id="cost" className="input" type="number" min="0" step="0.01" required value={f.unit_cost} onChange={set('unit_cost')} /></Field>
        <Field id="price" label="Unit price (₱)"><input id="price" className="input" type="number" min="0" step="0.01" required value={f.unit_price} onChange={set('unit_price')} /></Field>
        <Field id="qty" label="Stock on hand"><input id="qty" className="input" type="number" min="0" step="1" required value={f.stock_quantity} onChange={set('stock_quantity')} /></Field>
        <Field id="rl" label="Reorder level"><input id="rl" className="input" type="number" min="0" step="1" required value={f.reorder_level} onChange={set('reorder_level')} /></Field>
        <Field id="active" label="Active" full>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input id="active" type="checkbox" checked={f.is_active} onChange={set('is_active')} /> Available for sale</label>
        </Field>
        {err && <div className="notice err field full" style={{ margin: 0 }}>{err}</div>}
        <div className="actions field full" style={{ flexDirection: 'row' }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  )
}
