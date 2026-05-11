/** Class toggled momentarily when a `.fetch-home-intent-bottom-nav__icon` fires tap feedback (bounce + ripple in CSS). */
export const FETCH_HOME_INTENT_NAV_TAP_CLASS = 'fetch-home-intent-nav-tap'

const tapClearTimeouts = new WeakMap<HTMLButtonElement, number>()
const TAP_FEEDBACK_MS = 680

/** Plays bounce + ripple (see `index.css`) unless reduced motion is preferred. */
export function playHomeIntentNavTap(button: HTMLButtonElement) {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
  } catch {
    /* ignore */
  }
  const cls = FETCH_HOME_INTENT_NAV_TAP_CLASS
  button.classList.remove(cls)
  void button.offsetWidth
  button.classList.add(cls)

  const prev = tapClearTimeouts.get(button)
  if (prev != null) window.clearTimeout(prev)

  tapClearTimeouts.set(
    button,
    window.setTimeout(() => {
      button.classList.remove(cls)
      tapClearTimeouts.delete(button)
    }, TAP_FEEDBACK_MS),
  )
}
