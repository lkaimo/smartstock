import { useEffect } from 'react'

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, id, full, children }) {
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

export function Kpi({ label, value, change, hint }) {
  const cls = change == null ? 'flat' : change > 0.0005 ? 'up' : change < -0.0005 ? 'down' : 'flat'
  const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '–'
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {change != null ? (
        <div className={`delta ${cls}`}>{arrow} {Math.abs(change * 100).toFixed(1)}% vs prior period</div>
      ) : (
        <div className="delta flat">{hint || ' '}</div>
      )}
    </div>
  )
}

const STATUS = { completed: 'good', pending: 'warn', cancelled: 'mute', refunded: 'bad' }
export const StatusChip = ({ status }) => <span className={`chip ${STATUS[status] || 'mute'}`}>{status}</span>

export function StockChip({ state }) {
  const map = { ok: ['good', 'In stock'], low: ['warn', 'Low'], out: ['bad', 'Out'] }
  const [cls, text] = map[state]
  return <span className={`chip ${cls}`}>{text}</span>
}

export const canEditCatalog = (role) => role === 'admin' || role === 'manager'
export const canSell = (role) => role === 'admin' || role === 'manager' || role === 'staff'
