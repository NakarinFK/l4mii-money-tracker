import SectionHeader from './SectionHeader.jsx'
import { formatCurrency } from '../utils/format.js'

export default function CashFlowSection({ inflow, outflow, breakdown }) {
  const total = breakdown.reduce((sum, item) => sum + item.value, 0)
  const safeTotal = total || 1
  let current = 0
  const segments = breakdown.map((item) => {
    const start = (current / safeTotal) * 100
    current += item.value
    const end = (current / safeTotal) * 100
    return `${item.color} ${start}% ${end}%`
  })
  const fallbackSegment = '#e2e8f0 0% 100%'
  const donutStyle = {
    background: `conic-gradient(${segments.join(', ') || fallbackSegment})`,
  }

  return (
    <section className="p-4">
      <SectionHeader
        title="Cash Flow"
        subtitle={`Month-to-date spending breakdown (${breakdown.length} categories)`}
      />
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="relative h-40 w-40 rounded-full" style={donutStyle}>
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#0A0E15] text-center">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-zinc-400">
              Total
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
        <div className="flex-1 space-y-3 text-sm">
          <div className="rounded-lg bg-gray-50 dark:bg-zinc-900/70 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
              <span>Inflow</span>
              <span>{formatCurrency(inflow)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
              <span>Outflow</span>
              <span>{formatCurrency(outflow)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-zinc-50">
              <span>Net</span>
              <span>{formatCurrency(inflow - outflow)}</span>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 dark:text-zinc-400">{item.label}</span>
                </div>
                <span className="text-gray-900 dark:text-zinc-50 font-medium">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
