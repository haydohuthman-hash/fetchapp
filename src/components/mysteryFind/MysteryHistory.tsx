import { memo } from 'react'
import { readMysteryHistory } from '../../lib/mysteryFind/historyStorage'
import { deriveRevealTierFromValues, revealTierShortLabel } from '../../lib/mysteryFind/outcomeTier'

function aud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export const MysteryHistory = memo(function MysteryHistory({ visual = 'default' }: { visual?: 'default' | 'pack' }) {
  const pack = visual === 'pack'
  const rows = readMysteryHistory()
  if (rows.length === 0) {
    return (
      <p
        className={[
          'rounded-xl border px-3 py-4 text-center text-[12px]',
          pack ? 'border-zinc-700/90 bg-zinc-900/50 text-zinc-400' : 'border-zinc-100 bg-zinc-50 text-zinc-600',
        ].join(' ')}
      >
        {pack ? 'No pulls yet — your opens show here on this device.' : 'No reveals yet — your finds will show here on this device.'}
      </p>
    )
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const tier = r.revealTier ?? deriveRevealTierFromValues(r.paidCents, r.estimatedValueCents)
        return (
          <li
            key={`${r.sessionId}-${r.savedAt}`}
            className={[
              'flex items-center gap-2 rounded-xl border px-2 py-2',
              pack ? 'border-zinc-700/80 bg-zinc-900/55' : 'border-violet-100 bg-white',
            ].join(' ')}
          >
            <img src={r.listing.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
            <div className="min-w-0 flex-1">
              <p className={['truncate text-[12px] font-bold', pack ? 'text-zinc-100' : 'text-zinc-900'].join(' ')}>
                {r.listing.title}
              </p>
              <p className={['text-[10px]', pack ? 'text-zinc-500' : 'text-zinc-500'].join(' ')}>
                {revealTierShortLabel(tier)} · Paid {aud(r.paidCents)} · {new Date(r.savedAt).toLocaleDateString('en-AU')}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
})
