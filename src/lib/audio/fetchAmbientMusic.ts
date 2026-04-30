/**
 * Global ambient music — chill on the home shell, "war" during Bid Wars.
 *
 * Two-tier audio strategy:
 *  1. Prefer real audio files at `public/audio/home-chill.mp3`,
 *     `public/audio/adventure-excite.mp3`, and `public/audio/bidwars-war.mp3`
 *     (drop in your own track or licensed loop).
 *  2. If the file is missing / fails to load, fall back to a richer Web Audio
 *     synthesis (chord progression for chill, upbeat arps for adventure,
 *     drum+bass beat for war).
 *
 * Reference counting from screens (HomeView, BidwarsHub, etc.) decides which
 * bed plays. Pokies has its own bed, so it can fully duck this one.
 *
 * Public API:
 *  - `ambientRegisterHome(+1/-1)`
 *  - `ambientRegisterAdventure(+1/-1)`
 *  - `ambientRegisterBidWars(+1/-1)`
 *  - `ambientSetPokiesDuck(boolean)`
 *  - `ambientSetMusicEnabled(boolean)` / `ambientIsMusicEnabled()`
 */

type Bed = 'chill' | 'adventure' | 'war' | null

const HOME_AUDIO_URL = `${import.meta.env.BASE_URL}audio/home-chill.mp3`
const ADVENTURE_AUDIO_URL = `${import.meta.env.BASE_URL}audio/adventure-excite.mp3`
const WAR_AUDIO_URL = `${import.meta.env.BASE_URL}audio/bidwars-war.mp3`

const STORAGE_KEY = 'fetch.ambientMusic.enabled.v1'

/* ---------------- shared state ---------------- */
let homeRef = 0
let adventureRef = 0
let bidwarsRef = 0
let pokiesDuck = false
let currentBed: Bed = null
let musicEnabled = readStoredEnabled()

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let masterLimiter: DynamicsCompressorNode | null = null
let resumeListenersAttached = false

/* ---------------- HTMLAudio file path ---------------- */
type FileBed = {
  url: string
  audio: HTMLAudioElement | null
  /** `true` once we've confirmed the file plays; `false` once we've decided to fall back. */
  ready: boolean | null
  /** Pending init promise (only one in flight). */
  init: Promise<boolean> | null
}
const fileBeds: Record<Exclude<Bed, null>, FileBed> = {
  chill: { url: HOME_AUDIO_URL, audio: null, ready: null, init: null },
  adventure: { url: ADVENTURE_AUDIO_URL, audio: null, ready: null, init: null },
  war: { url: WAR_AUDIO_URL, audio: null, ready: null, init: null },
}

function readStoredEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'false') return false
    return true
  } catch {
    return true
  }
}

function persistEnabled(v: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

/* ---------------- AudioContext ---------------- */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const AC =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  audioCtx = new AC()
  masterGain = audioCtx.createGain()
  masterGain.gain.value = 0
  masterLimiter = audioCtx.createDynamicsCompressor()
  masterLimiter.threshold.value = -10
  masterLimiter.knee.value = 6
  masterLimiter.ratio.value = 4
  masterLimiter.attack.value = 0.005
  masterLimiter.release.value = 0.18
  masterGain.connect(masterLimiter)
  masterLimiter.connect(audioCtx.destination)
  return audioCtx
}

function attachResumeOnce() {
  if (resumeListenersAttached || typeof window === 'undefined') return
  resumeListenersAttached = true
  const go = () => {
    void getCtx()?.resume()
    if (currentBed === 'chill') void playChillFile()
    if (currentBed === 'adventure') void playAdventureFile()
    if (currentBed === 'war') void playWarFile()
    syncAmbient()
  }
  window.addEventListener('pointerdown', go, { capture: true, passive: true })
  window.addEventListener('keydown', go, { capture: true, passive: true })
  window.addEventListener('touchstart', go, { capture: true, passive: true })
}

