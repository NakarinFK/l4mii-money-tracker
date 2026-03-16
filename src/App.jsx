import { useEffect, useReducer, useMemo, useRef, useState } from 'react'
import Dashboard from './components/Dashboard.jsx'
import AppLayout from './components/AppLayout.jsx'
import { financeReducer, initFinanceState } from './reducers/financeReducer.js'
import { useDerivedData } from './hooks/useDerivedData.js'
import { getCurrentCycleId, buildCycleOptions } from './utils/cycle.js'
import { navItems } from './data/mockData.js'
import { persistenceAdapter } from './persistence/index.js'
import { validateFile, validateFileContent } from './utils/fileValidation.js'
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

  const cycleOptions = useMemo(() => {
    const normalizeCycleId = (value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed || null
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
      }
      return null
    }

    const options = new Set(buildCycleOptions(activeCycleId, 6))
    for (const item of [
      ...(state.planningCosts || []),
      ...(state.transactions || []),
      ...(state.budgets || []),
    ]) {
      const normalized = normalizeCycleId(item?.cycleId)
      if (normalized) options.add(normalized)
    }
    return Array.from(options).sort((a, b) => String(b).localeCompare(String(a)))
  }, [activeCycleId, state.planningCosts, state.transactions, state.budgets])

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

  const fileInputRef = useRef(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    try {
      const fileValidation = validateFile(file, {
        allowedTypes: ['application/json'],
        maxSize: 10 * 1024 * 1024,
      })
      if (!fileValidation.isValid) {
        alert(`Invalid file: ${fileValidation.errors.join(', ')}`)
        return
      }
      const contentValidation = await validateFileContent(fileValidation.sanitizedFile)
      if (!contentValidation.isValid) {
        alert(`File content validation failed: ${contentValidation.issues.join(', ')}`)
        return
      }
      const text = await fileValidation.sanitizedFile.text()
      const parsed = JSON.parse(text)
      if (
        !parsed ||
        typeof parsed.version !== 'number' ||
        parsed.app !== 'finance-dashboard' ||
        !('state' in parsed)
      ) {
        alert('Invalid import file. Please select a valid export.')
        return
      }
      await persistenceAdapter.backup()
      await persistenceAdapter.importData(parsed)
      window.location.reload()
    } catch (error) {
      console.error('Import failed', error)
      alert('Import failed. Please try again.')
    }
  }

  const handleExport = async () => {
    try {
      const payload = await persistenceAdapter.exportData()
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'l4mii-money-tracker-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed', error)
      window.alert('Export failed. Please try again.')
    }
  }

  return (
    <AppLayout
      selectedCycleId={selectedCycleId}
      onSelectCycle={setSelectedCycleId}
      cycleOptions={cycleOptions}
      activeCycleId={activeCycleId}
      onImportClick={handleImportClick}
      onExport={handleExport}
      userEmail={userEmail}
      onSignOut={isSupabaseConfigured ? handleSignOut : null}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />
      <Dashboard
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
    </AppLayout>
  )
}
