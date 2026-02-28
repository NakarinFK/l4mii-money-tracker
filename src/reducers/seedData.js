// Seed data and initialization functions
import {
  accounts as mockAccounts,
  budgetCategories as mockBudgetCategories,
  categories as mockCategories,
  subscriptions as mockSubscriptions,
  transactions as mockTransactions,
} from '../data/mockData.js'
import { deriveCycleId, getCurrentCycleId } from '../utils/cycle.js'

const DEFAULT_UNCATEGORIZED_ID = 'cat-uncategorized'

export function normalizeCategoryName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')
}

export function buildBudgetMap(categories, budgetCategories) {
  const budgetMap = {}
  categories.forEach((category) => {
    const budget = budgetCategories.find((b) => b.category === category.name)
    budgetMap[category.id] = budget ? Number(budget.amount) || 0 : 0
  })
  return budgetMap
}

export function buildPlanningCosts(subscriptions, categories, cycleId) {
  return subscriptions.map((sub) => {
    const category = categories.find((cat) => cat.name === sub.category)
    return {
      id: `plan-${sub.id}`,
      name: sub.name,
      amount: Number(sub.amount) || 0,
      categoryId: category ? category.id : DEFAULT_UNCATEGORIZED_ID,
      billingDay: Number(sub.day) || 1,
      cycleId,
      status: 'planned',
    }
  })
}

export function createSeedState() {
  const seedAccounts = mockAccounts.map((account, index) => ({
    id: `acc-${index + 1}`,
    name: account.name,
    balance: Number(account.balance) || 0,
  }))

  const seedCategories = Array.isArray(mockCategories) ? mockCategories : []

  const categoryIdByName = seedCategories.reduce((map, category) => {
    map[normalizeCategoryName(category.name)] = category.id
    return map
  }, {})

  const accountIdByName = seedAccounts.reduce((map, account) => {
    map[account.name] = account.id
    return map
  }, {})

  const seedTransactions = mockTransactions.map((transaction) => ({
    id: `txn-${transaction.id}`,
    type: 'expense',
    amount: Number(transaction.amount) || 0,
    fromAccount: accountIdByName[transaction.method] ?? null,
    toAccount: null,
    categoryId:
      categoryIdByName[normalizeCategoryName(transaction.category)] ??
      DEFAULT_UNCATEGORIZED_ID,
    cycleId: deriveCycleId(transaction.date),
    note: transaction.transaction,
    date: transaction.date,
  }))

  const seedBudgets = [
    {
      cycleId: getCurrentCycleId(),
      budgets: buildBudgetMap(seedCategories, mockBudgetCategories),
    },
  ]

  const seedPlanningCosts = buildPlanningCosts(
    mockSubscriptions,
    seedCategories,
    getCurrentCycleId()
  )

  return {
    accounts: seedAccounts,
    baseAccounts: seedAccounts,
    transactions: seedTransactions,
    categories: seedCategories,
    budgets: seedBudgets,
    planningCosts: seedPlanningCosts,
  }
}
