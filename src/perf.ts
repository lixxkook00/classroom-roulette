/*
 * Graphics quality for the 3-D parts (and the fireworks).
 *   'high' — full pixel ratio, shadows, antialiasing, 60 fps
 *   'low'  — pixel ratio 1, no shadows, no MSAA, 30 fps, fewer particles, static thumbnails
 * Picked from the device (cores, memory, GPU name, phone) and corrected at run time: when a canvas
 * cannot keep ~30 fps the whole app drops to 'low' and remembers that on this device.
 * Teachers can force it from Lớp học → Đồ hoạ 3D; a link with ?q=low or ?q=high does the same once.
 */
export type Quality = 'low' | 'high'
export type QualitySetting = Quality | 'auto'

const SETTING_KEY = 'element-roulette:quality'
const MEASURED_KEY = 'element-roulette:quality-measured'
export const QUALITY_EVENT = 'element-roulette:quality-change'

let heuristicCache: Quality | null = null

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, v)
  } catch {
    /* ignore */
  }
}

export function qualitySetting(): QualitySetting {
  const q = new URLSearchParams(window.location.search).get('q')
  if (q === 'low' || q === 'high') return q
  const s = read(SETTING_KEY)
  return s === 'low' || s === 'high' ? s : 'auto'
}

export function setQualitySetting(v: QualitySetting) {
  write(SETTING_KEY, v === 'auto' ? null : v)
  if (v !== 'auto') write(MEASURED_KEY, null)
  window.dispatchEvent(new Event(QUALITY_EVENT))
}

/** What the hardware looks like, without running anything. */
function heuristic(): Quality {
  if (heuristicCache) return heuristicCache
  let low = false
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  // Phones are NOT low-end by default: they usually show one 3-D model at a time, and recent phone GPUs
  // handle that easily. The frame-rate watchdog still catches a phone that really struggles.
  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    gpu = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    /* ignore */
  }
  // Apple GPUs (iPhone, iPad, M-series Macs) are fast; Safari also hides core count and memory.
  const apple = /Apple/i.test(gpu) || /iPhone|iPad/.test(navigator.userAgent)
  if (!apple) {
    if ((nav.hardwareConcurrency || 8) <= 2) low = true
    if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) low = true
  }
  if (nav.connection?.saveData) low = true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) low = true
  // Known weak GPUs (old Intel HD on school laptops, entry-level Android GPUs, software rendering)
  if (/SwiftShader|llvmpipe|Mali-4|Mali-T|Mali-G[1-5]\d\b|Adreno \(TM\) [1-4]\d\d|PowerVR|Intel\(R\) HD Graphics( [2-5]\d\d\d)?$|GMA/i.test(gpu)) low = true
  heuristicCache = low ? 'low' : 'high'
  return heuristicCache
}

/** The quality to render at right now. */
export function quality(): Quality {
  const s = qualitySetting()
  if (s !== 'auto') return s
  const measured = read(MEASURED_KEY)
  if (measured) {
    const at = Number(measured.split(':')[1] || 0)
    if (Date.now() - at < 14 * 864e5) return 'low'
    write(MEASURED_KEY, null)
  }
  return heuristic()
}

/** Called by a render loop that measured a sustained low frame rate. */
export function reportSlowDevice() {
  if (quality() === 'low') return
  write(MEASURED_KEY, `low:${Date.now()}`)
  window.dispatchEvent(new Event(QUALITY_EVENT))
}

export interface PerfFlags {
  quality: Quality
  /** Pixel-ratio cap for canvases. */
  dpr: number
  shadows: boolean
  antialias: boolean
  /** Target frame rate for continuous animations. */
  fps: number
  /** Multiplier for particle counts. */
  particles: number
}

export function perfFlags(maxDpr = 2): PerfFlags {
  const q = quality()
  const low = q === 'low'
  return {
    quality: q,
    dpr: Math.min(maxDpr, low ? Math.min(1.5, window.devicePixelRatio || 1) : window.devicePixelRatio || 1),
    shadows: !low,
    antialias: !low,
    fps: low ? 30 : 60,
    particles: low ? 0.45 : 1,
  }
}
