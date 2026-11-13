import { useEffect, useState } from 'react'

/*
 * "Xoay ngang": show the app in landscape while the phone is held upright.
 *
 *   Android (Chrome): real fullscreen + screen.orientation.lock('landscape').
 *   iPhone / anything that can't lock: the whole app is rotated 90° with CSS. To make that behave like a
 *   real landscape screen, every @media rule has width ⇄ height and portrait ⇄ landscape swapped, and
 *   vh ⇄ vw in property values, so the layout sees an 844 × 390 screen instead of 390 × 844.
 *   Touches on the 3-D canvases are mapped back into the rotated frame (see mapPointer).
 *
 * When the phone is physically turned to landscape the rotation switches itself off, and back on
 * when it is turned upright again, as long as the student hasn't tapped the button again.
 */

export const ROTATE_EVENT = 'element-roulette:rotate'
const WANT_KEY = 'element-roulette:landscape'

let wanted = readWanted()
let applied = false
let native = false

function readWanted() {
  try {
    return localStorage.getItem(WANT_KEY) === '1'
  } catch {
    return false
  }
}
function saveWanted(v: boolean) {
  try {
    if (v) localStorage.setItem(WANT_KEY, '1')
    else localStorage.removeItem(WANT_KEY)
  } catch {
    /* ignore */
  }
}

const portraitMq = () => window.matchMedia('(orientation: portrait)')
const coarseMq = () => window.matchMedia('(pointer: coarse)')

/** True while the app is CSS-rotated. */
export const isRotated = () => applied

/** Size of the app's own (layout) viewport: swapped while rotated. */
export function viewportSize(): { w: number; h: number } {
  return applied ? { w: window.innerHeight, h: window.innerWidth } : { w: window.innerWidth, h: window.innerHeight }
}

/* ---------- swapping the stylesheet ---------- */
const mediaOriginal = new Map<CSSMediaRule, string>()
const styleOriginal = new Map<CSSStyleDeclaration, [string, string, string][]>()
let indexed = false

const swapMedia = (t: string) =>
  t
    .replace(/(min-|max-)?(width|height)/g, (_, pre: string | undefined, dim: string) => `${pre ?? ''}${dim === 'width' ? '@H' : '@W'}`)
    .replace(/@H/g, 'height')
    .replace(/@W/g, 'width')
    .replace(/orientation:\s*(portrait|landscape)/g, (_, o: string) => `orientation: ${o === 'portrait' ? 'landscape' : 'portrait'}`)

const UNIT = /(\d)(d|s|l)?v(h|w)\b/g
const swapUnits = (v: string) => v.replace(UNIT, (_, d: string, p: string | undefined, a: string) => `${d}${p ?? ''}v${a === 'h' ? 'w' : 'h'}`)

function walk(rules: CSSRuleList) {
  for (const r of Array.from(rules)) {
    if (r instanceof CSSMediaRule) {
      mediaOriginal.set(r, r.media.mediaText)
      walk(r.cssRules)
    } else if (r instanceof CSSStyleRule) {
      const props: [string, string, string][] = []
      for (let i = 0; i < r.style.length; i++) {
        const name = r.style.item(i)
        const value = r.style.getPropertyValue(name)
        if (UNIT.test(value)) props.push([name, value, r.style.getPropertyPriority(name)])
        UNIT.lastIndex = 0
      }
      if (props.length) styleOriginal.set(r.style, props)
      if ('cssRules' in r && (r as CSSStyleRule & { cssRules?: CSSRuleList }).cssRules) walk((r as CSSStyleRule & { cssRules: CSSRuleList }).cssRules)
    } else if ('cssRules' in r) {
      walk((r as CSSGroupingRule).cssRules)
    }
  }
}

function index() {
  if (indexed) return
  indexed = true
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules)
    } catch {
      /* cross-origin sheet (web fonts): nothing to swap */
    }
  }
}

