/**
 * Battle overlay sound effects — generated entirely via Web Audio API.
 * No external audio files required; all sounds are synthesised at runtime.
 *
 * All public functions are safe to call even when the AudioContext is locked
 * (e.g. before the first user gesture) — they simply no-op.
 */

/* ─── Context ──────────────────────────────────────────────────────────── */

let _ctx: AudioContext | null = null

function ctx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext ?? (window as any).webkitAudioContext
      if (!AC) return null
      _ctx = new AC() as AudioContext
    }
    if (_ctx.state === 'suspended') void _ctx.resume()
    return _ctx
  } catch {
    return null
  }
}

/** Call once after a user gesture to unlock audio on iOS / Safari. */
export function initBattleAudio(): void {
  const c = ctx()
  if (c?.state === 'suspended') void c.resume()
}

/* ─── Low-level helpers ─────────────────────────────────────────────────── */

function out(c: AudioContext, vol = 0.7): GainNode {
  const g = c.createGain()
  g.gain.value = vol
  g.connect(c.destination)
  return g
}

/** Short oscillator burst. */
function osc(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.3,
  offsetSec = 0,
): void {
  const t = c.currentTime + offsetSec
  const node = c.createOscillator()
  const gain = c.createGain()
  node.type = type
  node.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  node.connect(gain)
  gain.connect(dest)
  node.start(t)
  node.stop(t + dur + 0.05)
}

/** White noise burst with exponential decay. */
function noise(c: AudioContext, dest: AudioNode, dur: number, vol = 0.25, offsetSec = 0): void {
  const t = c.currentTime + offsetSec
  const samples = Math.ceil(c.sampleRate * dur)
  const buf = c.createBuffer(1, samples, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.25))
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.value = vol
  src.connect(g)
  g.connect(dest)
  src.start(t)
}

/** Soft-clip waveshaper (adds warmth / harmonic crunch). */
function distort(c: AudioContext, amount = 60): WaveShaperNode {
  const ws = c.createWaveShaper()
  const len = 256
  const curve = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const x = (i * 2) / len - 1
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
  }
  ws.curve = curve
  return ws
}

/* ─── Public API ────────────────────────────────────────────────────────── */

/**
 * 3 / 2 / 1 countdown beeps.
 * Each is a semitone higher and slightly louder than the last.
 */
export function playCountdownBeep(num: 1 | 2 | 3): void {
  const c = ctx()
  if (!c) return
  const m = out(c)
  const freqMap = { 3: 440, 2: 587, 1: 880 } as const
  const freq = freqMap[num]
  const vol = num === 1 ? 0.5 : 0.3
  osc(c, m, freq, 0.18, 'square', vol)
  osc(c, m, freq * 2, 0.12, 'sine', vol * 0.25) // upper octave shimmer
}

/**
 * Falcon screech — sawtooth with soft-clip distortion and pitch flutter.
 * Used on battle start and win.
 */
export function playFalconScreech(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.6)
  const t = c.currentTime
  const node = c.createOscillator()
  const g = c.createGain()
  const ds = distort(c, 80)

  node.type = 'sawtooth'
  node.frequency.setValueAtTime(2600, t)
  node.frequency.linearRampToValueAtTime(1400, t + 0.07)
  node.frequency.setValueAtTime(2000, t + 0.12)
  node.frequency.exponentialRampToValueAtTime(850, t + 0.32)
  node.frequency.setValueAtTime(1300, t + 0.36)
  node.frequency.exponentialRampToValueAtTime(600, t + 0.55)

  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(0.45, t + 0.04)
  g.gain.setValueAtTime(0.4, t + 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.68)

  node.connect(ds)
  ds.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.75)
}

/**
 * "Battle Begins" — rising sweep → impact chord → noise crack,
 * followed by a falcon screech.
 */
