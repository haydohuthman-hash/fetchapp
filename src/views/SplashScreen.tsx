import { useCallback, useEffect, useRef } from 'react'
import { FetchSplashBrandMark } from '../components/FetchSplashBrandMark'

type SplashScreenProps = {
  onComplete: () => void
}

/**
 * Cold open: brand eyes + bolt mark and tagline (“anything, Delivered, nearby”).
 */
export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const doneRef = useRef(false)
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onComplete()
  }, [onComplete])

  useEffect(() => {
    if (reducedMotion) {
      const t = window.setTimeout(finish, 380)
      return () => window.clearTimeout(t)
    }
    /** Time to register mark + tagline before handoff. */
    const t = window.setTimeout(finish, 2200)
    return () => window.clearTimeout(t)
  }, [finish, reducedMotion])

  return (
    <div
      className="fetch-splash-root fetch-splash-root--brand-mark fetch-app-shell-bg flex min-h-dvh min-h-[100dvh] w-full flex-col items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Fetch. anything, Delivered, nearby"
    >
      <div className="fetch-splash-stage fetch-splash-stage--brand flex max-w-md flex-col items-center">
        <FetchSplashBrandMark className="fetch-splash-brand-mark h-auto w-[min(82vw,20rem)] max-w-full shrink-0" />
        <div className="fetch-splash-tagline mt-8 w-full text-center">
          <p className="font-montserrat text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-600">
            anything,
          </p>
          <p className="font-montserrat mt-1 text-[1.85rem] font-extrabold leading-none tracking-[-0.03em] text-zinc-900">
            Delivered,
          </p>
          <p className="font-montserrat mt-1.5 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-600">
            nearby
          </p>
        </div>
      </div>
    </div>
  )
}
