import { useMemo } from 'react'
import {
  buildAccountSummaries,
  buildCashFlow,
  buildKpis,
  buildTransactionRows,
} from '../utils/financeSelectors.js'
import { resolveCycleId } from '../utils/cycle.js'

export function useDerivedData(state, activeCycleId, selectedCycleId = 'current') {
  return useMemo(() => {
    // Early return if state is empty or accounts is not an array
    if (!state || !Array.isArray(state.accounts)) {
      return {
        accounts: [],
        transactions: [],
        cashFlow: [],
        activeBudgetMap: {},
        budgetTotal: 0,
        spentTotal: 0,
        plannedTotal: 0,
        kpis: {},
      }
    }

    const budgets = state.budgets || []
    const { scopedCycleId, isAllView, matchesCycle } = resolveCycleId(selectedCycleId, activeCycleId)

    const activeProfile = scopedCycleId
      ? budgets.find((profile) => profile.cycleId === scopedCycleId)
      : null
    const activeBudgetMap = activeProfile?.budgets || {}

    // Memoize expensive calculations
    const plannedTotal = (state.planningCosts || [])
      .filter(
        (cost) =>
          cost.status === 'planned' &&
          matchesCycle(cost.cycleId)
      )
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0)

    const spentTotal = (state.transactions || [])
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          matchesCycle(transaction.cycleId)
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const budgetTotal = isAllView
      ? budgets.reduce(
          (sum, profile) =>
            sum +
            Object.values(profile?.budgets || {}).reduce(
              (profileSum, value) => profileSum + Number(value || 0),
              0
            ),
          0
        )
      : Object.values(activeBudgetMap).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        )

    // Build derived data only when needed
    const scopedTransactions = isAllView
      ? state.transactions || []
      : (state.transactions || []).filter((transaction) =>
          matchesCycle(transaction.cycleId)
        )
    const accounts = buildAccountSummaries(state.accounts || [], state.transactions || [])
    const transactions = buildTransactionRows(
      scopedTransactions,
      state.accounts || [],
      state.categories || []
    )
    const cashFlow = buildCashFlow(scopedTransactions, state.categories || [])
    const kpis = buildKpis({
      accounts: state.accounts || [],
      transactions: scopedTransactions,
      budgetTotal,
      spentTotal,
      plannedTotal,
    })

    return {
      accounts,
      transactions,
      cashFlow,
      activeBudgetMap,
      budgetTotal,
      spentTotal,
      plannedTotal,
      kpis,
    }
  }, [
    state.accounts,
    state.budgets,
    state.categories,
    state.transactions,
    state.planningCosts,
    activeCycleId,
    selectedCycleId,
  ])
}
