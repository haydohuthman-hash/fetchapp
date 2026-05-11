import { memo } from 'react'
import { CircleHelp } from 'lucide-react'

const MIN_D = 20
const SLIDER_UI_MAX_D = 500

type Props = {
  valueUsd: number
  onChange: (usd: number) => void
  visual?: 'default' | 'pack' | 'reference'
}

function audApprox(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString('en-AU')}`
}

export const MysteryMaxPriceSlider = memo(function MysteryMaxPriceSlider({
  valueUsd,
  onChange,
  visual = 'default',
}: Props) {
  const capped = Math.min(Math.max(valueUsd, MIN_D), SLIDER_UI_MAX_D)
  const pack = visual === 'pack'
  const reference = visual === 'reference'

  if (reference) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 pt-0.5">
            <CircleHelp className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} aria-hidden />
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">Set your max spend</h2>
          </div>
          <span className="text-[1.75rem] font-black tabular-nums leading-none tracking-tight text-violet-600">
            {capped >= SLIDER_UI_MAX_D ? `${audApprox(SLIDER_UI_MAX_D)}+` : audApprox(capped)}
          </span>
        </div>

        <div className="mt-5">
          <input
            type="range"
            min={MIN_D}
            max={SLIDER_UI_MAX_D}
            step={5}
            value={Math.min(Math.max(valueUsd, MIN_D), SLIDER_UI_MAX_D)}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Max spend"
            className="mf-range-slider h-3 w-full cursor-pointer appearance-none rounded-full bg-violet-100 accent-violet-600"
          />
          <div className="mt-2.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            <span>${MIN_D}</span>
            <span>$500+</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className={[
        'rounded-2xl px-3 py-4',
        pack
          ? 'border border-cyan-500/25 bg-zinc-900/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'border border-violet-100 bg-gradient-to-b from-violet-50/90 to-white',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={['text-[13px] font-extrabold uppercase tracking-wide', pack ? 'text-zinc-400' : 'text-zinc-500'].join(' ')}>
          {pack ? 'Pack budget cap' : 'Set your max spend'}
        </h2>
        <span
          className={[
            'text-[1.65rem] font-black tabular-nums leading-none tracking-tight',
            pack
              ? 'bg-gradient-to-br from-amber-300 to-cyan-300 bg-clip-text text-transparent'
              : 'text-violet-600',
          ].join(' ')}
        >
          {capped >= SLIDER_UI_MAX_D ? `${audApprox(SLIDER_UI_MAX_D)}+` : audApprox(capped)}
        </span>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={MIN_D}
          max={SLIDER_UI_MAX_D}
          step={5}
          value={Math.min(Math.max(valueUsd, MIN_D), SLIDER_UI_MAX_D)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Max spend"
          className={[
            'h-2 w-full cursor-pointer appearance-none rounded-full',
            pack ? 'mf-range-slider mf-range-slider--pack bg-zinc-800 accent-cyan-400' : 'mf-range-slider bg-violet-100 accent-violet-600',
          ].join(' ')}
        />
        <div
          className={['mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wide', pack ? 'text-zinc-500' : 'text-zinc-400'].join(
            ' ',
          )}
        >
          <span>${MIN_D}</span>
          <span>$500+</span>
        </div>
      </div>
      <p className={['mt-4 text-[11px] font-medium leading-snug', pack ? 'text-zinc-500' : 'text-zinc-500'].join(' ')}>
        {pack
          ? 'Caps your matched checkout. Upside + Instant Relist credit scale with what you set here.'
          : 'This caps what you might pay for a matched item. Potential resale upside and Instant Relist credit scale with what you set here.'}
      </p>
    </section>
  )
})
