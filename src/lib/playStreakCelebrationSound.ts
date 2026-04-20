/**
 * Synthesised "swoosh + sparkle" for streak celebrations (no external assets).
 * Gracefully silent if the browser blocks autoplay — caller should still run visuals.
 */
export function playStreakCelebrationSound(): void {
  const AC =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined
  if (!AC) return

  let ctx: AudioContext
  try {
    ctx = new AC()
  } catch {
    return
  }

  void ctx
    .resume()
    .catch(() => undefined)
    .then(() => {
      const t = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, t)
      master.gain.linearRampToValueAtTime(0.28, t + 0.015)
      master.gain.linearRampToValueAtTime(0.0001, t + 0.72)
      master.connect(ctx.destination)

      /* Band-passed noise swoosh — left-to-right sweep feel */
      const nDur = 0.4
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * nDur), ctx.sampleRate)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
      const ns = ctx.createBufferSource()
      ns.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(3200, t)
      bp.frequency.exponentialRampToValueAtTime(380, t + nDur)
      bp.Q.setValueAtTime(0.8, t)
      const ng = ctx.createGain()
      ng.gain.setValueAtTime(0.0001, t)
      ng.gain.exponentialRampToValueAtTime(0.48, t + 0.035)
      ng.gain.exponentialRampToValueAtTime(0.0001, t + nDur)
      ns.connect(bp)
      bp.connect(ng)
      ng.connect(master)
      ns.start(t)
      ns.stop(t + nDur + 0.02)

      /* Rising chime — two harmonics for depth */
      const chime = (freq: number, delay: number, vol: number, dur: number, type: OscillatorType) => {
        const o = ctx.createOscillator()
        o.type = type
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t + delay)
        g.gain.exponentialRampToValueAtTime(vol, t + delay + 0.05)
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur)
        o.frequency.setValueAtTime(freq, t + delay)
        o.frequency.exponentialRampToValueAtTime(freq * 2.4, t + delay + dur * 0.75)
        o.connect(g)
        g.connect(master)
        o.start(t + delay)
        o.stop(t + delay + dur + 0.02)
      }

      chime(520, 0.02, 0.14, 0.38, 'sine')
      chime(780, 0.1, 0.07, 0.42, 'triangle')

      window.setTimeout(() => void ctx.close().catch(() => undefined), 1000)
    })
}

/**
 * Synthesised chest-opening sound: deep metallic thump + magical shimmer.
 */
export function playChestOpenSound(): void {
  const AC =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined
  if (!AC) return

  let ctx: AudioContext
  try {
    ctx = new AC()
  } catch {
    return
  }

  void ctx
    .resume()
    .catch(() => undefined)
    .then(() => {
      const t = ctx.currentTime

      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, t)
      master.gain.linearRampToValueAtTime(0.32, t + 0.01)
      master.gain.linearRampToValueAtTime(0.0001, t + 1.4)
      master.connect(ctx.destination)

      /* Low thump */
      const kick = ctx.createOscillator()
      kick.type = 'sine'
      kick.frequency.setValueAtTime(120, t)
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.2)
      const kg = ctx.createGain()
      kg.gain.setValueAtTime(0.0001, t)
      kg.gain.exponentialRampToValueAtTime(0.55, t + 0.01)
      kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      kick.connect(kg)
      kg.connect(master)
      kick.start(t)
      kick.stop(t + 0.4)

      /* Metallic creak */
      const creak = ctx.createOscillator()
      creak.type = 'sawtooth'
      creak.frequency.setValueAtTime(180, t + 0.05)
      creak.frequency.exponentialRampToValueAtTime(320, t + 0.3)
      const cf = ctx.createBiquadFilter()
      cf.type = 'bandpass'
      cf.frequency.value = 600
      cf.Q.value = 4
      const cg = ctx.createGain()
      cg.gain.setValueAtTime(0.0001, t + 0.05)
      cg.gain.exponentialRampToValueAtTime(0.08, t + 0.12)
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      creak.connect(cf)
      cf.connect(cg)
      cg.connect(master)
      creak.start(t + 0.05)
      creak.stop(t + 0.55)

      /* Shimmer sparkles — three staggered harmonics */
      const shimmer = (freq: number, delay: number, vol: number) => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.setValueAtTime(freq, t + delay)
        o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + delay + 0.6)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t + delay)
        g.gain.exponentialRampToValueAtTime(vol, t + delay + 0.06)
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.7)
        o.connect(g)
        g.connect(master)
        o.start(t + delay)
        o.stop(t + delay + 0.75)
      }

      shimmer(880, 0.35, 0.06)
      shimmer(1320, 0.45, 0.04)
      shimmer(1760, 0.55, 0.025)

      window.setTimeout(() => void ctx.close().catch(() => undefined), 1800)
    })
}
