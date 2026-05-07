import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FETCH_APP_PATH, FETCH_SHOP_PATH } from '../lib/fetchRoutes'
import { readShopProfileDraft, setShopSetupComplete, writeShopProfileDraft, type ShopProfileDraft } from '../lib/shopPageState'
import { readImageFileAsDataUrl, SHOP_AVATAR_MAX_BYTES, SHOP_COVER_MAX_BYTES } from '../lib/shopImagePicker'

type Step = 1 | 2 | 3

/**
 * First-time shop creation — name, handle, and basics (Facebook-page style), then optional tagline/location.
 */
export function FetchShopSetupView() {
  const navigate = useNavigate()
  const initial = readShopProfileDraft()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState(initial.name === 'KickVault' ? '' : initial.name)
  const [handle, setHandle] = useState(initial.handle === 'kickvault' ? '' : initial.handle)
  const [tagline, setTagline] = useState(initial.tagline)
  const [locationLabel, setLocationLabel] = useState(initial.locationLabel)
  const [shipsCopy, setShipsCopy] = useState(initial.shipsCopy)
  const [coverUrl, setCoverUrl] = useState<string | undefined>(initial.coverImageUrl)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initial.avatarImageUrl)

  const finish = useCallback(() => {
    const profile: ShopProfileDraft = {
      name: name.trim() || 'My shop',
      handle: handle.trim().replace(/^@/, '').replace(/\s+/g, '') || 'myshop',
      tagline: tagline.trim() || 'RARE FINDS. REAL VALUE.',
      locationLabel: locationLabel.trim() || 'Australia',
      shipsCopy: shipsCopy.trim() || 'Ships nationwide',
      ...(coverUrl ? { coverImageUrl: coverUrl } : {}),
      ...(avatarUrl ? { avatarImageUrl: avatarUrl } : {}),
    }
    writeShopProfileDraft(profile)
    setShopSetupComplete(true)
    navigate({ pathname: FETCH_SHOP_PATH, search: '' }, { replace: true })
  }, [name, handle, tagline, locationLabel, shipsCopy, coverUrl, avatarUrl, navigate])

  return (
    <div className="min-h-dvh bg-zinc-50 pb-[max(5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg px-4">
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate(FETCH_APP_PATH) : setStep((s) => (s === 2 ? 1 : 2)))}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-200/80"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Create your shop</p>
            <h1 className="text-[1.2rem] font-bold text-zinc-900">Set up like a page</h1>
          </div>
        </div>

        <div className="mt-6 flex gap-1.5">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={[
                'h-1.5 flex-1 rounded-full',
                step >= n ? 'bg-violet-600' : 'bg-zinc-200',
              ].join(' ')}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="mt-8 space-y-5">
            <p className="text-[14px] leading-relaxed text-zinc-600">
              Choose a public name and handle. You can change these later in Edit shop.
            </p>
            <label className="block">
              <span className="text-[12px] font-semibold text-zinc-700">Shop name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. KickVault"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[16px] font-medium text-zinc-900 outline-none ring-violet-500/0 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-zinc-700">Handle</span>
              <div className="mt-1.5 flex items-center rounded-2xl border border-zinc-200 bg-white px-3 ring-violet-500/0 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
                <span className="text-[15px] text-zinc-400">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="kickvault"
                  className="min-w-0 flex-1 bg-transparent py-3 pl-1 text-[16px] font-medium text-zinc-900 outline-none"
                />
              </div>
            </label>
            <button
              type="button"
              disabled={!name.trim() || handle.trim().length < 2}
              onClick={() => setStep(2)}
              className="mt-4 w-full rounded-2xl bg-violet-600 py-3.5 text-[16px] font-bold text-white shadow-lg shadow-violet-900/20 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none"
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8 space-y-5">
            <p className="text-[14px] leading-relaxed text-zinc-600">
              Tell buyers what you sell and how you ship — same idea as filling out a Facebook page “About”.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-zinc-700">Cover photo</p>
                <div
                  className="mt-2 aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center ring-1 ring-zinc-200/80"
                  style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
                />
                <label className="mt-2 block">
                  <span className="sr-only">Upload cover</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      const out = await readImageFileAsDataUrl(f, SHOP_COVER_MAX_BYTES)
                      if (out === 'too_large') {
                        window.alert('Cover must be under 2.5 MB.')
                        return
                      }
                      setCoverUrl(out)
                    }}
                  />
                </label>
                {coverUrl ? (
                  <button
                    type="button"
                    onClick={() => setCoverUrl(undefined)}
                    className="mt-1 text-[11px] font-semibold text-violet-600"
                  >
                    Remove cover
                  </button>
                ) : null}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-zinc-700">Shop profile pic</p>
                <div className="mt-2 flex justify-center">
                  <div
                    className={[
                      'flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100 bg-cover bg-center',
                      !avatarUrl ? 'text-[13px] font-bold text-zinc-400' : '',
                    ].join(' ')}
                    style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
                  >
                    {!avatarUrl ? '?' : null}
                  </div>
                </div>
                <label className="mt-2 block">
                  <span className="sr-only">Upload profile photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-white"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (!f) return
                      const out = await readImageFileAsDataUrl(f, SHOP_AVATAR_MAX_BYTES)
                      if (out === 'too_large') {
                        window.alert('Profile photo must be under 1.5 MB.')
                        return
                      }
                      setAvatarUrl(out)
                    }}
                  />
                </label>
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(undefined)}
                    className="mt-1 block w-full text-center text-[11px] font-semibold text-violet-600"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            <label className="block">
              <span className="text-[12px] font-semibold text-zinc-700">Tagline</span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="RARE FINDS. REAL VALUE."
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-zinc-700">Location</span>
              <input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="Brisbane, Australia"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-zinc-700">Shipping</span>
              <input
                value={shipsCopy}
                onChange={(e) => setShipsCopy(e.target.value)}
                placeholder="Ships worldwide"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3.5 text-[15px] font-semibold text-zinc-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 rounded-2xl bg-violet-600 py-3.5 text-[16px] font-bold text-white shadow-md shadow-violet-900/15"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/90 p-4">
              <p className="text-[14px] font-semibold text-violet-950">You’re ready to go live</p>
              <p className="mt-1 text-[13px] leading-relaxed text-violet-900/90">
                Next you’ll see your shop just like buyers will. Add listings, go live, and edit your look anytime.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3.5 text-[15px] font-semibold text-zinc-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-[16px] font-bold text-white"
              >
                Open my shop
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default FetchShopSetupView
