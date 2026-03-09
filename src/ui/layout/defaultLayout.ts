import type { LayoutState } from './layoutTypes'

export const DEFAULT_LAYOUT: LayoutState = {
  version: 2,
  grid: { cols: 24, rows: 48 },
  columns: [],
  items: [
    { id: 'accounts',          x: 0,  y: 0,  w: 12, h: 10, hidden: false },
    { id: 'cash-flow',         x: 12, y: 0,  w: 12, h: 10, hidden: false },
    { id: 'budget-plan',       x: 0,  y: 10, w: 5,  h: 17, hidden: false },
    { id: 'transactions-table',x: 5,  y: 10, w: 11, h: 29, hidden: false },
    { id: 'transaction-form',  x: 16, y: 10, w: 8,  h: 10, hidden: false },
    { id: 'planning-costs',    x: 16, y: 20, w: 4,  h: 25, hidden: false },
    { id: 'category-manager',  x: 20, y: 20, w: 4,  h: 25, hidden: false },
    { id: 'add-account',       x: 0,  y: 27, w: 5,  h: 6,  hidden: false },
    { id: 'account-selection', x: 0,  y: 16, w: 8,  h: 3,  hidden: true  },
  ],
}
