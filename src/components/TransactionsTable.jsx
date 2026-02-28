import { useMemo, useReducer, useState } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'

const columns = [
  { key: 'transaction', label: 'Transaction' },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'category', label: 'Category' },
  { key: 'method', label: 'Payment Method' },
  { key: 'date', label: 'Date' },
  { key: 'cycleStart', label: 'Billing Cycle Start' },
]

const initialSort = { key: 'date', direction: 'desc' }

function sortReducer(state, action) {
  if (action.type !== 'TOGGLE') return state
  if (state.key === action.key) {
    return {
      key: action.key,
      direction: state.direction === 'asc' ? 'desc' : 'asc',
    }
  }
  return { key: action.key, direction: 'asc' }
}

export default function TransactionsTable({ rows, onEdit, onDelete }) {
  const [sort, dispatch] = useReducer(sortReducer, initialSort)
  const [recentExpensesLimit, setRecentExpensesLimit] = useState(20)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const showEdit = typeof onEdit === 'function'
  const showDelete = typeof onDelete === 'function'

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(rows.map((row) => row.category))]
      .filter(Boolean)
      .sort()
    return uniqueCategories
  }, [rows])

  const filteredRows = useMemo(() => {
    if (selectedCategory === 'all') return rows
    return rows.filter((row) => row.category === selectedCategory)
  }, [rows, selectedCategory])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = getSortValue(a, sort.key)
      const bValue = getSortValue(b, sort.key)
      if (aValue === bValue) return 0
      return aValue > bValue ? 1 : -1
    })
    return sort.direction === 'asc' ? sorted : sorted.reverse()
  }, [filteredRows, sort])

  const visibleRows = useMemo(
    () => sortedRows.slice(0, recentExpensesLimit),
    [sortedRows, recentExpensesLimit]
  )

  const handleSort = (key) => dispatch({ type: 'TOGGLE', key })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title="Recent Expenses"
          subtitle={`Sortable table for quick review${selectedCategory !== 'all' ? ` (${visibleRows.length} filtered)` : ''}`}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 min-w-[120px]"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Show</span>
            <select
              value={recentExpensesLimit}
              onChange={(event) =>
                setRecentExpensesLimit(Number(event.target.value))
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
            >
              {[10, 20, 30, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 pr-4 font-medium ${
                    column.numeric ? 'text-right' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`flex items-center gap-1 ${
                      column.numeric ? 'justify-end w-full' : ''
                    }`}
                  >
                    <span>{column.label}</span>
                    {sort.key === column.key ? (
                      <span className="text-slate-400">
                        {sort.direction === 'asc' ? '^' : 'v'}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
              {showEdit || showDelete ? (
                <th className="py-2 pr-4 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                <td className="py-3 pr-4">{row.transaction}</td>
                <td className="py-3 pr-4 text-right">
                  {formatCurrency(row.amount)}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span>{row.category}</span>
                    {row.categoryDisabled ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        Disabled
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-4">{row.method}</td>
                <td className="py-3 pr-4">{formatDate(row.date)}</td>
                <td className="py-3 pr-4">{formatDate(row.cycleStart)}</td>
                {showEdit || showDelete ? (
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {showEdit && row.type !== 'opening' ? (
                        <button
                          type="button"
                          onClick={() => onEdit(row.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Edit
                        </button>
                      ) : null}
                      {showDelete && row.type !== 'opening' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm('Delete this transaction?')
                            ) {
                              onDelete(row.id)
                            }
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function getSortValue(row, key) {
  if (key === 'amount') return row.amount
  if (key === 'date' || key === 'cycleStart') {
    return new Date(row[key]).getTime()
  }
  return String(row[key]).toLowerCase()
}
