import type { ComponentType } from 'react'
import AccountsSection from '../../components/AccountsSection.jsx'
import AddAccountForm from '../../components/AddAccountForm.jsx'
import BudgetSection from '../../components/BudgetSection.jsx'
import CashFlowSection from '../../components/CashFlowSection.jsx'
import CategoryManager from '../../components/CategoryManager.jsx'
import PlanningCostSection from '../../components/PlanningCostSection.jsx'
import TransactionsTable from '../../components/TransactionsTable.jsx'
import TransactionForm from '../../components/TransactionForm.jsx'
import SelectedAccountBanner from './SelectedAccountBanner.tsx'

export type BlockId =
  | 'accounts'
  | 'add-account'
  | 'planning-costs'
  | 'budget-plan'
  | 'category-manager'
  | 'cash-flow'
  | 'transaction-form'
  | 'account-selection'
  | 'transactions-table'

export type BlockContext = {
  accounts: any[]
  categories: any[]
  budgets: any[]
  activeCycleId: string
  viewMode: 'cycle' | 'all'
  planningCosts: any[]
  cashFlow: any
  transactions: any[]
  formAccounts: any[]
  rawTransactions: any[]
  dispatch: any
  selectedAccountId: string | null
  selectedAccountName?: string
  onSelectAccount: (accountId: string) => void
  onClearSelection: () => void
  editingTransaction: any
  onSubmitTransaction: (payload: any) => void
  onCancelEdit: () => void
  onEditTransaction: (id: string) => void
  onDeleteTransaction: (id: string) => void
  visibleTransactions: any[]
}

export type BlockDefinition = {
  id: BlockId
  label: string
  Component: ComponentType<any>
  getProps: (context: BlockContext) => Record<string, unknown>
}

export const BLOCK_CATALOG: Record<BlockId, BlockDefinition> = {
  accounts: {
    id: 'accounts',
    label: 'Accounts',
    Component: AccountsSection,
    getProps: (context) => ({
      accounts: context.accounts,
      onSelect: context.onSelectAccount,
      selectedAccountId: context.selectedAccountId,
      dispatch: context.dispatch,
      transactions: context.rawTransactions,
      activeCycleId: context.activeCycleId,
    }),
  },
  'add-account': {
    id: 'add-account',
    label: 'Add Account',
    Component: AddAccountForm,
    getProps: (context) => ({
      dispatch: context.dispatch,
    }),
  },
  'planning-costs': {
    id: 'planning-costs',
    label: 'Planning Cost',
    Component: PlanningCostSection,
    getProps: (context) => ({
      planningCosts: context.planningCosts,
      categories: context.categories,
      accounts: context.formAccounts,
      activeCycleId: context.activeCycleId,
      viewMode: context.viewMode,
      dispatch: context.dispatch,
    }),
  },
  'budget-plan': {
    id: 'budget-plan',
    label: 'Budget Plan',
    Component: BudgetSection,
    getProps: (context) => ({
      categories: context.categories,
      budgets: context.budgets,
      activeCycleId: context.activeCycleId,
      viewMode: context.viewMode,
      transactions: context.rawTransactions,
      dispatch: context.dispatch,
    }),
  },
  'category-manager': {
    id: 'category-manager',
    label: 'Categories',
    Component: CategoryManager,
    getProps: (context) => ({
      categories: context.categories,
      transactions: context.rawTransactions,
      budgets: context.budgets,
      planningCosts: context.planningCosts,
      dispatch: context.dispatch,
    }),
  },
  'cash-flow': {
    id: 'cash-flow',
    label: 'Cash Flow',
    Component: CashFlowSection,
    getProps: (context) => ({
      inflow: context.cashFlow.inflow,
      outflow: context.cashFlow.outflow,
      breakdown: context.cashFlow.breakdown,
    }),
  },
  'transaction-form': {
    id: 'transaction-form',
    label: 'Transaction Form',
    Component: TransactionForm,
    getProps: (context) => ({
      accounts: context.formAccounts,
      categories: context.categories,
      editingTransaction: context.editingTransaction,
      onSubmit: context.onSubmitTransaction,
      onCancel: context.onCancelEdit,
      dispatch: context.dispatch,
    }),
  },
  'account-selection': {
    id: 'account-selection',
    label: 'Selected Account',
    Component: SelectedAccountBanner,
    getProps: (context) => ({
      selectedAccountId: context.selectedAccountId,
      selectedAccountName: context.selectedAccountName,
      onClearSelection: context.onClearSelection,
    }),
  },
  'transactions-table': {
    id: 'transactions-table',
    label: 'Transactions Table',
    Component: TransactionsTable,
    getProps: (context) => ({
      rows: context.visibleTransactions,
      onEdit: context.onEditTransaction,
      onDelete: context.onDeleteTransaction,
    }),
  },
}
