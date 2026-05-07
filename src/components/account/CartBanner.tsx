import { Package, ShoppingBag, Tag } from 'lucide-react'

const CARD =
  'relative overflow-hidden rounded-[20px] border border-[#E8E8E8] bg-[#F4F4F4] px-5 pb-5 pt-5'

const GREY_CTA =
  'inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F4F4F4] px-5 text-[13px] font-bold text-[#111111] transition-opacity active:opacity-80'

export type CartBannerProps = {
  itemCount: number
  onViewCart: () => void
  onContinueShopping: () => void
}

/**
 * Account “what’s in my cart” promo — same footprint as the old seller banner.
 */
export function CartBanner({ itemCount, onViewCart, onContinueShopping }: CartBannerProps) {
  const empty = itemCount <= 0
  return (
    <div className={CARD} style={{ minHeight: 150 }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <ShoppingBag className="absolute left-2 top-3 h-14 w-14 text-zinc-300/25" strokeWidth={1.25} />
        <Package className="absolute bottom-4 left-5 h-12 w-12 text-zinc-300/20" strokeWidth={1.25} />
        <Tag className="absolute right-6 top-6 h-11 w-11 text-zinc-300/22" strokeWidth={1.25} />
        <ShoppingBag className="absolute bottom-5 right-4 h-10 w-10 text-zinc-300/18" strokeWidth={1.25} />
      </div>
      <div className="relative z-[1]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#777777]">What&apos;s in my cart</p>
        <h2 className="mt-1.5 text-[1.5rem] font-black leading-tight tracking-tight text-[#111111]">
          {empty ? 'Your cart is empty' : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart`}
        </h2>
        <p className="mt-2 max-w-[95%] text-[13px] font-medium leading-snug text-[#777777]">
          {empty
            ? 'Browse the shop, save what you want, and checkout when you\'re ready.'
            : 'Review your picks, use credits, and checkout securely in the marketplace.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {empty ? (
            <button type="button" onClick={onContinueShopping} className={`${GREY_CTA} min-w-[8rem]`}>
              Shop marketplace
            </button>
          ) : (
            <>
              <button type="button" onClick={onViewCart} className={`${GREY_CTA} min-w-[5.5rem]`}>
                View cart
              </button>
              <button
                type="button"
                onClick={onContinueShopping}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full px-5 text-[13px] font-black text-[#111111] transition-opacity active:opacity-90"
                style={{ background: '#FFE01B' }}
              >
                Continue shopping
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
