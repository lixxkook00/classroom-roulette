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

/** Short burst of noise — a firework crackle. */
function crackle(at: number, volume = 0.12) {
  const ac = audio()
  if (!ac) return
  const len = Math.floor(ac.sampleRate * 0.25)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * (Math.random() < 0.3 ? 1 : 0.2)
  const src = ac.createBufferSource()
  const gain = ac.createGain()
  src.buffer = buf
  gain.gain.value = volume
  src.connect(gain).connect(ac.destination)
  src.start(ac.currentTime + at)
}

/** Correct answer: a bright fanfare and firework pops. */
export const playCorrect = () => {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => blip(f, 0.22, 0.18, 'triangle', i * 0.11))
  blip(1318.5, 0.5, 0.16, 'triangle', 0.48)
  ;[0.55, 0.85, 1.1, 1.4, 1.7].forEach((t) => crackle(t, 0.1 + Math.random() * 0.06))
}

/** Wrong answer: a friendly "wah-wah". */
export const playWrong = () => {
  const ac = audio()
  if (!ac) return
  ;[0, 0.32].forEach((at, i) => {
    const t = ac.currentTime + at
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(i ? 330 : 392, t)
    osc.frequency.exponentialRampToValueAtTime(i ? 196 : 311, t + (i ? 0.6 : 0.28))
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (i ? 0.65 : 0.3))
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.7)
  })
}
