import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useJsApiLoader } from '@react-google-maps/api'
import {
  PlacesAddressAutocomplete,
  type ResolvedPlace,
} from './FetchHomeStepOne/PlacesAddressAutocomplete'
import { playUiFeedback } from '../voice/fetchFeedback'
import addressSheetFlagMascotUrl from '../assets/fetchit-address-sheet-flag-transparent.png'

const GOOGLE_MAP_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry']

const brandedInputClass =
  'w-full rounded-2xl border border-[#4c1d95]/25 bg-white px-3.5 py-3.5 text-[15px] font-semibold leading-snug text-zinc-900 shadow-[0_10px_24px_-18px_rgba(76,29,149,0.45)] outline-none ring-0 placeholder:text-zinc-400 focus:border-[#4c1d95] focus:ring-2 focus:ring-[#c4b5fd]/80'

const COIN_COUNT = 100
const CONFETTI_COUNT = 60
const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#ffffff', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fde68a']

type Phase = 'address' | 'coins' | 'gift' | 'confetti' | 'signin'

function placeFromGeocodeResult(r: google.maps.GeocoderResult): ResolvedPlace | null {
  const loc = r.geometry?.location
  const formattedAddress = r.formatted_address
  const placeId = r.place_id
  if (!loc || !formattedAddress || !placeId) return null
  const suburb =
    r.address_components?.find((c) => c.types.includes('locality'))?.long_name ??
    r.address_components?.find((c) =>
      c.types.includes('sublocality') || c.types.includes('sublocality_level_1'),
    )?.long_name
  return { formattedAddress, placeId, coords: { lat: loc.lat(), lng: loc.lng() }, suburb }
}

/* ── Coin helpers ──────────────────────────────────────────────── */

type CoinSeed = { sx: string; sy: string; tx: string; ty: string; delay: number; dur: number; impactMs: number }

function buildCoinSeeds(gemsRect: DOMRect | null): CoinSeed[] {
  const seeds: CoinSeed[] = []
  const vw = window.innerWidth
  const vh = window.innerHeight
  const targetCx = gemsRect ? gemsRect.left + gemsRect.width / 2 : vw * 0.85
  const targetCy = gemsRect ? gemsRect.top + gemsRect.height / 2 : 20
  for (let i = 0; i < COIN_COUNT; i++) {
    const h1 = ((i * 2654435761) >>> 0) / 4294967296
    const h2 = (((i + 37) * 2246822519) >>> 0) / 4294967296
    const startX = vw * 0.15 + h1 * vw * 0.7
    const startY = vh * 0.75 + h2 * vh * 0.2
    const delay = i * 0.022 + h2 * 0.1
    const dur = 0.8 + h1 * 0.5
    seeds.push({ sx: `${startX}px`, sy: `${startY}px`, tx: `${targetCx - startX}px`, ty: `${targetCy - startY}px`, delay, dur, impactMs: (delay + dur) * 1000 })
  }
  return seeds
}

function pulseGemsIcon() {
  const el = document.querySelector('[data-fetch-gems-icon]')
  if (!el) return
  el.classList.add('fetch-gems-impact-pulse')
  el.addEventListener('animationend', () => el.classList.remove('fetch-gems-impact-pulse'), { once: true })
}
function addVortex() { document.querySelector('[data-fetch-gems-icon]')?.classList.add('fetch-gems-vortex') }
function removeVortex() { document.querySelector('[data-fetch-gems-icon]')?.classList.remove('fetch-gems-vortex') }