export function playBattleBegins(): void {
  const c = ctx()
  if (!c) return
  const m = out(c)
  const t = c.currentTime

  // Rising sweep
  const sweep = c.createOscillator()
  const sg = c.createGain()
  sweep.type = 'sawtooth'
  sweep.frequency.setValueAtTime(120, t)
  sweep.frequency.exponentialRampToValueAtTime(1100, t + 0.22)
  sg.gain.setValueAtTime(0.001, t)
  sg.gain.linearRampToValueAtTime(0.5, t + 0.1)
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.48)
  sweep.connect(sg)
  sg.connect(m)
  sweep.start(t)
  sweep.stop(t + 0.52)

  // Impact chord
  ;([261.6, 329.6, 392, 523.3] as const).forEach((f, i) => {
    osc(c, m, f, 1.4, 'triangle', 0.18, 0.22 + i * 0.04)
  })

  // Noise crack
  noise(c, m, 0.18, 0.4, 0.2)

  // Delayed falcon screech
  window.setTimeout(() => playFalconScreech(), 320)
}

/**
 * Viewer bid placed — quick ascending arpeggio.
 */
export function playBidPlaced(): void {
  const c = ctx()
  if (!c) return
  const m = out(c)
  ;([523.3, 659.3, 783.9, 1046.5] as const).forEach((f, i) => {
    osc(c, m, f, 0.15, 'triangle', 0.28, i * 0.07)
  })
}

/**
 * Rival bid — subtle blip so the user notices without being annoying.
 */
export function playRivalBid(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.5)
  osc(c, m, 380, 0.09, 'sine', 0.22)
  osc(c, m, 500, 0.07, 'sine', 0.15, 0.06)
}

/**
 * Outbid alert — descending sawtooth warning.
 */
export function playOutbid(): void {
  const c = ctx()
  if (!c) return
  const m = out(c)
  const t = c.currentTime
  const node = c.createOscillator()
  const g = c.createGain()
  node.type = 'sawtooth'
  node.frequency.setValueAtTime(560, t)
  node.frequency.linearRampToValueAtTime(290, t + 0.28)
  g.gain.setValueAtTime(0.38, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38)
  node.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.42)
}

/**
 * Timer tick — sharp accent played each second in the final 10 s.
 * Pitch and volume increase as urgency rises.
 */
export function playTimerTick(timeLeft: number): void {
  const c = ctx()
  if (!c) return
  const m = out(c)
  const urgency = Math.max(0, 1 - timeLeft / 10)
  const freq = 600 + urgency * 700
  const vol = 0.18 + urgency * 0.28
  osc(c, m, freq, 0.06, 'square', vol)
  noise(c, m, 0.04, vol * 0.35)
}

/**
 * Double heartbeat — plays alongside the tick in the final 10 s.
 * Gets heavier as time runs out.
 */
export function playHeartbeat(timeLeft: number): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.85)
  const urgency = Math.max(0, 1 - timeLeft / 10)
  const vol = 0.35 + urgency * 0.35

  const beat = (freq: number, dropFreq: number, offsetSec: number) => {
    const t = c.currentTime + offsetSec
    const node = c.createOscillator()
    const g = c.createGain()
    node.type = 'sine'
    node.frequency.setValueAtTime(freq, t)
    node.frequency.exponentialRampToValueAtTime(dropFreq, t + 0.13)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    node.connect(g)
    g.connect(m)
    node.start(t)
    node.stop(t + 0.25)
  }

  beat(95, 48, 0)
  beat(78, 38, 0.19) // "lub-dub"
}

/**
 * Cinematic tension swell — tremolo bass ramp, played in the final 5 s.
 */
export function playCinematicTension(timeLeft: number): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.7)
  const urgency = Math.max(0, 1 - timeLeft / 5)

  const lfo = c.createOscillator()
  const lfoG = c.createGain()
  const node = c.createOscillator()
  const g = c.createGain()

  lfo.frequency.value = 7 + urgency * 10
  lfoG.gain.value = 18 + urgency * 22
  lfo.connect(lfoG)
  lfoG.connect(node.frequency)

  node.type = 'sawtooth'
  node.frequency.value = 50 + urgency * 25
  g.gain.setValueAtTime(0.001, c.currentTime)
  g.gain.linearRampToValueAtTime(0.28 + urgency * 0.22, c.currentTime + 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.3)

  node.connect(g)
  g.connect(m)
  lfo.start(c.currentTime)
  node.start(c.currentTime)
  lfo.stop(c.currentTime + 1.4)
  node.stop(c.currentTime + 1.4)
}

