import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { formatFormulas } from '../../../chemFormat'
import { perfFlags, QUALITY_EVENT, reportSlowDevice, type PerfFlags } from '../../../perf'

/* Shared WebGL plumbing for the lab: renderer, environment lighting, text sprites, a render loop. */

export const HAND = '"Patrick Hand", "Comic Sans MS", cursive'
export const CHALK = '#f1f5ee'
export const YELLOW = 0xf6e27a

let envTexture: THREE.Texture | null = null
let envOwner: THREE.WebGLRenderer | null = null

/** A soft studio environment (shared across canvases) for reflections and fill light. */
export function environment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (envTexture && envOwner === renderer) return envTexture
  const pmrem = new THREE.PMREMGenerator(renderer)
  envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  envOwner = renderer
  pmrem.dispose()
  return envTexture
}

export function makeRenderer(canvas: HTMLCanvasElement, flags: PerfFlags): THREE.WebGLRenderer | null {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: flags.antialias, alpha: true, powerPreference: 'high-performance' })
    r.setPixelRatio(flags.dpr)
    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.1
    r.setClearColor(0x000000, 0)
    return r
  } catch {
    return null
  }
}

/* ---------- text sprites (hand-written labels in 3-D) ---------- */
const spriteCache = new Map<string, THREE.Texture>()

export interface TextSpriteOptions {
  color?: string
  size?: number // world height
  weight?: string
  bg?: string
}

export function textTexture(text: string, color = CHALK, bg?: string): { tex: THREE.Texture; aspect: number } {
  const key = `${text}|${color}|${bg ?? ''}`
  const cached = spriteCache.get(key)
  if (cached) return { tex: cached, aspect: cached.userData.aspect as number }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const px = 96
  ctx.font = `${px}px ${HAND}`
  const label = formatFormulas(text)
  const w = Math.ceil(ctx.measureText(label).width) + 40
  const h = px * 1.5
  canvas.width = w
  canvas.height = h
  if (bg) {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(4, 4, w - 8, h - 8, 18)
    ctx.fill()
  }
  ctx.font = `${px}px ${HAND}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(label, w / 2, h / 2 + 4)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.userData.aspect = w / h
  spriteCache.set(key, tex)
  return { tex, aspect: w / h }
}

export function textSprite(text: string, { color = CHALK, size = 0.6, bg }: TextSpriteOptions = {}): THREE.Sprite {
  const { tex, aspect } = textTexture(text, color, bg)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const s = new THREE.Sprite(mat)
  s.scale.set(size * aspect, size, 1)
  s.userData.aspect = aspect
  return s
}

export function setSpriteText(s: THREE.Sprite, text: string, color = CHALK, size?: number) {
  const { tex, aspect } = textTexture(text, color)
  s.material.map = tex
  s.material.needsUpdate = true
  const h = size ?? s.scale.y
  s.scale.set(h * aspect, h, 1)
}

/** Soft round particle for flames, glows and smoke. */
let dotTex: THREE.Texture | null = null
export function dotTexture(): THREE.Texture {
  if (dotTex) return dotTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  rg.addColorStop(0, 'rgba(255,255,255,1)')
  rg.addColorStop(0.4, 'rgba(255,255,255,0.6)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 64, 64)
  dotTex = new THREE.CanvasTexture(c)
  return dotTex
}

/** Frees everything under an object. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  })
}

/* ---------- render loop hook ---------- */
export interface ThreeCtx {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  env: THREE.Texture
  /** Graphics quality for this canvas (pixel ratio, shadows, particle counts…). */
  perf: PerfFlags
}

export interface ThreeApp {
  /** Called every frame; return false to skip rendering this frame. */
  update: (dt: number, t: number) => boolean | void
  resize?: (w: number, h: number) => void
  dispose?: () => void
}

/**
 * Creates renderer + scene + camera on the canvas inside `wrapRef`, keeps them sized to the wrapper,
 * runs the loop and tears everything down on unmount. The loop pauses while the tab is hidden or the
 * canvas is scrolled out of view, runs at 30 fps on low-end devices, and if it cannot sustain ~30 fps
 * it tells perf.ts to switch the app to low quality (pixel ratio drops at once).
 */
export function useThree(wrapRef: RefObject<HTMLDivElement | null>, canvasRef: RefObject<HTMLCanvasElement | null>, build: (ctx: ThreeCtx) => ThreeApp, maxDpr = 2) {
  const buildRef = useRef(build)
  useEffect(() => {
    buildRef.current = build
  })
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const perf = perfFlags(maxDpr)
    const renderer = makeRenderer(canvas, perf)
    if (!renderer) {
      wrap.classList.add('cv--nogl')
      return
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100)
    const env = environment(renderer)
    scene.environment = env
    const ctx: ThreeCtx = { renderer, scene, camera, canvas, env, perf }
    const app = buildRef.current(ctx)

    // Pause when scrolled out of view (phones, the comparison table).
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.02 })
    io.observe(wrap)
    // Drop to low quality live when asked (by our own watchdog or the settings switch).
    const onQuality = () => {
      const f = perfFlags(maxDpr)
      perf.fps = f.fps
      perf.particles = f.particles
      perf.quality = f.quality
      renderer.setPixelRatio(f.dpr)
      fit()
    }
    window.addEventListener(QUALITY_EVENT, onQuality)

    const fit = () => {
      const r = wrap.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      app.resize?.(w, h)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)

    let raf = 0
    let last = 0
    let t = 0
    let alive = true
    let acc = 0
    // watchdog: average frame time after a warm-up, only over frames we actually rendered
    let warm = 0
    let samples = 0
    let sum = 0
    const loop = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(loop)
      if (document.hidden || !visible) {
        last = now
        return
      }
      const raw = (now - (last || now)) / 1000
      last = now
      // frame-rate cap (30 fps on low quality): keep time flowing, skip the render
      acc += raw
      const minStep = 1 / perf.fps - 0.002
      if (acc < minStep) return
      const dt = Math.min(0.05, acc)
      acc = 0
      t += dt
      const t0 = performance.now()
      if (app.update(dt, t) !== false) renderer.render(scene, camera)
      const cost = performance.now() - t0
      if (perf.quality === 'high') {
        warm += dt
        if (warm > 1.5) {
          sum += cost
          if (++samples >= 60) {
            if (sum / samples > 28) reportSlowDevice()
            samples = 0
            sum = 0
          }
        }
      }
    }
    raf = requestAnimationFrame(loop)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener(QUALITY_EVENT, onQuality)
      app.dispose?.()
      disposeTree(scene)
      renderer.dispose()
    }
  }, [wrapRef, canvasRef, maxDpr])
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
export const rnd = (a: number, b: number) => a + Math.random() * (b - a)
