import { useEffect, useReducer, useMemo, useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import { financeReducer, initFinanceState } from './reducers/financeReducer.js'
import { useDerivedData } from './hooks/useDerivedData.js'
import { getCurrentCycleId } from './utils/cycle.js'
import { navItems } from './data/mockData.js'
import { persistenceAdapter } from './persistence/index.js'
import AuthPanel from './components/AuthPanel.jsx'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js'

export default function App({ initialState, initialLayoutState }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [selectedCycleId, setSelectedCycleId] = useState('current')

  const [state, dispatch] = useReducer(
    financeReducer,
    initialState,
    initFinanceState
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    let mounted = true

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted) {
          setSession(data.session ?? null)
        }
      } finally {
        if (mounted) {
          setAuthReady(true)
        }
      }
    }

    void initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        window.location.reload()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void persistenceAdapter.saveState(state)
  }, [state])

  const activeCycleId = useMemo(() => getCurrentCycleId(), [])
  const derived = useDerivedData(state, activeCycleId, selectedCycleId)

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-sm text-slate-500">Initializing authentication…</p>
      </div>
    )
  }

  if (isSupabaseConfigured && !session) {
    return <AuthPanel />
  }

  const userEmail = session?.user?.email || null

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isSupabaseConfigured && userEmail ? (
        <div className="mx-auto flex max-w-[1920px] items-center justify-end gap-3 px-6 pt-4">
          <span className="text-xs text-slate-500">Signed in as {userEmail}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      ) : null}
      <Dashboard
        navItems={navItems}
        kpis={derived.kpis}
        accounts={derived.accounts}
        categories={state.categories || []}
        budgets={state.budgets || []}
        activeCycleId={activeCycleId}
        planningCosts={state.planningCosts || []}
        cashFlow={derived.cashFlow}
        transactions={derived.transactions}
        formAccounts={state.accounts || []}
        rawTransactions={state.transactions || []}
        selectedCycleId={selectedCycleId}
        onSelectCycle={setSelectedCycleId}
        dispatch={dispatch}
        initialLayoutState={initialLayoutState}
      />
    </div>
  )
}
