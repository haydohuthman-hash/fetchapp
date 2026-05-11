import { memo } from 'react'

const CARDS = [
  {
    emoji: '😌',
    title: 'Okay Find',
    sub: 'Usually around your spend.',
    tag: 'Common',
  },
  {
    emoji: '🔥',
    title: 'Great Find',
    sub: 'Popular items worth more than you paid.',
    tag: 'Uncommon',
  },
  {
    emoji: '💎',
    title: 'Rare Find',
    sub: 'Premium high-value reveals.',
    tag: 'Rare',
  },
  {
    emoji: '🛡',
    title: 'Buyer protected',
    sub: "If the seller can't ship, you're covered.",
    tag: 'Always',
  },
] as const

export const MysteryWhatCouldHappenSimple = memo(function MysteryWhatCouldHappenSimple() {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center gap-2 px-0.5">
        <span className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" aria-hidden />
        <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">What could happen</h2>
        <span className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className="rounded-[22px] border border-zinc-200/90 bg-white px-3.5 py-3.5 shadow-[0_10px_36px_rgba(28,21,40,0.05)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_14px_40px_rgba(91,33,182,0.08)] active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl leading-none drop-shadow-sm" aria-hidden>
                {c.emoji}
              </span>
              <span className="rounded-full border border-violet-200/90 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-violet-800">
                {c.tag}
              </span>
            </div>
            <p className="mt-3 text-[13px] font-bold leading-tight text-[var(--color-fetch-charcoal,#1c1528)]">{c.title}</p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-zinc-600">{c.sub}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] font-medium leading-relaxed text-zinc-500">
        Every reveal is based on live marketplace inventory.
      </p>
    </section>
  )
})
