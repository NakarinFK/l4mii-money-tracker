// Transaction management utilities
import { cloneAccounts, adjustAccount } from './accountUtils.js'

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function normalizeCategoryName(name) {
  return String(name || '').trim().toLowerCase()
}

export function slugifyCategory(name) {
  return normalizeCategoryName(name)
}

export function normalizeTransactions(transactions, categories) {
  if (!Array.isArray(transactions)) return []
  return transactions.map((transaction) => {
    const normalized = { ...transaction }
    if (!normalized.id) {
      normalized.id = createId()
    }
    if (typeof normalized.amount === 'string') {
      normalized.amount = Number(normalized.amount) || 0
    }
    return normalized
  })
}

export function migrateOpeningBalances({ baseAccounts, transactions }) {
  const openingTransactions = transactions.filter(
    (tx) => tx.type === 'opening'
  )
  if (openingTransactions.length === 0) {
    return { baseAccounts, transactions }
  }

  const migratedBaseAccounts = cloneAccounts(baseAccounts)
  for (const openingTx of openingTransactions) {
    adjustAccount(migratedBaseAccounts, openingTx.toAccount, openingTx.amount)
  }

  const migratedTransactions = transactions.filter(
    (tx) => tx.type !== 'opening'
  )

  return {
    baseAccounts: migratedBaseAccounts,
    transactions: migratedTransactions,
  }
}
