export const THEME_PREFERENCE_KEY = 'fetch.themePreference'

/** Kept for storage key compatibility; app is light-only. */
export type ThemePreference = 'light'

export type ResolvedFetchTheme = 'light'

export function loadThemePreference(): ThemePreference {
  return 'light'
}

export function saveThemePreference(_pref: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, 'light')
  } catch {
    /* ignore */
  }
}

export function resolveThemeFromClock(_d: Date = new Date()): ResolvedFetchTheme {
  return 'light'
}

export function resolveTheme(_preference: ThemePreference, _d: Date = new Date()): ResolvedFetchTheme {
  return 'light'
}