/* ---------------- HTMLAudio loaders + fades ---------------- */
function ensureFileBed(kind: Exclude<Bed, null>): FileBed {
  const bed = fileBeds[kind]
  if (bed.audio) return bed
  if (typeof document === 'undefined') return bed
  const a = new Audio()
  a.src = bed.url
  a.loop = true
  a.preload = 'auto'
  a.crossOrigin = 'anonymous'
  a.volume = 0
  bed.audio = a
  return bed
}

function tryLoadBed(kind: Exclude<Bed, null>): Promise<boolean> {
  const bed = ensureFileBed(kind)
  if (bed.ready === true) return Promise.resolve(true)
  if (bed.ready === false) return Promise.resolve(false)
  if (bed.init) return bed.init
  if (!bed.audio) return Promise.resolve(false)

  bed.init = new Promise<boolean>((resolve) => {
    const a = bed.audio as HTMLAudioElement
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      bed.ready = ok
      bed.init = null
      cleanup()
      resolve(ok)
    }
    function cleanup() {
      a.removeEventListener('canplaythrough', onOk)
      a.removeEventListener('loadeddata', onOk)
      a.removeEventListener('error', onErr)
    }
    const onOk = () => finish(true)
    const onErr = () => finish(false)

    a.addEventListener('canplaythrough', onOk)
    a.addEventListener('loadeddata', onOk)
    a.addEventListener('error', onErr)

    /** If something is wrong with the URL the browser can stall — give up after 4s. */
    window.setTimeout(() => finish(false), 4000)
    try {
      a.load()
    } catch {
      finish(false)
    }
  })
  return bed.init
}

function fadeAudioElement(a: HTMLAudioElement, target: number, ms = 600) {
  const from = a.volume
  const start = performance.now()
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / ms)
    a.volume = Math.max(0, Math.min(1, from + (target - from) * t))
    if (t < 1) requestAnimationFrame(tick)
    else if (target === 0) a.pause()
  }
  if (target > 0 && a.paused) {
    void a.play().catch(() => {
      /* autoplay blocked — wait for user gesture */
    })
  }
  requestAnimationFrame(tick)
}

function stopAllFiles() {
  for (const k of ['chill', 'adventure', 'war'] as const) {
    const a = fileBeds[k].audio
    if (a) fadeAudioElement(a, 0, 400)
  }
}

function fadeOutOtherFiles(active: Exclude<Bed, null>) {
  for (const k of ['chill', 'adventure', 'war'] as const) {
    if (k === active) continue
    const a = fileBeds[k].audio
    if (a) fadeAudioElement(a, 0, 300)
  }
}

/** Stops other HTMLAudio beds immediately (avoids overlap with in-flight volume ramps). */
function silenceFileBedsExcept(active: Exclude<Bed, null>) {
  for (const k of ['chill', 'adventure', 'war'] as const) {
    if (k === active) continue
    const a = fileBeds[k].audio
    if (!a) continue
    try {
      a.pause()
    } catch {
      /* */
    }
    a.volume = 0
  }
}

async function playChillFile(): Promise<boolean> {
  const ok = await tryLoadBed('chill')
  if (!ok || !musicEnabled) return ok
  if (desiredBed() !== 'chill' || currentBed !== 'chill') return ok
  const chill = fileBeds.chill.audio
  fadeOutOtherFiles('chill')
  if (chill) fadeAudioElement(chill, 0.42, 800)
  return true
}

async function playAdventureFile(): Promise<boolean> {
  const ok = await tryLoadBed('adventure')
  if (!ok || !musicEnabled) return ok
  if (desiredBed() !== 'adventure' || currentBed !== 'adventure') return ok
  const adventure = fileBeds.adventure.audio
  fadeOutOtherFiles('adventure')
  if (adventure) fadeAudioElement(adventure, 0.34, 650)
  return true
}

