/** Client-only shop images (data URLs in localStorage). Keep under browser quota. */

export const SHOP_COVER_MAX_BYTES = 2_500_000
export const SHOP_AVATAR_MAX_BYTES = 1_500_000

export async function readImageFileAsDataUrl(file: File, maxBytes: number): Promise<'too_large' | string> {
  if (!file.type.startsWith('image/')) return 'too_large'
  if (file.size > maxBytes) return 'too_large'
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
