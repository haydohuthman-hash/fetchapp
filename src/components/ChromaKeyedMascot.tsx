import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { applyGreenScreenKey } from '../lib/chromaKeyGreenScreen'

/** Shared max height (CSS px) for Explore hero mascot (image + video). */
const MASCOT_MAX_CSS_H = 275

type ChromaKeyedMascotProps = {
  src: string
  className?: string
  /** Logical max width (px) for processing; sharpness uses devicePixelRatio. */
  maxProcessWidth?: number
  /** Cap displayed height (CSS px) after width scale; defaults to mascot hero limit. */
  maxCssHeight?: number
  /** Higher cap ⇒ sharper keyed output on dense displays (costs more CPU per paint). */
  chromaPixelRatioMax?: number
  /** Multiplies device pixel ratio before clamp for extra backing‑store clarity. */
  chromaResolutionScale?: number
  /** When greater than 1, `src` is a horizontal strip of equal-width frames. */
  stripFrameCount?: number
  stripFrameIndex?: number
}

export const ChromaKeyedMascot = memo(function ChromaKeyedMascot({
  src,
  className = '',
  maxProcessWidth = 420,
  maxCssHeight = MASCOT_MAX_CSS_H,
  chromaPixelRatioMax = 2.5,
  chromaResolutionScale = 1,
  stripFrameCount,
  stripFrameIndex = 0,
}: ChromaKeyedMascotProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [drawn, setDrawn] = useState(false)

  const paint = useCallback(() => {
    const img = imgRef.current
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!img?.naturalWidth || !canvas || !wrap) return

    const clampMax = chromaPixelRatioMax > 0 ? chromaPixelRatioMax : 2.5
    const rs = chromaResolutionScale > 0 ? chromaResolutionScale : 1
    const dpBase = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
    const dpr = Math.min(clampMax, Math.max(dpBase * rs, 1))

    const targetCssW = Math.min(maxProcessWidth, wrap.clientWidth || maxProcessWidth)
    if (targetCssW < 8) return

    const stripFrames = stripFrameCount && stripFrameCount > 1 ? Math.floor(stripFrameCount) : 0
    const frameIdx =
      stripFrames > 0
        ? Math.max(0, Math.min(stripFrames - 1, Math.floor(Number(stripFrameIndex) || 0)))
        : 0

    let sx = 0
    let sy = 0
    let sw = img.naturalWidth
    let sh = img.naturalHeight
    if (stripFrames > 0) {
      const sliceW = Math.floor(img.naturalWidth / stripFrames)
      sx = frameIdx * sliceW
      sw = frameIdx === stripFrames - 1 ? img.naturalWidth - sx : sliceW
      sy = 0
      sh = img.naturalHeight
    }

    const baseW = sw
    const baseH = sh
    const scale = targetCssW / baseW
    let outW = Math.max(1, Math.round(baseW * scale))
    let outH = Math.max(1, Math.round(baseH * scale))

    if (outH > maxCssHeight) {
      const shrink = maxCssHeight / outH
      outH = maxCssHeight
      outW = Math.max(1, Math.round(outW * shrink))
    }

    canvas.style.width = `${outW}px`
    canvas.style.height = `${outH}px`
    canvas.width = Math.round(outW * dpr)
    canvas.height = Math.round(outH * dpr)

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
    applyGreenScreenKey(snapshot.data)
    ctx.putImageData(snapshot, 0, 0)

    setDrawn(true)
  }, [maxProcessWidth, maxCssHeight, chromaPixelRatioMax, chromaResolutionScale, stripFrameCount, stripFrameIndex])

  useLayoutEffect(() => {
    setDrawn(false)
  }, [src, stripFrameCount, stripFrameIndex])

  useLayoutEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth) paint()
  }, [paint, src])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => paint())
    })
    ro.observe(wrap)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [paint])

  return (
    <div ref={wrapRef} className={`relative flex w-full justify-center pointer-events-none ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt=""
        decoding="async"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden
        onLoad={paint}
      />
      <canvas
        ref={canvasRef}
        className={`max-w-full select-none pointer-events-none ${drawn ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />
    </div>
  )
})