async function playWarFile(): Promise<boolean> {
  const ok = await tryLoadBed('war')
  if (!ok || !musicEnabled) return ok
  if (desiredBed() !== 'war' || currentBed !== 'war') return ok
  const war = fileBeds.war.audio
  fadeOutOtherFiles('war')
  if (war) fadeAudioElement(war, 0.6, 700)
  return true
}

/* ============================================================
 * Procedural fallback — chord progression (chill) + drum+bass (war)
 * ============================================================ */

type ProceduralBed = {
  stop: () => void
}

let proc: ProceduralBed | null = null

function rampMaster(target: number, sec = 0.6) {
  const ctx = getCtx()
  if (!masterGain || !ctx) return
  const t = ctx.currentTime
  masterGain.gain.cancelScheduledValues(t)
  masterGain.gain.linearRampToValueAtTime(Math.max(0, target), t + sec)
}

function disposeOscillator(o: OscillatorNode) {
  try {
    o.stop()
  } catch {
    /* */
  }
  try {
    o.disconnect()
  } catch {
    /* */
  }
}

function startChillProcedural(): ProceduralBed {
  const ctxOrNull = getCtx()
  if (!ctxOrNull || !masterGain) return { stop: () => undefined }
  const ctx: AudioContext = ctxOrNull
  const dest: GainNode = masterGain

  /** 4-bar progression — Am7 → Fmaj7 → Cmaj7 → G7 (lo-fi vibe, 4s/bar = 16s loop). */
  const progression: number[][] = [
    /* Am7  */ [220.0, 261.63, 329.63, 392.0],
    /* Fmaj7*/ [174.61, 220.0, 261.63, 329.63],
    /* Cmaj7*/ [130.81, 196.0, 246.94, 329.63],
    /* G7   */ [196.0, 246.94, 293.66, 369.99],
  ]
  const bar = 4 // seconds per bar

  const bus = ctx.createGain()
  bus.gain.value = 0.45

  /** Soft low-pass + slight resonance so it sounds dreamy. */
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1700
  lp.Q.value = 0.6
  bus.connect(lp)

  /** Stereo width via a tiny delay on one side. */
  let merger: ChannelMergerNode | null = null
  try {
    merger = ctx.createChannelMerger(2)
    const splitter = ctx.createChannelSplitter(1)
    lp.connect(splitter)
    const dly = ctx.createDelay(0.05)
    dly.delayTime.value = 0.012
    splitter.connect(merger, 0, 0)
    splitter.connect(dly).connect(merger, 0, 1)
    merger.connect(dest)
  } catch {
    lp.connect(dest)
  }

  const oscs: OscillatorNode[] = []
  let stopped = false

  /** Schedule pad voices ahead of time. */
  function scheduleBars(startAtSec: number, count: number) {
    for (let i = 0; i < count; i++) {
      const chord = progression[(Math.floor(startAtSec / bar) + i) % progression.length]
      const t0 = startAtSec + i * bar
      const t1 = t0 + bar
      for (const f of chord) {
        for (const wave of ['sine', 'triangle'] as OscillatorType[]) {
          const o = ctx.createOscillator()
          o.type = wave
          o.frequency.value = f * (wave === 'triangle' ? 1.005 : 1) // slight detune
          const g = ctx.createGain()
          g.gain.setValueAtTime(0, t0)
          g.gain.linearRampToValueAtTime(0.06, t0 + 0.6)
          g.gain.setValueAtTime(0.06, t1 - 0.4)
          g.gain.linearRampToValueAtTime(0.0, t1 + 0.05)
          o.connect(g).connect(bus)
          o.start(t0)
          o.stop(t1 + 0.1)
          oscs.push(o)
        }
      }

      /** Bell motif — arpeggiate the chord top down. */
      const top = [chord[3], chord[2], chord[1], chord[2]]
      for (let n = 0; n < top.length; n++) {
        const tn = t0 + 0.5 + n * 0.6
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = top[n] * 2
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, tn)
        g.gain.linearRampToValueAtTime(0.024, tn + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0008, tn + 0.55)
        g.gain.setValueAtTime(0, tn + 0.6)
        o.connect(g).connect(bus)
        o.start(tn)
        o.stop(tn + 0.62)
        oscs.push(o)
      }
    }
  }

  /** Roll the schedule forward in 4s windows so we never run dry. */
  let nextScheduleAt = ctx.currentTime
  function tick() {
    if (stopped) return
    const now = ctx.currentTime
    if (nextScheduleAt - now < 1.2) {
      scheduleBars(nextScheduleAt, 1)
      nextScheduleAt += bar
    }
    timer = window.setTimeout(tick, 200)
  }
  scheduleBars(ctx.currentTime, 2)
  nextScheduleAt = ctx.currentTime + bar
  let timer = window.setTimeout(tick, 200)

  return {
    stop() {
      stopped = true
      window.clearTimeout(timer)
      for (const o of oscs) disposeOscillator(o)
      try {
        merger?.disconnect()
      } catch {
        /* */
      }
    },
  }
}

