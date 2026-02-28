import { useEffect, useState } from 'react'

const STORAGE_KEY = 'dashboard-theme'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'

type ThemeMode = 'light' | 'dark'

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === 'light' || value === 'dark') return value
  return null
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return getStoredTheme() ?? getSystemTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const stored = getStoredTheme()
    if (stored) return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(MEDIA_QUERY)
    const handler = (event: MediaQueryListEvent) => {
      if (getStoredTheme()) return
      setTheme(event.matches ? 'dark' : 'light')
    }
    if (media.addEventListener) {
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }
    media.addListener(handler)
    return () => media.removeListener(handler)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
      return next
    })
  }

  return { theme, toggleTheme }
}
