import { type ReactNode, useLayoutEffect, useState } from 'react'
import { navSlideOrder } from '../lib/fetchNavSlideOrder'

let lastKnownPathForSlide: string | null = null

type FetchNavRouteSlideProps = {
  pathname: string
  children: ReactNode
  /** When false, no enter animation. */
  enabled?: boolean
  className?: string
}

/** Must match `fetch-nav-slide-in-from-*` duration in `index.css`. */
const SLIDE_MS = 400

/**
 * One-shot horizontal slide when `pathname` changes (bottom-nav order).
 * Uses a module path history so transitions still run when the shell remounts (e.g. home ↔ auth).
 */
export function FetchNavRouteSlide({ pathname, children, enabled = true, className }: FetchNavRouteSlideProps) {
  const [enterClass, setEnterClass] = useState('')

  useLayoutEffect(() => {
    if (!enabled) {
      lastKnownPathForSlide = pathname
      return
    }
    const prev = lastKnownPathForSlide
    lastKnownPathForSlide = pathname
    if (prev === null || prev === pathname) {
      return
    }
    const nextOrder = navSlideOrder(pathname)
    const prevOrder = navSlideOrder(prev)
    const forward =
      nextOrder > prevOrder ? true : nextOrder < prevOrder ? false : true
    setEnterClass(
      forward
        ? 'fetch-nav-route-slide--enter-from-right'
        : 'fetch-nav-route-slide--enter-from-left',
    )
    const t = window.setTimeout(() => setEnterClass(''), SLIDE_MS)
    return () => window.clearTimeout(t)
  }, [enabled, pathname])

  return (
    <div
      className={['min-h-0 min-w-0 flex-1 overflow-x-clip', enterClass, className ?? ''].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
