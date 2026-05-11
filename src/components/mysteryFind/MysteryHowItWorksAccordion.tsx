import { memo, useState } from 'react'

const STEPS = [
  'Set max spend',
  'Pick a category',
  'We search real listings',
  'Reveal your item',
  'Keep it, relist it, or share it',
]

export const MysteryHowItWorksAccordion = memo(function MysteryHowItWorksAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-zinc-100/60"
        aria-expanded={open}
      >
        <span className="text-[13px] font-extrabold text-zinc-900">How it works</span>
        <span
          className={['text-violet-500 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <ol className="space-y-1.5 border-t border-zinc-200/70 px-3 pb-3 pt-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-2 text-[12px] font-medium leading-snug text-zinc-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-800">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
})
