/** Canvas chroma key for bright greenscreen (bundled assets, same-origin). */
export function applyGreenScreenKey(data: Uint8ClampedArray) {
  const len = data.length
  for (let i = 0; i < len; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const maxRb = Math.max(r, b)
    const dg = g - maxRb
    if (dg < 18) continue
    if (g < 85) continue
    const t = (dg - 18) / 38
    if (t >= 1) {
      data[i + 3] = 0
      continue
    }
    data[i + 3] = Math.round(data[i + 3] * (1 - t))
    if (t > 0.2) {
      data[i + 1] = Math.min(g, Math.round((r + b) / 2))
    }
  }
}