type ChromaKeyedMascotVideoProps = {
  src: string
  className?: string
  maxProcessWidth?: number
  /** Cap displayed height (CSS px) after width scale; defaults to mascot hero limit. */
  maxCssHeight?: number
  /** Higher cap ⇒ sharper keyed output on dense displays (costs more CPU per frame). */
  chromaPixelRatioMax?: number
  /** Multiplies device pixel ratio before clamp for extra backing‑store clarity. */
  chromaResolutionScale?: number
}

/** Looping greenscreen video → canvas with the same key as static mascot art. */
export const ChromaKeyedMascotVideo = memo(function ChromaKeyedMascotVideo({
  src,
  className = '',
  maxProcessWidth = 420,
  maxCssHeight = MASCOT_MAX_CSS_H,
  chromaPixelRatioMax = 2.5,
  chromaResolutionScale = 1,
}: ChromaKeyedMascotVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [drawn, setDrawn] = useState(false)

  const paintFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!video || !canvas || !wrap) return
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return

    const clampMax = chromaPixelRatioMax > 0 ? chromaPixelRatioMax : 2.5
    const rs = chromaResolutionScale > 0 ? chromaResolutionScale : 1
    const dpBase = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
    const dpr = Math.min(clampMax, Math.max(dpBase * rs, 1))

    const targetCssW = Math.min(maxProcessWidth, wrap.clientWidth || maxProcessWidth)
    if (targetCssW < 8) return

    const scale = targetCssW / vw
    let outW = Math.max(1, Math.round(vw * scale))
    let outH = Math.max(1, Math.round(vh * scale))

    const maxCssH = maxCssHeight ?? MASCOT_MAX_CSS_H
    if (outH > maxCssH) {
      const shrink = maxCssH / outH
      outH = maxCssH
      outW = Math.max(1, Math.round(outW * shrink))
    }

    canvas.style.width = `${outW}px`
    canvas.style.height = `${outH}px`
    canvas.width = Math.round(outW * dpr)
    canvas.height = Math.round(outH * dpr)

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.drawImage(video, 0, 0, outW, outH)

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
    applyGreenScreenKey(snapshot.data)
    ctx.putImageData(snapshot, 0, 0)

    setDrawn(true)
  }, [maxProcessWidth, maxCssHeight, chromaPixelRatioMax, chromaResolutionScale])

  const loopRef = useRef<number>(0)
  const runFrame = useCallback(() => {
    paintFrame()
    loopRef.current = requestAnimationFrame(runFrame)
  }, [paintFrame])

  useLayoutEffect(() => {
    setDrawn(false)
    const video = videoRef.current
    if (!video) return

    const start = () => {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = requestAnimationFrame(runFrame)
    }

    const stop = () => {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = 0
    }

    video.addEventListener('playing', start)
    video.addEventListener('pause', stop)
    video.addEventListener('ended', stop)

    const tryPlay = () => void video.play().catch(() => {})

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tryPlay()
    video.addEventListener('loadeddata', tryPlay)

    return () => {
      video.removeEventListener('playing', start)
      video.removeEventListener('pause', stop)
      video.removeEventListener('ended', stop)
      video.removeEventListener('loadeddata', tryPlay)
      cancelAnimationFrame(loopRef.current)
      loopRef.current = 0
      video.pause()
    }
  }, [src, runFrame])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => paintFrame())
    })
    ro.observe(wrap)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [paintFrame])

  return (
    <div ref={wrapRef} className={`relative flex w-full justify-center pointer-events-none ${className}`}>
      <video
        ref={videoRef}
        src={src}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        playsInline
        muted
        loop
        autoPlay
        preload="auto"
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        className={`max-w-full select-none pointer-events-none ${drawn ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
      />
    </div>
  )
})
