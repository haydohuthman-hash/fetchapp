import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { formatAud, type LiveFeedStream } from '../lib/liveFeedDemo'
import { loadSession } from '../lib/fetchUserSession'

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7h16M6.5 12h11M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function tagLabel(tag: LiveFeedStream['tag']): string | null {
  switch (tag) {
    case 'ending_soon': return 'Ending soon'
    case 'hot': return 'Hot'
    case 'just_started': return 'Just started'
    default: return null
  }
}

function tagColor(tag: LiveFeedStream['tag']): string {
  switch (tag) {
    case 'ending_soon': return 'bg-amber-500 text-white'
    case 'hot': return 'bg-orange-500 text-white'
    case 'just_started': return 'bg-white text-zinc-900'
    default: return ''
  }
}

const COUNTDOWN_MAX_SEC = 300

function CountdownRing({ endsInSec, compact = false }: { endsInSec: number; compact?: boolean }) {
  const [sec, setSec] = useState(endsInSec)
  const box = compact ? 32 : 40
  const r = compact ? 11 : 15
  const circ = 2 * Math.PI * r

  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

  const frac = Math.min(sec / COUNTDOWN_MAX_SEC, 1)
  const offset = circ * (1 - frac)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  const label = `${m}:${s.toString().padStart(2, '0')}`
  const isElectric = sec <= 10
  const ringColor = isElectric ? '#0a0a0a' : '#171717'
  const strokeW = compact ? (isElectric ? 4.5 : 3.75) : isElectric ? 6.5 : 5.5
  const c = box / 2

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center',
        compact ? 'h-8 w-8' : 'h-10 w-10',
        isElectric ? 'fetch-countdown-electric' : '',
      ].join(' ')}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 -rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span
        className={`relative z-[1] font-bold tabular-nums ${compact ? 'text-[8px]' : 'text-[9px]'} ${isElectric ? 'text-zinc-950' : 'text-zinc-800'}`}
      >
        {label}
      </span>
      {isElectric ? (
        <span
          className={`fetch-countdown-bolt absolute z-[2] ${compact ? '-right-0.5 -top-0.5 text-[9px]' : '-right-1 -top-1 text-[10px]'}`}
          aria-hidden
        >
          ⚡
        </span>
      ) : null}
    </div>
  )
}

