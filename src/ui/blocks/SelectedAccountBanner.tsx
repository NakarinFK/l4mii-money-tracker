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
    <div className="rounded-xl border border-gray-200 dark:border-[#212631] bg-white dark:bg-[#0A0E15] p-4 text-sm text-gray-600 dark:text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Viewing transactions for{' '}
          <span className="font-semibold text-gray-900 dark:text-zinc-50">
            {selectedAccountName || 'Selected Account'}
          </span>
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
