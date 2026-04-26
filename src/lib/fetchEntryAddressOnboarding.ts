const STORAGE_KEY = 'fetch.entryAddressOnboarding.v1'
const SESSION_SKIP_KEY = 'fetch.entryAddressSheet.skipSession'
const POST_SIGNUP_PROMPT_KEY = 'fetch.entryAddressSheet.afterSignup'

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

export function requestEntryAddressSheetAfterSignup(): void {
  try {
    sessionStorage.setItem(POST_SIGNUP_PROMPT_KEY, '1')
    sessionStorage.removeItem(SESSION_SKIP_KEY)
  } catch {
    /* ignore */
  }
}

export function hasEntryAddressSheetAfterSignupRequest(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(POST_SIGNUP_PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

export function consumeEntryAddressSheetAfterSignupRequest(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const requested = sessionStorage.getItem(POST_SIGNUP_PROMPT_KEY) === '1'
    if (requested) sessionStorage.removeItem(POST_SIGNUP_PROMPT_KEY)
    return requested
  } catch {
    return false
  }
}
