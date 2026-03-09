import { useReducer } from 'react'
import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'

export default function AccountsSection({
  accounts,
  onSelect,
  selectedAccountId,
  dispatch,
  transactions = [],
  activeCycleId,
}) {
  const [editState, dispatchEdit] = useReducer(editReducer, {
    editingId: null,
    targetBalance: '',
  })

  const handleStartEdit = (account) => {
    const opening = transactions.find(
      (transaction) =>
        transaction.type === 'opening' &&
        transaction.toAccount === account.id &&
        transaction.cycleId === activeCycleId
    )
    dispatchEdit({
      type: 'START',
      id: account.id,
      balance: String(opening?.amount ?? ''),
    })
  }

  const handleSave = (accountId) => {
    const targetBalance = Number(editState.targetBalance)
    if (Number.isNaN(targetBalance)) return
    dispatch({
      type: 'SET_OPENING_BALANCE',
      payload: {
        accountId,
        cycleId: activeCycleId,
        amount: targetBalance,
      },
    })
    dispatchEdit({ type: 'CLEAR' })
  }

  return (
    <section className="p-4">
      <SectionHeader
        title="Accounts"
        subtitle="Current balances and recent movement"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div
            key={account.id ?? account.name}
            className="rounded-xl border border-gray-200 p-4 dark:border-[#212631]"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
              {account.name}
            </p>
            <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-zinc-50">
              {formatCurrency(account.balance)}
            </p>
            <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Income</span>
                <span>{formatCurrency(account.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expenses</span>
                <span>{formatCurrency(account.expenses)}</span>
              </div>
            </div>
            {editState.editingId === account.id ? (
              <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-zinc-400">
                <p>Opening balance (per cycle, does not change transactions)</p>
                <input
                  type="number"
                  step="0.01"
                  value={editState.targetBalance}
                  onChange={(event) =>
                    dispatchEdit({
                      type: 'UPDATE',
                      value: event.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-200 dark:border-[#212631] px-2 py-1 text-xs text-gray-700 dark:text-zinc-300"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(account.id)}
                    className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchEdit({ type: 'CLEAR' })}
                    className="text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {onSelect ? (
              <div className="mt-4 flex items-center justify-end">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(account)}
                    className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(account.id)}
                    className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:text-zinc-50"
                  >
                    {selectedAccountId === account.id ? 'Viewing' : 'View'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function editReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { editingId: action.id, targetBalance: action.balance }
    case 'UPDATE':
      return { ...state, targetBalance: action.value }
    case 'CLEAR':
      return { editingId: null, targetBalance: '' }
    default:
      return state
  }
}
