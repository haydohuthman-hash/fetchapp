import { useEffect, useState } from 'react'

const DEFAULT_SKELETON_MS = 1000
const STORAGE_PREFIX = 'fetch.pageSkeleton.seen.'

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

function hasSeenSkeleton(id: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return sessionStorage.getItem(storageKey(id)) === '1'
  } catch {
    return false
  }
}

function markSkeletonSeen(id: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(id), '1')
  } catch {
    /* ignore private mode / quota */
  }
}

export function useOneTimePageSkeleton(
  id: string,
  enabled = true,
  durationMs = DEFAULT_SKELETON_MS,
): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled || !id) {
      setVisible(false)
      return undefined
    }
    if (hasSeenSkeleton(id)) {
      setVisible(false)
      return undefined
    }

    setVisible(true)
    const t = window.setTimeout(() => {
      markSkeletonSeen(id)
      setVisible(false)
    }, durationMs)

    return () => window.clearTimeout(t)
  }, [durationMs, enabled, id])

  return visible
}

export function FetchPremiumPageSkeleton({
  visible,
  label = 'Loading',
}: {
  visible: boolean
  label?: string
}) {
  if (!visible) return null

  return (
    <div
      className="fetch-premium-page-skeleton pointer-events-none fixed inset-0 z-[9960] flex items-center justify-center bg-[#faf8ff]"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-[430px] px-4">
        <div className="fetch-premium-page-skeleton__top">
          <div className="fetch-premium-page-skeleton__circle fetch-premium-page-skeleton__shine" />
          <div className="min-w-0 flex-1">
            <div className="fetch-premium-page-skeleton__line fetch-premium-page-skeleton__line--title fetch-premium-page-skeleton__shine" />
            <div className="fetch-premium-page-skeleton__line fetch-premium-page-skeleton__line--short fetch-premium-page-skeleton__shine" />
          </div>
        </div>

        <div className="fetch-premium-page-skeleton__card">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="fetch-premium-page-skeleton__mini fetch-premium-page-skeleton__shine" />
                <div className="fetch-premium-page-skeleton__line fetch-premium-page-skeleton__line--stat fetch-premium-page-skeleton__shine" />
              </div>
            ))}
          </div>
        </div>

        <div className="fetch-premium-page-skeleton__card fetch-premium-page-skeleton__card--tight">
          <div className="fetch-premium-page-skeleton__line fetch-premium-page-skeleton__line--section fetch-premium-page-skeleton__shine" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="fetch-premium-page-skeleton__badge fetch-premium-page-skeleton__shine" />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fetch-premium-page-skeleton__tile fetch-premium-page-skeleton__shine" />
          ))}
        </div>
      </div>
    </div>
  )
}
