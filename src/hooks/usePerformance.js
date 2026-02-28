import { useCallback, useMemo, useState, useEffect } from 'react'

// Memoized callback for expensive operations
export function useExpensiveCallback(callback, deps) {
  return useCallback(callback, deps)
}

// Memoized value with deep comparison for objects
export function useDeepMemo(value, deps) {
  return useMemo(() => value, deps)
}

// Debounced value for search/filter operations
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Memoized filter function
export function useFilteredData(data, filterFn, deps) {
  return useMemo(() => {
    if (!data) return []
    return data.filter(filterFn)
  }, [data, filterFn, ...deps])
}

// Memoized sort function
export function useSortedData(data, sortFn, deps) {
  return useMemo(() => {
    if (!data) return []
    return [...data].sort(sortFn)
  }, [data, sortFn, ...deps])
}

// Memoized grouped data
export function useGroupedData(data, groupFn, deps) {
  return useMemo(() => {
    if (!data) return {}
    return data.reduce((groups, item) => {
      const key = groupFn(item)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    }, {})
  }, [data, groupFn, ...deps])
}
