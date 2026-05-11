import { memo, useMemo } from 'react'
import { getMysteryUpsidePreviewCards } from '../../lib/mysteryFind/mysteryUpsidePreview'

function IconLower() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/80">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7l10 10M17 7v10H7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function IconFair() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-violet-700 ring-1 ring-zinc-200/90">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.4 7.4 17.2l.9-5.1-3.8-3.6 5.2-.8L12 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function IconGreat() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/90">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 19V5M12 5l4.5 4.5M12 5L7.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function IconRare() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-amber-100 text-violet-800 ring-1 ring-violet-200/90">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2l2.2 4.5 4.8.7-3.5 3.4.8 4.8L12 14.8 7.7 15.4l.8-4.8-3.5-3.4 4.8-.7L12 2z"
          fill="currentColor"
          opacity="0.85"
        />
        <path d="M5 18l1.3 2.6 2.6 1.3-2.6 1.3L5 22l1-2.6L5 18z" fill="currentColor" opacity="0.45" />
      </svg>
    </span>
  )
}

function CardIcon({ id }: { id: 'lower' | 'fair' | 'great' | 'rare' }) {
  switch (id) {
    case 'lower':
      return <IconLower />
    case 'fair':
      return <IconFair />
    case 'great':
      return <IconGreat />
    case 'rare':
      return <IconRare />
    default:
      return null
  }
}

export const MysteryWhatCouldThisTurnInto = memo(function MysteryWhatCouldThisTurnInto({
  maxSpendUsd,
  variant = 'default',
}: {
  maxSpendUsd: number
  variant?: 'default' | 'reference'
}) {
  const cards = useMemo(() => getMysteryUpsidePreviewCards(maxSpendUsd), [maxSpendUsd])
  const ref = variant === 'reference'

  return (
    <section className="mt-6 space-y-3">
      <h2
        className={[
          'font-extrabold uppercase tracking-wide text-zinc-500',
          ref ? 'text-[11px] tracking-[0.14em]' : 'text-[13px]',
        ].join(' ')}
      >
        What could this turn into?
      </h2>
      <p className="text-[12px] font-medium leading-snug text-zinc-600">
        {ref ? 'Examples based on live marketplace data.' : 'Illustrative ranges based on your max spend — tied to live inventory, Instant Relist credit, and marketplace demand.'}
      </p>

      <div className={ref ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'}>
        {cards.map((c) => (
          <div
            key={c.id}
            className={[
              'relative overflow-hidden rounded-2xl border bg-white p-3',
              ref ? 'border-zinc-200' : 'border-violet-100 bg-gradient-to-br from-white to-violet-50/50 shadow-sm shadow-violet-950/[0.04] ring-1 ring-violet-100/60',
            ].join(' ')}
          >
            <div className="flex gap-2.5">
              <CardIcon id={c.id} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-violet-900">
                  {c.title}
                  {ref ? (
                    <span className="font-bold normal-case text-zinc-500"> ({c.chanceLabel})</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12px] font-semibold leading-snug text-zinc-800">{c.primaryLine}</p>
                <p
                  className={[
                    'mt-1.5 text-[11px] font-bold leading-snug',
                    c.secondaryEmphasis === 'green'
                      ? 'text-emerald-700'
                      : c.secondaryEmphasis === 'violet'
                        ? 'text-violet-800'
                        : 'text-zinc-600',
                  ].join(' ')}
                >
                  {c.secondaryLine}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!ref ? (
        <>
          <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
            Resale upside is estimated from live marketplace demand. Profit is not guaranteed.
          </p>
          <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
            Every reveal gives you a real marketplace item or protected marketplace credit if the seller can&apos;t complete
            the order.
          </p>
        </>
      ) : null}
    </section>
  )
})
