import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  FolderOpen,
  FileText,
  X,
  Download,
  Upload,
} from 'lucide-react'

export default function Sidebar({
  selectedCycleId,
  onSelectCycle,
  cycleOptions = [],
  activeCycleId,
  onImportClick,
  onExport,
  isOpen,
  onClose,
}) {
  const navGroups = [
    {
      label: 'Overview',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', active: true },
      ],
    },
    {
      label: 'Finance',
      items: [
        { icon: Wallet, label: 'Accounts' },
        { icon: CreditCard, label: 'Transactions' },
        { icon: PiggyBank, label: 'Budget' },
        { icon: TrendingUp, label: 'Cash Flow' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { icon: FolderOpen, label: 'Categories' },
        { icon: FileText, label: 'Planning Costs' },
      ],
    },
  ]

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-[#212631]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50">
            <Wallet className="h-4 w-4 text-white dark:text-zinc-900" />
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Money Trackers
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors ${
                      item.active
                        ? 'bg-gray-100 text-gray-900 dark:bg-[#212631] dark:text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#212631] dark:hover:text-white'
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Cycle selector + Import/Export */}
      <div className="border-t border-gray-200 px-4 py-4 dark:border-[#212631]">
        {/* Cycle Selector */}
        <div className="mb-3">
          <label className="mb-1 block px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Billing Cycle
          </label>
          <select
            value={selectedCycleId}
            onChange={(e) => onSelectCycle?.(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 dark:border-[#212631] dark:bg-[#0A0E15] dark:text-gray-300 dark:hover:border-[#373F4E]"
          >
            <option value="current">Current ({activeCycleId})</option>
            <option value="all">All Cycles</option>
            {cycleOptions.map((cycleId) => (
              <option key={cycleId} value={cycleId}>
                Cycle {cycleId}
              </option>
            ))}
          </select>
        </div>

        {/* Import/Export */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onImportClick}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-[#212631] dark:bg-[#0A0E15] dark:text-gray-400 dark:hover:bg-[#212631] dark:hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <button
            type="button"
            onClick={onExport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-[#212631] dark:bg-[#0A0E15] dark:text-gray-400 dark:hover:bg-[#212631] dark:hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed inset-y-0 left-0 z-[70] w-64 border-r border-gray-200 bg-white dark:border-[#212631] dark:bg-[#0A0E15]">
        {sidebarContent}
      </nav>

      {/* Mobile sidebar overlay */}
      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[65] bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <nav className="fixed inset-y-0 left-0 z-[70] w-64 border-r border-gray-200 bg-white dark:border-[#212631] dark:bg-[#0A0E15] lg:hidden">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#212631]"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </nav>
        </>
      ) : null}
    </>
  )
}
