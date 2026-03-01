import { useMemo, useState, useEffect, useRef } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'
import { resolveCycleId, formatCycleLabel } from '../utils/cycle.js'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function getBudgetBarColor(percent) {
  if (percent >= 100) return 'bg-red-600'
  if (percent >= 61) return 'bg-orange-600'
  if (percent >= 31) return 'bg-yellow-600'
  return 'bg-green-600'
}

function SortableBudgetItem({
  item,
  spentByCategory,
  inputValues,
  setInputValues,
  dispatch,
  budgetCycleId,
  toggleCategoryVisibility,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const budgeted = Number(inputValues[item.id]) || 0
  const spent = spentByCategory.get(item.id) || 0
  const percent = budgeted
    ? Math.round((spent / budgeted) * 100)
    : 0
  const capped = Math.min(percent, 100)
  const remaining = budgeted - spent

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 flex-shrink-0 mt-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {item.name}
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="flex-shrink-0">Budget:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={inputValues[item.id] || ''}
                onChange={(event) => {
                  const newValue = event.target.value
                  setInputValues((prev) => ({
                    ...prev,
                    [item.id]: newValue,
                  }))
                }}
                onBlur={(event) => {
                  const value = Number(event.target.value) || 0
                  dispatch({
                    type: 'UPDATE_BUDGET',
                    payload: {
                      cycleId: budgetCycleId,
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
                className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 flex-shrink-0"
              />
            </label>
          </div>
        </div>
        <div className="flex items-start gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
              {formatCurrency(spent)}
            </p>
            <p className="text-xs text-slate-500 whitespace-nowrap">
              {remaining >= 0
                ? `${formatCurrency(remaining)} left`
                : `${formatCurrency(Math.abs(remaining))} over`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleCategoryVisibility(item.id)}
            className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0 mt-1"
            title="Hide category"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-colors duration-200 ${getBudgetBarColor(percent)}`}
          style={{ width: `${capped}%` }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), rgba(100, 116, 139, 0.35) calc(10% - 1px), rgba(100, 116, 139, 0.35) 10%)',
          }}
        />
      </div>
      <p className="text-xs text-slate-500">{percent}% used</p>
    </div>
  )
}

export default function BudgetSection({
  categories = [],
  budgets,
  activeCycleId,
  selectedCycleId = 'current',
  transactions = [],
  dispatch,
}) {
  const [inputValues, setInputValues] = useState({})
  const [hiddenCategories, setHiddenCategories] = useState(new Set())
  const [sortableCategories, setSortableCategories] = useState([])
  const isInitialized = useRef(false)

  const { scopedCycleId, isAllView } = resolveCycleId(selectedCycleId, activeCycleId)
  const budgetCycleId = scopedCycleId || activeCycleId
  
  const { spentByCategory, monthLabel, activeBudgetMap } = useMemo(() => {
    const label = isAllView
      ? `All cycles (editing ${formatCycleLabel(activeCycleId)})`
      : formatCycleLabel(budgetCycleId)
    const map = new Map()
    const activeProfile = (budgets || []).find(
      (profile) => profile.cycleId === budgetCycleId
    )
    const budgetMap = activeProfile?.budgets || {}

    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return
      if (transaction.cycleId !== budgetCycleId) return
      if (!transaction.categoryId) return

      const current = map.get(transaction.categoryId) || 0
      map.set(transaction.categoryId, current + Number(transaction.amount || 0))
    })

    return {
      spentByCategory: map,
      monthLabel: label,
      activeBudgetMap: budgetMap,
    }
  }, [transactions, budgets, activeCycleId, budgetCycleId, isAllView])

  // Sync budget input values when categories or the viewed cycle changes; initialize sort order once
  useEffect(() => {
    if (categories.length > 0) {
      const newInputValues = {}
      categories.forEach((category) => {
        newInputValues[category.id] = String(Number(activeBudgetMap[category.id]) || 0)
      })
      setInputValues(newInputValues)
      if (!isInitialized.current) {
        setSortableCategories(categories.map(cat => cat.id))
        isInitialized.current = true
      }
    }
  }, [categories, activeBudgetMap, budgetCycleId])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Drag end handler
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setSortableCategories((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Toggle category visibility
  const toggleCategoryVisibility = (categoryId) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Get categories in sorted order and filter hidden
  const visibleCategories = useMemo(() => {
    return sortableCategories
      .map(id => categories.find(cat => cat.id === id))
      .filter(Boolean)
      .filter(cat => !hiddenCategories.has(cat.id))
  }, [sortableCategories, categories, hiddenCategories])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <SectionHeader
        title="Budget Plan"
        subtitle={`Tracked by category · ${monthLabel}`}
      />
      {isAllView ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You are viewing all cycles. Budget editing remains scoped to current cycle {activeCycleId}.
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableCategories} strategy={verticalListSortingStrategy}>
          <div className="mt-4 space-y-4">
            {visibleCategories.map((item) => (
              <SortableBudgetItem
                key={item.id}
                item={item}
                spentByCategory={spentByCategory}
                inputValues={inputValues}
                setInputValues={setInputValues}
                dispatch={dispatch}
                budgetCycleId={budgetCycleId}
                toggleCategoryVisibility={toggleCategoryVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {hiddenCategories.size > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setHiddenCategories(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Show {hiddenCategories.size} hidden {hiddenCategories.size === 1 ? 'category' : 'categories'}
          </button>
        </div>
      )}
    </section>
  )
}

