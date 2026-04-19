/**
 * Short synthesized “swoosh + sparkle” for streak celebrations (no external assets).
 * May be silent until user gesture if the browser blocks autoplay — caller should still run visuals.
 */
export function playStreakCelebrationSound(): void {
  const AC = typeof window !== 'undefined' ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined
  if (!AC) return

  let ctx: AudioContext
  try {
    ctx = new AC()
  } catch {
    return
  }

  const resume = ctx.resume().catch(() => undefined)

  void resume.then(() => {
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
    master.connect(ctx.destination)

    // Noise swoosh (band-passed)
    const noiseDur = 0.38
    const noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * noiseDur), ctx.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(2800, now)
    bp.frequency.exponentialRampToValueAtTime(420, now + noiseDur)
    bp.Q.setValueAtTime(0.9, now)
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.0001, now)
    ng.gain.exponentialRampToValueAtTime(0.45, now + 0.04)
    ng.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur)
    noise.connect(bp)
    bp.connect(ng)
    ng.connect(master)
    noise.start(now)
    noise.stop(now + noiseDur + 0.05)

    // Rising tone chime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.0001, now + 0.02)
    og.gain.exponentialRampToValueAtTime(0.12, now + 0.08)
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    osc.frequency.setValueAtTime(440, now + 0.02)
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.28)
    osc.connect(og)
    og.connect(master)
    osc.start(now + 0.02)
    osc.stop(now + 0.45)

    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    const og2 = ctx.createGain()
    og2.gain.setValueAtTime(0.0001, now + 0.12)
    og2.gain.exponentialRampToValueAtTime(0.06, now + 0.18)
    og2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
    osc2.frequency.setValueAtTime(660, now + 0.12)
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.36)
    osc2.connect(og2)
    og2.connect(master)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.52)

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined)
    }, 900)
  })
}
