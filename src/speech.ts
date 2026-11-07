// English pronunciation of element names using the browser's built-in voices (Web Speech API).
// No audio files are needed; every modern browser ships at least one English voice.
import { useEffect, useState } from 'react'
import type { Accent } from './data/pronunciation'

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

const LANG: Record<Accent, RegExp> = { uk: /^en[-_]GB/i, us: /^en[-_]US/i }
const NICE = /natural|neural|google|samantha|daniel|serena|kate|arthur|aria|jenny|libby|sonia|ryan|guy/i

function voiceFor(accent: Accent): SpeechSynthesisVoice | null {
  if (!canSpeak) return null
  const voices = window.speechSynthesis.getVoices()
  const mine = voices.filter((v) => LANG[accent].test(v.lang))
  return mine.find((v) => NICE.test(v.name)) ?? mine[0] ?? null
}

/** Whether this device has a voice for the accent (voices load asynchronously, so this updates). */
export function useHasVoice(accent: Accent): boolean {
  const [has, setHas] = useState(() => !!voiceFor(accent))
  useEffect(() => {
    if (!canSpeak) return
    const update = () => setHas(!!voiceFor(accent))
    update()
    window.speechSynthesis.addEventListener?.('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update)
  }, [accent])
  return has
}

/** Says `text` in British or American English. Returns false when the browser can't speak. */
export function speakEnglish(text: string, opts: { slow?: boolean; accent?: Accent } = {}): boolean {
  if (!canSpeak) return false
  const accent = opts.accent ?? 'uk'
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = voiceFor(accent)
  u.lang = voice?.lang ?? (accent === 'uk' ? 'en-GB' : 'en-US')
  if (voice) u.voice = voice
  // Slow mode is really slow, so students can hear every syllable.
  u.rate = opts.slow ? 0.38 : 0.9
  synth.speak(u)
  return true
}

const ACCENT_KEY = 'element-roulette:accent'

/** The student's chosen accent, remembered on this device. */
export function useAccent(): [Accent, (a: Accent) => void] {
  const [accent, setAccent] = useState<Accent>(() => {
    try {
      return localStorage.getItem(ACCENT_KEY) === 'us' ? 'us' : 'uk'
    } catch {
      return 'uk'
    }
  })
  const set = (a: Accent) => {
    setAccent(a)
    try {
      localStorage.setItem(ACCENT_KEY, a)
    } catch {
      /* ignore */
    }
  }
  return [accent, set]
}
