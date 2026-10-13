import { useEffect, useState } from 'react'
import { supabase, configMissing } from './supabase.js'
import { useStore } from './lib/useStore.js'
import { stockState } from './lib/metrics.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import Sales from './pages/Sales.jsx'
import Customers from './pages/Customers.jsx'
import Movements from './pages/Movements.jsx'

const PAGES = [
  ['dashboard', 'Dashboard'],
  ['products', 'Products & suppliers'],
  ['sales', 'Sales'],
  ['movements', 'Stock movements'],
  ['customers', 'Customers'],
]

function useRole(session) {
  const [role, setRole] = useState(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!session) return
    supabase.from('inventory_user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setRole('viewer'); setMissing(true) } else { setRole(data.role); setMissing(false) }
      })
  }, [session])
  return { role, missing }
}

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (configMissing) {
    return (
      <div className="auth">
        <div className="panel auth-card">
          <h1>SmartStock</h1>
          <div className="notice err" style={{ margin: 0 }}>
            Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your hosting environment variables, then redeploy.
          </div>
        </div>
      </div>
    )
  }
  if (session === undefined) return null
  if (!session) return <Login />
  return <Shell session={session} />
}

function Shell({ session }) {
  const [page, setPage] = useState(() => window.location.hash.slice(1) || 'dashboard')
  const store = useStore()
  const { role, missing } = useRole(session)

  useEffect(() => { window.location.hash = page }, [page])
  const lowCount = store.products.filter((p) => p.is_active && stockState(p) !== 'ok').length
  const ctx = { ...store, role: role || 'viewer', go: setPage }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">Smart<span>Stock</span></div>
        <nav className="nav" aria-label="Main">
          {PAGES.map(([id, label]) => (
            <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>
              {label}
              {id === 'products' && lowCount > 0 && <span className="badge">{lowCount}</span>}
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <div>{session.user.email}<br /><span style={{ opacity: .7 }}>Role: {role || '…'}</span></div>
          <button className="btn sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {missing && (
          <div className="notice">
            Roles are not set up yet, so this account is read-only. Run <code>supabase/migration.sql</code> in the Supabase SQL editor to enable roles and editing.
          </div>
        )}
        {store.error && <div className="notice err">Could not load data: {store.error}</div>}
        {store.loading ? <div className="empty">Loading…</div> : (
          <>
            {page === 'dashboard' && <Dashboard {...ctx} />}
            {page === 'products' && <Products {...ctx} />}
            {page === 'sales' && <Sales {...ctx} />}
            {page === 'movements' && <Movements {...ctx} />}
            {page === 'customers' && <Customers {...ctx} />}
          </>
        )}
      </main>
    </div>
  )
}
