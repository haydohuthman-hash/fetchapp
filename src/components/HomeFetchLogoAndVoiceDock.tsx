import { FetchSoundWaveBars } from './FetchSoundWaveBars'
import { FetchSplashBrandMark } from './FetchSplashBrandMark'

export type HomeFetchDockSize = 'compact' | 'large' | 'largeCompact'

const logoBox: Record<HomeFetchDockSize, string> = {
  compact: 'h-[3.25rem] w-[3.25rem] rounded-2xl',
  large: 'h-[5.5rem] w-[5.5rem] rounded-[1.15rem]',
  largeCompact: 'h-16 w-16 rounded-2xl',
}

const markScale: Record<HomeFetchDockSize, string> = {
  compact: 'h-[2.35rem] w-[3.85rem]',
  large: 'h-[3.85rem] w-[6.35rem]',
  largeCompact: 'h-[2.75rem] w-[4.5rem]',
}

const bubblePad: Record<HomeFetchDockSize, string> = {
  compact: 'px-2.5 py-2',
  large: 'px-3 py-2.5',
  largeCompact: 'px-2.5 py-2',
}

export function HomeFetchBrandLogoButton({
  size,
  onPress,
  className = '',
  /** Left cap of a unified strip (no right radius, flush to siblings). */
  stripLeading = false,
}: {
  size: HomeFetchDockSize
  onPress: () => void
  className?: string
  stripLeading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'flex shrink-0 items-center justify-center overflow-hidden bg-[#FACC15] transition-transform active:scale-[0.98]',
        stripLeading
          ? [
              'h-full self-stretch rounded-none rounded-l-[13px] shadow-none ring-0',
              size === 'largeCompact'
                ? 'min-h-16 w-16 sm:min-h-[4.25rem] sm:w-[4.25rem]'
                : 'min-h-[3.25rem] w-[3.25rem] sm:min-h-[3.35rem]',
            ].join(' ')
          : ['shadow-md ring-1 ring-black/15 dark:ring-white/10', logoBox[size]].join(' '),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Open Fetch assistant"
    >
      <FetchSplashBrandMark
        className={[
          'shrink-0',
          stripLeading && size === 'largeCompact' ? 'h-[3.15rem] w-[5.15rem]' : markScale[size],
        ].join(' ')}
      />
    </button>
  )
}

export function HomeFetchVoiceSpeechBubbleChip({
  size,
  waveActive,
  onPress,
  className = '',
  /** Right cap: glassy red chip, white waves, no tail (connects to strip). */
  exploreGlassStrip = false,
}: {
  size: HomeFetchDockSize
  waveActive: boolean
  onPress: () => void
  className?: string
  exploreGlassStrip?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'group relative shrink-0',
        exploreGlassStrip
          ? [
              'flex shrink-0 items-center self-stretch py-1 pl-1 pr-1.5',
              size === 'largeCompact'
                ? 'min-h-16 sm:min-h-[4.25rem]'
                : 'min-h-[3.25rem] sm:min-h-[3.35rem]',
            ].join(' ')
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Voice and chat"
    >
      {!exploreGlassStrip ? (
        <span
          className="pointer-events-none absolute left-0 top-1/2 z-0 h-0 w-0 -translate-x-[7px] -translate-y-1/2 border-y-[7px] border-r-[9px] border-y-transparent border-r-zinc-200/95 dark:border-r-zinc-600/95"
          aria-hidden
        />
      ) : null}
      <div
        className={[
          exploreGlassStrip
            ? [
                'fetch-explore-header-voice-chip flex shrink-0 items-center justify-center rounded-xl border-0 bg-[#FACC15] shadow-none',
                size === 'largeCompact' ? 'h-11 w-11' : 'h-10 w-10',
              ].join(' ')
            : [
                'relative rounded-2xl border border-zinc-200/95 bg-white shadow-sm dark:border-zinc-600/90 dark:bg-zinc-800/95',
                bubblePad[size],
              ].join(' '),
        ].join(' ')}
      >
        <FetchSoundWaveBars
          active={waveActive}
          orientation="vertical"
          verticalAlign={exploreGlassStrip ? 'center' : 'end'}
          maxBarHeightPx={exploreGlassStrip ? (size === 'largeCompact' ? 24 : 22) : 17}
          className={size === 'large' && !exploreGlassStrip ? 'scale-110' : ''}
        />
      </div>
    </button>
  )
}

type PairedProps = {
  size: HomeFetchDockSize
  onOpenBrain: () => void
  waveActive: boolean
  className?: string
}

/** Paired logo + bubble (e.g. bottom home dock where no headline sits between). */
export function HomeFetchLogoAndVoiceDock({ size, onOpenBrain, waveActive, className = '' }: PairedProps) {
  return (
    <div className={['flex flex-row items-center gap-2.5 sm:gap-3', className].filter(Boolean).join(' ')}>
      <HomeFetchBrandLogoButton size={size} onPress={onOpenBrain} />
      <HomeFetchVoiceSpeechBubbleChip size={size} waveActive={waveActive} onPress={onOpenBrain} />
    </div>
  )
}
