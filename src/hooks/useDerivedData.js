import { useMemo } from 'react'
import {
  buildAccountSummaries,
  buildCashFlow,
  buildKpis,
  buildTransactionRows,
} from '../utils/financeSelectors.js'

export function useDerivedData(state, activeCycleId, viewMode = 'cycle') {
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
    const isAllView = viewMode === 'all'

    const activeProfile = budgets.find(
      (profile) => profile.cycleId === activeCycleId
    )
    const activeBudgetMap = activeProfile?.budgets || {}

    // Memoize expensive calculations
    const plannedTotal = (state.planningCosts || [])
      .filter(
        (cost) =>
          cost.status === 'planned' &&
          (isAllView || cost.cycleId === activeCycleId)
      )
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0)

    const spentTotal = (state.transactions || [])
      .filter(
        (transaction) =>
          transaction.type === 'expense' &&
          (isAllView || transaction.cycleId === activeCycleId)
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
    const accounts = buildAccountSummaries(state.accounts || [], state.transactions || [])
    const transactions = buildTransactionRows(
      state.transactions || [],
      state.accounts || [],
      state.categories || []
    )
    const cashFlow = buildCashFlow(state.transactions || [], state.categories || [])
    const kpis = buildKpis({
      accounts: state.accounts || [],
      transactions: state.transactions || [],
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
    viewMode,
  ])
}
