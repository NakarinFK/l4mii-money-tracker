export const navItems = [
  'Home',
  'Incomes',
  'Expenses',
  'Transfers',
  'Fix Cost',
  'Accounts',
  'Categories',
]

export const kpis = [
  {
    label: 'Total Balance',
    value: 'THB 86,430',
    note: 'Across 4 accounts',
  },
  {
    label: 'Cash Flow (This Month)',
    value: 'THB 40,210',
    note: 'Income minus expenses',
  },
  {
    label: 'Planned Costs',
    value: 'THB 14,820',
    note: 'Subscriptions and fixed costs',
  },
  {
    label: 'Budget Left',
    value: 'THB 8,900',
    note: 'Remaining before month end',
  },
]

export const accounts = [
  {
    name: 'Wallet',
    balance: 403,
    income: 0,
    expenses: 0,
  },
  {
    name: 'True Wallet',
    balance: 106.13,
    income: 734.44,
    expenses: 2627.31,
  },
  {
    name: 'BK Bank',
    balance: 604.07,
    income: 1412.8,
    expenses: 2392.83,
  },
  {
    name: 'Line Pay',
    balance: 54.7,
    income: 213.8,
    expenses: 573,
  },
]

export const categories = [
  { id: 'cat-food', name: 'Food and Drinks', disabled: false },
  { id: 'cat-transport', name: 'Transportation', disabled: false },
  { id: 'cat-subscription', name: 'Subscription', disabled: false },
  { id: 'cat-home', name: 'Home', disabled: false },
  { id: 'cat-shopping', name: 'Shopping', disabled: false },
  { id: 'cat-uncategorized', name: 'Uncategorized', disabled: false },
]

export const subscriptions = [
  {
    name: 'Notion Plus',
    cost: 200,
    billing: 'Monthly',
    nextDate: '2026-02-02',
    status: 'Active',
  },
  {
    name: 'Utility',
    cost: 2460.66,
    billing: 'Monthly',
    nextDate: '2026-01-29',
    status: 'Active',
  },
  {
    name: 'Netflix',
    cost: 490,
    billing: 'Monthly',
    nextDate: '2026-02-02',
    status: 'Active',
  },
  {
    name: 'ChatGPT',
    cost: 723.47,
    billing: 'Monthly',
    nextDate: '2026-02-09',
    status: 'Active',
  },
  {
    name: 'YouTube Premium',
    cost: 179,
    billing: 'Monthly',
    nextDate: '2026-02-21',
    status: 'Active',
  },
  {
    name: 'Car',
    cost: 4249,
    billing: 'Monthly',
    nextDate: '2026-02-05',
    status: 'Active',
  },
]

export const budgetCategories = [
  {
    name: 'Food and Drinks',
    budget: 3200,
    spent: 4148,
  },
  {
    name: 'Transportation',
    budget: 3700,
    spent: 3932,
  },
  {
    name: 'Subscription',
    budget: 1682,
    spent: 2847,
  },
  {
    name: 'Home',
    budget: 9466,
    spent: 9466,
  },
  {
    name: 'Shopping',
    budget: 3500,
    spent: 3178,
  },
  {
    name: 'Fix Cost',
    budget: 5473,
    spent: 5473,
  },
]

export const cashFlow = {
  inflow: 68200,
  outflow: 27990,
  breakdown: [
    { label: 'Home', value: 9466, color: '#f97316' },
    { label: 'Food and Drinks', value: 4148, color: '#38bdf8' },
    { label: 'Transportation', value: 3932, color: '#22c55e' },
    { label: 'Shopping', value: 3178, color: '#eab308' },
    { label: 'Subscription', value: 2847, color: '#6366f1' },
  ],
}

export const transactions = [
  {
    id: 1,
    transaction: 'Yakiniku Like',
    amount: 308,
    category: 'Food and Drinks',
    method: 'BK Bank',
    date: '2026-01-26',
    cycleStart: '2025-12-27',
  },
  {
    id: 2,
    transaction: 'Foodcourt',
    amount: 95,
    category: 'Food and Drinks',
    method: 'True Wallet',
    date: '2026-01-25',
    cycleStart: '2025-12-27',
  },
  {
    id: 3,
    transaction: 'Commute Pass',
    amount: 860,
    category: 'Transportation',
    method: 'Line Pay',
    date: '2026-01-25',
    cycleStart: '2025-12-27',
  },
  {
    id: 4,
    transaction: 'Netflix',
    amount: 490,
    category: 'Subscription',
    method: 'BK Bank',
    date: '2026-01-24',
    cycleStart: '2025-12-27',
  },
  {
    id: 5,
    transaction: 'Internet True',
    amount: 854.93,
    category: 'Home',
    method: 'True Wallet',
    date: '2026-01-23',
    cycleStart: '2025-12-27',
  },
  {
    id: 6,
    transaction: 'Grocery Run',
    amount: 1260,
    category: 'Food and Drinks',
    method: 'BK Bank',
    date: '2026-01-22',
    cycleStart: '2025-12-27',
  },
  {
    id: 7,
    transaction: 'New Shoes',
    amount: 1520,
    category: 'Shopping',
    method: 'BK Bank',
    date: '2026-01-20',
    cycleStart: '2025-12-27',
  },
  {
    id: 8,
    transaction: 'Grab Ride',
    amount: 437,
    category: 'Transportation',
    method: 'True Wallet',
    date: '2026-01-19',
    cycleStart: '2025-12-27',
  },
]
