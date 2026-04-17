import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

const SLIDE_FILL_MIN = 0.8
const SLIDE_FILL_RANGE = 0.2

const SLIDER_THEME = {
  /** Bid / fetch: black copy on white fill. */
  default: {
    label: '#000000',
    fill: '#ffffff',
    border: 'rgba(255, 255, 255, 0.42)',
    chevron: ['rgba(0, 255, 106, 0.38)', 'rgba(0, 255, 106, 0.58)', 'rgba(0, 255, 106, 0.88)'] as const,
  },
  /** Buy: black copy on hyper-green fill. */
  buy: {
    label: '#000000',
    fill: '#00ff6a',
    border: 'rgba(255, 255, 255, 0.42)',
    chevron: ['rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.75)'] as const,
  },
} as const

const DENSITY = {
  default: { shellPad: 3, trackH: 48, borderW: 2, labelPx: 16, chevronSvgH: 23 },
  compact: { shellPad: 2, trackH: 38, borderW: 2, labelPx: 13, chevronSvgH: 20 },
} as const

export type FetchCommercePillSliderProps = {
  /** Live battle: default. Drops reels: compact (thinner). */
  density?: keyof typeof DENSITY
  mode: 'buy' | 'bid' | 'fetch'
  /** Shown for buy/bid (e.g. "$40"). */
  priceLabel?: string
  /** Fetch mode: primary line (e.g. listing title), truncated with ellipsis. */
  fetchLine?: string
  onConfirm: () => void
}

/** `AUD` immediately before the amount when not already present. */
function withAudPrefix(priceFragment: string): string {
  const s = priceFragment.trim()
  if (!s) return s
  if (/^AUD\s/i.test(s)) return s
  return `AUD ${s}`
}

/** Lead word + optional AUD price; price is rendered larger in the pill. */
function buildDisplayParts(
  mode: FetchCommercePillSliderProps['mode'],
  priceLabel?: string,
  fetchLine?: string,
): { lead: string; price: string | null } {
  const pl = priceLabel?.trim()
  if (mode === 'fetch') {
    const t = fetchLine?.trim()
    if (t) return { lead: `Fetch · ${t}`, price: null }
    if (pl) return { lead: 'Fetch', price: withAudPrefix(pl) }
    return { lead: 'Fetch', price: null }
  }
  if (mode === 'bid') {
    if (pl) return { lead: 'Bid', price: withAudPrefix(pl) }
    return { lead: 'Bid', price: null }
  }
  if (pl) return { lead: 'Buy', price: withAudPrefix(pl) }
  return { lead: 'Buy', price: null }
}

function formatAriaLabel(parts: { lead: string; price: string | null }) {
  return parts.price ? `${parts.lead} ${parts.price}`.replace(/\s+/g, ' ').trim() : parts.lead.trim()
}

/** Triple chevron: strokes on sliding fill (left two softer). */
function SlideChevronRail({
  heightPx,
  strokes,
}: {
  heightPx: number
  strokes: readonly [string, string, string]
}) {
  const w = Math.round(heightPx * 1.92)
  const [c1, c2, c3] = strokes
  return (
    <svg
      width={w}
      height={heightPx}
      viewBox="0 0 42 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M2.1 7.4L6.2 10 2.1 12.6"
        stroke={c1}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 6.1L16.4 10 10.2 13.9"
        stroke={c2}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.8 4.7L31.2 10 20.8 15.3"
        stroke={c3}
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FetchCommercePillSlider({
  density = 'default',
  mode,
  priceLabel,
  fetchLine,
  onConfirm,
}: FetchCommercePillSliderProps) {
  const d = DENSITY[density]
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)
  const [p, setP] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [completing, setCompleting] = useState(false)
  const pRef = useRef(0)
  const dragRef = useRef<{ pointerId: number; startClientX: number; startP: number } | null>(null)
  const doneTimerRef = useRef<number>(0)

  const measure = useCallback(() => {
    const tr = trackRef.current
    if (!tr) return
    setTrackW(tr.getBoundingClientRect().width)
  }, [])

  useEffect(() => {
    measure()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  useEffect(() => {
    pRef.current = p
  }, [p])

  useEffect(() => () => window.clearTimeout(doneTimerRef.current), [])

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (completing) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setSliding(true)
      dragRef.current = { pointerId: e.pointerId, startClientX: e.clientX, startP: pRef.current }
    },
    [completing],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr || e.pointerId !== dr.pointerId || trackW <= 0 || completing) return
      const span = trackW * SLIDE_FILL_RANGE
      if (span <= 0) return
      const next = Math.max(0, Math.min(1, dr.startP + (e.clientX - dr.startClientX) / span))
      pRef.current = next
      setP(next)
    },
    [trackW, completing],
  )

  const finish = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr || e.pointerId !== dr.pointerId) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      dragRef.current = null
      setSliding(false)
      if (pRef.current >= 0.97) {
        setCompleting(true)
        pRef.current = 1
        setP(1)
        doneTimerRef.current = window.setTimeout(() => {
          onConfirm()
          setCompleting(false)
          pRef.current = 0
          setP(0)
        }, 220)
      } else {
        pRef.current = 0
        setP(0)
      }
    },
    [onConfirm],
  )

  const displayParts = buildDisplayParts(mode, priceLabel, fetchLine)
  const ariaLabel = formatAriaLabel(displayParts)
  const priceFontPx = Math.round(d.labelPx * 1.28)
  const theme = mode === 'buy' ? SLIDER_THEME.buy : SLIDER_THEME.default
  const fillFrac = SLIDE_FILL_MIN + SLIDE_FILL_RANGE * p
  const fillPct = fillFrac * 100
  const trans = sliding || completing ? 'none' : 'width 0.22s cubic-bezier(0.25, 0.85, 0.25, 1)'

  return (
    <div
      className="fetch-commerce-pill-shell w-full rounded-full"
      style={{
        padding: d.shellPad,
        borderRadius: 9999,
        border: `${d.borderW}px solid ${theme.border}`,
        background: 'transparent',
      }}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p * 100)}
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className={`fetch-commerce-pill-track relative w-full touch-none overflow-hidden ${completing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          height: d.trackH,
          borderRadius: 9999,
          background: 'transparent',
        }}
      >
        <div
          className="fetch-commerce-pill-fill"
          style={{
            width: `${fillPct}%`,
            height: '100%',
            borderRadius: 9999,
            background: theme.fill,
            transition: trans,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <span
            className="fetch-commerce-pill-label flex h-full w-full min-w-0 max-w-full items-center justify-between px-2.5 font-semibold uppercase tracking-[0.07em]"
            style={{ lineHeight: 1.12, color: theme.label }}
          >
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left leading-[1.12]">
              <span className="min-w-0 truncate" style={{ fontSize: d.labelPx }}>
                {displayParts.lead}
              </span>
              {displayParts.price ? (
                <span
                  className="shrink-0 tabular-nums tracking-[0.04em]"
                  style={{ fontSize: priceFontPx, lineHeight: 1.05 }}
                >
                  {displayParts.price}
                </span>
              ) : null}
            </span>
            <span className="chevrons inline-flex shrink-0 items-center justify-center self-stretch pl-1.5">
              <SlideChevronRail heightPx={d.chevronSvgH} strokes={theme.chevron} />
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
