import { memo } from 'react'

/** Educational block — circular inventory + Fetchit credit (no gambling framing). */
export const MysteryInstantRelistExplainer = memo(function MysteryInstantRelistExplainer() {
  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-b from-white via-violet-50/40 to-white px-3.5 py-4">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-violet-900">Instant Relist</h2>
      <p className="mt-2 text-[13px] font-semibold leading-snug text-zinc-800">
        Not vibing with what you revealed? Put it straight back into Fetchit inventory and receive Marketplace Credit
        instantly — then reveal again. Sellers still get paid on the original match; the item keeps moving so another
        buyer can discover it.
      </p>
      <ul className="mt-3 space-y-1.5 text-[12px] font-medium leading-relaxed text-zinc-600">
        <li className="flex gap-2">
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
          Credit you can use on Fetchit, auctions, or marketplace purchases.
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
          Keeps real listings circulating — same item can surface for someone new.
        </li>
      </ul>
    </section>
  )
})
