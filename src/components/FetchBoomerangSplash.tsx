import { useEffect, useRef } from 'react'
import fetchitSplashLogoUrl from '../assets/fetchit-splash-logo.png'

function StaticEntryBrand() {
  return (
    <div className="fetch-entry-brand-splash flex w-full items-center justify-center text-center">
      <img
        src={fetchitSplashLogoUrl}
        alt="Fetchit"
        className="block w-[min(78vw,24rem)] select-none object-contain"
        draggable={false}
      />
    </div>
  )
}

type Props = { onDone?: () => void }

export function FetchBoomerangSplash({ onDone }: Props) {
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      onDoneRef.current?.()
    }, 850)
    return () => window.clearTimeout(t)
  }, [])

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current?.()
  }

  return (
    <div
      className="fetch-boomerang-splash-root pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-white text-[#1c1340]"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative z-[1] flex min-h-0 w-full max-w-lg flex-col items-center justify-center px-6">
        <StaticEntryBrand />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
        className="sr-only"
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>
  )
}