/** Cached drum hit buffers. */
let drumKick: AudioBuffer | null = null
let drumSnare: AudioBuffer | null = null
let drumHat: AudioBuffer | null = null

function makeKickBuffer(ctx: AudioContext): AudioBuffer {
  const dur = 0.35
  const sr = ctx.sampleRate
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < ch.length; i++) {
    const t = i / sr
    /** Pitch sweep 110→45Hz, exp decay. */
    const f = 110 * Math.pow(0.4, t * 6)
    const amp = Math.exp(-t * 6.5)
    ch[i] = Math.sin(2 * Math.PI * f * t) * amp
  }
  return buf
}

function makeSnareBuffer(ctx: AudioContext): AudioBuffer {
  const dur = 0.22
  const sr = ctx.sampleRate
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < ch.length; i++) {
    const t = i / sr
    const noise = Math.random() * 2 - 1
    const tone = Math.sin(2 * Math.PI * 200 * t) * 0.4
    const amp = Math.exp(-t * 18)
    ch[i] = (noise * 0.7 + tone) * amp
  }
  return buf
}

function makeHatBuffer(ctx: AudioContext): AudioBuffer {
  const dur = 0.06
  const sr = ctx.sampleRate
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < ch.length; i++) {
    const t = i / sr
    ch[i] = (Math.random() * 2 - 1) * Math.exp(-t * 65)
  }
  return buf
}