function CoinCelebration({ onDone, onCoinTick }: { onDone: () => void; onCoinTick?: (n: number) => void }) {
  const gemsRect = document.querySelector('[data-fetch-gems-icon]')?.getBoundingClientRect() ?? null
  const seeds = useMemo(() => buildCoinSeeds(gemsRect), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const hitTimersRef = useRef<number[]>([])

  useEffect(() => {
    playUiFeedback('gems_collect')
    addVortex()
    startRef.current = performance.now()
    const tick = (now: number) => {
      const pct = Math.min((now - startRef.current) / 2400, 1)
      onCoinTick?.(Math.round(pct * COIN_COUNT))
      if (pct < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    const timers: number[] = []
    for (const s of seeds) {
      timers.push(window.setTimeout(() => { playUiFeedback('coin_hit'); pulseGemsIcon() }, s.impactMs))
    }
    hitTimersRef.current = timers
    const dismiss = window.setTimeout(() => { removeVortex(); onDone() }, 3200)
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(dismiss); hitTimersRef.current.forEach(clearTimeout); removeVortex() }
  }, [onDone, seeds])

  return createPortal(
    <>
      {seeds.map((s, i) => (
        <span key={i} className="fetch-entry-coin" style={{ left: s.sx, top: s.sy, '--coin-tx': s.tx, '--coin-ty': s.ty, '--coin-delay': `${s.delay}s`, '--coin-dur': `${s.dur}s` } as React.CSSProperties} />
      ))}
    </>,
    document.body,
  )
}

/* ── Confetti burst ────────────────────────────────────────────── */

type ConfettiSeed = { x: number; dx: number; color: string; delay: number; dur: number; w: number; h: number }

function buildConfettiSeeds(): ConfettiSeed[] {
  const seeds: ConfettiSeed[] = []
  const vw = typeof window !== 'undefined' ? window.innerWidth : 430
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const h = ((i * 2654435761) >>> 0) / 4294967296
    const h2 = (((i + 19) * 2246822519) >>> 0) / 4294967296
    seeds.push({
      x: vw * 0.1 + h * vw * 0.8,
      dx: (h2 - 0.5) * 200,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: h2 * 0.4,
      dur: 1.8 + h * 1,
      w: 6 + h2 * 8,
      h: 6 + h * 6,
    })
  }
  return seeds
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const seeds = useMemo(buildConfettiSeeds, [])
  useEffect(() => {
    playUiFeedback('payment_success')
    const t = window.setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <>
      {seeds.map((s, i) => (
        <span
          key={i}
          className="fetch-confetti-piece"
          style={{
            left: s.x,
            top: '35vh',
            width: s.w,
            height: s.h,
            backgroundColor: s.color,
            '--conf-dx': `${s.dx}px`,
            '--conf-delay': `${s.delay}s`,
            '--conf-dur': `${s.dur}s`,
          } as React.CSSProperties}
        />
      ))}
    </>,
    document.body,
  )
}

/* ── Gift choice screen ────────────────────────────────────────── */

function GiftChoiceScreen({ onChoose }: { onChoose: (gift: string) => void }) {
  return (
    <div className="relative z-[5] flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-5 py-6 animate-[fetch-phase-fade-in_0.5s_ease_both]">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400/70">You earned 100 coins</p>
        <h2 className="mt-2 text-[1.6rem] font-black leading-tight tracking-tight text-white">
          Choose your gift
        </h2>
        <p className="mt-1.5 text-[13px] text-white/45">Pick one reward to unlock</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {/* Gift 1: $0 travel fee */}
        <button
          type="button"
          onClick={() => onChoose('free_travel')}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-5 text-left transition-all duration-200 hover:border-amber-400/30 hover:bg-white/[0.07] active:scale-[0.98] animate-[fetch-gift-card-glow_3s_ease-in-out_infinite]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-[1.75rem]" aria-hidden>
            🚗
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white">$0 Travel Fee</p>
            <p className="mt-0.5 text-[12px] leading-snug text-white/45">Your first delivery ride is completely free</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/25 transition-colors group-hover:text-amber-400/60" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Gift 2: Seller boost */}
        <button
          type="button"
          onClick={() => onChoose('seller_boost')}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-5 text-left transition-all duration-200 hover:border-amber-400/30 hover:bg-white/[0.07] active:scale-[0.98] animate-[fetch-gift-card-glow_3s_ease-in-out_infinite_0.5s]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 text-[1.75rem]" aria-hidden>
            ⚡
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white">First-Time Seller Boost</p>
            <p className="mt-0.5 text-[12px] leading-snug text-white/45">Your first listing gets promoted to local buyers</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/25 transition-colors group-hover:text-emerald-400/60" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── Sign-in prompt ────────────────────────────────────────────── */

function SignInPrompt({ gift, onSignIn, onSkip }: { gift: string; onSignIn: () => void; onSkip: () => void }) {
  const giftLabel = gift === 'free_travel' ? '$0 Travel Fee' : 'Seller Boost'
  return (
    <div className="relative z-[5] flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-5 py-6 animate-[fetch-phase-fade-in_0.5s_ease_both]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10">
        <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="si-coin" x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde68a" />
              <stop offset="0.35" stopColor="#fbbf24" />
              <stop offset="0.72" stopColor="#d97706" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="10" fill="url(#si-coin)" stroke="#78350f" strokeWidth="0.85" />
          <circle cx="12" cy="12" r="7.75" fill="none" stroke="#92400e" strokeWidth="0.55" opacity="0.7" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-[1.45rem] font-black leading-tight tracking-tight text-white">
          Sign in to claim
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-white/50">
          Your <span className="font-bold text-amber-400">100 coins</span> and <span className="font-bold text-white/80">{giftLabel}</span> are waiting.
          <br />Sign in to lock them to your account.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold tracking-tight text-black shadow-[0_8px_28px_-8px_rgba(255,255,255,0.25)] transition-[transform,box-shadow] hover:shadow-[0_10px_32px_-8px_rgba(255,255,255,0.3)] active:scale-[0.98]"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-1.5 text-center text-[12px] font-medium text-white/35 transition-colors hover:text-white/55"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

/* ── Sheet shell ───────────────────────────────────────────────── */

type SheetShellProps = {
  heroSrc: string
  heroAlt: string
  mapsApiKey: string
  hasMapsKey: boolean
  mapsReady: boolean
  isLoggedIn: boolean
  onConfirm: (place: ResolvedPlace) => void
  onDismiss: () => void
  onCoinTick?: (n: number) => void
}

function FetchEntryAddressSheetShell({
  heroSrc: _heroSrc,
  heroAlt: _heroAlt,
  mapsApiKey,
  hasMapsKey,
  mapsReady,
  isLoggedIn,
  onConfirm,
  onDismiss,
  onCoinTick,
}: SheetShellProps) {
  const suggestionsMountRef = useRef<HTMLDivElement>(null)
  const [pendingPlace, setPendingPlace] = useState<ResolvedPlace | null>(null)
  const [addressText, setAddressText] = useState('')
  const [locBusy, setLocBusy] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('address')
  const [chosenGift, setChosenGift] = useState<string | null>(null)
  const confirmedPlaceRef = useRef<ResolvedPlace | null>(null)
  const hasAddress = Boolean(pendingPlace) || addressText.trim().length > 0

  useEffect(() => { setPendingPlace(null); setLocError(null); setLocBusy(false) }, [hasMapsKey, mapsReady])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const startCelebration = useCallback((place: ResolvedPlace) => {
    confirmedPlaceRef.current = place
    setPhase('coins')
  }, [])

  const onCoinsDone = useCallback(() => setPhase('gift'), [])

  const onGiftChosen = useCallback((gift: string) => {
    setChosenGift(gift)
    setPhase('confetti')
  }, [])

  const onConfettiDone = useCallback(() => {
    if (isLoggedIn) {
      if (confirmedPlaceRef.current) onConfirm(confirmedPlaceRef.current)
    } else {
      setPhase('signin')
    }
  }, [isLoggedIn, onConfirm])

  const onSignIn = useCallback(() => {
    if (confirmedPlaceRef.current) onConfirm(confirmedPlaceRef.current)
  }, [onConfirm])

  const useCurrentLocation = useCallback(() => {
    setLocError(null)
    if (!hasMapsKey || !mapsReady || typeof google === 'undefined' || !google.maps?.Geocoder) {
      setLocError('Maps is still loading. Try again in a moment.')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocError('Location is not available on this device.')
      return
    }
    setLocBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode(
          { location: { lat: pos.coords.latitude, lng: pos.coords.longitude } },
          (results, status) => {
            setLocBusy(false)
            if (status !== 'OK' || !results?.[0]) { setLocError('Could not resolve that location.'); return }
            const resolved = placeFromGeocodeResult(results[0])
            if (!resolved) { setLocError('Could not read address details.'); return }
            startCelebration(resolved)
          },
        )
      },
      () => { setLocBusy(false); setLocError('Location permission is needed.') },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    )
  }, [hasMapsKey, mapsReady, startCelebration])

  const isCoinPhase = phase === 'coins'
  const isFullScreen = phase === 'gift' || phase === 'confetti' || phase === 'signin'

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col transition-[background-color,backdrop-filter] duration-500 ${
        isFullScreen ? 'justify-center bg-black/90 backdrop-blur-0'
        : isCoinPhase ? 'justify-end bg-transparent backdrop-blur-0'
        : 'justify-end bg-[#2e1065]/35 backdrop-blur-[4px]'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fetch-entry-address-heading"
    >
      <div
        className={[
          'pointer-events-auto relative mx-auto flex w-full flex-col',
          isFullScreen
            ? 'fetch-entry-galactic max-w-lg flex-1 overflow-hidden rounded-none'
            : 'max-w-lg max-h-[min(92dvh,720px)] overflow-visible rounded-t-[1.5rem] bg-[#faf8ff] shadow-[0_-18px_52px_-24px_rgba(76,29,149,0.45)] ring-1 ring-[#4c1d95]/12 animate-[fetch-galactic-sheet-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both]',
        ].join(' ')}
        style={isFullScreen ? undefined : { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {phase === 'address' ? (
          <img
            src={addressSheetFlagMascotUrl}
            alt=""
            className="pointer-events-none absolute left-1/2 top-0 z-[6] w-[112%] max-w-none -translate-x-1/2 -translate-y-[63%] select-none object-contain drop-shadow-[0_18px_30px_rgba(46,16,101,0.24)]"
            draggable={false}
            aria-hidden
          />
        ) : null}

        {/* Shooting stars stay only on the reward fullscreen phases. */}
        {isFullScreen ? (
          <>
            <span className="fetch-entry-galactic__shooting-star" aria-hidden />
            <span className="fetch-entry-galactic__shooting-star" aria-hidden />
            <span className="fetch-entry-galactic__shooting-star" aria-hidden />
          </>
        ) : null}

        {/* Phase: coins */}
        {isCoinPhase ? <CoinCelebration onDone={onCoinsDone} onCoinTick={onCoinTick} /> : null}

        {/* Phase: confetti */}
        {phase === 'confetti' ? <ConfettiBurst onDone={onConfettiDone} /> : null}

        {/* Phase: address input */}
        {phase === 'address' || isCoinPhase ? (
          <>
            <div className="relative z-[5] flex shrink-0 justify-center pt-3 pb-2" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#4c1d95]/18" />
            </div>
            <div className={`relative z-[5] flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5 pt-2 transition-[filter,opacity] duration-500 ${isCoinPhase ? 'pointer-events-none blur-[6px] opacity-60' : 'blur-0 opacity-100'}`}>
              <div className="space-y-2">
                <h2 id="fetch-entry-address-heading" className="text-[1.45rem] font-black leading-tight tracking-tight text-zinc-950">
                  Where should we deliver?
                </h2>
                <p className="text-[13px] font-medium leading-snug text-zinc-500">
                  Enter your address to <span className="font-extrabold text-[#4c1d95]">collect 100 coins</span>.
                </p>
              </div>

              {hasMapsKey && mapsReady ? (
                <>
                  <PlacesAddressAutocomplete
                    apiKey={mapsApiKey}
                    field="pickup"
                    placeholder="Street address or suburb"
                    autoFocus
                    onResolved={(p) => { setPendingPlace(p); setAddressText(p.formattedAddress) }}
                    suggestionsMountRef={suggestionsMountRef}
                    className={brandedInputClass}
                  />
                  <div ref={suggestionsMountRef} className="fetch-entry-address-suggestions min-h-0 shrink-0" />
                </>
              ) : (
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => { setAddressText(e.target.value); setPendingPlace(null) }}
                  placeholder="Enter your delivery address"
                  autoFocus
                  className={brandedInputClass}
                />
              )}

              {locError ? <p className="text-[12px] font-semibold text-red-600" role="alert">{locError}</p> : null}

              <div className="mt-auto flex flex-col gap-2.5 pt-2">
                {hasMapsKey ? (
                  <button type="button" onClick={useCurrentLocation} disabled={!mapsReady || locBusy} className="self-start text-[12px] font-bold text-[#4c1d95]/75 underline decoration-[#4c1d95]/25 underline-offset-[3px] transition-colors hover:text-[#4c1d95] disabled:cursor-not-allowed disabled:opacity-35">
                    {locBusy ? 'Locating...' : 'Use current address'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    const place: ResolvedPlace = pendingPlace ?? { formattedAddress: addressText.trim(), placeId: '', coords: { lat: 0, lng: 0 } }
                    startCelebration(place)
                  }}
                  disabled={!hasAddress}
                  className={[
                    'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-extrabold tracking-tight transition-[transform,background-color,box-shadow,color] duration-300 active:scale-[0.98]',
                    hasAddress
                      ? 'bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] text-white shadow-[0_18px_34px_-18px_rgba(76,29,149,0.65),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-105'
                      : 'cursor-not-allowed bg-zinc-200 text-zinc-400 shadow-none',
                  ].join(' ')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                    <path d="M20 8h-3.6a3.4 3.4 0 1 0-4.4-4.4A3.4 3.4 0 1 0 7.6 8H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 8v13" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Collect coins
                </button>

                <button type="button" onClick={onDismiss} className="w-full py-1.5 text-center text-[12px] font-bold text-zinc-400 transition-colors hover:text-[#4c1d95]/75">
                  Not now
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* Phase: gift choice */}
        {phase === 'gift' ? <GiftChoiceScreen onChoose={onGiftChosen} /> : null}

        {/* Phase: confetti + chosen gift confirmation */}
        {phase === 'confetti' ? (
          <div className="relative z-[5] flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 animate-[fetch-phase-fade-in_0.4s_ease_both]">
            <span className="text-[3rem]" aria-hidden>{chosenGift === 'free_travel' ? '🚗' : '⚡'}</span>
            <h2 className="text-[1.4rem] font-black tracking-tight text-white">
              {chosenGift === 'free_travel' ? '$0 Travel Fee unlocked!' : 'Seller Boost unlocked!'}
            </h2>
          </div>
        ) : null}

        {/* Phase: sign in */}
        {phase === 'signin' ? <SignInPrompt gift={chosenGift ?? ''} onSignIn={onSignIn} onSkip={onDismiss} /> : null}
      </div>
    </div>
  )
}

/* ── Maps wrapper + export ─────────────────────────────────────── */

function FetchEntryAddressSheetWithMaps({
  mapsApiKey,
  ...rest
}: Omit<SheetShellProps, 'hasMapsKey' | 'mapsReady'> & { mapsApiKey: string }) {
  const { isLoaded } = useJsApiLoader({
    id: 'fetch-google-maps',
    googleMapsApiKey: mapsApiKey,
    version: 'weekly',
    libraries: GOOGLE_MAP_LIBRARIES,
    preventGoogleFontsLoading: true,
  })
  return <FetchEntryAddressSheetShell {...rest} mapsApiKey={mapsApiKey} hasMapsKey mapsReady={isLoaded} />
}

export function FetchEntryAddressSheet({
  open,
  mapsApiKey,
  heroSrc,
  heroAlt = '',
  isLoggedIn = false,
  onConfirm,
  onDismiss,
  onCoinTick,
}: {
  open: boolean
  mapsApiKey: string
  heroSrc: string
  heroAlt?: string
  isLoggedIn?: boolean
  onConfirm: (place: ResolvedPlace) => void
  onDismiss: () => void
  onCoinTick?: (n: number) => void
}) {
  if (!open) return null
  const trimmedKey = mapsApiKey.trim()
  if (trimmedKey) {
    return <FetchEntryAddressSheetWithMaps mapsApiKey={trimmedKey} heroSrc={heroSrc} heroAlt={heroAlt} isLoggedIn={isLoggedIn} onConfirm={onConfirm} onDismiss={onDismiss} onCoinTick={onCoinTick} />
  }
  return <FetchEntryAddressSheetShell heroSrc={heroSrc} heroAlt={heroAlt} mapsApiKey="" hasMapsKey={false} mapsReady={false} isLoggedIn={isLoggedIn} onConfirm={onConfirm} onDismiss={onDismiss} onCoinTick={onCoinTick} />
}
