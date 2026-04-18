import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  saveThemePreference,
  THEME_PREFERENCE_KEY,
  type ResolvedFetchTheme,
  type ThemePreference,
} from '../lib/fetchThemeStorage'

type FetchThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedFetchTheme
  /** No-op for API compatibility; app is light-only. */
  setPreference: (next: ThemePreference) => void
}

const FetchThemeContext = createContext<FetchThemeContextValue | null>(null)

function applyDomTheme() {
  document.documentElement.dataset.fetchTheme = 'light'
}

export function FetchThemeProvider({ children }: { children: ReactNode }) {
  const preference: ThemePreference = 'light'
  const resolved: ResolvedFetchTheme = 'light'

  const setPreference = useCallback((_next: ThemePreference) => {
    saveThemePreference('light')
    applyDomTheme()
  }, [])

  useEffect(() => {
    saveThemePreference('light')
    applyDomTheme()
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_PREFERENCE_KEY && e.newValue && e.newValue.trim() !== 'light') {
        try {
          window.localStorage.setItem(THEME_PREFERENCE_KEY, 'light')
        } catch {
          /* ignore */
        }
        applyDomTheme()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [setPreference],
  )

  return <FetchThemeContext.Provider value={value}>{children}</FetchThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with provider
export function useFetchTheme(): FetchThemeContextValue {
  const ctx = useContext(FetchThemeContext)
  if (!ctx) {
    throw new Error('useFetchTheme must be used within FetchThemeProvider')
  }
  return ctx
}