/**
 * Final-second cinematic impact — deep bass drop + noise burst + shimmer.
 */
export function playFinalImpact(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.9)
  const t = c.currentTime

  // Bass drop
  const bd = c.createOscillator()
  const bg = c.createGain()
  bd.type = 'sine'
  bd.frequency.setValueAtTime(220, t)
  bd.frequency.exponentialRampToValueAtTime(28, t + 0.45)
  bg.gain.setValueAtTime(0.75, t)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
  bd.connect(bg)
  bg.connect(m)
  bd.start(t)
  bd.stop(t + 1.0)

  // Noise burst
  noise(c, m, 0.22, 0.65, 0)

  // High shimmer
  osc(c, m, 1760, 0.6, 'sine', 0.22, 0.05)
  osc(c, m, 2093, 0.5, 'sine', 0.18, 0.12)
}

/**
 * Win fanfare — triumphant ascending melody + harmony + sustained chord.
 * Includes a falcon screech and confetti pops.
 */
export function playWinFanfare(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.75)

  // Melody arpeggio
  ;([523.3, 659.3, 783.9, 1046.5, 1318.5] as const).forEach((f, i) => {
    osc(c, m, f, 0.38, 'triangle', 0.38, i * 0.11)
  })

  // Harmony a third below
  ;([392, 493.9, 587.3, 783.9] as const).forEach((f, i) => {
    osc(c, m, f, 0.4, 'sine', 0.2, 0.05 + i * 0.11)
  })

  // Sustained chord
  ;([523.3, 659.3, 783.9, 1046.5] as const).forEach((f) => {
    osc(c, m, f, 1.8, 'sine', 0.15, 0.58)
  })

  window.setTimeout(() => playFalconScreech(), 180)
  window.setTimeout(() => playConfettiPops(), 500)
}

/**
 * Time bonus — quick "ding-up" shimmer when the timer gains +5s from a bid.
 */
export function playTimeBonus(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.6)
  osc(c, m, 988, 0.12, 'sine', 0.3)
  osc(c, m, 1318, 0.14, 'sine', 0.26, 0.05)
  osc(c, m, 1760, 0.18, 'sine', 0.2, 0.1)
}

/**
 * Soft chat ping when a new message arrives in the lobby.
 */
export function playChatPing(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.32)
  osc(c, m, 1320, 0.08, 'sine', 0.18)
  osc(c, m, 1760, 0.1, 'sine', 0.12, 0.04)
}

/**
 * Player join notice — quick rising swoop.
 */
export function playUserJoined(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.4)
  const t = c.currentTime
  const node = c.createOscillator()
  const g = c.createGain()
  node.type = 'sine'
  node.frequency.setValueAtTime(440, t)
  node.frequency.exponentialRampToValueAtTime(1100, t + 0.14)
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(0.22, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
  node.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.25)
}

/**
 * Lobby-to-countdown transition — short drum-roll style whoosh.
 */
export function playLobbyLaunch(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.7)
  noise(c, m, 0.5, 0.35, 0)
  osc(c, m, 180, 0.55, 'sawtooth', 0.25, 0)
  osc(c, m, 90, 0.6, 'sine', 0.35, 0)
}

/**
 * Confetti explosion — cluster of quick high-pitched pops.
 */
export function playConfettiPops(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.7)
  for (let i = 0; i < 10; i++) {
    const delay = Math.random() * 0.55
    const freq = 700 + Math.random() * 1400
    osc(c, m, freq, 0.07 + Math.random() * 0.07, 'square', 0.14 + Math.random() * 0.1, delay)
  }
}

/* ─── Matchmaking overlay SFX ───────────────────────────────────────────── */

/**
 * Soft radar ping during the matchmaking search phase.
 * Pitch wobbles over time so successive pings don't feel monotonous.
 */
export function playMatchmakingPing(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.42)
  const base = 880 + Math.random() * 220
  osc(c, m, base, 0.1, 'sine', 0.22)
  osc(c, m, base * 1.5, 0.08, 'sine', 0.1, 0.04)
  noise(c, m, 0.04, 0.08, 0.02)
}

