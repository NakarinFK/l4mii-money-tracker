import { lazy } from 'react'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

// Lazy load heavy components
export const LazyTransactionForm = lazy(() => import('../components/TransactionForm.jsx'))
export const LazyPlanningCostSection = lazy(() => import('../components/PlanningCostSection.jsx'))
export const LazyCategoryManager = lazy(() => import('../components/CategoryManager.jsx'))
export const LazyDashboardLayout = lazy(() => import('../ui/layout/DashboardLayout.tsx'))

// Wrapper components with error boundaries
export function LazyTransactionFormWrapper(props) {
  return (
    <ErrorBoundary>
      <LazyTransactionForm {...props} />
    </ErrorBoundary>
  )
}

export function LazyPlanningCostSectionWrapper(props) {
  return (
    <ErrorBoundary>
      <LazyPlanningCostSection {...props} />
    </ErrorBoundary>
  )
}

export function LazyCategoryManagerWrapper(props) {
  return (
    <ErrorBoundary>
      <LazyCategoryManager {...props} />
    </ErrorBoundary>
  )
}

export function LazyDashboardLayoutWrapper(props) {
  return (
    <ErrorBoundary>
      <LazyDashboardLayout {...props} />
    </ErrorBoundary>
  )
}
