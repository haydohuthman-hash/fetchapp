/* eslint-disable @typescript-eslint/no-misused-promises -- UX handlers attach async connects */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createLocalTracks,
  createLocalVideoTrack,
  Room,
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type LocalTrack,
  type LocalVideoTrack,
  type RemoteTrack,
} from 'livekit-client'
import { fetchLiveKitToken } from '../lib/livekit/fetchToken'
import {
  endLiveSession,
  fetchLiveSession,
  patchLiveSession,
  postLiveChat,
  type LiveCommerceSession,
  type LiveShowListingLine,
} from '../lib/live/liveSessionApi'
import { useAuthState } from '../lib/authState'
import { FETCH_APP_PATH, FETCH_AUTH_PATH } from '../lib/fetchRoutes'
import { LiveStudio } from '../components/live/LiveStudio'
import { PinnedLiveCommerceCard } from '../components/live/PinnedLiveCommerceCard'

const MEDIA_PREFS_KEY = 'fetch.goLive.prefs'

type MediaPrefs = {
  audioOnly?: boolean
  facingMode?: 'user' | 'environment'
}

function readPrefs(): MediaPrefs {
  try {
    return JSON.parse(sessionStorage.getItem(MEDIA_PREFS_KEY) || '{}') as MediaPrefs
  } catch {
    return {}
  }
}

function resolvePinned(session: LiveCommerceSession | null): LiveShowListingLine | null {
  if (!session?.pinnedListingId) return null
  const hit = session.listings.find((l) => l.listingId === session.pinnedListingId)
  return hit ?? null
}

