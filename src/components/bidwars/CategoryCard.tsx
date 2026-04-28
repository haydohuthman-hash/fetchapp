/**
 * CategoryCard — used in Home top-categories rail and Browse grid. Light grey
 * card, real image, live count chip.
 */

import type { Category } from '../../lib/data'

type Props = {
  category: Category
  onPress?: (c: Category) => void
  className?: string
  layout?: 'tile' | 'rail'
}

export function CategoryCard({ category, onPress, className = '', layout = 'tile' }: Props) {
  const railClass = 'min-w-[8rem]'
  return (
    <button
      type="button"
      onClick={() => onPress?.(category)}
      className={[
        'group flex flex-col items-stretch overflow-hidden rounded-2xl bg-zinc-100 text-left shadow-sm ring-1 ring-zinc-200 transition-transform active:scale-[0.98]',
        layout === 'rail' ? `shrink-0 ${railClass}` : 'min-w-0',
        className,
      ].join(' ')}
      aria-label={`Browse ${category.title}`}
    >
      <span className="relative aspect-square w-full overflow-hidden bg-zinc-100">
        <img
          src={category.imageUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.04]"
        />
        {category.liveCount > 0 ? (
          <span className="pointer-events-none absolute left-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-[3px] text-[10px] font-black uppercase leading-none tracking-wide text-white shadow-sm">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {category.liveCount} live
          </span>
        ) : null}
      </span>
      <span className="px-2.5 py-2 text-[11.5px] font-black leading-tight text-zinc-900">
        {category.title}
      </span>
    </button>
  )
}
