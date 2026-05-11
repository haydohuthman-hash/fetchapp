import { memo, useEffect, useMemo, useState } from 'react'

export const MysteryRevealScreen = memo(function MysteryRevealScreen({
  variant = 'light',
  stripImages,
  winnerImage,
  winnerTitle,
  onDone,
}: {
  variant?: 'light' | 'dark'
  stripImages: string[]
  winnerImage: string
  winnerTitle: string
  onDone: () => void
}) {
  const dark = variant === 'dark'
  const messages = useMemo(
    () => [
      'Searching real listings…',
      'Checking seller trust…',
      'Matching your budget…',
      'Locking your reveal…',
    ],
    [],
  )
  const [msgIdx, setMsgIdx] = useState(0)
  const [frame, setFrame] = useState(0)
  const [landed, setLanded] = useState(false)

  const ring = stripImages.length > 0 ? stripImages : [winnerImage]
  const stripLoop = useMemo(() => {
    const r = ring
    return [...r, ...r, ...r]
  }, [ring])

  useEffect(() => {
    if (landed) return
    const id = window.setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 700)
    return () => clearInterval(id)
  }, [landed, messages.length])

  useEffect(() => {
    if (landed) return
    const id = window.setInterval(() => setFrame((f) => f + 1), 90)
    return () => clearInterval(id)
  }, [landed])

  useEffect(() => {
    const landT = window.setTimeout(() => {
      setLanded(true)
      window.setTimeout(onDone, 520)
    }, 2900)
    return () => clearTimeout(landT)
  }, [onDone])

  return (
    <div
      className={[
        'flex min-h-dvh flex-col items-center justify-center px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]',
        dark
          ? 'bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgba(124,58,237,0.22),#03030a)]'
          : 'bg-[radial-gradient(ellipse_95%_52%_at_50%_0%,rgba(124,58,237,0.11),var(--fetch-app-bg,#f8f6fd))]',
      ].join(' ')}
    >
      {dark ? (
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-violet-300/95">
          Matching live listings
        </p>
      ) : (
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-violet-600">
          Matching live listings
        </p>
      )}
      <div
        className={[
          'relative w-full max-w-lg overflow-hidden py-2 transition-opacity duration-500',
          dark
            ? 'rounded-2xl border border-violet-500/25 bg-black/50 shadow-[0_0_40px_rgba(139,92,246,0.2)]'
            : 'rounded-2xl border border-violet-100/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]',
          landed ? 'opacity-35' : 'opacity-100',
        ].join(' ')}
      >
        {dark ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-[120%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-violet-400/90 to-transparent shadow-[0_0_16px_rgba(167,139,250,0.85)]" />
        ) : null}
        <div
          className={[
            'pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r to-transparent',
            dark ? 'from-zinc-950' : 'from-[var(--fetch-app-bg,#f8f6fd)]',
          ].join(' ')}
        />
        <div
          className={[
            'pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l to-transparent',
            dark ? 'from-zinc-950' : 'from-[var(--fetch-app-bg,#f8f6fd)]',
          ].join(' ')}
        />
        <div
          className="fetch-mystery-reveal-scroll"
          style={{ animationPlayState: landed ? 'paused' : 'running' }}
        >
          {stripLoop.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={[
                'relative h-[6.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl border sm:h-[7rem] sm:w-[5.85rem]',
                dark
                  ? 'border-violet-500/35 bg-zinc-900/90 shadow-[0_0_24px_rgba(124,58,237,0.2)]'
                  : 'border-violet-200/90 bg-violet-100',
              ].join(' ')}
            >
              <img src={src} alt="" className={`h-full w-full object-cover ${landed ? '' : 'blur-[6px]'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-5 flex w-full max-w-[22rem] flex-col items-center">
        <div
          className={[
            'relative aspect-[4/5] w-full max-w-[15.5rem] overflow-hidden rounded-2xl border-2 transition-all duration-500 sm:max-w-[17.5rem]',
            dark
              ? 'border-violet-400/50 bg-zinc-900 shadow-[0_0_48px_rgba(124,58,237,0.4)]'
              : 'border-violet-200 bg-white',
            landed
              ? dark
                ? 'border-violet-300 shadow-[0_0_56px_rgba(167,139,250,0.45)] ring-2 ring-violet-400/35'
                : 'border-violet-500'
              : dark
                ? 'border-zinc-700'
                : 'border-violet-100',
          ].join(' ')}
        >
          <img
            src={landed ? winnerImage : ring[frame % ring.length]}
            alt=""
            className={['h-full w-full object-cover transition-[filter]', landed ? '' : 'blur-[7px] brightness-[0.96]'].join(
              ' ',
            )}
          />
          <div
            className={[
              'pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent',
              dark ? 'from-violet-950/50' : 'from-violet-950/25',
            ].join(' ')}
          />
        </div>
        <p
          className={[
            'mt-4 max-w-[18rem] text-center text-[14px] font-extrabold leading-snug',
            dark ? 'bg-gradient-to-r from-violet-200 via-fuchsia-200 to-violet-100 bg-clip-text text-transparent' : 'text-violet-950',
          ].join(' ')}
        >
          {landed ? winnerTitle : messages[msgIdx]}
        </p>
        {!landed ? (
          <p className={['mt-1 text-center text-[11px] font-medium', dark ? 'text-zinc-500' : 'text-zinc-500'].join(' ')}>
            {dark ? 'Only real seller inventory — no synthetic items.' : 'Matching live inventory…'}
          </p>
        ) : (
          <p
            className={[
              'mt-1 text-center text-[11px] font-semibold',
              dark ? 'font-bold uppercase tracking-widest text-violet-300' : 'text-violet-700',
            ].join(' ')}
          >
            {dark ? 'Matched' : 'Ready'}
          </p>
        )}
      </div>
    </div>
  )
})