function startWarProcedural(): ProceduralBed {
  const ctxOrNull = getCtx()
  if (!ctxOrNull || !masterGain) return { stop: () => undefined }
  const ctx: AudioContext = ctxOrNull
  const dest: GainNode = masterGain

  if (!drumKick) drumKick = makeKickBuffer(ctx)
  if (!drumSnare) drumSnare = makeSnareBuffer(ctx)
  if (!drumHat) drumHat = makeHatBuffer(ctx)

  const bus = ctx.createGain()
  bus.gain.value = 0.78

  /** Master HP filter so the kick doesn't muddy mobile speakers too much. */
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 38
  bus.connect(hp).connect(dest)

  /** Sub-bus for tonal layers (saw pad). */
  const padBus = ctx.createGain()
  padBus.gain.value = 0.32
  const padLp = ctx.createBiquadFilter()
  padLp.type = 'lowpass'
  padLp.frequency.value = 600
  padLp.Q.value = 1.4
  padBus.connect(padLp).connect(bus)

  const drumGain = (level: number) => {
    const g = ctx.createGain()
    g.gain.value = level
    g.connect(bus)
    return g
  }
  const kickG = drumGain(0.95)
  const snareG = drumGain(0.42)
  const hatG = drumGain(0.18)

  const bpm = 132
  const beat = 60 / bpm
  const sixteenth = beat / 4

  const scheduledOscs: OscillatorNode[] = []
  const scheduledSrcs: AudioBufferSourceNode[] = []
  let stopped = false

  function fireBuffer(buf: AudioBuffer, dest: GainNode, when: number, gain = 1) {
    const s = ctx.createBufferSource()
    s.buffer = buf
    const g = ctx.createGain()
    g.gain.value = gain
    s.connect(g).connect(dest)
    s.start(when)
    scheduledSrcs.push(s)
  }

  /** Em - C - D - Em (i - VI - VII - i)  driving menace */
  const bassNotes = [82.41, 65.41, 73.42, 82.41]
  const bassPattern: number[] = [
    0, 0.5, 1, 1.5, 2, 2.25, 3, 3.5, // sixteenths within a 4-beat bar (in beats)
  ]

  function scheduleBar(startAtSec: number, idx: number) {
    /** 4-on-the-floor kick on every beat. */
    for (let b = 0; b < 4; b++) {
      fireBuffer(drumKick as AudioBuffer, kickG, startAtSec + b * beat, 1)
    }
    /** Snare on 2 and 4. */
    fireBuffer(drumSnare as AudioBuffer, snareG, startAtSec + 1 * beat)
    fireBuffer(drumSnare as AudioBuffer, snareG, startAtSec + 3 * beat)
    /** Hat eighth-notes, slightly lower on the offs. */
    for (let s = 0; s < 8; s++) {
      const w = startAtSec + s * (beat / 2)
      fireBuffer(drumHat as AudioBuffer, hatG, w, s % 2 === 0 ? 1 : 0.7)
    }
    /** Bass ostinato. */
    const root = bassNotes[idx % bassNotes.length]
    for (const beatPos of bassPattern) {
      const t0 = startAtSec + beatPos * beat
      const t1 = t0 + sixteenth * 1.4
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = root
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(220, t0)
      f.frequency.linearRampToValueAtTime(120, t1)
      f.Q.value = 6
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.005)
      g.gain.exponentialRampToValueAtTime(0.0009, t1)
      g.gain.setValueAtTime(0, t1 + 0.01)
      o.connect(f).connect(g).connect(bus)
      o.start(t0)
      o.stop(t1 + 0.05)
      scheduledOscs.push(o)
    }
    /** Pad — sustained chord, two slightly detuned saws, sweeping filter for tension. */
    const chordRoot = root
    const fifth = chordRoot * 1.4983
    const padDur = beat * 4
    const padStart = startAtSec
    const padEnd = padStart + padDur
    const sweepFromHz = 380
    const sweepToHz = 800

    padLp.frequency.cancelScheduledValues(padStart)
    padLp.frequency.setValueAtTime(sweepFromHz, padStart)
    padLp.frequency.linearRampToValueAtTime(sweepToHz, padStart + padDur * 0.7)
    padLp.frequency.linearRampToValueAtTime(sweepFromHz, padEnd)

    for (const f of [chordRoot, chordRoot * 1.005, fifth, fifth * 1.004]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, padStart)
      g.gain.linearRampToValueAtTime(0.045, padStart + 0.6)
      g.gain.setValueAtTime(0.045, padEnd - 0.4)
      g.gain.linearRampToValueAtTime(0, padEnd + 0.05)
      o.connect(g).connect(padBus)
      o.start(padStart)
      o.stop(padEnd + 0.1)
      scheduledOscs.push(o)
    }
  }

  let nextBarAt = ctx.currentTime + 0.05
  let barIdx = 0
  /** Schedule 2 bars ahead at start, then top up roughly twice per bar. */
  scheduleBar(nextBarAt, barIdx++)
  nextBarAt += beat * 4
  scheduleBar(nextBarAt, barIdx++)
  nextBarAt += beat * 4

  function tick() {
    if (stopped) return
    const now = ctx.currentTime
    while (nextBarAt - now < beat * 4) {
      scheduleBar(nextBarAt, barIdx++)
      nextBarAt += beat * 4
    }
    timer = window.setTimeout(tick, 250)
  }
  let timer = window.setTimeout(tick, 250)

  return {
    stop() {
      stopped = true
      window.clearTimeout(timer)
      for (const o of scheduledOscs) disposeOscillator(o)
      for (const s of scheduledSrcs) {
        try {
          s.stop()
        } catch {
          /* */
        }
        try {
          s.disconnect()
        } catch {
          /* */
        }
      }
      try {
        bus.disconnect()
        padBus.disconnect()
      } catch {
        /* */
      }
    },
  }
}