function swapSheets(on: boolean) {
  index()
  mediaOriginal.forEach((orig, rule) => {
    rule.media.mediaText = on ? swapMedia(orig) : orig
  })
  styleOriginal.forEach((props, style) => {
    for (const [name, value, prio] of props) style.setProperty(name, on ? swapUnits(value) : value, prio)
  })
}

function sizeRoot() {
  const root = document.documentElement
  root.style.setProperty('--rot-w', `${window.innerHeight}px`)
  root.style.setProperty('--rot-h', `${window.innerWidth}px`)
}

function apply() {
  const should = wanted && !native && portraitMq().matches
  if (should === applied) {
    if (applied) sizeRoot()
    return
  }
  applied = should
  if (should) sizeRoot()
  swapSheets(should)
  document.documentElement.classList.toggle('rotated', should)
  // Layout code that measures the window (canvases, the table) re-measures on resize.
  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new Event(ROTATE_EVENT))
}

let listening = false
function listen() {
  if (listening) return
  listening = true
  portraitMq().addEventListener('change', apply)
  window.addEventListener('resize', () => applied && sizeRoot())
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && native) {
      native = false
      wanted = false
      saveWanted(false)
      apply()
      window.dispatchEvent(new Event(ROTATE_EVENT))
    }
  })
}

/** Restores the student's choice on page load. */
export function initRotate() {
  if (typeof window === 'undefined') return
  listen()
  if (wanted && coarseMq().matches) apply()
  else if (wanted) {
    wanted = false
    saveWanted(false)
  }
}

async function tryNativeLock(): Promise<boolean> {
  const el = document.documentElement
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
  if (!el.requestFullscreen || !orientation?.lock) return false
  try {
    await el.requestFullscreen({ navigationUI: 'hide' })
    await orientation.lock('landscape')
    return true
  } catch {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    return false
  }
}

export async function setLandscape(on: boolean) {
  listen()
  if (on) {
    native = await tryNativeLock()
    wanted = true
    saveWanted(!native) // a native lock ends with fullscreen, so it isn't restored on reload
  } else {
    if (native) {
      try {
        screen.orientation.unlock()
      } catch {
        /* ignore */
      }
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      native = false
    }
    wanted = false
    saveWanted(false)
  }
  apply()
  window.dispatchEvent(new Event(ROTATE_EVENT))
}

/** For the button: show it on touch devices held upright, or while landscape is forced. */
export function useLandscape() {
  const [, force] = useState(0)
  useEffect(() => {
    const on = () => force((n) => n + 1)
    window.addEventListener(ROTATE_EVENT, on)
    const pm = portraitMq()
    pm.addEventListener('change', on)
    return () => {
      window.removeEventListener(ROTATE_EVENT, on)
      pm.removeEventListener('change', on)
    }
  }, [])
  const active = applied || native
  const available = coarseMq().matches && (portraitMq().matches || active)
  return { available, active, toggle: () => void setLandscape(!active) }
}

/* ---------- pointer events inside the rotated app ---------- */

/**
 * While rotated, rewrite a pointer event's coordinates into the app's (rotated) frame, so code that
 * reads clientX/clientY/pageX/pageY — OrbitControls, our picking — works unchanged.
 * Install on an ancestor in the capture phase so it runs before the target's own listeners.
 */
export function mapPointer(e: PointerEvent) {
  if (!applied) return
  const W = window.innerWidth
  const sx = e.clientX
  const sy = e.clientY
  const def = (k: string, v: number) => Object.defineProperty(e, k, { value: v, configurable: true })
  def('clientX', sy)
  def('clientY', W - sx)
  def('pageX', sy)
  def('pageY', W - sx)
  def('movementX', e.movementY)
  def('movementY', -e.movementX)
}

/** An element's box in the app's (rotated) frame, matching mapPointer's coordinates. */
export function layoutRect(el: Element): { left: number; top: number; width: number; height: number } {
  const r = el.getBoundingClientRect()
  if (!applied) return { left: r.left, top: r.top, width: r.width, height: r.height }
  const W = window.innerWidth
  return { left: r.top, top: W - (r.left + r.width), width: r.height, height: r.width }
}
