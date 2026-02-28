import { useMemo, useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'

const initialState = {
  editingId: null,
  draftName: '',
  draftType: 'expense',
  warningId: null,
  warningMessage: '',
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_EDIT':
      return {
        editingId: action.id,
        draftName: action.name || '',
        draftType: action.categoryType || 'expense',
        warningId: null,
        warningMessage: '',
      }
    case 'UPDATE_DRAFT':
      return { ...state, draftName: action.value }
    case 'UPDATE_TYPE':
      return { ...state, draftType: action.value }
    case 'SET_WARNING':
      return {
        ...state,
        warningId: action.id,
        warningMessage: action.message || '',
      }
    case 'CANCEL':
      return initialState
    default:
      return state
  }
}

export default function CategoryManager({
  categories = [],
  transactions = [],
  budgets = [],
  planningCosts = [],
  dispatch,
}) {
  const [state, dispatchLocal] = useReducer(reducer, initialState)

  const counts = useMemo(() => {
    const map = new Map()
    transactions.forEach((transaction) => {
      if (!transaction.categoryId) return
      map.set(
        transaction.categoryId,
        (map.get(transaction.categoryId) || 0) + 1
      )
    })
    return map
  }, [transactions])

  const planningCounts = useMemo(() => {
    const map = new Map()
    planningCosts.forEach((cost) => {
      if (!cost.categoryId) return
      map.set(cost.categoryId, (map.get(cost.categoryId) || 0) + 1)
    })
    return map
  }, [planningCosts])

  const budgetCounts = useMemo(() => {
    const map = new Map()
    budgets.forEach((profile) => {
      if (!profile?.budgets) return
      Object.entries(profile.budgets).forEach(([categoryId, amount]) => {
        if (!Number(amount)) return
        map.set(categoryId, (map.get(categoryId) || 0) + 1)
      })
    })
    return map
  }, [budgets])

  const handleSave = () => {
    const trimmed = state.draftName.trim()
    if (!trimmed) return
    dispatch({
      type: 'RENAME_CATEGORY',
      payload: { id: state.editingId, name: trimmed, type: state.draftType },
    })
    dispatchLocal({ type: 'CANCEL' })
  }

  const handleDelete = (category) => {
    if (!category?.id) return
    const usage = getCategoryUsage(
      category.id,
      counts,
      planningCounts,
      budgetCounts
    )
    if (usage.isUsed) {
      dispatchLocal({
        type: 'SET_WARNING',
        id: category.id,
        message: buildUsageMessage(usage),
      })
      return
    }
    const confirmed = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`
    )
    if (!confirmed) return
    dispatch({ type: 'DELETE_CATEGORY', payload: { id: category.id } })
    dispatchLocal({ type: 'CANCEL' })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Categories"
        subtitle="Manage categories and usage"
      />
      <div className="mt-4 space-y-3">
        {categories.map((category) => {
          const categoryType = getCategoryType(category)
          const isActive = isCategoryActive(category)
          const isEditing = state.editingId === category.id
          return (
            <div
              key={category.id}
              className={`rounded-xl border border-slate-200 p-3 ${
                isActive ? '' : 'opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={state.draftName}
                        onChange={(event) =>
                          dispatchLocal({
                            type: 'UPDATE_DRAFT',
                            value: event.target.value,
                          })
                        }
                        className="w-48 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700"
                      />
                      <select
                        value={state.draftType}
                        onChange={(event) =>
                          dispatchLocal({
                            type: 'UPDATE_TYPE',
                            value: event.target.value,
                          })
                        }
                        className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
                        required
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">
                      {category.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {counts.get(category.id) || 0} transactions
                  </p>
                  {!isEditing ? (
                    <p className="text-xs text-slate-500">
                      Type: {categoryType}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatchLocal({ type: 'CANCEL' })}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          dispatchLocal({
                            type: 'START_EDIT',
                            id: category.id,
                            name: category.name,
                            categoryType,
                          })
                        }
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              {state.warningId === category.id ? (
                <p className="mt-2 text-xs text-rose-600">
                  {state.warningMessage}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function getCategoryType(category) {
  if (!category || !category.type) return 'expense'
  return category.type === 'income' ? 'income' : 'expense'
}

function isCategoryActive(category) {
  if (!category) return true
  if (typeof category.disabled === 'boolean') return !category.disabled
  if (typeof category.active === 'boolean') return category.active
  return true
}

function getCategoryUsage(categoryId, counts, planningCounts, budgetCounts) {
  const transactions = counts.get(categoryId) || 0
  const planningCosts = planningCounts.get(categoryId) || 0
  const budgets = budgetCounts.get(categoryId) || 0
  return {
    transactions,
    planningCosts,
    budgets,
    isUsed: transactions > 0 || planningCosts > 0 || budgets > 0,
  }
}

function buildUsageMessage(usage) {
  const parts = []
  if (usage.transactions) {
    parts.push(`${usage.transactions} transactions`)
  }
  if (usage.planningCosts) {
    parts.push(`${usage.planningCosts} planning costs`)
  }
  if (usage.budgets) {
    parts.push(`${usage.budgets} budget entries`)
  }
  if (!parts.length) {
    return 'This category is currently in use.'
  }
  return `Cannot delete: used by ${parts.join(', ')}.`
}
