import { memo } from 'react'
import { MYSTERY_TRUST_BULLETS } from '../../lib/mysteryFind/constants'

export const MysteryTrustPanel = memo(function MysteryTrustPanel({ compact }: { compact?: boolean }) {
  return (
    <div
      className={[
        'rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/90 to-white px-4 py-3.5 text-left',
        compact ? 'py-2.5' : '',
      ].join(' ')}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">Trust</p>
      <ul className="mt-2 space-y-1.5">
        {MYSTERY_TRUST_BULLETS.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[12px] leading-snug text-zinc-700">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
              ✓
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
})
