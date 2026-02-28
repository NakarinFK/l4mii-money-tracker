// Validation utilities for form inputs and data sanitization

/**
 * Validates and sanitizes text input
 */
export function validateTextInput(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: 'Must be a string' }
  }
  
  // Remove potentially dangerous characters
  const sanitized = value
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
  
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Cannot be empty' }
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized, error: `Too long (max ${maxLength} characters)` }
  }
  
  return { isValid: true, sanitized, error: null }
}

/**
 * Validates amount input
 */
export function validateAmount(value) {
  if (typeof value === 'string') {
    // Remove commas and spaces
    const cleanValue = value.replace(/[, ]/g, '')
    
    // Check if it's a valid number
    const num = parseFloat(cleanValue)
    
    if (isNaN(num)) {
      return { isValid: false, sanitized: 0, error: 'Must be a valid number' }
    }
    
    if (num < 0) {
      return { isValid: false, sanitized: 0, error: 'Cannot be negative' }
    }
    
    if (num > 999999999.99) {
      return { isValid: false, sanitized: 0, error: 'Amount too large' }
    }
    
    return { isValid: true, sanitized: num, error: null }
  }
  
  if (typeof value === 'number') {
    if (isNaN(value) || value < 0) {
      return { isValid: false, sanitized: 0, error: 'Invalid amount' }
    }
    return { isValid: true, sanitized: value, error: null }
  }
  
  return { isValid: false, sanitized: 0, error: 'Must be a number' }
}

/**
 * Validates date input
 */
export function validateDate(value) {
  if (typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: 'Must be a string' }
  }
  
  // Check YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    return { isValid: false, sanitized: '', error: 'Invalid date format (YYYY-MM-DD)' }
  }
  
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return { isValid: false, sanitized: '', error: 'Invalid date' }
  }
  
  // Check if date is not too far in the past or future
  const now = new Date()
  const minDate = new Date(now.getFullYear() - 10, 0, 1)
  const maxDate = new Date(now.getFullYear() + 10, 11, 31)
  
  if (date < minDate || date > maxDate) {
    return { isValid: false, sanitized: '', error: 'Date out of reasonable range' }
  }
  
  return { isValid: true, sanitized: value, error: null }
}

/**
 * Validates category ID
 */
export function validateCategoryId(value, availableCategories = []) {
  if (typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: 'Must be a string' }
  }
  
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Cannot be empty' }
  }
  
  if (availableCategories.length > 0 && !availableCategories.includes(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid category' }
  }
  
  return { isValid: true, sanitized, error: null }
}

/**
 * Validates account ID
 */
export function validateAccountId(value, availableAccounts = []) {
  if (typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: 'Must be a string' }
  }
  
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, '')
  
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Cannot be empty' }
  }
  
  if (availableAccounts.length > 0 && !availableAccounts.includes(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid account' }
  }
  
  return { isValid: true, sanitized, error: null }
}

/**
 * Validates billing day (1-31)
 */
export function validateBillingDay(value) {
  const num = parseInt(value, 10)
  
  if (isNaN(num) || num < 1 || num > 31) {
    return { isValid: false, sanitized: 1, error: 'Must be between 1 and 31' }
  }
  
  return { isValid: true, sanitized: num, error: null }
}

/**
 * Sanitizes note text
 */
export function sanitizeNote(value) {
  if (typeof value !== 'string') {
    return { isValid: false, sanitized: '', error: 'Must be a string' }
  }
  
  const sanitized = value
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
  
  return { isValid: true, sanitized, error: null }
}
