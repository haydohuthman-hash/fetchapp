import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PublishedExploreStory = {
  id: string
  blobUrl: string
  posterDataUrl: string
  overlayText: string
}

const FALLBACK_POSTER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" rx="56" fill="%23e4e4e7"/%3E%3C/svg%3E'

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const mime of candidates) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return mime
    } catch {
      /* noop */
    }
  }
  return undefined
}

function drawOverlayOnCanvas(ctx: CanvasRenderingContext2D, text: string, cw: number, ch: number) {
  const t = text.trim()
  if (!t) return
  const maxLines = 5
  const padX = Math.max(14, cw * 0.04)
  const padY = Math.max(36, ch * 0.07)
  const fs = Math.max(19, Math.min(40, cw * 0.058))
  ctx.font = `800 ${fs}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  const words = t.replace(/\s+/g, ' ').split(' ')
  const lines: string[] = []
  let line = ''

  const pushLineIfOk = (): void => {
    if (lines.length >= maxLines) return
    if (line) lines.push(line)
    line = ''
  }

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(test).width <= cw - padX * 2) {
      line = test
      continue
    }
    pushLineIfOk()
    line = word
    if (lines.length >= maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  while (lines.length > maxLines) lines.pop()

  const lineGap = fs * 1.12
  const totalH = lines.length * lineGap
  let y = ch - padY - 6

  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(0, y - totalH - fs * 0.35 - 14, cw, totalH + fs * 0.35 + 24)

  ctx.fillStyle = '#ffffff'
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    ctx.fillText(lines[i]!, cw / 2, y)
    y -= lineGap
  }
}

export function ExploreStoryViewerModal({
  open,
  videoUrl,
  onClose,
}: {
  open: boolean
  videoUrl: string | null
  onClose: () => void
}) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open || !videoUrl) return
    const el = ref.current
    el?.play().catch(() => undefined)
  }, [open, videoUrl])

  if (!open || !videoUrl || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[121] flex flex-col bg-black pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
      role="dialog"
      aria-modal="true"
      aria-label="Story playback"
    >
      <button
        type="button"
        aria-label="Close story"
        onClick={onClose}
        className="absolute left-3 top-[max(0.5rem,env(safe-area-inset-top))] z-[2] rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white outline-none [-webkit-tap-highlight-color:transparent] active:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/45"
      >
        Close
      </button>
      <div className="flex flex-1 items-center justify-center px-4">
        <video
          ref={ref}
          src={videoUrl}
          playsInline
          controls
          className="max-h-[min(90dvh,calc(100vw*16/9))] w-full max-w-[min(100%,430px)] rounded-xl bg-black"
        />
      </div>
    </div>,
    document.body,
  )
}

export function ExploreStoryComposerModal({
  open,
  onClose,
  onPublish,
}: {
  open: boolean
  onClose: () => void
  onPublish: (clip: PublishedExploreStory) => void
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const overlayTextRef = useRef('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overlayText, setOverlayText] = useState('')
  const [micEnabled, setMicEnabled] = useState(true)
  const [recording, setRecording] = useState(false)
  const [composedClip, setComposedClip] = useState<{ blob: Blob; posterDataUrl: string } | null>(null)

  useEffect(() => {
    overlayTextRef.current = overlayText
  }, [overlayText])

  useEffect(() => {
    if (!open) return
    setError(null)
    setOverlayText('')
    overlayTextRef.current = ''
    setMicEnabled(true)
    setRecording(false)
    setComposedClip(null)
    chunksRef.current = []
    recorderRef.current = null
    setBusy(true)

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const v = previewRef.current
        if (v) {
          v.srcObject = stream
          v.muted = true
          v.playsInline = true
          await v.play().catch(() => undefined)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not access camera or microphone.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      const activeRec = recorderRef.current
      if (activeRec && activeRec.state !== 'inactive') {
        try {
          activeRec.stop()
        } catch {
          /* noop */
        }
      }
      recorderRef.current = null
      chunksRef.current = []
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      const v = previewRef.current
      if (v) {
        v.pause()
        v.srcObject = null
      }
    }
  }, [open])

  useEffect(() => {
    const s = streamRef.current
    if (!s || !open) return
    s.getAudioTracks().forEach((t) => {
      t.enabled = micEnabled
    })
  }, [micEnabled, open])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const stopRecording = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    const rec = recorderRef.current
    const overlaySnap = overlayTextRef.current

    if (!rec || rec.state === 'inactive') {
      setRecording(false)
      return
    }

    rec.onstop = () => {
      const mimeType = rec.mimeType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []
      recorderRef.current = null

      const vid = previewRef.current
      const canvas = canvasRef.current
      let posterDataUrl = ''
      const vw = vid?.videoWidth ?? 0
      const vh = vid?.videoHeight ?? 0
      if (vid && canvas && vw > 2 && vh > 2) {
        canvas.width = vw
        canvas.height = vh
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(vid, 0, 0, vw, vh)
          drawOverlayOnCanvas(ctx, overlaySnap, vw, vh)
          try {
            posterDataUrl = canvas.toDataURL('image/jpeg', 0.86)
          } catch {
            posterDataUrl = ''
          }
        }
      }

      if (blob.size > 0) {
        setComposedClip({ blob, posterDataUrl: posterDataUrl || FALLBACK_POSTER })
        setError(null)
      } else {
        setError('Recording was empty — try again.')
        setComposedClip(null)
      }
      setRecording(false)
    }

    try {
      rec.stop()
    } catch {
      recorderRef.current = null
      setRecording(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    const vid = previewRef.current
    const canvas = canvasRef.current
    const stream = streamRef.current
    if (!vid || !canvas || !stream) return

    const vw = vid.videoWidth
    const vh = vid.videoHeight
    if (recording || vw <= 2 || vh <= 2) {
      if (vw <= 2 || vh <= 2)
        setError('Camera is still starting — wait a moment and try again.')
      return
    }

    setComposedClip(null)
    chunksRef.current = []

    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Could not start recording.')
      return
    }

    const mime = pickRecorderMimeType()
    try {
      const canvasStream = canvas.captureStream(24)
      const vidTrack = canvasStream.getVideoTracks()[0]
      const audioTracks = stream.getAudioTracks()

      const outTracks: MediaStreamTrack[] = [vidTrack]
      if (audioTracks[0]) outTracks.push(audioTracks[0])

      const outStream = new MediaStream(outTracks)
      const recorder = mime ? new MediaRecorder(outStream, { mimeType: mime }) : new MediaRecorder(outStream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onerror = () => {
        setError('Recording failed.')
        recorderRef.current = null
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
        setRecording(false)
      }
      recorderRef.current = recorder
      recorder.start(120)

      const tick = (): void => {
        if (!recorderRef.current || recorderRef.current.state !== 'recording') return
        ctx.drawImage(vid, 0, 0, vw, vh)
        drawOverlayOnCanvas(ctx, overlayTextRef.current, vw, vh)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
      setRecording(true)
      setError(null)
    } catch {
      setError('Recording is not supported in this browser.')
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [recording])

  const submitPost = useCallback(() => {
    if (!composedClip) return
    const blobUrl = URL.createObjectURL(composedClip.blob)
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
    onPublish({
      id,
      blobUrl,
      posterDataUrl: composedClip.posterDataUrl,
      overlayText: overlayText.trim(),
    })
    setComposedClip(null)
    onClose()
  }, [composedClip, onClose, onPublish, overlayText])

  const hardClose = useCallback(() => {
    stopRecording()
    setComposedClip(null)
    onClose()
  }, [onClose, stopRecording])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explore-story-composer-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
        <button
          type="button"
          onClick={() => hardClose()}
          className="rounded-xl px-3 py-2 text-[14px] font-semibold text-white/85 outline-none [-webkit-tap-highlight-color:transparent] transition-colors active:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Close
        </button>
        <h2 id="explore-story-composer-title" className="min-w-0 flex-1 text-center text-[15px] font-bold text-white">
          New story
        </h2>
        <div className="w-[4.75rem]" aria-hidden />
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[min(100%,430px)] flex-1 px-4 pb-6">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-zinc-900">
          <video ref={previewRef} className="absolute inset-0 h-full w-full object-cover" playsInline />
          <canvas ref={canvasRef} className="pointer-events-none absolute left-[-9999px] top-0 h-px w-px opacity-0" />
          {!busy ? (
            <div className="pointer-events-none absolute bottom-14 left-0 right-0 flex justify-center px-4">
              {overlayText.trim() ? (
                <div className="max-w-[95%] rounded-xl bg-black/40 px-3 py-2 text-center text-[15px] font-extrabold leading-snug text-white">
                  {overlayText.trim()}
                </div>
              ) : null}
            </div>
          ) : null}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[14px] font-semibold text-white">
              Starting camera…
            </div>
          ) : null}
        </div>

        {recording ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-red-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording…
          </div>
        ) : null}

        {composedClip ? (
          <p className="mt-3 text-center text-[13px] font-semibold text-emerald-300">Clip ready — tap Post to add it.</p>
        ) : null}

        {error ? <p className="mt-3 text-center text-[13px] font-medium text-red-300">{error}</p> : null}

        <label className="sr-only" htmlFor="explore-story-overlay-text">
          Text overlay
        </label>
        <textarea
          id="explore-story-overlay-text"
          value={overlayText}
          disabled={recording}
          onChange={(e) => setOverlayText(e.target.value)}
          placeholder="Add text overlay (shows on recording)"
          className="mt-4 max-h-[4.75rem] w-full resize-none rounded-2xl border border-white/14 bg-white/8 px-3 py-2.5 text-[15px] leading-snug text-white outline-none [-webkit-tap-highlight-color:transparent] placeholder:text-white/40 focus-visible:border-white/35"
          rows={2}
          maxLength={280}
          autoComplete="off"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMicEnabled((v) => !v)}
            disabled={recording}
            className={`rounded-xl border px-4 py-2.5 text-[13px] font-semibold outline-none [-webkit-tap-highlight-color:transparent] transition-colors focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40 ${
              micEnabled ? 'border-white/30 bg-white/10 text-white' : 'border-white/14 bg-transparent text-white/65'
            }`}
          >
            {micEnabled ? 'Mic on' : 'Mic off'}
          </button>

          {!recording ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => startRecording()}
              className="min-w-[7rem] flex-1 rounded-xl bg-white px-4 py-2.5 text-center text-[14px] font-black text-zinc-950 outline-none [-webkit-tap-highlight-color:transparent] transition-colors active:bg-zinc-200 disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Record
            </button>
          ) : (
            <button
              type="button"
              onClick={() => stopRecording()}
              className="min-w-[7rem] flex-1 rounded-xl border border-white/40 bg-transparent px-4 py-2.5 text-center text-[14px] font-black text-white outline-none [-webkit-tap-highlight-color:transparent] active:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Stop
            </button>
          )}

          <button
            type="button"
            disabled={recording || !composedClip}
            onClick={() => submitPost()}
            className="rounded-xl border border-transparent bg-violet-600 px-4 py-2.5 text-[14px] font-bold text-white outline-none [-webkit-tap-highlight-color:transparent] active:bg-violet-700 disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Post
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] font-medium leading-relaxed text-white/52">
          Text is drawn into each video frame before saving. Toggle Mic before you hit Record — turn it off for silent video
          (camera permission is still required).
        </p>
      </div>
    </div>,
    document.body,
  )
}
