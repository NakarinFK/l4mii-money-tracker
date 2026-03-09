import { useMemo, useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'
import { resolveCycleId, formatCycleLabel } from '../utils/cycle.js'

const createAddState = (categoryId) => ({
  name: '',
  amount: '',
  categoryId: categoryId || '',
  billingDay: '',
})

const createPayState = (date) => ({
  accountId: '',
  date,
})

const initialState = (categoryId) => ({
  add: createAddState(categoryId),
  editingId: null,
  edit: createAddState(categoryId),
  payingId: null,
  pay: createPayState(new Date().toISOString().slice(0, 10)),
})

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_ADD':
      return { ...state, add: { ...state.add, [action.field]: action.value } }
    case 'RESET_ADD':
      return { ...state, add: createAddState(action.categoryId) }
    case 'START_EDIT':
      return {
        ...state,
        editingId: action.id,
        edit: {
          name: action.name || '',
          amount: String(action.amount ?? ''),
          categoryId: action.categoryId || '',
          billingDay: String(action.billingDay ?? ''),
        },
      }
    case 'UPDATE_EDIT':
      return { ...state, edit: { ...state.edit, [action.field]: action.value } }
    case 'CANCEL_EDIT':
      return { ...state, editingId: null }
    case 'START_PAY':
      return {
        ...state,
        payingId: action.id,
        pay: createPayState(action.date),
      }
    case 'UPDATE_PAY':
      return { ...state, pay: { ...state.pay, [action.field]: action.value } }
    case 'CANCEL_PAY':
      return { ...state, payingId: null }
    default:
      return state
  }
}

