// Account management utilities
export function cloneAccounts(accounts) {
  if (!Array.isArray(accounts)) {
    console.warn('cloneAccounts: accounts is not an array', accounts)
    return []
  }
  return accounts.map((account) => ({ ...account }))
}

export function applyTransaction(accounts, transaction, direction = 1) {
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

export function adjustAccount(accounts, accountId, delta) {
  if (!accountId) return
  const index = accounts.findIndex((account) => account.id === accountId)
  if (index === -1) return
  const current = accounts[index]
  accounts[index] = {
    ...current,
    balance: Number(current.balance) + delta,
  }
}

export function recalculateBalances(accounts, transactions) {
  if (!Array.isArray(accounts)) {
    console.warn('recalculateBalances: accounts is not an array', accounts)
    return { accounts: [], transactions: transactions || [] }
  }
  
  const clonedAccounts = cloneAccounts(accounts)
  
  // Reset to base balances
  clonedAccounts.forEach((account, index) => {
    const baseAccount = accounts.find((acc) => acc.id === account.id)
    clonedAccounts[index] = { ...account, balance: baseAccount.balance || 0 }
  })

  // Apply all transactions
  if (Array.isArray(transactions)) {
    transactions.forEach((transaction) => {
      applyTransaction(clonedAccounts, transaction, 1)
    })
  }

  return { accounts: clonedAccounts, transactions: transactions || [] }
}
