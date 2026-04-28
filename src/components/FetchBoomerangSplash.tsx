import { useCallback, useEffect, useRef, useState } from 'react'

/** Place your file at `public/fetch-entry-splash.mp4` (bundled URL respects `base` in vite.config). */
const ENTRY_SPLASH_VIDEO = `${import.meta.env.BASE_URL}fetch-entry-splash.mp4`

/** Ramp volume to 0 over the last N seconds of the file (whole clip if shorter). */
const ENTRY_SPLASH_AUDIO_FADE_SEC = 1.35
/** If `<video>` never reaches `loadedmetadata` (broken asset / codec). */
const ENTRY_SPLASH_NO_METADATA_MS = 45_000
/** Extra slack after nominal duration — only fires if playback stalls (never hits `ended`). */
const ENTRY_SPLASH_AFTER_DURATION_SLACK_MS = 14_000

function entrySplashFadeVolume(duration: number, currentTime: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 1
  const windowSec = Math.min(ENTRY_SPLASH_AUDIO_FADE_SEC, duration)
  const fadeStart = duration - windowSec
  if (currentTime <= fadeStart) return 1
  const remaining = duration - currentTime
  return Math.max(0, remaining / windowSec)
}

function StaticEntryBrand() {
  return (
    <div className="fetch-entry-brand-splash flex flex-col items-center justify-center text-center">
      <p className="text-[clamp(3.5rem,18vw,6.25rem)] font-black leading-none tracking-[-0.08em] text-white">
        fetchit
      </p>
      <p className="mt-2 text-[clamp(0.9rem,4vw,1.25rem)] font-black uppercase leading-none tracking-[0.28em] text-white/95">
        Bid Wars
      </p>
    </div>
  )
}

type Props = { onDone?: () => void }

export function FetchBoomerangSplash({ onDone }: Props) {
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const videoRef = useRef<HTMLVideoElement>(null)
  /** Ensure `play()` is only invoked once even if multiple readiness events fire. */
  const splashPlayPrimedRef = useRef(false)
  const noMetadataTimerRef = useRef<number | null>(null)
  const stallCeilingTimerRef = useRef<number | null>(null)

  const [preferReducedMotion, setPreferReducedMotion] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  /** iOS/Android block unmuted autoplay — prompt so a tap can unmute. */
  const [soundUnlockOffered, setSoundUnlockOffered] = useState(false)
  /** Keep DOM `muted` in sync with imperative updates so React does not clobber mobile fallback. */
  const [videoMuted, setVideoMuted] = useState(false)

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

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    clearNoMetadataTimer()
    clearStallCeilingTimer()
    onDoneRef.current?.()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const snap = () => setPreferReducedMotion(mq.matches)
    snap()
    mq.addEventListener('change', snap)
    return () => mq.removeEventListener('change', snap)
  }, [])

  /** Reduced motion / no video — short branded hold (matches previous timing feel). */
  useEffect(() => {
    if (!preferReducedMotion) return
    const t = window.setTimeout(finish, 900)
    return () => window.clearTimeout(t)
  }, [preferReducedMotion, finish])

  /** Static fallback after video error or missing file. */
  useEffect(() => {
    if (preferReducedMotion || !videoFailed) return
    const t = window.setTimeout(finish, 980)
    return () => window.clearTimeout(t)
  }, [preferReducedMotion, videoFailed, finish])

  /** Stuck loader if metadata never arrives. */
  useEffect(() => {
    const expectVideo = !preferReducedMotion && !videoFailed
    if (!expectVideo) {
      clearNoMetadataTimer()
      return
    }
    noMetadataTimerRef.current = window.setTimeout(() => {
      noMetadataTimerRef.current = null
      finish()
    }, ENTRY_SPLASH_NO_METADATA_MS)
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
    v.volume = entrySplashFadeVolume(v.duration, v.currentTime)
  }, [])

  const tryPlaySplash = useCallback((v: HTMLVideoElement) => {
    if (splashPlayPrimedRef.current) return
    splashPlayPrimedRef.current = true

    /** First attempt must be audible; muted fallback satisfies autoplay on mobile. */
    const startMutedPlayback = (): void => {
      v.muted = true
      setVideoMuted(true)
      void v.play().catch(() => setVideoFailed(true))
      syncVolume(v)
      setSoundUnlockOffered(true)
    }

    v.muted = false
    setVideoMuted(false)
    v.volume = 1
    void v
      .play()
      .then(() => {
        syncVolume(v)
        setSoundUnlockOffered(false)
      })
      .catch(() => {
        startMutedPlayback()
      })
  }, [syncVolume])

  const showVideo = !preferReducedMotion && !videoFailed
  /** Text fallback only when we are not playing video (accessibility or missing/broken file). */
  const showStatic = preferReducedMotion || videoFailed

  /**
   * Safari / Chrome on iOS only allow unmuting from a user gesture on the same
   * browsing context — this runs from the explicit "Sound on" control.
   */
  const unlockSplashSound = useCallback(() => {
    const v = videoRef.current
    if (!v || doneRef.current || v.ended) return
    v.muted = false
    setVideoMuted(false)
    v.volume = 1
    syncVolume(v)
    void v
      .play()
      .then(() => {
        setSoundUnlockOffered(false)
      })
      .catch(() => {
        /* keep offer visible; user can retry */
      })
  }, [syncVolume])

  /** Smooth end-of-splash audio taper + `timeupdate` backup if rAF is throttled. */
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
      className="fetch-boomerang-splash-root pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={ENTRY_SPLASH_VIDEO}
          muted={videoMuted}
          autoPlay
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            clearNoMetadataTimer()
            const d = v.duration
            if (Number.isFinite(d) && d > 0 && d < 86400) {
              clearStallCeilingTimer()
              stallCeilingTimerRef.current = window.setTimeout(() => {
                stallCeilingTimerRef.current = null
                finish()
              }, d * 1000 + ENTRY_SPLASH_AFTER_DURATION_SLACK_MS)
            }
            v.volume = 1
            v.muted = false
            setVideoMuted(false)
            syncVolume(v)
            tryPlaySplash(v)
          }}
          onLoadedData={(e) => tryPlaySplash(e.currentTarget)}
          onCanPlay={(e) => tryPlaySplash(e.currentTarget)}
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

      {showStatic ? (
        <div className="relative z-[1] flex min-h-0 w-full max-w-lg flex-col items-center justify-center px-6">
          <StaticEntryBrand />
        </div>
      ) : null}

      {showVideo && soundUnlockOffered ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            unlockSplashSound()
          }}
          className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,8px))] left-1/2 z-[3] max-w-[min(92vw,20rem)] -translate-x-1/2 rounded-full bg-black/55 px-4 py-2.5 text-[13px] font-black uppercase tracking-[0.12em] text-white ring-1 ring-white/25 backdrop-blur-md transition-[background-color,transform] hover:bg-black/65 active:scale-[0.98]"
          aria-label="Turn sound on for intro video"
        >
          Tap for sound
        </button>
      ) : null}

      {/* Always-available skip — guarantees the user can reach the app. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[4] rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white ring-1 ring-white/20 backdrop-blur-sm transition-[background-color,transform] hover:bg-white/25 active:scale-95"
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>
  )
}
