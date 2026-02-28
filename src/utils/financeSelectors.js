import { formatCurrency } from './format.js'

const CASHFLOW_COLORS = [
  '#f97316', // orange
  '#38bdf8', // sky
  '#22c55e', // green
  '#eab308', // yellow
  '#6366f1', // indigo
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#ef4444', // red
  '#3b82f6', // blue
]

export function buildAccountSummaries(accounts, transactions) {
  const incomeByAccount = new Map()
  const expenseByAccount = new Map()

  transactions.forEach((transaction) => {
    if (transaction.type === 'income' && transaction.toAccount) {
      incomeByAccount.set(
        transaction.toAccount,
        (incomeByAccount.get(transaction.toAccount) || 0) +
          Number(transaction.amount || 0)
      )
    }

    if (transaction.type === 'expense' && transaction.fromAccount) {
      expenseByAccount.set(
        transaction.fromAccount,
        (expenseByAccount.get(transaction.fromAccount) || 0) +
          Number(transaction.amount || 0)
      )
    }
  })

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    balance: account.balance,
    income: incomeByAccount.get(account.id) || 0,
    expenses: expenseByAccount.get(account.id) || 0,
  }))
}

export function buildCashFlow(transactions, categories) {
  const inflow = sumByType(transactions, 'income')
  const outflow = sumByType(transactions, 'expense')
  const breakdownMap = new Map()
  const categoryMap = new Map(
    (categories || []).map((category) => [category.id, category])
  )

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') return
    const category =
      categoryMap.get(transaction.categoryId) || { name: 'Uncategorized' }
    const key = category.name
    breakdownMap.set(key, (breakdownMap.get(key) || 0) + transaction.amount)
  })

  const breakdown = Array.from(breakdownMap.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: CASHFLOW_COLORS[index % CASHFLOW_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)

  return { inflow, outflow, breakdown }
}

export function buildTransactionRows(transactions, accounts, categories) {
  const accountMap = new Map(accounts.map((account) => [account.id, account.name]))
  const categoryMap = new Map(
    (categories || []).map((category) => [category.id, category])
  )

  return transactions.map((transaction) => {
    const fromName = transaction.fromAccount
      ? accountMap.get(transaction.fromAccount) || 'Unknown'
      : '—'
    const toName = transaction.toAccount
      ? accountMap.get(transaction.toAccount) || 'Unknown'
      : '—'
    const category = categoryMap.get(transaction.categoryId)
    const categoryName = category?.name || 'Uncategorized'
    const categoryDisabled = Boolean(category?.disabled)

    let method = '—'
    if (transaction.type === 'income') {
      method = toName
    } else if (transaction.type === 'expense') {
      method = fromName
    } else if (transaction.type === 'transfer') {
      method = `${fromName} → ${toName}`
    } else if (transaction.type === 'opening') {
      method = toName
    }

    const isOpening = transaction.type === 'opening'
    const displayCategory = isOpening
      ? 'Opening'
      : transaction.type === 'transfer'
        ? 'Transfer'
        : categoryName
    const displayTitle =
      transaction.note ||
      (isOpening ? 'Opening Balance' : categoryName) ||
      transaction.type

    return {
      id: transaction.id,
      transaction: displayTitle,
      amount: transaction.amount,
      category: displayCategory,
      categoryDisabled,
      categoryId: transaction.categoryId,
      type: transaction.type,
      method,
      date: transaction.date,
      cycleStart: transaction.date,
    }
  })
}

export function buildKpis({
  accounts,
  transactions,
  budgetTotal,
  spentTotal,
  plannedTotal,
}) {
  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  )
  const inflow = sumByType(transactions, 'income')
  const outflow = sumByType(transactions, 'expense')
  const plannedCosts = Number(plannedTotal || 0)
  const availableBalance = totalBalance - plannedCosts

  return [
    {
      label: 'Total Balance',
      value: formatCurrency(totalBalance),
      note: `Available after planned: ${formatCurrency(availableBalance)}`,
    },
    {
      label: 'Cash Flow (This Month)',
      value: formatCurrency(inflow - outflow),
      note: `Inflow ${formatCurrency(inflow)} · Outflow ${formatCurrency(outflow)}`,
    },
    {
      label: 'Planned Costs',
      value: formatCurrency(plannedCosts),
      note: 'Planned for the active cycle',
    },
    {
      label: 'Budget Left',
      value: `${formatCurrency(spentTotal || 0)} / ${formatCurrency(budgetTotal || 0)}`,
      note: 'Spent / Total Budget',
    },
  ]
}

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
}
