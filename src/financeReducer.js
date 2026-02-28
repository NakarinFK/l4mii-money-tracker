import {
  accounts as mockAccounts,
  budgetCategories as mockBudgetCategories,
  categories as mockCategories,
  subscriptions as mockSubscriptions,
  transactions as mockTransactions,
} from './data/mockData.js'
import { deriveCycleId, getCurrentCycleId } from './utils/cycle.js'

const DEFAULT_UNCATEGORIZED_ID = 'cat-uncategorized'

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

const seedState = {
  accounts: seedAccounts,
  baseAccounts: seedAccounts,
  transactions: seedTransactions,
  categories: seedCategories,
  budgets: seedBudgets,
  planningCosts: seedPlanningCosts,
}

const cloneAccounts = (accounts) => accounts.map((account) => ({ ...account }))

function applyTransaction(accounts, transaction, direction = 1) {
  const amount = Number(transaction.amount) || 0
  if (!amount) return

  if (transaction.type === 'opening') {
    adjustAccount(accounts, transaction.toAccount, amount * direction)
    return
  }

  if (transaction.type === 'income') {
    adjustAccount(accounts, transaction.toAccount, amount * direction)
    return
  }

  if (transaction.type === 'expense') {
    adjustAccount(accounts, transaction.fromAccount, -amount * direction)
    return
  }

  if (transaction.type === 'transfer') {
    adjustAccount(accounts, transaction.fromAccount, -amount * direction)
    adjustAccount(accounts, transaction.toAccount, amount * direction)
  }
}

function adjustAccount(accounts, accountId, delta) {
  if (!accountId) return
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index === -1) return
  const current = accounts[index]
  accounts[index] = {
    ...current,
    balance: Number(current.balance) + delta,
  }
}

function deriveBaseAccountsFromCurrent(accounts, transactions) {
  const baseAccounts = cloneAccounts(accounts)
  for (const transaction of transactions) {
    applyTransaction(baseAccounts, transaction, -1)
  }
  return baseAccounts
}

function recalculateBalances(state) {
  const accounts = cloneAccounts(state.baseAccounts)
  for (const transaction of state.transactions) {
    applyTransaction(accounts, transaction, 1)
  }
  return { ...state, accounts }
}

function normalizeState(state) {
  if (!state || !Array.isArray(state.accounts)) return seedState
  const categories = ensureCategories(state.categories)
  const transactions = normalizeTransactions(state.transactions, categories)
  const baseAccounts = Array.isArray(state.baseAccounts)
    ? state.baseAccounts
    : deriveBaseAccountsFromCurrent(state.accounts, transactions)
  const migrated = migrateOpeningBalances({ baseAccounts, transactions })
  const budgets = ensureBudgets(state.budgets, categories)
  const planningCosts = ensurePlanningCosts(state.planningCosts, categories)

  return recalculateBalances({
    accounts: state.accounts,
    baseAccounts: migrated.baseAccounts,
    transactions: migrated.transactions,
    categories,
    budgets,
    planningCosts,
  })
}

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function normalizeCategoryName(name) {
  return String(name || '').trim().toLowerCase()
}

