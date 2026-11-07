// Tiny Web Audio blips so we don't need to ship audio files.
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function blip(freq: number, duration: number, volume: number, type: OscillatorType = 'triangle', at = 0) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

export const playTick = () => blip(880 + Math.random() * 220, 0.05, 0.08, 'square')

/** A short "clack" when a mystery-card field locks in. */
export const playLock = () => {
  blip(196, 0.14, 0.22, 'square')
  blip(392, 0.1, 0.12, 'triangle', 0.03)
}

export const playWin = () => {
  blip(523.25, 0.18, 0.18, 'triangle', 0)
  blip(659.25, 0.18, 0.18, 'triangle', 0.12)
  blip(783.99, 0.35, 0.2, 'triangle', 0.24)
}
