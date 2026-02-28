import React from 'react'

type Props = {
  selectedAccountId?: string | null
  selectedAccountName?: string
  onClearSelection?: () => void
}

export default function SelectedAccountBanner({
  selectedAccountId,
  selectedAccountName,
  onClearSelection,
}: Props) {
  if (!selectedAccountId) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Viewing transactions for{' '}
          <span className="font-semibold text-slate-900">
            {selectedAccountName || 'Selected Account'}
          </span>
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
