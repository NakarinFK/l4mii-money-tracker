// Category and budget management utilities
import { buildBudgetMap } from './seedData.js'
import { getCurrentCycleId } from '../utils/cycle.js'

export function ensureCategories(categories) {
  if (!Array.isArray(categories)) {
    return []
  }
  return categories
}

export function ensureBudgets(budgets, categories) {
  // Preserve persisted budgets; only create default if completely missing
  if (Array.isArray(budgets) && budgets.length > 0) {
    return budgets
  }
  // No budgets persisted: create a default empty budget for current cycle
  const currentCycleId = getCurrentCycleId()
  return [
    {
      cycleId: currentCycleId,
      budgets: buildBudgetMap(categories, []),
    },
  ]
}

export function ensurePlanningCosts(planningCosts, categories) {
  if (!Array.isArray(planningCosts)) {
    return []
  }
  return planningCosts
}

export function isCategoryActive(category) {
  if (!category) return false
  if (typeof category.disabled === 'boolean') return !category.disabled
  if (typeof category.active === 'boolean') return category.active
  return true
}

export function matchesCategoryType(category, type) {
  if (!category) return false
  const expectedType = type === 'income' ? 'income' : 'expense'
  const categoryType = category.type === 'income' ? 'income' : 'expense'
  return categoryType === expectedType
}

export function getDefaultCategoryId(categories, type) {
  const activeCategories = categories.filter(isCategoryActive)
  const matchingCategories = activeCategories.filter((cat) =>
    matchesCategoryType(cat, type)
  )
  return matchingCategories.length > 0 ? matchingCategories[0].id : ''
}

export function getCategoryWarning(formState, categories, editingTransaction) {
  if (!formState.categoryId || editingTransaction) return ''
  const category = categories.find((cat) => cat.id === formState.categoryId)
  if (!category) return ''
  if (!isCategoryActive(category)) {
    return 'This category is inactive.'
  }
  if (!matchesCategoryType(category, formState.type)) {
    const categoryType = category.type === 'income' ? 'income' : 'expense'
    return `This is an ${categoryType} category, but you're recording an ${formState.type}.`
  }
  return ''
}

export function isCategoryValidForType(categoryId, type, categories) {
  const category = categories.find((cat) => cat.id === categoryId)
  return category && matchesCategoryType(category, type)
}