function startAdventureProcedural(): ProceduralBed {
  const ctxOrNull = getCtx()
  if (!ctxOrNull || !masterGain) return { stop: () => undefined }
  const ctx: AudioContext = ctxOrNull
  const dest: GainNode = masterGain

  if (!drumKick) drumKick = makeKickBuffer(ctx)
  if (!drumHat) drumHat = makeHatBuffer(ctx)

  const bus = ctx.createGain()
  bus.gain.value = 0.42

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 42

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1450
  lp.Q.value = 0.55
  bus.connect(hp).connect(lp).connect(dest)

  const drumBus = ctx.createGain()
  drumBus.gain.value = 0.5
  drumBus.connect(bus)

  const arpBus = ctx.createGain()
  arpBus.gain.value = 0.14
  arpBus.connect(bus)

  const bpm = 128
  const beat = 60 / bpm
  const sixteenth = beat / 4
  const progression = [
    [261.63, 329.63, 392.0, 523.25],
    [220.0, 293.66, 369.99, 440.0],
    [329.63, 392.0, 493.88, 659.25],
    [196.0, 261.63, 329.63, 392.0],
  ]
  const scheduledOscs: OscillatorNode[] = []
  const scheduledSrcs: AudioBufferSourceNode[] = []
  let stopped = false

  function fireBuffer(buf: AudioBuffer, when: number, gain = 1) {
    const s = ctx.createBufferSource()
    s.buffer = buf
    const g = ctx.createGain()
    g.gain.value = gain
    s.connect(g).connect(drumBus)
    s.start(when)
    scheduledSrcs.push(s)
  }

  function scheduleBar(startAtSec: number, idx: number) {
    for (let b = 0; b < 4; b++) {
      fireBuffer(drumKick as AudioBuffer, startAtSec + b * beat, b === 0 ? 0.55 : 0.3)
    }
    for (let s = 0; s < 16; s++) {
      if (s % 2 !== 0) continue
      fireBuffer(drumHat as AudioBuffer, startAtSec + s * sixteenth, s % 4 === 0 ? 0.16 : 0.09)
    }

    const notes = progression[idx % progression.length]
    for (let s = 0; s < 16; s++) {
      if (s % 2 !== 0) continue
      const note = notes[(s / 2 + idx) % notes.length]
      const t0 = startAtSec + s * sixteenth
      const t1 = t0 + sixteenth * 1.35
      const o = ctx.createOscillator()
      o.type = s % 4 === 0 ? 'sine' : 'triangle'
      o.frequency.setValueAtTime(note, t0)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(s % 4 === 0 ? 0.024 : 0.016, t0 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0008, t1 + 0.08)
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(900 + s * 20, t0)
      f.Q.value = 1.2
      o.connect(f).connect(g).connect(arpBus)
      o.start(t0)
      o.stop(t1 + 0.04)
      scheduledOscs.push(o)
    }

    const root = notes[0] / 2
    const bass = ctx.createOscillator()
    bass.type = 'sawtooth'
    bass.frequency.setValueAtTime(root, startAtSec)
    const bassGain = ctx.createGain()
    bassGain.gain.setValueAtTime(0, startAtSec)
    bassGain.gain.linearRampToValueAtTime(0.055, startAtSec + 0.08)
    bassGain.gain.setValueAtTime(0.055, startAtSec + beat * 3.5)
    bassGain.gain.linearRampToValueAtTime(0, startAtSec + beat * 4)
    bass.connect(bassGain).connect(bus)
    bass.start(startAtSec)
    bass.stop(startAtSec + beat * 4 + 0.04)
    scheduledOscs.push(bass)
  }

  let nextBarAt = ctx.currentTime + 0.04
  let barIdx = 0
  scheduleBar(nextBarAt, barIdx++)
  nextBarAt += beat * 4
  scheduleBar(nextBarAt, barIdx++)
  nextBarAt += beat * 4

  function tick() {
    if (stopped) return
    const now = ctx.currentTime
    while (nextBarAt - now < beat * 4) {
      scheduleBar(nextBarAt, barIdx++)
      nextBarAt += beat * 4
    }
    timer = window.setTimeout(tick, 220)
  }
  let timer = window.setTimeout(tick, 220)

  return {
    stop() {
      stopped = true
      window.clearTimeout(timer)
      for (const o of scheduledOscs) disposeOscillator(o)
      for (const s of scheduledSrcs) {
        try {
          s.stop()
        } catch {
          /* */
        }
        try {
          s.disconnect()
        } catch {
          /* */
        }
      }
      try {
        bus.disconnect()
        drumBus.disconnect()
        arpBus.disconnect()
      } catch {
        /* */
      }
    },
  }
}

