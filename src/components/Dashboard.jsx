import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import KpiGrid from './KpiGrid.jsx'
import { buildTransactionRows } from '../utils/financeSelectors.js'
import {
  persistenceAdapter,
  saveLayoutState,
  loadCoverImage,
  saveCoverImage,
} from '../persistence/index.js'
import FreeGridLayout from '../ui/layout/FreeGridLayout.tsx'
import { DEFAULT_LAYOUT } from '../ui/layout/defaultLayout'
import { layoutReducer, normalizeLayoutState } from '../ui/layout/layoutReducer'
import { validateFile, validateFileContent } from '../utils/fileValidation.js'

export default function Dashboard({
  kpis,
  accounts,
  categories,
  budgets,
  activeCycleId,
  planningCosts,
  cashFlow,
  transactions,
  formAccounts,
  rawTransactions,
  viewMode = 'cycle',
  onToggleViewMode,
  dispatch,
  initialLayoutState,
}) {
  const [editingTransaction, dispatchEdit] = useReducer(editReducer, null)
  const [selectedAccountId, dispatchSelection] = useReducer(
    selectionReducer,
    null
  )
  const [layoutState, layoutDispatch] = useReducer(
    layoutReducer,
    initialLayoutState || DEFAULT_LAYOUT,
    normalizeLayoutState
  )
  const [coverImage, setCoverImage] = useState(null)
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const handleEdit = (id) => {
    const transaction = rawTransactions.find((item) => item.id === id)
    if (!transaction || transaction.type === 'opening') return
    dispatchEdit({ type: 'START', transaction })
  }

  const handleCancelEdit = () => dispatchEdit({ type: 'CLEAR' })

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: { id } })
    if (editingTransaction?.id === id) {
      dispatchEdit({ type: 'CLEAR' })
    }
  }

  const handleSelectAccount = (accountId) =>
    dispatchSelection({ type: 'SELECT', accountId })

  const handleClearSelection = () => dispatchSelection({ type: 'CLEAR' })

  const selectedAccount = formAccounts.find(
    (account) => account.id === selectedAccountId
  )

  const filteredRows = useMemo(() => {
    if (!selectedAccountId) return []
    const filtered = rawTransactions.filter((transaction) => {
      if (transaction.type === 'expense') {
        return transaction.fromAccount === selectedAccountId
      }
      if (transaction.type === 'income') {
        return transaction.toAccount === selectedAccountId
      }
      if (transaction.type === 'opening') {
        return transaction.toAccount === selectedAccountId
      }
      if (transaction.type === 'transfer') {
        return (
          transaction.fromAccount === selectedAccountId ||
          transaction.toAccount === selectedAccountId
        )
      }
      return false
    })
    return buildTransactionRows(filtered, formAccounts, categories)
  }, [rawTransactions, formAccounts, categories, selectedAccountId])

  const visibleTransactions = selectedAccountId ? filteredRows : transactions

  const handleSubmit = (payload) => {
    if (editingTransaction) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { ...payload, id: editingTransaction.id },
      })
      dispatchEdit({ type: 'CLEAR' })
      return
    }
    dispatch({ type: 'ADD_TRANSACTION', payload })
  }

  const handleToggleVisibility = (id) => {
    layoutDispatch({
      type: 'TOGGLE_BLOCK_VISIBILITY',
      payload: { id },
    })
  }

  const handleResetLayout = () => {
    layoutDispatch({ type: 'RESET_LAYOUT' })
  }

  const handleMoveItem = (payload) => {
    layoutDispatch({
      type: 'MOVE_ITEM_TO_CELL',
      payload,
    })
  }

  const handleResizeItem = (payload) => {
    layoutDispatch({
      type: 'RESIZE_ITEM',
      payload,
    })
  }

  const handleToggleCollapse = (id) => {
    layoutDispatch({
      type: 'TOGGLE_COLLAPSE',
      payload: { id },
    })
  }

  const handleExport = async () => {
    try {
      const payload = await persistenceAdapter.exportData()
      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'finance-dashboard-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed', error)
      window.alert('Export failed. Please try again.')
    }
  }

  const blockContext = {
    accounts,
    categories,
    budgets,
    activeCycleId,
    viewMode,
    planningCosts,
    cashFlow,
    transactions,
    formAccounts,
    rawTransactions,
    dispatch,
    selectedAccountId,
    selectedAccountName: selectedAccount?.name || 'Selected Account',
    onSelectAccount: handleSelectAccount,
    onClearSelection: handleClearSelection,
    editingTransaction,
    onSubmitTransaction: handleSubmit,
    onCancelEdit: handleCancelEdit,
    onEditTransaction: handleEdit,
    onDeleteTransaction: handleDelete,
    visibleTransactions,
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    
    try {
      // Validate file type and size
      const fileValidation = validateFile(file, {
        allowedTypes: ['application/json'],
        maxSize: 10 * 1024 * 1024, // 10MB
      })
      
      if (!fileValidation.isValid) {
        alert(`Invalid file: ${fileValidation.errors.join(', ')}`)
        return
      }
      
      // Validate file content
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

  useEffect(() => {
    void saveLayoutState(layoutState)
  }, [layoutState])

  useEffect(() => {
    let cancelled = false
    const loadCover = async () => {
      const stored = await loadCoverImage()
      if (!cancelled) {
        setCoverImage(stored || null)
      }
    }
    void loadCover()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCoverPick = () => {
    coverInputRef.current?.click()
  }

  const handleCoverRemove = async () => {
    setCoverImage(null)
    await saveCoverImage(null)
  }

  const handleCoverFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (!file.type.startsWith('image/')) return
    const dataUrl = await readFileAsDataUrl(file)
    setCoverImage(dataUrl)
    await saveCoverImage(dataUrl)
  }

  return (
    <div className="mx-auto max-w-[1920px] space-y-8 px-6 py-8">
      <CoverHeader
        coverImage={coverImage}
        onChangeCover={handleCoverPick}
        onRemoveCover={handleCoverRemove}
      >
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFile}
          className="hidden"
        />
        <p
          className={`text-xs uppercase tracking-[0.3em] ${
            coverImage ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          Overview
        </p>
        <h1
          className={`text-3xl font-semibold ${
            coverImage ? 'text-white' : 'text-slate-900'
          }`}
        >
          Money Trackers
        </h1>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onToggleViewMode}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-900"
          >
            {viewMode === 'all' ? 'Back to Current Cycle' : 'Show All Cycles'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-900"
          >
            Import Data
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:text-slate-900"
          >
            Export Data
          </button>
        </div>
      </CoverHeader>

      <KpiGrid items={kpis} />

      <FreeGridLayout
        layoutState={layoutState}
        blockContext={blockContext}
        onMoveItem={handleMoveItem}
        onResizeItem={handleResizeItem}
        onToggleVisibility={handleToggleVisibility}
        onResetLayout={handleResetLayout}
        onToggleCollapse={handleToggleCollapse}
      />
    </div>
  )
}

function CoverHeader({
  coverImage,
  onChangeCover,
  onRemoveCover,
  children,
}) {
  return (
    <header
      className={`group relative overflow-hidden ${
        coverImage ? 'min-h-[180px] rounded-2xl' : ''
      }`}
    >
      {coverImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImage})` }}
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : null}
      <div
        className={`relative space-y-3 ${
          coverImage ? 'px-6 py-6' : 'px-0 py-0'
        }`}
      >
        {children}
      </div>
      <div
        className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <button
          type="button"
          onClick={onChangeCover}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            coverImage
              ? 'border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
          }`}
        >
          Change cover
        </button>
        {coverImage ? (
          <button
            type="button"
            onClick={onRemoveCover}
            className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20"
          >
            Remove
          </button>
        ) : null}
      </div>
    </header>
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function editReducer(state, action) {
  switch (action.type) {
    case 'START':
      return action.transaction || null
    case 'CLEAR':
      return null
    default:
      return state
  }
}

function selectionReducer(state, action) {
  switch (action.type) {
    case 'SELECT':
      return action.accountId
    case 'CLEAR':
      return null
    default:
      return state
  }
}
