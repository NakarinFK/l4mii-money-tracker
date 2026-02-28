import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export default function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage('')

    const payload = {
      email: email.trim(),
      password,
    }

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp(payload)
        : await supabase.auth.signInWithPassword(payload)

    if (result.error) {
      setMessage(result.error.message)
      setLoading(false)
      return
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Check your email to confirm your account before signing in.')
    } else {
      setMessage('Signed in successfully. Redirecting…')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Money Tracker Login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to sync your data across devices.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-200 focus:ring"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'signup' ? 'signin' : 'signup'))}
          className="mt-4 text-sm text-slate-600 underline underline-offset-4"
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : "Don't have an account? Create one"}
        </button>

        {message ? <p className="mt-4 text-xs text-slate-500">{message}</p> : null}
      </div>
    </div>
  )
}
