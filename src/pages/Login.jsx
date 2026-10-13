import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function Login() {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg({ err: true, text: error.message })
    else if (mode === 'up' && !data.session) setMsg({ text: 'Account created. Check your email to confirm it, then sign in.' })
  }

  return (
    <div className="auth">
      <form className="panel auth-card" onSubmit={submit}>
        <h1>SmartStock</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>Sign in to manage stock, record sales and track performance.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <div className={`notice${msg.err ? ' err' : ''}`} style={{ margin: 0 }}>{msg.text}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'Create an account' : 'I already have an account'}
        </button>
      </form>
    </div>
  )
}
