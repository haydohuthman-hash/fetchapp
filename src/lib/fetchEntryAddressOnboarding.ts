const STORAGE_KEY = 'fetch.entryAddressOnboarding.v1'
const SESSION_SKIP_KEY = 'fetch.entryAddressSheet.skipSession'

export function isEntryAddressOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { complete?: boolean }
    return parsed.complete === true
  } catch {
    return false
  }
}

export function markEntryAddressOnboardingComplete(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, complete: true, at: Date.now() }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function skipEntryAddressSheetForSession(): void {
  try {
    sessionStorage.setItem(SESSION_SKIP_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isEntryAddressSheetSkippedForSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_SKIP_KEY) === '1'
  } catch {
    return false
  }
}
