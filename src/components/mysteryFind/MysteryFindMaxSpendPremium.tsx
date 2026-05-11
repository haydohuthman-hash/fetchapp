import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { playUiFeedback } from '../../voice/fetchFeedback'

const MIN_D = 20
const SLIDER_UI_MAX_D = 500
/** Must match `--mf-range-thumb` size in CSS (px) for ResizeObserver travel math. */
const THUMB_PX = 44

const SCALE_MARKS = [100, 250] as const

function audApprox(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString('en-AU')}`
}

function pctAlong(usd: number): number {
  return ((usd - MIN_D) / (SLIDER_UI_MAX_D - MIN_D)) * 100
}

/** Thumb center % along rail (native range travel is inset by half the knob). */
function thumbCenterAlong(usd: number, edgePct: number): number {
  const t = pctAlong(usd) / 100
  return edgePct + t * (100 - 2 * edgePct)
}

type Props = {
  valueUsd: number
  onChange: (usd: number) => void
}

/** Max spend — measured thumb travel so fill, halos & ticks match `#mf-max-spend-range`. */
export const MysteryFindMaxSpendPremium = memo(function MysteryFindMaxSpendPremium({ valueUsd, onChange }: Props) {
  const capped = Math.min(Math.max(Math.round(valueUsd), MIN_D), SLIDER_UI_MAX_D)

  const railRef = useRef<HTMLDivElement>(null)
  const [railEdgePct, setRailEdgePct] = useState(6.8)

  useLayoutEffect(() => {
    const el = railRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = el.getBoundingClientRect().width
      if (w <= 0) return
      const half = THUMB_PX / 2
      setRailEdgePct(Math.min(14, Math.max(4.5, (half / w) * 100)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const thumbX = useMemo(() => thumbCenterAlong(capped, railEdgePct), [capped, railEdgePct])
  const fillW = thumbX
  const valLabel = capped >= SLIDER_UI_MAX_D ? `${audApprox(SLIDER_UI_MAX_D)}+` : audApprox(capped)

  const cappedRef = useRef(capped)
  cappedRef.current = capped

  const [dragging, setDragging] = useState(false)
  const gestureFromRef = useRef(capped)

  const [amountPop, setAmountPop] = useState(false)
  const prevCappedRef = useRef(capped)

  useEffect(() => {
    if (dragging) return
    if (prevCappedRef.current === capped) return
    prevCappedRef.current = capped
    setAmountPop(true)
    const t = window.setTimeout(() => setAmountPop(false), 450)
    return () => clearTimeout(t)
  }, [capped, dragging])

  useEffect(() => {
    if (!dragging) return
    const end = () => {
      setDragging(false)
      const from = gestureFromRef.current
      const to = cappedRef.current
      if (from !== to) {
        playUiFeedback('coin_hit')
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(10)
          } catch {
            /* ignore */
          }
        }
      }
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging])

  const onSliderPointerDown = useCallback(() => {
    gestureFromRef.current = cappedRef.current
    setDragging(true)
  }, [])

  return (
    <section className="relative overflow-visible rounded-[28px] border border-zinc-200/80 bg-white shadow-[0_24px_56px_rgba(28,21,40,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
      <div
        className="pointer-events-none absolute -inset-x-6 -top-10 bottom-0 z-0 opacity-[0.55]"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-40 w-[110%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(167,139,250,0.35),transparent_72%)] blur-3xl" />
      </div>

      <div className="relative z-[1] bg-gradient-to-br from-violet-50/95 via-white to-fuchsia-50/40 px-4 pb-5 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 shadow-[0_4px_14px_rgba(124,58,237,0.18)] ring-1 ring-white/80">
              <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Set your max spend</h2>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-500/95">Drag the dot — $1 steps</p>
            </div>
          </div>
          <output
            htmlFor="mf-max-spend-range"
            className={[
              'inline-block min-w-[5.5rem] origin-right text-right font-black tabular-nums tracking-tight',
              'bg-gradient-to-br from-violet-700 via-fuchsia-600 to-violet-800 bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]',
              amountPop ? 'fetch-mf-spend-amount--pop' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ fontSize: 'clamp(1.5rem, 5vw + 0.85rem, 2rem)', lineHeight: 1 }}
            aria-live="polite"
          >
            {valLabel}
          </output>
        </div>

        <div
          className={[
            'relative mt-7 rounded-[999px] border border-white/80 bg-white/60 px-3 py-3.5 shadow-[0_12px_40px_rgba(91,33,182,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md',
            'ring-1 ring-violet-200/45 transition-[transform,box-shadow] duration-200 motion-reduce:transition-none',
            dragging ? 'scale-[1.02] shadow-[0_18px_48px_rgba(124,58,237,0.22)] ring-violet-400/40' : '',
          ].join(' ')}
          data-mf-dragging={dragging ? 'true' : undefined}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-0 -translate-y-1/2" aria-hidden>
            <div
              className={[
                'absolute bottom-0 h-16 w-16 -translate-x-1/2 translate-y-1 rounded-full bg-violet-500/50 blur-2xl transition-[left,opacity,transform] duration-150 ease-out motion-reduce:transition-none',
                dragging ? 'scale-110 opacity-100' : 'opacity-80',
              ].join(' ')}
              style={{ left: `${thumbX}%` }}
            />
            <div
              className={[
                'absolute bottom-0 h-12 w-12 -translate-x-1/2 translate-y-1 rounded-full bg-fuchsia-400/35 blur-xl transition-[left,opacity] duration-150 motion-reduce:transition-none',
                dragging ? 'opacity-95' : 'opacity-65',
              ].join(' ')}
              style={{ left: `${thumbX}%` }}
            />
          </div>

          <div ref={railRef} className="relative z-[2] h-16 w-full">
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 overflow-hidden rounded-full bg-zinc-200/95 shadow-[inset_0_2px_6px_rgba(28,21,40,0.085)] ring-1 ring-zinc-300/35">
              <div
                className="fetch-mf-spend-fill absolute inset-y-0 left-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-violet-300/35 transition-[width] duration-[90ms] ease-out motion-reduce:transition-none"
                style={{ width: `${fillW}%` }}
              />
              {SCALE_MARKS.map((m) => (
                <div
                  key={m}
                  className="absolute bottom-[2px] top-[2px] z-[1] w-[1px] -translate-x-1/2 rounded-full bg-zinc-500/55"
                  style={{ left: `${thumbCenterAlong(m, railEdgePct)}%` }}
                />
              ))}
            </div>

            <input
              id="mf-max-spend-range"
              type="range"
              min={MIN_D}
              max={SLIDER_UI_MAX_D}
              step={1}
              value={capped}
              onChange={(e) => onChange(Number(e.target.value))}
              onPointerDown={onSliderPointerDown}
              aria-label="Maximum spend in Australian dollars"
              aria-valuemin={MIN_D}
              aria-valuemax={SLIDER_UI_MAX_D}
              aria-valuenow={capped}
              aria-valuetext={`${valLabel} maximum`}
              className="mf-range-slider mf-range-slider--overlay mf-range-slider--mystery absolute inset-0 z-30 m-0 h-16 w-full cursor-grab p-0 [-webkit-tap-highlight-color:transparent] active:cursor-grabbing"
            />
          </div>
        </div>

        <div className="relative mx-0 mt-3.5 h-4 font-semibold uppercase tracking-[0.14em] text-zinc-400">
          <span className="absolute left-0 top-0 text-[9px]">${MIN_D}</span>
          {SCALE_MARKS.map((m) => (
            <span
              key={m}
              className="absolute top-0 -translate-x-1/2 text-[8px] text-zinc-400/95"
              style={{ left: `${thumbCenterAlong(m, railEdgePct)}%` }}
            >
              ${m}
            </span>
          ))}
          <span className="absolute right-0 top-0 text-[9px]">${SLIDER_UI_MAX_D}+</span>
        </div>

        <p className="sr-only">
          Range {MIN_D} to {SLIDER_UI_MAX_D} dollars. Thumb movement is inset slightly from the track ends so the knob
          does not crop.
        </p>
      </div>
    </section>
  )
})