const LiveFeedCard = memo(function LiveFeedCard({
  stream,
  onJoin,
}: {
  stream: LiveFeedStream
  onJoin: () => void
}) {
  return (
    <button
      type="button"
      onClick={onJoin}
      className="group flex min-w-0 flex-col gap-2 bg-transparent p-0 text-left shadow-none ring-0 transition-transform active:scale-[0.98]"
      aria-label={`Join ${stream.seller} live`}
    >
      <p className="min-w-0 truncate pl-0.5 text-left text-[11px] font-semibold leading-tight tracking-[-0.01em] text-zinc-800 dark:text-zinc-200">
        {stream.seller}
      </p>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.15rem] bg-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200/90 dark:ring-zinc-700/80">
        {stream.imageUrl ? (
          <img
            src={stream.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-active:scale-[1.03]"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
            No preview
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden />

        <div className="pointer-events-none absolute left-2 top-2 z-[1] flex items-center gap-1 rounded-full bg-[#00ff6a] px-2 py-[3px] shadow-sm">
          <span className="relative flex h-[5px] w-[5px] shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/35 opacity-45" />
            <span className="fetch-live-feed-dot-pulse relative inline-flex h-[4px] w-[4px] rounded-full bg-black" />
          </span>
          <span className="text-[7px] font-bold uppercase tracking-wide text-[#000000]">Live</span>
          <span className="text-[8px] font-semibold tabular-nums text-[#000000]">{stream.watchersLabel}</span>
        </div>

        {tagLabel(stream.tag) ? (
          <div
            className={`pointer-events-none absolute bottom-[2.75rem] left-2 z-[1] rounded-full px-2 py-[3px] text-[8px] font-bold uppercase tracking-wide ${tagColor(stream.tag)}`}
          >
            {tagLabel(stream.tag)}
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-2 left-2.5 right-2 z-[1]">
          <span className="block truncate text-[10px] font-medium text-white/80">{stream.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5 rounded-xl bg-white px-2 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <span className="min-w-0 flex-1 truncate text-[1.2rem] font-bold leading-none tracking-[-0.02em] text-[#343434] antialiased dark:text-zinc-50">
          {formatAud(stream.priceCents)}
        </span>
        <CountdownRing endsInSec={stream.endsInSec} compact />
      </div>
    </button>
  )
})

/* ── Slide-to-Bid Slider ────────────────────────────────────────── */

const SLIDE_ZONE_FRAC = 0.20
const CONFIRM_THRESHOLD = 0.85

function BoltIcon({ size = 22, color = '#FACC15' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2L4.5 14H12l-1 8 8.5-12H12l1-8z" fill={color} />
    </svg>
  )
}

const SPARK_SEEDS = [
  { xFrac: 0.06, yPct: 18, delay: 0 },
  { xFrac: 0.14, yPct: 42, delay: 0.06 },
  { xFrac: 0.22, yPct: 10, delay: 0.12 },
  { xFrac: 0.30, yPct: 46, delay: 0.04 },
  { xFrac: 0.38, yPct: 22, delay: 0.10 },
  { xFrac: 0.46, yPct: 38, delay: 0.02 },
  { xFrac: 0.54, yPct: 8, delay: 0.14 },
  { xFrac: 0.62, yPct: 44, delay: 0.08 },
  { xFrac: 0.70, yPct: 16, delay: 0.05 },
  { xFrac: 0.78, yPct: 36, delay: 0.11 },
  { xFrac: 0.86, yPct: 26, delay: 0.03 },
  { xFrac: 0.94, yPct: 48, delay: 0.09 },
]

const BOLT_EMOJI_SEEDS = [
  { xPct: 72, delay: 0 },
  { xPct: 78, delay: 0.12 },
  { xPct: 85, delay: 0.06 },
  { xPct: 90, delay: 0.18 },
  { xPct: 66, delay: 0.09 },
  { xPct: 95, delay: 0.15 },
  { xPct: 60, delay: 0.22 },
  { xPct: 82, delay: 0.03 },
]

function SlideToBid({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)
  const [slidePx, setSlidePx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [shocking, setShocking] = useState(false)
  const dragRef = useRef<{ pid: number; startX: number; startPx: number } | null>(null)
  const pxRef = useRef(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setTrackW(el.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
  }, [])

  useEffect(() => { pxRef.current = slidePx }, [slidePx])

  const slideZonePx = trackW * SLIDE_ZONE_FRAC

  const onDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    if (confirmed || shocking) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragRef.current = { pid: e.pointerId, startX: e.clientX, startPx: pxRef.current }
  }, [confirmed, shocking])

  const onMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid || slideZonePx <= 0) return
    const raw = d.startPx + (e.clientX - d.startX)
    const next = Math.max(0, Math.min(slideZonePx, raw))
    pxRef.current = next
    setSlidePx(next)
  }, [slideZonePx])

  const onUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* */ }
    dragRef.current = null
    setDragging(false)
    const frac = slideZonePx > 0 ? pxRef.current / slideZonePx : 0
    if (frac >= CONFIRM_THRESHOLD) {
      setConfirmed(true)
      setShocking(true)
      pxRef.current = slideZonePx
      setSlidePx(slideZonePx)
      window.setTimeout(() => {
        setShocking(false)
        onConfirm()
        setConfirmed(false)
        pxRef.current = 0
        setSlidePx(0)
      }, 900)
    } else {
      pxRef.current = 0
      setSlidePx(0)
    }
  }, [slideZonePx, onConfirm])

  const slideFrac = slideZonePx > 0 ? slidePx / slideZonePx : 0
  const isSliding = dragging && slideFrac > 0.02
  const fillPct = (1 - SLIDE_ZONE_FRAC) * 100 + SLIDE_ZONE_FRAC * 100 * slideFrac
  const trans = dragging ? 'none' : 'width 0.32s cubic-bezier(0.25, 0.9, 0.25, 1)'

  return (
    <div
      className={[
        'fetch-slide-bid-outer relative w-full rounded-full p-[3px]',
        shocking ? 'fetch-slide-bid-shock' : '',
      ].join(' ')}
      style={{ border: '1.5px solid rgba(255,255,255,0.15)' }}
    >
      <div
        ref={trackRef}
        className="relative flex h-[50px] w-full touch-none items-center overflow-hidden rounded-full"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(slideFrac * 100)}
        aria-label={label}
        tabIndex={0}
      >
        {/* Red fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#FACC15]"
          style={{ width: `${fillPct}%`, transition: trans }}
        />

        {/* Label + bolt + chevrons inside fill */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center"
          style={{ width: `${fillPct}%`, transition: trans }}
        >
          <span className="pl-4 text-[13px] font-bold tracking-wide text-white whitespace-nowrap">
            {label}
          </span>
          <span className="min-w-0 flex-1" />
          <div
            className="flex shrink-0 items-center pr-1.5"
            style={{ opacity: confirmed ? 0 : 1, transition: 'opacity 0.2s ease' }}
          >
            <BoltIcon size={22} color="#FACC15" />
            <svg width="28" height="42" viewBox="0 0 28 42" fill="none" aria-hidden className="ml-[-4px]">
              <path
                d="M5 9l10 12L5 33"
                stroke={isSliding || shocking ? 'rgba(250,204,21,0.8)' : 'rgba(255,255,255,0.4)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s ease' }}
              />
              <path
                d="M15 12l7 9-7 9"
                stroke={isSliding || shocking ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.22)'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s ease' }}
              />
            </svg>
          </div>
        </div>

        {/* Sparks */}
        {(isSliding || shocking) ? (
          <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
            {SPARK_SEEDS.map((s, i) => (
              <span
                key={i}
                className="fetch-slide-bid-spark absolute"
                style={{
                  left: `${(1 - SLIDE_ZONE_FRAC) * 100 + SLIDE_ZONE_FRAC * 100 * s.xFrac}%`,
                  top: `${s.yPct}%`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
            {shocking ? SPARK_SEEDS.map((s, i) => (
              <span
                key={`s2-${i}`}
                className="fetch-slide-bid-spark absolute"
                style={{
                  left: `${10 + i * 7}%`,
                  top: `${(s.yPct + 20) % 52}%`,
                  animationDelay: `${s.delay + 0.15}s`,
                }}
              />
            )) : null}
          </div>
        ) : null}
      </div>

      {/* Floating bolt emojis that fly upward */}
      {(isSliding || shocking) ? (
        <div className="pointer-events-none absolute inset-0 z-[3] overflow-visible" aria-hidden>
          {BOLT_EMOJI_SEEDS.map((b, i) => (
            <span
              key={i}
              className="fetch-slide-bolt-emoji absolute bottom-0"
              style={{ left: `${b.xPct}%`, animationDelay: `${b.delay}s` }}
            >
              ⚡
            </span>
          ))}
          {shocking ? BOLT_EMOJI_SEEDS.map((b, i) => (
            <span
              key={`se-${i}`}
              className="fetch-slide-bolt-emoji absolute bottom-0"
              style={{ left: `${(b.xPct + 15) % 100}%`, animationDelay: `${b.delay + 0.1}s` }}
            >
              ⚡
            </span>
          )) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── Bid Increment Dropdown ─────────────────────────────────────── */

const BID_INCREMENTS = [500, 1000, 2000, 5000] as const

function BidIncrementDropdown({
  selectedCents,
  onSelect,
}: {
  selectedCents: number
  onSelect: (cents: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-white/[0.1] px-2.5 py-1.5 text-[12px] font-bold tabular-nums text-white ring-1 ring-white/[0.12] transition-colors active:bg-white/[0.18]"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Bid</span>
        <span>+${selectedCents / 100}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className={`text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div
          className="absolute bottom-full right-0 z-10 mb-2 flex flex-col gap-0.5 rounded-xl border border-white/[0.12] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          style={{ background: 'rgba(30,30,34,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {BID_INCREMENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => { onSelect(cents); setOpen(false) }}
              className={[
                'rounded-lg px-4 py-2 text-left text-[13px] font-bold tabular-nums transition-colors',
                cents === selectedCents
                  ? 'bg-[#00ff6a] text-[#000000]'
                  : 'text-zinc-300 active:bg-white/[0.08]',
              ].join(' ')}
            >
              +${cents / 100}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ── Chat Bar ──────────────────────────────────────────────────── */

function LiveChatBar() {
  const [msg, setMsg] = useState('')

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/[0.12] bg-white/[0.08] px-3.5 py-2.5">
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Say something…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-white/40 outline-none"
        />
      </div>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-[17px] ring-1 ring-white/[0.1] transition-transform active:scale-110"
        aria-label="Send emoji"
      >
        😊
      </button>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00ff6a] text-[15px] shadow-sm transition-transform active:scale-110"
        aria-label="Boost"
      >
        🚀
      </button>
    </div>
  )
}

/* ── Live Video Auction Overlay ─────────────────────────────────── */

/* ── Live Comments ─────────────────────────────────────────────── */

type LiveComment = { id: number; user: string; text: string }

const DEMO_COMMENTS: { user: string; text: string }[] = [
  { user: 'Sarah M', text: 'How much for shipping? 🤔' },
  { user: 'Jake_91', text: 'This is a steal!!' },
  { user: 'Lina', text: '🔥🔥🔥' },
  { user: 'Tom B', text: 'Can you show the back?' },
  { user: 'Ava', text: 'Bidding now!' },
  { user: 'Chris D', text: 'Is this still available after auction?' },
  { user: 'Mia K', text: 'Love this seller ❤️' },
  { user: 'Nate', text: 'Going fast 👀' },
  { user: 'Priya', text: 'Just joined!' },
  { user: 'Owen', text: 'Outbid again 😭' },
  { user: 'Zoe R', text: 'Does it come with warranty?' },
  { user: 'Liam F', text: "+$10 let's goooo ⚡" },
]

function LiveCommentsFeed() {
  const [comments, setComments] = useState<LiveComment[]>(() =>
    DEMO_COMMENTS.slice(0, 3).map((c, i) => ({ ...c, id: i })),
  )
  const nextId = useRef(3)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      const idx = nextId.current % DEMO_COMMENTS.length
      const c = DEMO_COMMENTS[idx]!
      setComments((prev) => [...prev, { ...c, id: nextId.current }])
      nextId.current += 1
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }, 2200 + Math.random() * 1800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="relative flex h-[6.5rem] flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-1.5 px-0.5 pb-1">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 text-[12px] leading-snug">
              <span className="shrink-0 font-bold text-white/90">{c.user}</span>
              <span className="text-white/60">{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LiveVideoAuction({
  stream,
  onClose,
  onOpenListing,
}: {
  stream: LiveFeedStream
  onClose: () => void
  onOpenListing: (listingId: string) => void
}) {
  const [sec, setSec] = useState(stream.endsInSec)
  const [bidCents, setBidCents] = useState(stream.priceCents)
  const [incrementCents, setIncrementCents] = useState<number>(500)
  const videoRef = useRef<HTMLDivElement>(null)

  const session = useMemo(() => loadSession(), [])
  const hasDetails = Boolean(session?.email)

  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setBidCents((c) => c + 500)
    }, 4000 + Math.random() * 3000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSlideConfirm = useCallback(() => {
    if (hasDetails) {
      setBidCents((c) => c + incrementCents)
    }
    onOpenListing(stream.listingId)
  }, [onOpenListing, stream.listingId, hasDetails, incrementCents])

  const m = Math.floor(sec / 60)
  const s = sec % 60
  const timerLabel = `${m}:${s.toString().padStart(2, '0')}`

  const sliderLabel = hasDetails
    ? `Slide to bid ${formatAud(bidCents + incrementCents)}`
    : 'Add Payment Details'

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black">
      {/* Full-screen video */}
      <div ref={videoRef} className="absolute inset-0">
        {stream.imageUrl ? (
          <img
            src={stream.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" aria-hidden />
      </div>

      {/* Top bar: seller left, live + close right */}
      <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{stream.seller}</p>
          <p className="text-[11px] font-medium text-white/70">{stream.location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-[#00ff6a] px-2 py-[3px]">
            <span className="relative flex h-[5px] w-[5px] shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/35 opacity-45" />
              <span className="fetch-live-feed-dot-pulse relative inline-flex h-[4px] w-[4px] rounded-full bg-black" />
            </span>
            <span className="text-[8px] font-bold uppercase text-[#000000]">Live</span>
            <span className="text-[8px] font-semibold tabular-nums text-[#000000]">{stream.watchersLabel}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm active:bg-black/70"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Comments — left side, above panel */}
      <div className="fetch-live-comments absolute bottom-0 left-0 z-[2] w-[65%] max-w-[280px] px-3" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 11.5rem)' }}>
        <LiveCommentsFeed />
      </div>

      {/* Bottom panel */}
      <div
        className="absolute inset-x-0 bottom-0 z-[2] mx-2 mb-[max(0.35rem,env(safe-area-inset-bottom,0px))] rounded-[1.25rem] border border-white/[0.14] px-3 pb-3 pt-2.5"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Current bid</p>
            <p className="text-[1.2rem] font-black tabular-nums leading-tight text-white">{formatAud(bidCents)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/[0.1] px-2.5 py-1 text-[11px] font-bold tabular-nums text-white ring-1 ring-white/[0.12]">
              {timerLabel}
            </span>
            <BidIncrementDropdown selectedCents={incrementCents} onSelect={setIncrementCents} />
          </div>
        </div>
        <div className="mt-2">
          <SlideToBid label={sliderLabel} onConfirm={handleSlideConfirm} />
        </div>
        <div className="mt-2.5">
          <LiveChatBar />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ── Welcome / How-It-Works Sheet ──────────────────────────────── */

function WelcomeSliderDemo() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackW, setTrackW] = useState(0)
  const [slidePx, setSlidePx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [shocking, setShocking] = useState(false)
  const dragRef = useRef<{ pid: number; startX: number; startPx: number } | null>(null)
  const pxRef = useRef(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setTrackW(el.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }
  }, [])

  useEffect(() => { pxRef.current = slidePx }, [slidePx])

  const slideZonePx = trackW * SLIDE_ZONE_FRAC

  const onDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    if (confirmed || shocking) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragRef.current = { pid: e.pointerId, startX: e.clientX, startPx: pxRef.current }
  }, [confirmed, shocking])

  const onMove = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid || slideZonePx <= 0) return
    const raw = d.startPx + (e.clientX - d.startX)
    const next = Math.max(0, Math.min(slideZonePx, raw))
    pxRef.current = next
    setSlidePx(next)
  }, [slideZonePx])

  const onUp = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pid) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* */ }
    dragRef.current = null
    setDragging(false)
    const frac = slideZonePx > 0 ? pxRef.current / slideZonePx : 0
    if (frac >= CONFIRM_THRESHOLD) {
      setConfirmed(true)
      setShocking(true)
      pxRef.current = slideZonePx
      setSlidePx(slideZonePx)
      window.setTimeout(() => {
        setShocking(false)
        setConfirmed(false)
        pxRef.current = 0
        setSlidePx(0)
      }, 900)
    } else {
      pxRef.current = 0
      setSlidePx(0)
    }
  }, [slideZonePx])

  const slideFrac = slideZonePx > 0 ? slidePx / slideZonePx : 0
  const isSliding = dragging && slideFrac > 0.02
  const fillPct = (1 - SLIDE_ZONE_FRAC) * 100 + SLIDE_ZONE_FRAC * 100 * slideFrac
  const trans = dragging ? 'none' : 'width 0.32s cubic-bezier(0.25, 0.9, 0.25, 1)'

  return (
    <div
      className={[
        'fetch-slide-bid-outer relative w-full rounded-full p-[3px]',
        shocking ? 'fetch-slide-bid-shock' : '',
      ].join(' ')}
      style={{ border: '1.5px solid rgba(22,163,74,0.65)' }}
    >
      <div
        ref={trackRef}
        className="relative flex h-[50px] w-full touch-none items-center overflow-hidden rounded-full"
        style={{ background: 'rgba(16,185,129,0.14)' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(slideFrac * 100)}
        aria-label="Try sliding to bid"
        tabIndex={0}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white"
          style={{ width: `${fillPct}%`, transition: trans }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center"
          style={{ width: `${fillPct}%`, transition: trans }}
        >
          <span className="pl-4 text-[13px] font-bold tracking-wide text-black whitespace-nowrap">
            Try it — Slide to bid $125
          </span>
          <span className="min-w-0 flex-1" />
          <div
            className="flex shrink-0 items-center pr-1.5"
            style={{ opacity: confirmed ? 0 : 1, transition: 'opacity 0.2s ease' }}
          >
            <BoltIcon size={22} color="#FACC15" />
            <svg width="28" height="42" viewBox="0 0 28 42" fill="none" aria-hidden className="ml-[-4px]">
              <path
                d="M5 9l10 12L5 33"
                stroke={isSliding || shocking ? 'rgba(250,204,21,0.8)' : 'rgba(255,255,255,0.4)'}
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s ease' }}
              />
              <path
                d="M15 12l7 9-7 9"
                stroke={isSliding || shocking ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.22)'}
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s ease' }}
              />
            </svg>
          </div>
        </div>

        {(isSliding || shocking) ? (
          <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
            {SPARK_SEEDS.map((s, i) => (
              <span
                key={i}
                className="fetch-slide-bid-spark absolute"
                style={{
                  left: `${(1 - SLIDE_ZONE_FRAC) * 100 + SLIDE_ZONE_FRAC * 100 * s.xFrac}%`,
                  top: `${s.yPct}%`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {(isSliding || shocking) ? (
        <div className="pointer-events-none absolute inset-0 z-[3] overflow-visible" aria-hidden>
          {BOLT_EMOJI_SEEDS.map((b, i) => (
            <span
              key={i}
              className="fetch-slide-bolt-emoji absolute bottom-0"
              style={{ left: `${b.xPct}%`, animationDelay: `${b.delay}s` }}
            >
              ⚡
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LiveWelcomeSheet({ onDismiss }: { onDismiss: () => void }) {
  const session = loadSession()
  const hasDetails = !!(session?.email)

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40" onClick={onDismiss}>
      <div
        className="relative mx-auto w-full max-w-[430px] animate-[fetch-welcome-sheet-up_0.4s_ease-out_both] rounded-t-[1.5rem] bg-zinc-50 px-6 pb-[max(2rem,env(safe-area-inset-bottom,0px)+1.5rem)] pt-5 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-5 h-[4px] w-10 rounded-full bg-zinc-300" />

        {/* Demo slider */}
        <div className="mb-5">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white">Try it out</p>
          <WelcomeSliderDemo />
        </div>

        {/* Headline */}
        <div className="mb-6 rounded-xl bg-zinc-50 px-4 py-3 text-center ring-1 ring-zinc-200/80">
          <h2 className="text-[1.2rem] font-extrabold tracking-tight text-zinc-900">Buy, Sell, Live</h2>
          <p className="mt-1 text-[12px] font-medium text-zinc-600">Everything happens in real-time, locally.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {!hasDetails ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-600 bg-white py-3.5 text-[14px] font-bold text-white shadow-sm transition-colors active:bg-zinc-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
              </svg>
              Add Payment Details
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="flex w-full items-center justify-center rounded-2xl bg-white py-3.5 text-[14px] font-bold text-zinc-900 shadow-sm transition-colors active:bg-zinc-200"
          >
            Start Browsing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ── Main Page ──────────────────────────────────────────────────── */

type Props = {
  onOpenListing: (listingId: string) => void
  onGoLive?: () => void
}

export const LiveFeedPage = memo(function LiveFeedPage({ onOpenListing, onGoLive }: Props) {
  const streams = useMemo<LiveFeedStream[]>(() => [], [])
  const [activeStream, setActiveStream] = useState<LiveFeedStream | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  const filtered = streams

  const onJoinStream = useCallback((s: LiveFeedStream) => {
    setActiveStream(s)
  }, [])

  const onCloseStream = useCallback(() => {
    setActiveStream(null)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="sticky top-0 z-10 shrink-0 border-b border-zinc-100 bg-white/95 backdrop-blur-md pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3 px-4 pb-2">
          <div className="min-w-0">
            <h1 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-zinc-900">Live</h1>
            <p className="text-[11px] font-medium text-zinc-500">Join live local sellers</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors active:bg-zinc-100"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors active:bg-zinc-100"
              aria-label="Filters"
            >
              <FilterIcon />
            </button>
            {onGoLive ? (
              <button
                type="button"
                onClick={onGoLive}
                className="ml-1 rounded-full bg-[#00ff6a] px-3.5 py-1.5 text-[11px] font-bold text-[#000000] shadow-sm active:opacity-90"
              >
                Go live
              </button>
            ) : null}
          </div>
        </div>

      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50/70 [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="3" stroke="#a1a1aa" strokeWidth="2" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-zinc-700">No live streams right now</p>
            <p className="mt-1 max-w-[18rem] text-[13px] text-zinc-500">
              Check back soon or explore nearby listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 px-3 pb-[max(6rem,env(safe-area-inset-bottom,0px)+5rem)] pt-3">
            {filtered.map((stream) => (
              <LiveFeedCard
                key={stream.id}
                stream={stream}
                onJoin={() => onJoinStream(stream)}
              />
            ))}
          </div>
        )}
      </div>

      {activeStream ? (
        <LiveVideoAuction
          stream={activeStream}
          onClose={onCloseStream}
          onOpenListing={onOpenListing}
        />
      ) : null}

      {showWelcome ? (
        <LiveWelcomeSheet onDismiss={() => setShowWelcome(false)} />
      ) : null}
    </div>
  )
})
