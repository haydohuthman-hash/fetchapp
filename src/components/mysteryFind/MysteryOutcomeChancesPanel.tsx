import { memo } from 'react'

const ROWS = [
  {
    id: 'fair' as const,
    pct: '55%',
    title: 'Fair Value',
    sub: 'Value close to what you pay — a fair marketplace match.',
  },
  {
    id: 'great' as const,
    pct: '25%',
    title: 'Great Find',
    sub: 'Clear upside vs what you paid — share-worthy discovery.',
  },
  {
    id: 'lower' as const,
    pct: '15%',
    title: 'Lower Value',
    sub: 'Softer vs spend — still real, relistable, and backed by buyer protection.',
  },
  {
    id: 'rare' as const,
    pct: '5%',
    title: 'Rare Find',
    sub: 'Premium or hard-to-source items when inventory aligns.',
  },
]

export const MysteryOutcomeChancesPanel = memo(function MysteryOutcomeChancesPanel() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-zinc-500">What you could find</h2>
        <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600">
          Target mix for surprise shopping — depends on live listings in your category and budget.
        </p>
      </div>
      <div className="grid gap-2">
        {ROWS.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/95 to-white px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-black text-zinc-900">{row.title}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-snug text-zinc-600">{row.sub}</p>
              </div>
              <span className="shrink-0 rounded-lg bg-violet-600 px-2 py-1 text-[13px] font-black tabular-nums text-white">
                {row.pct}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] font-medium leading-relaxed text-zinc-500">
        Fetchit matches you with real seller inventory. Reveal types shift with what&apos;s listed — not every lane
        has rare stock every day.
      </p>
    </section>
  )
})
