type Props = {
  count?: number
  variant?: 'card' | 'row' | 'rail'
  className?: string
}

export function LoadingSkeleton({ count = 3, variant = 'card', className = '' }: Props) {
  if (variant === 'row') {
    return (
      <div className={['flex flex-col gap-2', className].join(' ')}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <div className="h-12 w-12 shrink-0 rounded-2xl fetch-shimmer" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-3 w-3/5 rounded-md fetch-shimmer" />
              <div className="h-2.5 w-2/5 rounded-md fetch-shimmer" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (variant === 'rail') {
    return (
      <div className={['flex gap-2 overflow-hidden', className].join(' ')}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="w-[8.5rem] shrink-0 rounded-2xl bg-white ring-1 ring-zinc-200">
            <div className="aspect-square w-full rounded-t-2xl fetch-shimmer" />
            <div className="p-2">
              <div className="h-3 w-3/4 rounded-md fetch-shimmer" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={['grid grid-cols-2 gap-2', className].join(' ')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col rounded-2xl bg-white ring-1 ring-zinc-200">
          <div className="aspect-[4/5] w-full rounded-t-2xl fetch-shimmer" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded-md fetch-shimmer" />
            <div className="h-2.5 w-1/2 rounded-md fetch-shimmer" />
            <div className="h-3.5 w-3/5 rounded-md fetch-shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}
