import { useMemo, useState, useEffect, useRef } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'

function getBudgetBarColor(percent) {
  if (percent >= 100) return 'bg-red-500'
  if (percent >= 61) return 'bg-orange-500'
  if (percent >= 31) return 'bg-yellow-500'
  return 'bg-green-500'
}

export default function BudgetSection({
  categories = [],
  budgets,
  activeCycleId,
  transactions = [],
  dispatch,
}) {
  const [inputValues, setInputValues] = useState({})
  const isInitialized = useRef(false)
  
  const { spentByCategory, monthLabel, activeBudgetMap } = useMemo(() => {
    const label = formatCycleLabel(activeCycleId)
    const map = new Map()
    const activeProfile = (budgets || []).find(
      (profile) => profile.cycleId === activeCycleId
    )
    const budgetMap = activeProfile?.budgets || {}

    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return
      if (transaction.cycleId !== activeCycleId) return
      if (!transaction.categoryId) return

      const current = map.get(transaction.categoryId) || 0
      map.set(transaction.categoryId, current + Number(transaction.amount || 0))
    })

    return {
      spentByCategory: map,
      monthLabel: label,
      activeBudgetMap: budgetMap,
    }
  }, [transactions, budgets, activeCycleId])

  // Initialize input values only on first mount
  useEffect(() => {
    if (!isInitialized.current && categories.length > 0) {
      const newInputValues = {}
      categories.forEach((category) => {
        newInputValues[category.id] = String(Number(activeBudgetMap[category.id]) || 0)
      })
      setInputValues(newInputValues)
      isInitialized.current = true
    }
  }, [categories])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Budget Plan"
        subtitle={`Tracked by category · ${monthLabel}`}
      />
      <div className="mt-4 space-y-4">
        {categories.map((item) => {
          const budgeted = Number(inputValues[item.id]) || 0
          const spent = spentByCategory.get(item.id) || 0
          const percent = budgeted
            ? Math.round((spent / budgeted) * 100)
            : 0
          const capped = Math.min(percent, 100)
          const remaining = budgeted - spent
          return (
            <div key={item.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Budget:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputValues[item.id] || ''}
                      onChange={(event) => {
                        const newValue = event.target.value
                        setInputValues(prev => ({
                          ...prev,
                          [item.id]: newValue
                        }))
                      }}
                      onBlur={(event) => {
                        const value = Number(event.target.value) || 0
                        dispatch({
                          type: 'UPDATE_BUDGET',
                          payload: {
                            cycleId: activeCycleId,
                            categoryId: item.id,
                            amount: value,
                          },
                        })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.target.blur()
                        }
                      }}
                      className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                    />
                  </label>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(spent)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {remaining >= 0
                      ? `${formatCurrency(remaining)} left`
                      : `${formatCurrency(Math.abs(remaining))} over`}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full transition-colors duration-200 ${getBudgetBarColor(percent)}`}
                  style={{ width: `${capped}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{percent}% used</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatCycleLabel(cycleId) {
  if (!cycleId) return 'Current Month'
  const [year, month] = cycleId.split('-').map(Number)
  if (!year || !month) return cycleId
  const date = new Date(year, month - 1, 1)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
