/**
 * Soft scoop between star-wallpaper hero and body (same path as Explore home).
 * Default fill matches white cards; use `curveFill` to match tinted shells (e.g. search).
 */
export function ExploreEarthCurveDivider({ curveFill = '#ffffff' }: { curveFill?: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] w-full overflow-hidden leading-none">
      <svg
        className="relative z-[1] block h-[min(72px,18vw)] w-full translate-y-[0.5px]"
        viewBox="0 0 390 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path fill={curveFill} d="M0,80 L0,34 C132,12 258,12 390,34 L390,80 Z" />
      </svg>
    </div>
  )
}
