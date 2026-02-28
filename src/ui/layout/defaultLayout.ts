import type { LayoutState } from './layoutTypes'

export const DEFAULT_LAYOUT: LayoutState = {
  version: 2,
  grid: { cols: 24, rows: 48 },
  columns: [],
  items: [
    { id: 'accounts', x: 0, y: 0, w: 3, h: 2, hidden: false },
    { id: 'add-account', x: 3, y: 0, w: 2, h: 2, hidden: false },
    { id: 'planning-costs', x: 0, y: 2, w: 3, h: 3, hidden: false },
    { id: 'budget-plan', x: 3, y: 2, w: 3, h: 3, hidden: false },
    { id: 'category-manager', x: 6, y: 0, w: 2, h: 3, hidden: false },
    { id: 'cash-flow', x: 8, y: 0, w: 2, h: 3, hidden: false },
    { id: 'transaction-form', x: 6, y: 3, w: 2, h: 3, hidden: false },
    { id: 'account-selection', x: 8, y: 3, w: 2, h: 2, hidden: false },
    { id: 'transactions-table', x: 0, y: 6, w: 10, h: 4, hidden: false },
  ],
}