export function LiveRoomView({ roomName }: { roomName: string }) {
  const navigate = useNavigate()
  const { sessionUserId } = useAuthState()
  const [session, setSession] = useState<LiveCommerceSession | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [liveErr, setLiveErr] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const roomRef = useRef<Room | null>(null)
  const hostLocalVideoRef = useRef<LocalVideoTrack | null>(null)
  const hostLocalAudioRef = useRef<LocalAudioTrack | null>(null)

  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const [viewerChat, setViewerChat] = useState('')
  const [tick, setTick] = useState(() => Date.now())
  const [remoteCount, setRemoteCount] = useState(0)

  const isHost = Boolean(sessionUserId && session?.sellerId === sessionUserId)

  const refreshSession = useCallback(async () => {
    try {
      const s = await fetchLiveSession(roomName)
      setSession(s)
      setLoadErr(null)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'load_failed')
    }
  }, [roomName])

  useEffect(() => {
    let cancelled = false
    void refreshSession()
    const id = window.setInterval(() => {
      if (!cancelled) void refreshSession()
    }, 2300)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [refreshSession])

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const elapsedSec = useMemo(() => {
    if (!session?.startedAt) return 0
    const t0 = Date.parse(session.startedAt)
    if (!Number.isFinite(t0)) return 0
    return Math.max(0, Math.floor((tick - t0) / 1000))
  }, [session?.startedAt, tick])

  const pinned = useMemo(() => resolvePinned(session), [session])

  const patchViewerCount = useCallback(
    (n: number) => {
      if (!session?.roomName || !isHost) return
      void patchLiveSession(session.roomName, { viewerCount: n }).catch(() => undefined)
    },
    [isHost, session?.roomName],
  )

  useEffect(() => {
    if (!sessionUserId || !session || session.status !== 'live') {
      if (roomRef.current) {
        void roomRef.current.disconnect()
        roomRef.current = null
        setConnected(false)
      }
      return
    }

    const identity = isHost ? `host-${sessionUserId}` : `viewer-${sessionUserId}`
    const role = isHost ? ('host' as const) : ('viewer' as const)

    let disposed = false
    const vidEl = videoRef.current
    if (!vidEl) return undefined

    const connect = async () => {
      console.log('[LiveKit] token requested', { stage: '[LiveKit]', roomName: session.roomName, role, identity })
      setLiveErr(null)
      try {
        const tok = await fetchLiveKitToken({
          roomName: session.roomName,
          identity,
          role,
        })

        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.Disconnected, () => {
          console.log('[LiveKit] room disconnected')
          setConnected(false)
        })

        const bump = () => {
          const n = room.remoteParticipants.size
          setRemoteCount(n)
          if (role === 'host') patchViewerCount(n)
        }
        room.on(RoomEvent.ParticipantConnected, () => bump())
        room.on(RoomEvent.ParticipantDisconnected, () => bump())

        await room.connect(tok.url, tok.token)
        if (disposed) {
          await room.disconnect()
          return
        }

        if (role === 'host') {
          const prefs = readPrefs()
          const fm =
            prefs.facingMode === 'environment' ? 'environment' : 'user'
          queueMicrotask(() => setFacingMode(fm))

          const needsVideo = !prefs.audioOnly
          hostLocalAudioRef.current = null

          const audioTracks = await createLocalTracks({
            audio: true,
            video: false,
          })

          let vt: LocalVideoTrack | undefined
          if (needsVideo) {
            vt = await createLocalVideoTrack({ facingMode: fm })
          }
          for (const t of audioTracks) {
            await room.localParticipant.publishTrack(t)
          }
          if (!audioTracks[0]) console.warn('[LiveKit] no audio track')
          else hostLocalAudioRef.current = audioTracks.find((x: LocalTrack) => x.kind === Track.Kind.Audio) as LocalAudioTrack

          hostLocalVideoRef.current = vt ?? null

          if (vt) await room.localParticipant.publishTrack(vt)
          if (vt && vidEl) {
            vt.attach(vidEl)
            vidEl.muted = true
          }

          console.log('[LiveKit] connected as host', session.roomName)
          console.log('[LiveKit] publishing tracks', {
            audio: Boolean(hostLocalAudioRef.current),
            video: Boolean(vt),
          })
          bump()
          setConnected(true)
        } else {
          console.log('[LiveKit] connected as viewer', session.roomName)

          const attachRemote = (track: RemoteTrack) => {
            if (track.kind === Track.Kind.Video) {
              track.attach(vidEl)
              vidEl.muted = false
            }
            if (track.kind === Track.Kind.Audio) {
              const a = document.createElement('audio')
              a.autoplay = true
              document.body.appendChild(a)
              track.attach(a)
            }
          }

          room.remoteParticipants.forEach((p) => {
            p.trackPublications.forEach((pub) => {
              if (pub.track) attachRemote(pub.track)
            })
          })

          room.on(RoomEvent.TrackSubscribed, (_t, publication) => {
            if (publication.track) attachRemote(publication.track)
          })

          bump()
          setConnected(true)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'livekit_connect_failed'
        console.warn('[LiveKit]', msg)
        setLiveErr(msg)
        setConnected(false)
      }
    }

    void connect()

    return () => {
      disposed = true
      hostLocalVideoRef.current?.stop()
      hostLocalAudioRef.current?.stop()
      hostLocalVideoRef.current = null
      hostLocalAudioRef.current = null
      void roomRef.current?.disconnect()
      roomRef.current = null
    }
  }, [patchViewerCount, sessionUserId, session?.roomName, session?.status, isHost])

  const flipCamera = useCallback(async () => {
    const room = roomRef.current
    const vidEl = videoRef.current
    const prev = hostLocalVideoRef.current
    if (!room?.localParticipant || !vidEl || !prev || !camOn) return
    const next = facingMode === 'user' ? 'environment' : 'user'
    try {
      prev.stop()
      await room.localParticipant.unpublishTrack(prev)
      const vt = await createLocalVideoTrack({ facingMode: next })
      hostLocalVideoRef.current = vt
      await room.localParticipant.publishTrack(vt)
      vt.attach(vidEl)
      vidEl.muted = true
      setFacingMode(next)
      console.log('[LiveKit] flipped camera', next)
    } catch (e) {
      console.warn('[LiveKit] flip failed', e)
    }
  }, [camOn, facingMode])

  const onMuteToggle = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return
    await room.localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn((v) => !v)
    console.log('[LiveKit] mic', !micOn ? 'on' : 'off')
  }, [micOn])

  const onCamToggle = useCallback(async () => {
    const room = roomRef.current
    if (!room?.localParticipant) return
    const next = !camOn
    await room.localParticipant.setCameraEnabled(next)
    setCamOn(next)
    console.log('[LiveKit] camera', next ? 'on' : 'off')
  }, [camOn])

  const onShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/live/${encodeURIComponent(roomName)}` : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Live on Fetchit', url })
      } else {
        await navigator.clipboard?.writeText(url)
        window.alert('Link copied')
      }
      console.log('[LiveKit] share', url)
    } catch {
      /* ignore */
    }
  }, [roomName])

  const handleEndLive = useCallback(async () => {
    try {
      console.log('[LiveKit] live ended', roomName)
      await endLiveSession(roomName)
      await roomRef.current?.disconnect()
      roomRef.current = null
      navigate(FETCH_APP_PATH)
    } catch (e) {
      console.warn('[LiveKit] end live error', e)
    }
  }, [navigate, roomName])

  const sendViewerChat = useCallback(async () => {
    const t = viewerChat.trim()
    if (!t || !roomName) return
    setViewerChat('')
    try {
      await postLiveChat(roomName, t)
      await refreshSession()
    } catch {
      /* ignore */
    }
  }, [refreshSession, roomName, viewerChat])

  const openBuyForPinned = useCallback(() => {
    if (!pinned) return
    const mode = pinned.saleMode === 'auction' ? 'bid' : 'buyNow'
    try {
      sessionStorage.setItem(
        'fetch.pendingPeerListingHandoff',
        JSON.stringify({ listingId: pinned.listingId, mode }),
      )
      sessionStorage.setItem('fetch.pendingHomeShellTab', 'marketplace')
      navigate(FETCH_APP_PATH)
    } catch {
      /* ignore */
    }
  }, [navigate, pinned])

  if (!sessionUserId) {
    return (
      <div className="flex min-h-dvh flex-col bg-gradient-to-br from-white via-violet-50 to-white px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-zinc-900">Sign in to watch</h1>
        <p className="mt-2 text-[14px] leading-snug text-zinc-600">Join this live auction or sale with your Fetchit account.</p>
        <button
          type="button"
          onClick={() => navigate(FETCH_AUTH_PATH)}
          className="mt-6 rounded-2xl bg-violet-600 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-violet-600/25 active:brightness-95"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => navigate(FETCH_APP_PATH)}
          className="mt-3 rounded-2xl border border-zinc-200 bg-white py-3 text-[14px] font-semibold text-zinc-800"
        >
          Back home
        </button>
      </div>
    )
  }

  if (loadErr && !session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white px-4 text-center">
        <p className="text-[15px] font-semibold text-zinc-900">Couldn&apos;t load this live</p>
        <p className="text-[13px] text-zinc-600">{loadErr}</p>
        <button
          type="button"
          className="rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-bold text-white"
          onClick={() => void refreshSession()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (session?.status === 'ended') {
    return (
      <div className="flex min-h-dvh flex-col bg-white px-4 pb-10 pt-[max(3rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-zinc-900">This live has ended</h1>
        <p className="mt-2 text-[14px] text-zinc-600">Room {session.roomName}</p>
        <button
          type="button"
          className="mt-6 rounded-2xl bg-violet-600 py-3.5 font-bold text-white"
          onClick={() => {
            try {
              sessionStorage.setItem('fetch.pendingHomeShellTab', 'marketplace')
            } catch {
              /* ignore */
            }
            navigate(FETCH_APP_PATH)
          }}
        >
          Browse more lives
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"
          aria-hidden
        />
        <p className="text-[14px] text-zinc-600">Loading live room…</p>
      </div>
    )
  }

  if (!isHost && session.status !== 'live') {
    return (
      <div className="flex min-h-dvh flex-col bg-gradient-to-br from-white via-violet-50 to-white px-4 pb-8 pt-[max(3rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold text-zinc-900">Show starting soon</h1>
        <p className="mt-2 text-[14px] leading-snug text-zinc-600">
          The seller hasn&apos;t gone live yet. We&apos;ll connect you the moment the room opens.
        </p>
        <button
          type="button"
          className="mt-6 rounded-2xl bg-violet-600 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-violet-600/25"
          onClick={() => void refreshSession()}
        >
          Refresh status
        </button>
        <button
          type="button"
          className="mt-3 rounded-2xl border border-zinc-200 bg-white py-3 text-[14px] font-semibold text-zinc-800"
          onClick={() => navigate(FETCH_APP_PATH)}
        >
          Back home
        </button>
      </div>
    )
  }

  if (isHost && session.status !== 'live') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white px-4 text-center">
        <p className="text-[15px] font-semibold text-zinc-900">This room isn&apos;t live yet</p>
        <p className="text-[13px] text-zinc-600">Finish Go Live from the seller flow, or go back home.</p>
        <button
          type="button"
          className="rounded-2xl bg-violet-600 px-6 py-3 font-bold text-white"
          onClick={() => navigate(FETCH_APP_PATH)}
        >
          Back home
        </button>
      </div>
    )
  }

  const auctionLeftSec =
    session?.auctionActive && session.auctionEndsAt
      ? Math.max(0, Math.ceil((session.auctionEndsAt - tick) / 1000))
      : null

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline />
      {(liveErr || (!connected && session?.status === 'live')) ? (
        <div className="pointer-events-none absolute left-3 right-3 top-[max(3rem,env(safe-area-inset-top))] rounded-xl bg-white/95 p-3 text-[12px] text-red-800 shadow">
          {liveErr || 'Connecting to live…'}
        </div>
      ) : null}

      {!isHost ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col bg-gradient-to-b from-black/40 via-transparent to-black/70">
          <header className="pointer-events-auto flex items-start justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-900">
                  {Math.max(remoteCount, session.viewerCount ?? 0)} watching
                </span>
              </div>
              <p className="max-w-[14rem] truncate text-[14px] font-bold text-white drop-shadow">{session.title || 'Live show'}</p>
              <p className="text-[12px] text-white/90 drop-shadow">{session.sellerDisplay || 'Seller'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  console.log('[LiveKit] follow seller (demo)')
                  window.alert('Following this seller')
                }}
                className="fetch-live-pressable rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-violet-700 shadow"
              >
                Follow
              </button>
              <button
                type="button"
                onClick={() => void onShare()}
                className="fetch-live-pressable rounded-full border border-white/60 bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur"
              >
                Share
              </button>
            </div>
          </header>

          {auctionLeftSec != null ? (
            <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-orange-400 px-3 py-1 text-[12px] font-bold text-orange-950 shadow">
              Auction {auctionLeftSec}s
            </div>
          ) : null}

          <div className="pointer-events-auto mt-auto flex flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {pinned ? (
              <PinnedLiveCommerceCard
                session={session}
                pinned={pinned}
                viewerMode
                onBuy={openBuyForPinned}
                onBid={openBuyForPinned}
              />
            ) : (
              <p className="pointer-events-none text-center text-[12px] text-white/85 drop-shadow">
                Seller hasn&apos;t pinned an item yet
              </p>
            )}
            <div className="flex gap-2">
              <input
                value={viewerChat}
                onChange={(e) => setViewerChat(e.target.value)}
                placeholder="Chat…"
                className="min-w-0 flex-1 rounded-xl border border-white/50 bg-white/95 px-3 py-2 text-[13px] text-zinc-900"
              />
              <button
                type="button"
                onClick={() => void sendViewerChat()}
                className="fetch-live-pressable rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-bold text-white"
              >
                Send
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  console.log('[LiveKit] reaction placeholder')
                  void postLiveChat(roomName, '🔥').catch(() => undefined)
                }}
                className="fetch-live-pressable flex-1 rounded-xl bg-white/90 py-2.5 text-[13px] font-bold text-zinc-900"
              >
                React
              </button>
              <button
                type="button"
                onClick={() => void onShare()}
                className="fetch-live-pressable flex-1 rounded-xl bg-violet-100 py-2.5 text-[13px] font-bold text-violet-900"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isHost && session ? (
        <LiveStudio
          roomName={session.roomName}
          session={session}
          elapsedSec={elapsedSec}
          viewerCount={Math.max(remoteCount, session.viewerCount ?? 0)}
          onFlipCamera={() => void flipCamera()}
          onMuteToggle={() => void onMuteToggle()}
          onCamToggle={() => void onCamToggle()}
          micOn={micOn}
          camOn={camOn}
          onShare={() => void onShare()}
          onRefresh={refreshSession}
          onEnded={() => void handleEndLive()}
        />
      ) : null}

      <button
        type="button"
        onClick={() => navigate(FETCH_APP_PATH)}
        className="pointer-events-auto absolute left-3 top-[max(3.5rem,env(safe-area-inset-top)+2.5rem)] z-10 rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur"
      >
        ← Back
      </button>
    </div>
  )
}

export default LiveRoomView
