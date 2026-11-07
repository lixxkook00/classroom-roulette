import { flushSync } from 'react-dom'

/** Unbiased-enough random integer in [0, max) using the crypto RNG. */
export function randomInt(max: number) {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % max
}

/** Random item from a list, avoiding `not` when there is any other choice. */
export function pickOther<T>(list: T[], not: T | null): T {
  if (list.length <= 1) return list[0]
  let v = list[randomInt(list.length)]
  while (v === not) v = list[randomInt(list.length)]
  return v
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * True when Space should be left alone: typing in a text field, or a key already handled
 * (e.g. by the open class dropdown). Focused buttons and switches do NOT count, so Space
 * always spins on the spin screen even right after clicking something — Enter still
 * presses a focused button for keyboard users.
 */
export function isTypingSpace(e: KeyboardEvent) {
  if (e.defaultPrevented || e.repeat) return true
  const t = e.target
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true
  if (t.tagName === 'INPUT') return !['checkbox', 'radio', 'button', 'submit', 'range'].includes((t as HTMLInputElement).type)
  return !!t.closest('[role="listbox"], [role="dialog"]')
}

type VT = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> }
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => VT }

export const supportsViewTransitions = typeof document !== 'undefined' && 'startViewTransition' in document

/**
 * Runs a React state change inside a View Transition. `kind` lands on <html data-nav="…">
 * so the CSS can pick the right animation (screen slide, mode switch…).
 */
export function viewTransition(kind: string, apply: () => void) {
  const doc = document as DocWithVT
  if (!doc.startViewTransition || prefersReducedMotion()) return apply()
  document.documentElement.dataset.nav = kind
  const vt = doc.startViewTransition(() => flushSync(apply))
  // A newer transition may cut this one short — that's fine, don't report it as an error.
  vt.ready.catch(() => {})
  vt.finished.catch(() => {})
  vt.updateCallbackDone.catch(() => {})
}

/** Link to a student tab on this same site, e.g. studentUrl('table'). */
export function studentUrl(path: string): string {
  return `${window.location.origin}${window.location.pathname}#/${path}`
}

/** Current time as an ISO string (kept out of render code). */
export const nowIso = () => new Date().toISOString()