function slugifyCategory(name) {
  return normalizeCategoryName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function createCategoryId(name, categories) {
  const baseSlug = slugifyCategory(name)
  const base = baseSlug ? `cat-${baseSlug}` : `cat-${createId()}`
  let candidate = base
  let counter = 2
  const existing = new Set(categories.map((category) => category.id))
  while (existing.has(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

function buildBudgetMap(categories, budgetCategories) {
  const map = categories.reduce((acc, category) => {
    acc[category.id] = 0
    return acc
  }, {})
  if (Array.isArray(budgetCategories)) {
    budgetCategories.forEach((item) => {
      const id = categoryIdByName[normalizeCategoryName(item.name)]
      if (id) {
        map[id] = Number(item.budget) || 0
      }
    })
  }
  return map
}

function buildPlanningCosts(subscriptions, categories, cycleId) {
  const categoryMap = new Map(
    categories.map((category) => [normalizeCategoryName(category.name), category.id])
  )
  const defaultCategoryId =
    categoryMap.get('subscription') || DEFAULT_UNCATEGORIZED_ID
  if (!Array.isArray(subscriptions)) return []
  return subscriptions.map((item, index) => {
    const date = new Date(item.nextDate || Date.now())
    const billingDay = Number.isNaN(date.getTime()) ? 1 : date.getDate()
    return {
      id: `plan-${index + 1}`,
      name: item.name,
      amount: Number(item.cost) || 0,
      categoryId: defaultCategoryId,
      billingDay,
      cycleId,
      status: 'planned',
    }
  })
}

function ensureCategories(categories) {
  const list = Array.isArray(categories) ? categories : []
  const merged = [...seedCategories]
  const indexById = new Map(merged.map((category, index) => [category.id, index]))

  list.forEach((category) => {
    if (!category || !category.id) return
    const index = indexById.get(category.id)
    if (index !== undefined) {
      merged[index] = category
    } else {
      merged.push(category)
    }
  })

  if (!merged.find((category) => category.id === DEFAULT_UNCATEGORIZED_ID)) {
    merged.push({
      id: DEFAULT_UNCATEGORIZED_ID,
      name: 'Uncategorized',
      disabled: false,
    })
  }

  return merged
}

function ensureBudgets(budgets, categories) {
  const list = Array.isArray(budgets) ? budgets : []
  const activeCycleId = getCurrentCycleId()
  if (list.find((profile) => profile.cycleId === activeCycleId)) {
    return list
  }
  const seed =
    list.length === 0
      ? buildBudgetMap(categories, mockBudgetCategories)
      : {}
  return [
    ...list,
    {
      cycleId: activeCycleId,
      budgets: seed,
    },
  ]
}

function ensurePlanningCosts(planningCosts, categories) {
  if (Array.isArray(planningCosts)) {
    return planningCosts.map((cost) => ({
      ...cost,
      amount: Number(cost.amount) || 0,
      categoryId: cost.categoryId || DEFAULT_UNCATEGORIZED_ID,
      cycleId: cost.cycleId || getCurrentCycleId(),
      billingDay: Number(cost.billingDay) || 1,
      status: cost.status || 'planned',
    }))
  }
  return buildPlanningCosts(mockSubscriptions, categories, getCurrentCycleId())
}

function normalizeTransactions(transactions, categories) {
  const list = Array.isArray(transactions) ? transactions : []
  const nameMap = new Map(
    categories.map((category) => [
      normalizeCategoryName(category.name),
      category.id,
    ])
  )

  return list.map((transaction) => {
    const { category, ...rest } = transaction || {}
    const cycleId = rest.cycleId || deriveCycleId(rest.date)
    if (rest.type === 'opening') {
      return {
        ...rest,
        categoryId: rest.categoryId ?? null,
        cycleId,
      }
    }
    const categoryId =
      rest.categoryId ||
      nameMap.get(normalizeCategoryName(category)) ||
      DEFAULT_UNCATEGORIZED_ID
    return {
      ...rest,
      categoryId,
      cycleId,
    }
  })
}

function migrateOpeningBalances({ baseAccounts, transactions }) {
  const cycleId = getCurrentCycleId()
  const openingKeys = new Set(
    transactions
      .filter((transaction) => transaction?.type === 'opening')
      .map((transaction) => `${transaction.toAccount}|${transaction.cycleId || cycleId}`)
  )
  let updated = false
  let nextTransactions = [...transactions]

  baseAccounts.forEach((account) => {
    const amount = Number(account.balance || 0)
    if (!amount) return
    updated = true
    const key = `${account.id}|${cycleId}`
    if (openingKeys.has(key)) return
    nextTransactions.push({
      id: createId(),
      type: 'opening',
      amount,
      fromAccount: null,
      toAccount: account.id,
      categoryId: null,
      cycleId,
      note: 'Opening Balance',
      date: `${cycleId}-01`,
    })
  })

  const nextBaseAccounts = updated
    ? baseAccounts.map((account) => ({ ...account, balance: 0 }))
    : baseAccounts

  return {
    baseAccounts: nextBaseAccounts,
    transactions: nextTransactions,
  }
}

function resolveCategoryId(payload, categories, fallback) {
  if (payload.categoryId) return payload.categoryId
  if (payload.category) {
    const nameMap = new Map(
      categories.map((category) => [
        normalizeCategoryName(category.name),
        category.id,
      ])
    )
    return (
      nameMap.get(normalizeCategoryName(payload.category)) ||
      DEFAULT_UNCATEGORIZED_ID
    )
  }
  return fallback ? DEFAULT_UNCATEGORIZED_ID : undefined
}

export function initFinanceState(snapshot) {
  if (snapshot) {
    return normalizeState(snapshot)
  }
  return normalizeState(seedState)
}

export function persistFinanceState() {
  return undefined
}

export function financeReducer(state, action) {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const payload = action.payload || {}
      const categoryId = resolveCategoryId(payload, state.categories, true)
      const transaction = {
        id: createId(),
        type: payload.type || 'expense',
        amount: Math.abs(Number(payload.amount) || 0),
        fromAccount: payload.fromAccount ?? null,
        toAccount: payload.toAccount ?? null,
        categoryId,
        cycleId: deriveCycleId(payload.date),
        note: payload.note || '',
        date: payload.date || new Date().toISOString().slice(0, 10),
      }

      const nextState = {
        ...state,
        transactions: [transaction, ...state.transactions],
      }

      return recalculateBalances(nextState)
    }
    case 'DELETE_TRANSACTION': {
      const id = action.payload?.id
      if (!id) return state
      const nextState = {
        ...state,
        transactions: state.transactions.filter((item) => item.id !== id),
      }
      return recalculateBalances(nextState)
    }
    case 'UPDATE_TRANSACTION': {
      const payload = action.payload || {}
      const id = payload.id
      if (!id) return state
      const transactions = state.transactions.map((transaction) => {
        if (transaction.id !== id) return transaction
        const nextCategoryId =
          resolveCategoryId(payload, state.categories, false) ??
          transaction.categoryId
        const nextDate = payload.date ?? transaction.date
        const nextAmount = Math.abs(
          Number(
            Object.prototype.hasOwnProperty.call(payload, 'amount')
              ? payload.amount
              : transaction.amount
          ) || 0
        )
        return {
          ...transaction,
          type: payload.type ?? transaction.type,
          amount: nextAmount,
          fromAccount: Object.prototype.hasOwnProperty.call(payload, 'fromAccount')
            ? payload.fromAccount
            : transaction.fromAccount,
          toAccount: Object.prototype.hasOwnProperty.call(payload, 'toAccount')
            ? payload.toAccount
            : transaction.toAccount,
          categoryId: nextCategoryId,
          cycleId: payload.cycleId ?? deriveCycleId(nextDate),
          note: payload.note ?? transaction.note,
          date: nextDate,
        }
      })
      return recalculateBalances({ ...state, transactions })
    }
    case 'ADD_CATEGORY': {
      const payload = action.payload || {}
      const name = String(payload.name || '').trim()
      if (!name) return state
      const normalized = normalizeCategoryName(name)
      if (
        state.categories.some(
          (category) => normalizeCategoryName(category.name) === normalized
        )
      ) {
        return state
      }
      const id = payload.id || createCategoryId(name, state.categories)
      const type = payload.type === 'income' ? 'income' : 'expense'
      const active =
        typeof payload.active === 'boolean' ? payload.active : true
      return {
        ...state,
        categories: [
          ...state.categories,
          { id, name, type, active, disabled: false },
        ],
      }
    }
    case 'UPDATE_CATEGORY':
    case 'RENAME_CATEGORY': {
      const payload = action.payload || {}
      if (!payload.id) return state
      const name = String(payload.name || '').trim()
      if (!name) return state
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === payload.id
            ? {
                ...category,
                name,
                type: payload.type || category.type,
              }
            : category
        ),
      }
    }
    case 'DISABLE_CATEGORY': {
      const id = action.payload?.id
      if (!id) return state
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === id ? { ...category, disabled: true } : category
        ),
      }
    }
    case 'ENABLE_CATEGORY': {
      const id = action.payload?.id
      if (!id) return state
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === id ? { ...category, disabled: false } : category
        ),
      }
    }
    case 'DELETE_CATEGORY': {
      const id = action.payload?.id
      if (!id) return state
      const budgets = Array.isArray(state.budgets) ? state.budgets : []
      const cleanedBudgets = budgets.map((profile) => {
        if (!profile?.budgets) {
          return profile
        }
        if (!Object.prototype.hasOwnProperty.call(profile.budgets, id)) {
          return profile
        }
        const nextBudgets = { ...profile.budgets }
        delete nextBudgets[id]
        return { ...profile, budgets: nextBudgets }
      })
      return {
        ...state,
        categories: state.categories.filter((category) => category.id !== id),
        budgets: cleanedBudgets,
      }
    }
    case 'UPDATE_BUDGET': {
      const payload = action.payload || {}
      const cycleId = payload.cycleId || getCurrentCycleId()
      const categoryId = payload.categoryId
      if (!categoryId) return state
      const amount = Number(payload.amount) || 0
      const budgets = Array.isArray(state.budgets) ? state.budgets : []
      const existing = budgets.find((profile) => profile.cycleId === cycleId)
      if (!existing) {
        return {
          ...state,
          budgets: [
            ...budgets,
            { cycleId, budgets: { [categoryId]: amount } },
          ],
        }
      }
      return {
        ...state,
        budgets: budgets.map((profile) =>
          profile.cycleId === cycleId
            ? {
                ...profile,
                budgets: {
                  ...profile.budgets,
                  [categoryId]: amount,
                },
              }
            : profile
        ),
      }
    }
    case 'ADD_PLANNING_COST': {
      const payload = action.payload || {}
      const name = String(payload.name || '').trim()
      if (!name) return state
      const amount = Number(payload.amount) || 0
      const categoryId =
        payload.categoryId || DEFAULT_UNCATEGORIZED_ID
      const billingDay = Number(payload.billingDay) || 1
      const cycleId = payload.cycleId || getCurrentCycleId()
      const status = payload.status || 'planned'
      const newCost = {
        id: createId(),
        name,
        amount,
        categoryId,
        billingDay,
        cycleId,
        status,
      }
      return {
        ...state,
        planningCosts: [...(state.planningCosts || []), newCost],
      }
    }
    case 'UPDATE_PLANNING_COST': {
      const payload = action.payload || {}
      if (!payload.id) return state
      return {
        ...state,
        planningCosts: (state.planningCosts || []).map((cost) =>
          cost.id === payload.id
            ? {
                ...cost,
                name: payload.name ?? cost.name,
                amount:
                  payload.amount !== undefined
                    ? Number(payload.amount) || 0
                    : cost.amount,
                categoryId: payload.categoryId ?? cost.categoryId,
                billingDay:
                  payload.billingDay !== undefined
                    ? Number(payload.billingDay) || 1
                    : cost.billingDay,
                cycleId: payload.cycleId ?? cost.cycleId,
                status: payload.status ?? cost.status,
              }
            : cost
        ),
      }
    }
    case 'DELETE_PLANNING_COST': {
      const id = action.payload?.id
      if (!id) return state
      return {
        ...state,
        planningCosts: (state.planningCosts || []).filter(
          (cost) => cost.id !== id
        ),
      }
    }
    case 'SET_PLANNING_STATUS': {
      const payload = action.payload || {}
      if (!payload.id) return state
      return {
        ...state,
        planningCosts: (state.planningCosts || []).map((cost) =>
          cost.id === payload.id
            ? { ...cost, status: payload.status || cost.status }
            : cost
        ),
      }
    }
    case 'PAY_PLANNING_COST': {
      const payload = action.payload || {}
      const planningCostId = payload.planningCostId
      const accountId = payload.accountId
      if (!planningCostId || !accountId) return state
      const planningCost = (state.planningCosts || []).find(
        (cost) => cost.id === planningCostId
      )
      if (!planningCost) return state
      const dateValue = payload.date || new Date().toISOString().slice(0, 10)
      const transaction = {
        id: createId(),
        type: 'expense',
        amount: Number(planningCost.amount) || 0,
        fromAccount: accountId,
        toAccount: null,
        categoryId: planningCost.categoryId,
        cycleId: planningCost.cycleId,
        planningCostId: planningCost.id,
        note: planningCost.name,
        date: dateValue,
      }
      const nextPlanningCosts = (state.planningCosts || []).map((cost) =>
        cost.id === planningCostId ? { ...cost, status: 'done' } : cost
      )
      return recalculateBalances({
        ...state,
        transactions: [transaction, ...state.transactions],
        planningCosts: nextPlanningCosts,
      })
    }
    case 'SET_OPENING_BALANCE': {
      const payload = action.payload || {}
      const accountId = payload.accountId
      const cycleId = payload.cycleId || getCurrentCycleId()
      if (!accountId) return state
      const amount = Number(payload.amount)
      if (Number.isNaN(amount)) return state

      const filtered = state.transactions.filter(
        (transaction) =>
          !(
            transaction.type === 'opening' &&
            transaction.toAccount === accountId &&
            transaction.cycleId === cycleId
          )
      )

      const nextTransactions =
        amount !== 0
          ? [
              {
                id: createId(),
                type: 'opening',
                amount,
                fromAccount: null,
                toAccount: accountId,
                categoryId: null,
                cycleId,
                note: 'Opening Balance',
                date: `${cycleId}-01`,
              },
              ...filtered,
            ]
          : filtered

      return recalculateBalances({ ...state, transactions: nextTransactions })
    }
    case 'ADJUST_ACCOUNT_BALANCE': {
      const payload = action.payload || {}
      const accountId = payload.accountId
      if (!accountId) return state
      const targetBalance = Number(payload.targetBalance)
      if (Number.isNaN(targetBalance)) return state

      const currentAccount = state.accounts.find(
        (account) => account.id === accountId
      )
      if (!currentAccount) return state

      const delta = targetBalance - Number(currentAccount.balance || 0)

      const baseAccounts = state.baseAccounts.map((account) =>
        account.id === accountId
          ? { ...account, balance: Number(account.balance || 0) + delta }
          : account
      )

      return recalculateBalances({ ...state, baseAccounts })
    }
    case 'ADD_ACCOUNT': {
      const payload = action.payload || {}
      const openingAmount = Number(payload.balance) || 0
      const newAccount = {
        id: createId(),
        name: payload.name || 'New Account',
        balance: 0,
      }
      const cycleId = getCurrentCycleId()
      const nextTransactions =
        openingAmount !== 0
          ? [
              {
                id: createId(),
                type: 'opening',
                amount: openingAmount,
                fromAccount: null,
                toAccount: newAccount.id,
                categoryId: null,
                cycleId,
                note: 'Opening Balance',
                date: `${cycleId}-01`,
              },
              ...state.transactions,
            ]
          : state.transactions
      return recalculateBalances({
        ...state,
        accounts: [...state.accounts, newAccount],
        baseAccounts: [...state.baseAccounts, newAccount],
        transactions: nextTransactions,
      })
    }
    case 'RECALCULATE_BALANCES': {
      return recalculateBalances(state)
    }
    default:
      return state
  }
}
