import { useCallback, useEffect, useRef, useState } from 'react'

/** Place your file at `public/pokies-splash.mp4` (bundled URL respects `base` in vite.config). */
const POKIES_SPLASH_VIDEO = `${import.meta.env.BASE_URL}pokies-splash.mp4`

/** Ramp audio to 0 over the last N seconds of the clip (whole file if shorter). */
const POKIES_SPLASH_AUDIO_FADE_SEC = 1.35
/** Fallback hold when the file fails to load (reduced motion / decode error path). */
const POKIES_SPLASH_FALLBACK_MS = 900
/** Long wait if `<video>` never reaches `loadedmetadata` (broken URL / codec). */
const POKIES_SPLASH_NO_METADATA_MS = 45_000
/** Extra slack after the file’s nominal duration — only fires if playback stalls forever. */
const POKIES_SPLASH_AFTER_DURATION_SLACK_MS = 14_000

function pokiesSplashFadeVolume(duration: number, currentTime: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 1
  const windowSec = Math.min(POKIES_SPLASH_AUDIO_FADE_SEC, duration)
  const fadeStart = duration - windowSec
  if (currentTime <= fadeStart) return 1
  const remaining = duration - currentTime
  return Math.max(0, remaining / windowSec)
}

type Props = {
  /** Called once when the splash video finishes (or fallback timer elapses). */
  onDone: () => void
}

/**
 * Pokies entry splash — full-screen video shown the first time the Pokies
 * page mounts. Auto-plays muted on iOS if the browser blocks unmuted
 * autoplay. Falls back to a short branded hold if the file is unavailable.
 */
export function PokiesSplash({ onDone }: Props) {
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const videoRef = useRef<HTMLVideoElement>(null)
  /** Fires if metadata never arrives (broken asset). Cleared once we know duration. */
  const noMetadataTimerRef = useRef<number | null>(null)
  /** Fires only if playback stalls and never reaches `ended` — set to nominal end + slack. */
  const stallCeilingTimerRef = useRef<number | null>(null)

  const [preferReducedMotion, setPreferReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [exiting, setExiting] = useState(false)

  const clearNoMetadataTimer = () => {
    if (noMetadataTimerRef.current != null) {
      window.clearTimeout(noMetadataTimerRef.current)
      noMetadataTimerRef.current = null
    }
  }

  const clearStallCeilingTimer = () => {
    if (stallCeilingTimerRef.current != null) {
      window.clearTimeout(stallCeilingTimerRef.current)
      stallCeilingTimerRef.current = null
    }
  }

  /** Stable identity so motion/fallback/stub timers are not reset when the parent re-renders. */
  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    clearNoMetadataTimer()
    clearStallCeilingTimer()
    setExiting(true)
    /** ~220ms fade-out of the splash overlay before the parent unmounts it. */
    window.setTimeout(() => {
      onDoneRef.current()
    }, 220)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const snap = () => setPreferReducedMotion(mq.matches)
    snap()
    mq.addEventListener('change', snap)
    return () => mq.removeEventListener('change', snap)
  }, [])

  /** Reduced motion / no video — short branded hold. */
  useEffect(() => {
    if (!preferReducedMotion) return
    const t = window.setTimeout(finish, POKIES_SPLASH_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [preferReducedMotion, finish])

  useEffect(() => {
    if (preferReducedMotion || !videoFailed) return
    const t = window.setTimeout(finish, POKIES_SPLASH_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [preferReducedMotion, videoFailed, finish])

  /** If we expect a `<video>` but metadata never loads, do not hang forever. */
  useEffect(() => {
    const showVideo = !preferReducedMotion && !videoFailed
    if (!showVideo) {
      clearNoMetadataTimer()
      return
    }
    noMetadataTimerRef.current = window.setTimeout(() => {
      noMetadataTimerRef.current = null
      finish()
    }, POKIES_SPLASH_NO_METADATA_MS)
    return () => clearNoMetadataTimer()
  }, [preferReducedMotion, videoFailed, finish])

  useEffect(
    () => () => {
      clearNoMetadataTimer()
      clearStallCeilingTimer()
    },
    [],
  )

  const syncVolume = useCallback((v: HTMLVideoElement) => {
    if (v.readyState < HTMLMediaElement.HAVE_METADATA) return
    v.volume = pokiesSplashFadeVolume(v.duration, v.currentTime)
  }, [])

  const tryPlaySplash = useCallback((v: HTMLVideoElement) => {
    v.muted = false
    v.volume = 1
    void v.play().catch(() => {
      // Most browsers block unmuted autoplay — still show video, silent.
      v.muted = true
      void v.play().catch(() => setVideoFailed(true))
    })
  }, [])

  const showVideo = !preferReducedMotion && !videoFailed

  /** ~60fps volume ramp during the last {@link POKIES_SPLASH_AUDIO_FADE_SEC}s. */
  useEffect(() => {
    if (!showVideo) return undefined
    const v = videoRef.current
    if (!v) return undefined
    let alive = true
    let rafId = 0
    const loop = () => {
      if (!alive) return
      if (v.ended) return
      rafId = requestAnimationFrame(loop)
      if (!v.paused && v.readyState >= HTMLMediaElement.HAVE_METADATA) {
        syncVolume(v)
      }
    }
    const kick = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(loop)
    }
    const onPlaying = () => kick()
    v.addEventListener('playing', onPlaying)
    if (!v.paused) kick()
    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      v.removeEventListener('playing', onPlaying)
    }
  }, [showVideo, syncVolume])

  return (
    <div
      className={[
        'fetch-pokies-splash-root pointer-events-auto absolute inset-0 z-[40] flex items-center justify-center overflow-hidden bg-[#05020b] text-white transition-opacity',
        exiting ? 'opacity-0 duration-300 ease-out' : 'opacity-100 duration-150',
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Loading Prize Spin"
    >
      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={POKIES_SPLASH_VIDEO}
          muted={false}
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            clearNoMetadataTimer()
            clearStallCeilingTimer()
            const d = v.duration
            if (Number.isFinite(d) && d > 0 && d < 86400) {
              stallCeilingTimerRef.current = window.setTimeout(() => {
                stallCeilingTimerRef.current = null
                finish()
              }, d * 1000 + POKIES_SPLASH_AFTER_DURATION_SLACK_MS)
            }
            v.volume = 1
            v.muted = false
            syncVolume(v)
            tryPlaySplash(v)
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            if (!v.paused && v.readyState >= HTMLMediaElement.HAVE_METADATA) {
              syncVolume(v)
            }
          }}
          onEnded={finish}
          onError={() => setVideoFailed(true)}
          aria-hidden
        />
      ) : null}

      {!showVideo ? (
        <div className="relative z-[1] flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[clamp(2.25rem,12vw,4rem)] font-black uppercase leading-none tracking-[0.2em] text-amber-300 drop-shadow-[0_4px_24px_rgba(252,211,77,0.55)]">
            Prize Spin
          </p>
          <p className="mt-3 text-[12px] font-black uppercase leading-none tracking-[0.32em] text-violet-200/90">
            Tap to start
          </p>
        </div>
      ) : null}

      {/* Always-available skip so the page is reachable even if the video stalls. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[2] rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white ring-1 ring-white/20 backdrop-blur-sm transition-[background-color,transform] hover:bg-white/25 active:scale-95"
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>
  )
}
