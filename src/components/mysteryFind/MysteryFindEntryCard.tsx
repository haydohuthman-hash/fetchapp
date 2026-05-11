import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FETCH_MYSTERY_FIND_PATH } from '../../lib/fetchRoutes'

type Props = {
  variant?: 'home' | 'banner' | 'compact'
  className?: string
}

export const MysteryFindEntryCard = memo(function MysteryFindEntryCard({
  variant = 'home',
  className = '',
}: Props) {
  const navigate = useNavigate()

  if (variant === 'banner') {
    return (
      <button
        type="button"
        onClick={() => navigate(FETCH_MYSTERY_FIND_PATH)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-xl border border-violet-200/90 bg-gradient-to-r from-violet-50 to-white px-3 py-2.5 text-left outline-none transition-[filter] active:brightness-95',
          className,
        ].join(' ')}
      >
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-violet-950">Fetchit</p>
          <p className="mt-0.5 text-[11px] font-medium text-violet-800/90 leading-snug">
            Reveal discoveries from real sellers — upside varies by inventory.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white">
          Try Fetchit
        </span>
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => navigate(FETCH_MYSTERY_FIND_PATH)}
        className={[
          'rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-[12px] font-bold text-violet-950',
          className,
        ].join(' ')}
      >
        Fetchit
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate(FETCH_MYSTERY_FIND_PATH)}
      className={[
        'flex w-full items-center gap-2.5 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-violet-50/60 px-3 py-3 text-left outline-none transition-[filter] active:brightness-95',
        className,
      ].join(' ')}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-lg text-white">
        ✦
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold text-violet-950">Fetchit</span>
        <span className="mt-0.5 block text-[11px] font-medium leading-snug text-violet-800/85">
          Reveal real listings — upside varies, always marketplace-backed.
        </span>
      </span>
      <span className="shrink-0 text-violet-400" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
})