/**
 * Whoosh used when a new listing card slides into the vote phase.
 */
export function playListingReveal(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.6)
  const t = c.currentTime

  /* Up-sweep */
  const node = c.createOscillator()
  const g = c.createGain()
  node.type = 'sawtooth'
  node.frequency.setValueAtTime(220, t)
  node.frequency.exponentialRampToValueAtTime(960, t + 0.22)
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(0.32, t + 0.08)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  node.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.36)

  /* Air whoosh */
  noise(c, m, 0.28, 0.32, 0)

  /* Bright tag */
  osc(c, m, 1320, 0.18, 'sine', 0.18, 0.18)
}

/**
 * Vote passes — bright two-tone confirm with a quick shimmer tail.
 */
export function playVotePass(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.7)
  ;([523.3, 783.9, 1046.5] as const).forEach((f, i) => {
    osc(c, m, f, 0.18, 'triangle', 0.32, i * 0.06)
  })
  osc(c, m, 1568, 0.28, 'sine', 0.18, 0.2)
}

/**
 * Vote fails — short descending buzzer (reject).
 */
export function playVoteReject(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.55)
  const t = c.currentTime
  const node = c.createOscillator()
  const g = c.createGain()
  node.type = 'sawtooth'
  node.frequency.setValueAtTime(280, t)
  node.frequency.linearRampToValueAtTime(150, t + 0.32)
  g.gain.setValueAtTime(0.34, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
  node.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.45)
  /* Light noise to give it some grit */
  noise(c, m, 0.18, 0.18, 0.02)
}

/**
 * Gift card landing pop — bouncy "boop" + sparkle for the first-adventure
 * map flying into the backpack.
 */
export function playGiftPop(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.7)
  const t = c.currentTime

  /* Bouncy sine pop */
  const node = c.createOscillator()
  const g = c.createGain()
  node.type = 'sine'
  node.frequency.setValueAtTime(220, t)
  node.frequency.exponentialRampToValueAtTime(660, t + 0.06)
  node.frequency.exponentialRampToValueAtTime(360, t + 0.18)
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(0.5, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  node.connect(g)
  g.connect(m)
  node.start(t)
  node.stop(t + 0.36)

  /* Sparkle on top */
  ;([1320, 1760, 2349] as const).forEach((f, i) => {
    osc(c, m, f, 0.18, 'sine', 0.16, 0.05 + i * 0.04)
  })

  /* Subtle noise click */
  noise(c, m, 0.04, 0.12, 0)
}

/**
 * Bid War horn — big triumphant blast when a listing wins the vote and the
 * full-screen bidding stage takes over. Layered low-brass + impact + sparkle.
 */
export function playBidWarHorn(): void {
  const c = ctx()
  if (!c) return
  const m = out(c, 0.85)
  const t = c.currentTime

  /* Low brass swell */
  const brass = c.createOscillator()
  const bg = c.createGain()
  const ds = distort(c, 70)
  brass.type = 'sawtooth'
  brass.frequency.setValueAtTime(98, t)
  brass.frequency.linearRampToValueAtTime(196, t + 0.18)
  brass.frequency.setValueAtTime(196, t + 0.6)
  brass.frequency.exponentialRampToValueAtTime(130, t + 1.0)
  bg.gain.setValueAtTime(0.001, t)
  bg.gain.linearRampToValueAtTime(0.55, t + 0.12)
  bg.gain.setValueAtTime(0.45, t + 0.7)
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
  brass.connect(ds)
  ds.connect(bg)
  bg.connect(m)
  brass.start(t)
  brass.stop(t + 1.3)

  /* Mid harmony — perfect fifth above */
  osc(c, m, 294, 1.0, 'sawtooth', 0.22, 0.05)
  osc(c, m, 392, 0.9, 'triangle', 0.18, 0.1)

  /* Impact / kick */
  noise(c, m, 0.22, 0.55, 0)
  osc(c, m, 70, 0.6, 'sine', 0.7, 0)

  /* Sparkle on top */
  ;([1046.5, 1318.5, 1568, 2093] as const).forEach((f, i) => {
    osc(c, m, f, 0.5, 'sine', 0.16, 0.18 + i * 0.05)
  })
}