function stopProcedural() {
  if (proc) {
    proc.stop()
    proc = null
  }
}

/* ---------------- Orchestration ---------------- */
function desiredBed(): Bed {
  if (!musicEnabled) return null
  if (pokiesDuck) return null
  if (bidwarsRef > 0) return 'war'
  if (adventureRef > 0) return 'adventure'
  if (homeRef > 0) return 'chill'
  return null
}

let pendingApply: { bed: Bed; promise: Promise<void> } | null = null
/** Incremented on every `applyBed` start so in-flight awaits cannot finish with the wrong procedural/file ramp. */
let applySeq = 0

async function applyBed(want: Bed) {
  const mySeq = ++applySeq
  /** Always stop the procedural bed when bed changes (or stops). */
  stopProcedural()

  if (!want) {
    stopAllFiles()
    rampMaster(0)
    return
  }

  /** Cut non-active file beds immediately so adventure/war cannot linger under async load. */
  silenceFileBedsExcept(want)

  /** Try real audio file first. */
  const okFile =
    want === 'chill'
      ? await playChillFile()
      : want === 'adventure'
        ? await playAdventureFile()
        : await playWarFile()
  if (mySeq !== applySeq) return

  if (okFile) {
    rampMaster(0)
    return
  }

  /** Fallback to procedural (file missing). */
  if (mySeq !== applySeq) return
  stopAllFiles()
  proc =
    want === 'chill'
      ? startChillProcedural()
      : want === 'adventure'
        ? startAdventureProcedural()
        : startWarProcedural()
  rampMaster(want === 'war' ? 0.18 : want === 'adventure' ? 0.16 : 0.14, 0.9)
}

function syncAmbient() {
  attachResumeOnce()
  void getCtx()?.resume()

  const want = desiredBed()
  if (want === currentBed && !pendingApply) return
  if (pendingApply && pendingApply.bed === want) return

  currentBed = want
  const promise = applyBed(want).finally(() => {
    if (pendingApply && pendingApply.promise === promise) pendingApply = null
  })
  pendingApply = { bed: want, promise }
}

/* ---------------- Public API ---------------- */
export function ambientRegisterHome(delta: 1 | -1) {
  homeRef = Math.max(0, homeRef + delta)
  syncAmbient()
}

export function ambientRegisterAdventure(delta: 1 | -1) {
  adventureRef = Math.max(0, adventureRef + delta)
  syncAmbient()
}

export function ambientRegisterBidWars(delta: 1 | -1) {
  bidwarsRef = Math.max(0, bidwarsRef + delta)
  syncAmbient()
}

export function ambientSetPokiesDuck(ducked: boolean) {
  pokiesDuck = ducked
  syncAmbient()
}

export function ambientSetMusicEnabled(enabled: boolean) {
  musicEnabled = enabled
  persistEnabled(enabled)
  syncAmbient()
}

export function ambientIsMusicEnabled(): boolean {
  return musicEnabled
}
