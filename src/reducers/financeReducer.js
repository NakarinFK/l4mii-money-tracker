// Main finance reducer with optimized structure
import { cloneAccounts, recalculateBalances, applyTransaction } from './accountUtils.js'
import {
  normalizeTransactions,
  migrateOpeningBalances,
} from './transactionUtils.js'
import {
  ensureCategories,
  ensureBudgets,
  ensurePlanningCosts,
} from './categoryUtils.js'

function createEmptyState() {
  return {
    accounts: [],
    baseAccounts: [],
    transactions: [],
    categories: [],
    budgets: [],
    planningCosts: [],
  }
}

function normalizeState(state) {
  if (!state || !Array.isArray(state.accounts)) {
    return createEmptyState()
  }
  
  const categories = ensureCategories(state.categories)
  const transactions = normalizeTransactions(state.transactions, categories)
  
  const baseAccounts = Array.isArray(state.baseAccounts)
    ? state.baseAccounts
    : deriveBaseAccountsFromCurrent(state.accounts, transactions)
    
  const migrated = migrateOpeningBalances({ baseAccounts, transactions })
  const budgets = ensureBudgets(state.budgets, categories)
  const planningCosts = ensurePlanningCosts(state.planningCosts, categories)

  const result = recalculateBalances(migrated.baseAccounts, migrated.transactions)
  
  const finalState = {
    accounts: result.accounts,
    baseAccounts: migrated.baseAccounts,
    transactions: result.transactions,
    categories,
    budgets,
    planningCosts,
  }

  return finalState
}

function deriveBaseAccountsFromCurrent(accounts, transactions) {
  const baseAccounts = cloneAccounts(accounts)
  for (const transaction of transactions) {
    // Apply transaction in reverse to get base state
    applyTransaction(baseAccounts, transaction, -1)
  }
  return baseAccounts
}

// Action handlers
const actionHandlers = {
  ADD_TRANSACTION: (state, payload) => {
    const newTransaction = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
    }
    
    const updatedState = {
      ...state,
      transactions: [...state.transactions, newTransaction],
    }
    
    return recalculateBalances(updatedState)
  },

  UPDATE_TRANSACTION: (state, payload) => {
    const { id, ...updates } = payload
    const updatedTransactions = state.transactions.map((tx) =>
      tx.id === id ? { ...tx, ...updates } : tx
    )
    
    const updatedState = {
      ...state,
      transactions: updatedTransactions,
    }
    
    return recalculateBalances(updatedState)
  },

  DELETE_TRANSACTION: (state, payload) => {
    const updatedTransactions = state.transactions.filter((tx) => tx.id !== payload.id)
    
    const updatedState = {
      ...state,
      transactions: updatedTransactions,
    }
    
    return recalculateBalances(updatedState)
  },

  ADD_ACCOUNT: (state, payload) => {
    const newAccount = {
      id: `acc-${Date.now().toString(36)}`,
      ...payload,
    }
    
    return {
      ...state,
      accounts: [...state.accounts, newAccount],
      baseAccounts: [...state.baseAccounts, newAccount],
    }
  },

  UPDATE_ACCOUNT: (state, payload) => {
    const { id, ...updates } = payload
    const updatedAccounts = state.accounts.map((account) =>
      account.id === id ? { ...account, ...updates } : account
    )
    
    const updatedBaseAccounts = state.baseAccounts.map((account) =>
      account.id === id ? { ...account, ...updates } : account
    )
    
    return {
      ...state,
      accounts: updatedAccounts,
      baseAccounts: updatedBaseAccounts,
    }
  },

  DELETE_ACCOUNT: (state, payload) => {
    const updatedAccounts = state.accounts.filter((account) => account.id !== payload.id)
    const updatedBaseAccounts = state.baseAccounts.filter((account) => account.id !== payload.id)
    
    return {
      ...state,
      accounts: updatedAccounts,
      baseAccounts: updatedBaseAccounts,
    }
  },

  ADD_CATEGORY: (state, payload) => {
    const newCategory = {
      id: `cat-${Date.now().toString(36)}`,
      active: true,
      ...payload,
    }
    
    return {
      ...state,
      categories: [...state.categories, newCategory],
    }
  },

  UPDATE_CATEGORY: (state, payload) => {
    const { id, ...updates } = payload
    const updatedCategories = state.categories.map((category) =>
      category.id === id ? { ...category, ...updates } : category
    )
    
    return {
      ...state,
      categories: updatedCategories,
    }
  },

  DELETE_CATEGORY: (state, payload) => {
    const updatedCategories = state.categories.filter((category) => category.id !== payload.id)
    
    return {
      ...state,
      categories: updatedCategories,
    }
  },

  ADD_PLANNING_COST: (state, payload) => {
    const newPlanningCost = {
      id: `plan-${Date.now().toString(36)}`,
      status: 'planned',
      ...payload,
    }
    
    return {
      ...state,
      planningCosts: [...state.planningCosts, newPlanningCost],
    }
  },

  UPDATE_PLANNING_COST: (state, payload) => {
    const { id, ...updates } = payload
    const updatedPlanningCosts = state.planningCosts.map((cost) =>
      cost.id === id ? { ...cost, ...updates } : cost
    )
    
    return {
      ...state,
      planningCosts: updatedPlanningCosts,
    }
  },

  DELETE_PLANNING_COST: (state, payload) => {
    const updatedPlanningCosts = state.planningCosts.filter((cost) => cost.id !== payload.id)
    
    return {
      ...state,
      planningCosts: updatedPlanningCosts,
    }
  },

  UPDATE_BUDGET: (state, payload) => {
    const { cycleId, categoryId, amount } = payload
    const existingBudget = state.budgets.find((budget) => budget.cycleId === cycleId)
    const currentBudgets = existingBudget?.budgets || {}
    
    const updatedBudgets = {
      ...currentBudgets,
      [categoryId]: amount,
    }

    const newBudgetsArray = existingBudget
      ? state.budgets.map((budget) =>
          budget.cycleId === cycleId ? { ...budget, budgets: updatedBudgets } : budget
        )
      : [...state.budgets, { cycleId, budgets: updatedBudgets }]
    
    return {
      ...state,
      budgets: newBudgetsArray,
    }
  },
}

export function financeReducer(state, action) {
  if (!state) {
    return createEmptyState()
  }
  
  const handler = actionHandlers[action.type]
  if (handler) {
    return handler(state, action.payload)
  }
  
  return state
}

export function initFinanceState(persistedState) {
  return normalizeState(persistedState)
}