export default function PlanningCostSection({
  planningCosts = [],
  categories = [],
  accounts = [],
  activeCycleId,
  selectedCycleId = 'current',
  dispatch,
}) {
  const activeCategories = categories.filter((category) => !category.disabled)
  const defaultCategoryId = activeCategories[0]?.id || ''
  const [state, dispatchLocal] = useReducer(
    reducer,
    defaultCategoryId,
    initialState
  )

  const { scopedCycleId, isAllView, matchesCycle } = resolveCycleId(selectedCycleId, activeCycleId)

  const items = useMemo(
    () =>
      planningCosts.filter((cost) => matchesCycle(cost.cycleId)),
    [planningCosts, scopedCycleId, isAllView]
  )

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )

  const handleAdd = (event) => {
    event.preventDefault()
    const name = state.add.name.trim()
    const amount = Number(state.add.amount)
    const billingDay = Number(state.add.billingDay) || 1
    if (!name || !amount || amount <= 0 || !state.add.categoryId) return
    dispatch({
      type: 'ADD_PLANNING_COST',
      payload: {
        name,
        amount,
        categoryId: state.add.categoryId,
        billingDay,
        cycleId: activeCycleId,
        status: 'planned',
      },
    })
    dispatchLocal({ type: 'RESET_ADD', categoryId: defaultCategoryId })
  }

  const handleSaveEdit = (id) => {
    const name = state.edit.name.trim()
    const amount = Number(state.edit.amount)
    const billingDay = Number(state.edit.billingDay) || 1
    if (!name || !amount || amount <= 0 || !state.edit.categoryId) return
    dispatch({
      type: 'UPDATE_PLANNING_COST',
      payload: {
        id,
        name,
        amount,
        categoryId: state.edit.categoryId,
        billingDay,
      },
    })
    dispatchLocal({ type: 'CANCEL_EDIT' })
  }

  const handlePay = (id) => {
    if (!state.pay.accountId) return
    dispatch({
      type: 'PAY_PLANNING_COST',
      payload: {
        planningCostId: id,
        accountId: state.pay.accountId,
        date: state.pay.date,
      },
    })
    dispatchLocal({ type: 'CANCEL_PAY' })
  }

  return (
    <section className="p-4">
      <SectionHeader
        title="Planning Cost"
        subtitle={
          isAllView
            ? 'All billing cycles · historical view'
            : `Monthly view · ${formatCycleLabel(scopedCycleId)}`
        }
      />

      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleAdd}>
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Name
          <input
            value={state.add.name}
            onChange={(event) =>
              dispatchLocal({
                type: 'UPDATE_ADD',
                field: 'name',
                value: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[#212631] bg-white dark:bg-[#0A0E15] px-3 py-2 text-sm text-gray-700 dark:text-zinc-300"
            required
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Amount
          <input
            type="number"
            step="0.01"
            value={state.add.amount}
            onChange={(event) =>
              dispatchLocal({
                type: 'UPDATE_ADD',
                field: 'amount',
                value: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[#212631] bg-white dark:bg-[#0A0E15] px-3 py-2 text-sm text-gray-700 dark:text-zinc-300"
            required
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Category
          <select
            value={state.add.categoryId}
            onChange={(event) =>
              dispatchLocal({
                type: 'UPDATE_ADD',
                field: 'categoryId',
                value: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[#212631] bg-white dark:bg-[#0A0E15] px-3 py-2 text-sm text-gray-700 dark:text-zinc-300"
            required
          >
            <option value="">Select category</option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
          Billing Day
          <input
            type="number"
            min="1"
            max="31"
            value={state.add.billingDay}
            onChange={(event) =>
              dispatchLocal({
                type: 'UPDATE_ADD',
                field: 'billingDay',
                value: event.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[#212631] bg-white dark:bg-[#0A0E15] px-3 py-2 text-sm text-gray-700 dark:text-zinc-300"
            placeholder="e.g. 5"
            required
          />
        </label>
        <div className="sm:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900"
          >
            Add Planning Cost
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {items.map((item) => {
          const category = categoryMap.get(item.categoryId)
          const statusLabel = item.status || 'planned'
          const isInactive = statusLabel === 'inactive'
          const isDone = statusLabel === 'done'
          const isEditing = state.editingId === item.id
          const isPaying = state.payingId === item.id
          return (
            <div
              key={item.id}
              className={`rounded-xl border border-gray-200 dark:border-[#212631] p-4 ${
                isInactive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {formatCurrency(item.amount)} ·{' '}
                    {category?.name || 'Uncategorized'} · Every {item.billingDay}
                    th {item.cycleId !== scopedCycleId ? `· Cycle ${item.cycleId}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:text-zinc-400">
                  {statusLabel}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    value={state.edit.name}
                    onChange={(event) =>
                      dispatchLocal({
                        type: 'UPDATE_EDIT',
                        field: 'name',
                        value: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={state.edit.amount}
                    onChange={(event) =>
                      dispatchLocal({
                        type: 'UPDATE_EDIT',
                        field: 'amount',
                        value: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                  />
                  <select
                    value={state.edit.categoryId}
                    onChange={(event) =>
                      dispatchLocal({
                        type: 'UPDATE_EDIT',
                        field: 'categoryId',
                        value: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                  >
                    {activeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={state.edit.billingDay}
                    onChange={(event) =>
                      dispatchLocal({
                        type: 'UPDATE_EDIT',
                        field: 'billingDay',
                        value: event.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                  />
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchLocal({ type: 'CANCEL_EDIT' })}
                      className="text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {isPaying ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Pay from
                    <select
                      value={state.pay.accountId}
                      onChange={(event) =>
                        dispatchLocal({
                          type: 'UPDATE_PAY',
                          field: 'accountId',
                          value: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Date
                    <input
                      type="date"
                      value={state.pay.date}
                      onChange={(event) =>
                        dispatchLocal({
                          type: 'UPDATE_PAY',
                          field: 'date',
                          value: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-sm text-gray-700 dark:text-zinc-300"
                    />
                  </label>
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handlePay(item.id)}
                      className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchLocal({ type: 'CANCEL_PAY' })}
                      className="text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {!isEditing && !isPaying ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600 dark:text-zinc-400">
                  <button
                    type="button"
                    onClick={() =>
                      dispatchLocal({
                        type: 'START_EDIT',
                        id: item.id,
                        name: item.name,
                        amount: item.amount,
                        categoryId: item.categoryId,
                        billingDay: item.billingDay,
                      })
                    }
                    className="hover:text-gray-900 dark:hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'SET_PLANNING_STATUS',
                        payload: {
                          id: item.id,
                          status: isInactive ? 'planned' : 'inactive',
                        },
                      })
                    }
                    className="hover:text-gray-900 dark:hover:text-white"
                  >
                    {isInactive ? 'Activate' : 'Set Inactive'}
                  </button>
                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: 'SET_PLANNING_STATUS',
                          payload: { id: item.id, status: 'done' },
                        })
                      }
                      className="hover:text-gray-900 dark:hover:text-white"
                    >
                      Mark Done
                    </button>
                  ) : null}
                  {!isDone ? (
                    <button
                      type="button"
                      onClick={() =>
                        dispatchLocal({
                          type: 'START_PAY',
                          id: item.id,
                          date: new Date().toISOString().slice(0, 10),
                        })
                      }
                      className="hover:text-gray-900 dark:hover:text-white"
                    >
                      Pay Now
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'DELETE_PLANNING_COST',
                        payload: { id: item.id },
                      })
                    }
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}
        {items.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {isAllView
              ? 'No planning costs in history yet.'
              : 'No planned costs for this cycle yet.'}
          </p>
        ) : null}
      </div>
    </section>
  )
}
