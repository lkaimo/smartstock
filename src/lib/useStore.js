import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'

// Loads the four inventory tables and builds lookups used across pages.
export function useStore() {
  const [state, setState] = useState({ products: [], customers: [], sales: [], items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const q = (t, order) => supabase.from(t).select('*').order(order.col, { ascending: order.asc }).limit(5000)
    const [p, c, s, i] = await Promise.all([
      q('inventory_products', { col: 'name', asc: true }),
      q('inventory_customers', { col: 'full_name', asc: true }),
      q('inventory_sales', { col: 'sale_date', asc: false }),
      supabase.from('inventory_sale_items').select('*').limit(20000),
    ])
    const err = p.error || c.error || s.error || i.error
    if (err) setError(err.message)
    else setState({ products: p.data, customers: c.data, sales: s.data, items: i.data })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const derived = useMemo(() => {
    const itemsBySale = new Map()
    for (const it of state.items) {
      if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, [])
      itemsBySale.get(it.sale_id).push(it)
    }
    return {
      itemsBySale,
      productsById: new Map(state.products.map((p) => [p.id, p])),
      customersById: new Map(state.customers.map((c) => [c.id, c])),
    }
  }, [state])

  return { ...state, ...derived, loading, error, reload: load }
}
