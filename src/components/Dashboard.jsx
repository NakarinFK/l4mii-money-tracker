import { useEffect, useMemo, useReducer, useState } from 'react'
import KpiGrid from './KpiGrid.jsx'
import { buildTransactionRows } from '../utils/financeSelectors.js'
import { saveLayoutState } from '../persistence/index.js'
import FreeGridLayout from '../ui/layout/FreeGridLayout.tsx'
import { DEFAULT_LAYOUT } from '../ui/layout/defaultLayout'
import { layoutReducer, normalizeLayoutState } from '../ui/layout/layoutReducer'

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
  selectedCycleId = 'current',
  onSelectCycle,
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

  const handleSetAccentColor = (id, color) => {
    if (id === null) {
      layoutDispatch({ type: 'SET_ACCENT_COLOR_ALL', payload: { color } })
    } else {
      layoutDispatch({ type: 'SET_ACCENT_COLOR', payload: { id, color } })
    }
  }

  const blockContext = {
    accounts,
    categories,
    budgets,
    activeCycleId,
    selectedCycleId,
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

  useEffect(() => {
    void saveLayoutState(layoutState)
  }, [layoutState])

  return (
    <div className="space-y-6 p-6">
      <KpiGrid items={kpis} />

      <FreeGridLayout
        layoutState={layoutState}
        blockContext={blockContext}
        onMoveItem={handleMoveItem}
        onResizeItem={handleResizeItem}
        onToggleVisibility={handleToggleVisibility}
        onResetLayout={handleResetLayout}
        onToggleCollapse={handleToggleCollapse}
        onSetAccentColor={handleSetAccentColor}
      />
    </div>
  )
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
