import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Phase, Scene } from '../../data/organic'
import { prefersReducedMotion } from '../../util'
import { clamp, disposeTree, dotTexture, easeOut, lerp, rnd, textSprite, useThree, type ThreeCtx } from './three/common'

/*
 * Experiments in WebGL: glassware, liquids, a particle flame that lights the bench, instanced
 * bubbles, solids that fall and dissolve, a dropper, indicator paper, an inflating balloon —
 * all built from the lesson's Scene data. Units ≈ cm; the bench is y = 0.
 */

const RUN_S = 3.8 // must match ReactPart's RUN_MS

/* ---------- materials ---------- */
const glassMat = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
    roughness: 0.03,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.02,
    envMapIntensity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

function cssToColor(c: string): { color: THREE.Color; alpha: number } {
  const m = /rgba?\(([^)]+)\)/.exec(c)
  const col = m ? (() => {
    const v = m[1].split(',').map((x) => parseFloat(x))
    return { color: new THREE.Color(v[0] / 255, v[1] / 255, v[2] / 255), alpha: v[3] ?? 1 }
  })() : { color: new THREE.Color(c), alpha: 1 }
  col.color.multiplyScalar(0.72)
  return col
}

const liquidMat = (c: string) => {
  const { color, alpha } = cssToColor(c)
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity: clamp(alpha + 0.18, 0.4, 0.9),
    roughness: 0.2,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.25,
    depthWrite: false,
  })
}

function setLiquidColor(m: THREE.MeshPhysicalMaterial, c: string) {
  const { color, alpha } = cssToColor(c)
  m.color.copy(color)
  m.opacity = clamp(alpha + 0.18, 0.4, 0.9)
}

/* ---------- lathe helpers ---------- */
const lathe = (pts: [number, number][], segs = 56) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs)

/** Thin-walled test tube: radius 1, height 7.6, round bottom. */
function tubeGeometry() {
  const pts: [number, number][] = [[1.0, 7.6]]
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2)
    pts.push([Math.cos(a) * 1.0, 1.0 - Math.sin(a) * 1.0])
  }
  for (let i = 12; i >= 0; i--) {
    const a = (i / 12) * (Math.PI / 2)
    pts.push([Math.cos(a) * 0.9, 1.0 - Math.sin(a) * 0.9 + 0.1])
  }
  pts.push([0.9, 7.6], [1.0, 7.6])
  return lathe(pts)
}

/** Liquid filling the tube up to `level`. */
function tubeLiquidGeometry(level: number) {
  const pts: [number, number][] = []
  for (let i = 12; i >= 0; i--) {
    const a = (i / 12) * (Math.PI / 2)
    pts.push([Math.cos(a) * 0.88, 1.0 - Math.sin(a) * 0.88 + 0.1])
  }
  pts.push([0.88, level], [0, level])
  return lathe(pts.reverse())
}

function flaskGeometry() {
  return lathe([
    [0, 0],
    [2.5, 0],
    [2.5, 0.25],
    [0.62, 4.1],
    [0.62, 6.3],
    [0.78, 6.4],
    [0.78, 6.5],
    [0.52, 6.5],
    [0.52, 4.05],
    [2.35, 0.3],
    [2.35, 0.12],
    [0, 0.12],
  ])
}
function flaskLiquidGeometry(level: number) {
  const t = (level - 0.3) / (4.05 - 0.3)
  const r = lerp(2.35, 0.52, t)
  return lathe([
    [0, 0.12],
    [2.35, 0.12],
    [2.35, 0.3],
    [r, level],
    [0, level],
  ])
}

/* ---------- particle flame (instanced billboards: works where point sprites are size-capped) ---------- */
const MAX_FLAME = 320
/**
 * Premultiplied additive particles: colour AND alpha are scaled by each particle's brightness, so dim
 * particles neither darken nor turn the (transparent) canvas opaque when the browser composites it.
 */
const flameMaterial = () => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: dotTexture() } },
    vertexShader: `
      attribute vec3 aColor; attribute float aAlpha;
      varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      void main() {
        vUv = uv; vColor = aColor; vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec2 vUv; varying vec3 vColor; varying float vAlpha;
      void main() { float a = texture2D(uMap, vUv).a * vAlpha; gl_FragColor = vec4(vColor * a, a); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  m.blending = THREE.CustomBlending
  m.blendEquation = THREE.AddEquation
  m.blendSrc = THREE.OneFactor
  m.blendDst = THREE.OneFactor
  m.blendSrcAlpha = THREE.OneFactor
  m.blendDstAlpha = THREE.OneFactor
  return m
}

class FlameSystem {
  mesh: THREE.InstancedMesh
  light: THREE.PointLight
  private p: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; r: number }[] = []
  private dummy = new THREE.Object3D()
  private colors: THREE.InstancedBufferAttribute
  private alphas: THREE.InstancedBufferAttribute
  glow = 0
  private camera: THREE.Camera
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera
    const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1) as unknown as THREE.InstancedBufferGeometry)
    this.colors = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FLAME * 3), 3)
    this.alphas = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FLAME), 1)
    this.colors.setUsage(THREE.DynamicDrawUsage)
    this.alphas.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aColor', this.colors)
    geo.setAttribute('aAlpha', this.alphas)
    this.mesh = new THREE.InstancedMesh(geo, flameMaterial(), MAX_FLAME)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 10
    this.light = new THREE.PointLight(0x8fb8ff, 0, 9, 2)
    scene.add(this.mesh, this.light)
  }
  /** Emit + step. size ≈ flame height (world units). */
  update(dt: number, t: number, x: number, y: number, z: number, size: number, on: boolean, width = 0.35, reduced = false) {
    this.glow += ((on ? 1 : 0) - this.glow) * Math.min(1, dt * 4)
    if (on) {
      const n = Math.round((reduced ? 1 : 2.2) * size * width * 2.5) + 1
      for (let i = 0; i < n && this.p.length < MAX_FLAME; i++)
        this.p.push({
          x: x + rnd(-1, 1) * size * width * 0.5,
          y,
          z: z + rnd(-1, 1) * size * width * 0.25,
          vx: rnd(-1, 1) * size * 0.1,
          vy: rnd(0.9, 1.5) * size * 1.1,
          vz: rnd(-1, 1) * size * 0.1,
          life: 0,
          max: rnd(0.45, 0.85),
          r: size * rnd(0.16, 0.32),
        })
    }
    let n = 0
    const q = this.camera.quaternion
    const col = this.colors.array as Float32Array
    const alp = this.alphas.array as Float32Array
    for (const q0 of this.p) {
      q0.life += dt
      if (q0.life >= q0.max) continue
      q0.y += q0.vy * dt
      q0.x += q0.vx * dt + Math.sin(t * 14 + q0.r * 40) * size * 0.01
      q0.z += q0.vz * dt
      q0.vx *= 0.9
      q0.vz *= 0.9
      const u = q0.life / q0.max
      const sz = q0.r * (1 - u * 0.5) * 2
      this.dummy.position.set(q0.x, q0.y, q0.z)
      this.dummy.quaternion.copy(q)
      this.dummy.scale.set(sz, sz, 1)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(n, this.dummy.matrix)
      // ethanol: pale blue core, faint warm tip
      if (u < 0.55) {
        col[n * 3] = 0.3
        col[n * 3 + 1] = 0.55
        col[n * 3 + 2] = 1.0
      } else {
        col[n * 3] = 1.0
        col[n * 3 + 1] = 0.8
        col[n * 3 + 2] = 0.5
      }
      alp[n] = (1 - u) * (u < 0.55 ? 0.42 : 0.1) * this.glow
      n++
    }
    this.p = this.p.filter((q1) => q1.life < q1.max)
    this.mesh.count = n
    this.mesh.instanceMatrix.needsUpdate = true
    this.colors.needsUpdate = true
    this.alphas.needsUpdate = true
    const flick = 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7.3)
    this.light.position.set(x, y + size * 0.45, z)
    this.light.intensity = this.glow * size * 4.5 * flick
  }
}

/* ---------- bubbles ---------- */
class Bubbles {
  mesh: THREE.InstancedMesh
  private items: { x: number; y: number; z: number; r: number; vy: number; ph: number; surface: number }[] = []
  private dummy = new THREE.Object3D()
  acc = 0
  constructor(scene: THREE.Scene, max = 140) {
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.05, metalness: 0, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false })
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat, max)
    this.mesh.count = 0
    this.mesh.renderOrder = 1
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }
  spawn(x: number, y: number, z: number, surface: number, rMin = 0.06, rMax = 0.17) {
    if (this.items.length >= this.mesh.instanceMatrix.count) return
    this.items.push({ x, y, z, r: rnd(rMin, rMax), vy: 0.6, ph: rnd(0, 6), surface })
  }
  update(dt: number) {
    for (const b of this.items) {
      b.ph += dt * 6
      b.vy = Math.min(2.6, b.vy + dt * 1.6)
      b.y += b.vy * dt
      b.x += Math.sin(b.ph) * 0.004
      if (b.y + b.r >= b.surface) b.r = -1
    }
    this.items = this.items.filter((b) => b.r > 0)
    this.items.forEach((b, i) => {
      this.dummy.position.set(b.x, b.y, b.z)
      this.dummy.scale.setScalar(b.r)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    })
    this.mesh.count = this.items.length
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

/* ---------- surface ripples ---------- */
class Ripples {
  private pool: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = []
  private live: { m: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; life: number }[] = []
  private scene: THREE.Scene
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  add(x: number, y: number, z: number) {
    let m = this.pool.pop()
    if (!m) {
      m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }))
      m.rotation.x = -Math.PI / 2
      m.renderOrder = 4
      this.scene.add(m)
    }
    m.position.set(x, y + 0.005, z)
    m.visible = true
    this.live.push({ m, life: 0 })
  }
  update(dt: number) {
    for (const r of this.live) {
      r.life += dt
      const u = r.life / 0.6
      r.m.scale.setScalar(0.1 + u * 0.7)
      r.m.material.opacity = 0.5 * (1 - u)
      if (u >= 1) {
        r.m.visible = false
        this.pool.push(r.m)
      }
    }
    this.live = this.live.filter((r) => r.life < 0.6)
  }
}

/* ====================================================================
   Scene builders
   ==================================================================== */
interface Rig {
  group: THREE.Group
  flame: FlameSystem
  bubbles: Bubbles
  ripples: Ripples
  reduced: boolean
  camTarget: THREE.Vector3
  /** Radius of what must stay in view around the target. */
  radius: number
  update: (dt: number, t: number, el: number, phase: Phase, poppedAge: number | null) => void
}

function commonLighting(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xf1f5ee, 0x1b2f26, 0.35))
  const key = new THREE.DirectionalLight(0xfff3e0, 1.5)
  key.position.set(5, 10, 6)
  key.castShadow = true
  key.shadow.mapSize.set(1536, 1536)
  key.shadow.camera.left = key.shadow.camera.bottom = -14
  key.shadow.camera.right = key.shadow.camera.top = 14
  key.shadow.camera.near = 1
  key.shadow.camera.far = 30
  key.shadow.bias = -0.0006
  key.shadow.radius = 4
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbfe3ff, 0.45)
  fill.position.set(-6, 4, -3)
  scene.add(fill)
  // bench: catches shadows; a faint disc grounds the apparatus on the chalkboard
  const bench = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.ShadowMaterial({ opacity: 0.3 }))
  bench.rotation.x = -Math.PI / 2
  bench.receiveShadow = true
  scene.add(bench)
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  rg.addColorStop(0, 'rgba(70, 110, 90, 0.55)')
  rg.addColorStop(1, 'rgba(70, 110, 90, 0)')
  g.fillStyle = rg
  g.fillRect(0, 0, 128, 128)
  const discTex = new THREE.CanvasTexture(c)
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false }))
  disc.rotation.x = -Math.PI / 2
  disc.position.y = -0.01
  scene.add(disc)
}

function spiritLamp(k = 1) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    lathe([
      [0, 0],
      [2.3, 0],
      [2.4, 0.3],
      [2.3, 1.2],
      [1.5, 2.0],
      [0.5, 2.5],
      [0.5, 2.9],
      [0.38, 2.9],
      [0.38, 2.5],
      [1.35, 1.95],
      [2.15, 1.2],
      [2.2, 0.35],
      [0, 0.12],
    ]),
    glassMat(),
  )
  body.renderOrder = 3
  const liquid = new THREE.Mesh(
    lathe([
      [0, 0.12],
      [2.18, 0.12],
      [2.2, 0.35],
      [2.17, 1.0],
      [0, 1.0],
    ]),
    liquidMat('rgba(127, 200, 232, 0.45)'),
  )
  liquid.renderOrder = 2
  liquid.castShadow = true
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.5, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x9aa39d, metalness: 0.8, roughness: 0.35 }))
  collar.position.y = 3.1
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 1 }))
  wick.position.y = 3.6
  g.add(body, liquid, collar, wick)
  g.scale.setScalar(k)
  g.userData.wickTop = 3.95 * k
  return g
}

function buildTube(ctx: ThreeCtx, scene: Extract<Scene, { kind: 'tube' }>, reduced: boolean): Rig {
  const { scene: S } = ctx
  const group = new THREE.Group()
  S.add(group)
  const { liquid: lq, solid, drops, paper } = scene
  const lift = scene.heat ? 2.6 : 0
  const LEVEL = 3.6

  // stand + clamp when the tube is heated
  if (scene.heat) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x8c949a, metalness: 0.9, roughness: 0.35 })
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 2.2), steel)
    base.position.set(-3.2, 0.125, 0)
    base.castShadow = true
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 11, 16), steel)
    rod.position.set(-3.2, 5.5, 0)
    rod.castShadow = true
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 12), steel)
    arm.rotation.z = Math.PI / 2
    arm.position.set(-1.6, lift + 6.6, 0)
    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.08, 10, 40), steel)
    clampRing.rotation.x = Math.PI / 2
    clampRing.position.set(0, lift + 6.6, 0)
    group.add(base, rod, arm, clampRing)
  }

  const tube = new THREE.Group()
  tube.position.y = lift
  group.add(tube)
  const glass = new THREE.Mesh(tubeGeometry(), glassMat())
  glass.renderOrder = 3
  glass.castShadow = true
  tube.add(glass)
  const liquidM = liquidMat(lq.color)
  const liquid = new THREE.Mesh(tubeLiquidGeometry(LEVEL), liquidM)
  liquid.renderOrder = 2
  liquid.castShadow = true
  tube.add(liquid)
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.88, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false }))
  surface.rotation.x = -Math.PI / 2
  surface.position.y = LEVEL + 0.003
  surface.renderOrder = 2
  tube.add(surface)

  const flame = new FlameSystem(S, ctx.camera)
  const bubbles = new Bubbles(S)
  const ripples = new Ripples(S)

  // labels
  const label = textSprite(lq.label.split('\n')[0], { size: 0.62 })
  label.position.set(2.6, lift + 2.6, 0.4)
  group.add(label)
  if (lq.label.includes('\n')) {
    const l2 = textSprite(lq.label.split('\n')[1], { size: 0.62 })
    l2.position.set(2.6, lift + 1.9, 0.4)
    group.add(l2)
  }

  // solid
  let solidMesh: THREE.Object3D | null = null
  let powder: THREE.InstancedMesh | null = null
  const powderOrder: number[] = []
  let solidLabel: THREE.Sprite | null = null
  if (solid) {
    const col = new THREE.Color(solid.color)
    if (solid.shape === 'powder') {
      powder = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }), 60)
      const d = new THREE.Object3D()
      for (let i = 0; i < 60; i++) {
        const a = rnd(0, 6.28)
        const rr = Math.sqrt(Math.random()) * 0.62
        d.position.set(Math.cos(a) * rr, rnd(0.1, 0.35), Math.sin(a) * rr)
        d.updateMatrix()
        powder.setMatrixAt(i, d.matrix)
        powderOrder.push(i)
      }
      powderOrder.sort(() => Math.random() - 0.5)
      powder.castShadow = true
      solidMesh = powder
    } else if (solid.shape === 'pellet') {
      solidMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.32, 6, 18), new THREE.MeshStandardMaterial({ color: col, metalness: 0.92, roughness: 0.32 }))
      solidMesh.rotation.z = Math.PI / 2
    } else if (solid.shape === 'ribbon') {
      solidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.035), new THREE.MeshStandardMaterial({ color: col, metalness: 0.95, roughness: 0.28 }))
      solidMesh.rotation.set(0.15, 0.4, 0.1)
    } else {
      const geo = new THREE.DodecahedronGeometry(0.36, 1)
      const p = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rnd(0.85, 1.15), p.getY(i) * rnd(0.85, 1.15), p.getZ(i) * rnd(0.85, 1.15))
      geo.computeVertexNormals()
      solidMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.92 }))
    }
    solidMesh.castShadow = true
    solidMesh.position.set(0, 8.8, 0)
    tube.add(solidMesh)
    solidLabel = textSprite(solid.label, { color: '#c9d1cb', size: 0.62 })
    solidLabel.position.set(-1.7, lift + 8.9, 0.5)
    group.add(solidLabel)
  }

  // dropper
  const dropMeshes: THREE.Mesh[] = []
  let dropLabel: THREE.Sprite | null = null
  if (drops) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshStandardMaterial({ color: 0xd9433a, roughness: 0.55 }))
    bulb.scale.set(1, 1.25, 1)
    bulb.position.set(0, lift + 11.3, 0)
    bulb.castShadow = true
    const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 2.4, 20, 1, true), glassMat())
    pip.position.set(0, lift + 9.6, 0)
    pip.renderOrder = 3
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 2.2, 12), liquidMat(drops.color))
    inner.position.set(0, lift + 9.65, 0)
    inner.renderOrder = 2
    group.add(bulb, pip, inner)
    dropLabel = textSprite(drops.label, { size: 0.62 })
    dropLabel.position.set(2.2, lift + 10.6, 0.4)
    group.add(dropLabel)
  }
  const dropGeo = new THREE.SphereGeometry(0.11, 14, 10)
  const dropMat = drops ? liquidMat(drops.color) : null
  const dropState: { y: number; vy: number; m: THREE.Mesh }[] = []

  // indicator paper (canvas texture, redrawn as the colour front moves)
  let paperMesh: THREE.Mesh | null = null
  let paperCanvas: HTMLCanvasElement | null = null
  let paperTex: THREE.CanvasTexture | null = null
  let lastFront = -1
  let paperLabel: THREE.Sprite | null = null
  const PAPER_H = 3.4
  if (paper) {
    paperCanvas = document.createElement('canvas')
    paperCanvas.width = 32
    paperCanvas.height = 256
    paperTex = new THREE.CanvasTexture(paperCanvas)
    paperTex.colorSpace = THREE.SRGBColorSpace
    paperMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, PAPER_H), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 1, side: THREE.DoubleSide }))
    paperMesh.position.set(0, lift + 7.6 + PAPER_H / 2 - 0.3, 0.25)
    paperMesh.castShadow = true
    group.add(paperMesh)
    paperLabel = textSprite(paper.label, { size: 0.62 })
    paperLabel.position.set(-2.4, lift + 8.6, 0.4)
    group.add(paperLabel)
  }
  const drawPaper = (front: number) => {
    if (!paperCanvas || !paperTex || !paper) return
    const g = paperCanvas.getContext('2d')!
    g.fillStyle = paper.from
    g.fillRect(0, 0, 32, 256)
    if (front > 0) {
      const fy = 256 - front * (256 / PAPER_H)
      const grad = g.createLinearGradient(0, fy - 14, 0, fy + 6)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, paper.to)
      g.fillStyle = grad
      g.fillRect(0, fy - 14, 32, 256)
      g.fillStyle = paper.to
      g.fillRect(0, fy + 6, 32, 256)
    }
    paperTex.needsUpdate = true
  }
  drawPaper(0)

  // heating lamp
  let lamp: THREE.Group | null = null
  if (scene.heat) {
    lamp = spiritLamp(0.42)
    group.add(lamp)
  }

  // splint + burst
  let splint: THREE.Group | null = null
  let burstRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null = null
  let flash: THREE.PointLight | null = null
  let splintFlame: FlameSystem | null = null
  if (scene.splint) {
    splint = new THREE.Group()
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.4), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 }))
    stick.position.z = 1.7
    stick.castShadow = true
    splint.add(stick)
    splint.visible = false
    group.add(splint)
    splintFlame = new FlameSystem(S, ctx.camera)
    burstRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe68c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))
    burstRing.position.set(0, lift + 8.0, 0)
    burstRing.renderOrder = 11
    group.add(burstRing)
    flash = new THREE.PointLight(0xffe0a0, 0, 10, 2)
    flash.position.set(0, lift + 8.2, 0.5)
    group.add(flash)
  }

  let dropTimer = 0
  const tubeSurfaceY = lift + LEVEL

  const update: Rig['update'] = (dt, t, el, phase, poppedAge) => {
    const running = phase === 'running'
    const started = phase !== 'idle'
    const dissolveU = solid?.dissolves && started ? clamp((el - 0.7) / 3.1) : 0
    if (lq.after && started) {
      // colour drift: lerp between the two css colours
      const a = cssToColor(lq.color)
      const b = cssToColor(lq.after)
      const u = easeOut(clamp((el - 0.4) / 3.2))
      liquidM.color.copy(a.color).lerp(b.color, u)
      liquidM.opacity = clamp(lerp(a.alpha, b.alpha, u) + 0.18, 0.4, 0.9)
    } else setLiquidColor(liquidM, lq.color)
    liquid.scale.y = 1 + (running ? Math.sin(t * 2.5) * 0.004 : 0)

    // solid falls, lands, dissolves
    let sx = 0
    let sy = 8.8
    if (solidMesh) {
      const fallU = started ? clamp(el / 0.7) : 0
      const rest = solid!.shape === 'powder' ? 0.0 : solid!.shape === 'ribbon' ? 0.95 : 0.42
      sy = lerp(8.8, rest, fallU * fallU)
      if (started && el > 0.7) sy += Math.sin((el - 0.7) * 11) * 0.12 * Math.exp(-(el - 0.7) * 3.5)
      solidMesh.position.y = sy
      if (solid!.shape === 'pellet' && started) solidMesh.rotation.y += dt * 0.8
      if (powder) {
        const d = new THREE.Object3D()
        const gone = Math.floor(dissolveU * 60)
        for (let k = 0; k < 60; k++) {
          const i = powderOrder[k]
          powder.getMatrixAt(i, d.matrix)
          d.matrix.decompose(d.position, d.quaternion, d.scale)
          d.scale.setScalar(k < gone ? 0.001 : 1 - dissolveU * 0.4)
          d.updateMatrix()
          powder.setMatrixAt(i, d.matrix)
        }
        powder.instanceMatrix.needsUpdate = true
      } else {
        const sc = Math.max(0.001, 1 - dissolveU)
        solidMesh.scale.setScalar(sc)
        solidMesh.visible = sc > 0.01
      }
      if (solidLabel) solidLabel.material.opacity = started ? 0.4 : 1
    }
    // bubbles
    if (scene.bubbles && started) {
      const rate = running ? (reduced ? 5 : 11) * (solid?.dissolves ? 1 - dissolveU * 0.7 : 1) : 1.1
      bubbles.acc += dt * rate
      while (bubbles.acc > 1) {
        bubbles.acc -= 1
        const a = rnd(0, 6.28)
        const rr = rnd(0, 0.5)
        bubbles.spawn(sx + Math.cos(a) * rr, lift + (solidMesh ? Math.min(sy, LEVEL - 0.3) : 0.6) + rnd(-0.1, 0.1), Math.sin(a) * rr, tubeSurfaceY)
      }
    }
    if (scene.heat && running && Math.random() < dt * 5) bubbles.spawn(rnd(-0.6, 0.6), lift + 0.4, rnd(-0.6, 0.6), tubeSurfaceY, 0.03, 0.07)
    bubbles.update(dt)
    ripples.update(dt)

    // drops
    if (drops && dropMat) {
      if (running) {
        dropTimer += dt
        if (dropTimer > 0.45) {
          dropTimer = 0
          const m = new THREE.Mesh(dropGeo, dropMat)
          m.renderOrder = 2
          group.add(m)
          dropMeshes.push(m)
          dropState.push({ y: lift + 8.3, vy: 1, m })
        }
      }
      for (const d of dropState) {
        d.vy += 22 * dt
        d.y -= d.vy * dt
        d.m.position.set(0, d.y, 0)
        d.m.scale.set(0.9, 1.2, 0.9)
        if (d.y <= tubeSurfaceY + 0.1) {
          ripples.add(0, tubeSurfaceY, 0)
          group.remove(d.m)
          d.y = -999
        }
      }
      for (let i = dropState.length - 1; i >= 0; i--) if (dropState[i].y < 0) dropState.splice(i, 1)
    }

    // paper
    if (paper && paperMesh) {
      const dip = started ? easeOut(clamp(el / 0.8)) : 0
      const liftU = phase === 'done' ? easeOut(clamp((el - RUN_S) / 0.8)) : 0
      const baseY = lift + 7.6 + PAPER_H / 2 - 0.3
      paperMesh.position.y = baseY - lerp(0, 5.0, dip) + lerp(0, 2.2, liftU)
      const bottom = paperMesh.position.y - PAPER_H / 2
      const immersed = Math.max(0, tubeSurfaceY - bottom)
      const front = started ? clamp((el - 0.9) / 2.4) * (immersed + 0.5) : 0
      if (Math.abs(front - lastFront) > 0.01) {
        lastFront = front
        drawPaper(front)
      }
    }

    // flames
    const wickY = lamp ? (lamp.userData.wickTop as number) : 0
    flame.update(dt, t, 0, wickY, 0, 1.7, !!scene.heat && running, 0.35, reduced)

    // splint test
    if (splint && splintFlame && burstRing && flash) {
      if (poppedAge !== null) {
        splint.visible = true
        const inU = easeOut(clamp(poppedAge / 0.35))
        splint.position.set(0.3 + (1 - inU) * 4, lift + 8.0 + (1 - inU) * 1.6, 0.5)
        splint.lookAt(splint.position.x + 1, splint.position.y + 0.55, splint.position.z + 0.3)
        splintFlame.update(dt, t, splint.position.x, splint.position.y + 0.05, splint.position.z, 0.8, true, 0.35, reduced)
        const age = poppedAge - 0.3
        if (age > 0 && age < 0.7) {
          const u = age / 0.7
          burstRing.scale.setScalar(0.3 + u * 2.6)
          burstRing.material.opacity = 1 - u
          burstRing.quaternion.copy(ctx.camera.quaternion)
          flash.intensity = (1 - u) * 60
        } else {
          burstRing.material.opacity = 0
          flash.intensity = 0
        }
      } else {
        splint.visible = false
        splintFlame.update(dt, t, 0, -5, 0, 0.7, false)
        burstRing.material.opacity = 0
        flash.intensity = 0
      }
    }
  }

  return {
    group,
    flame,
    bubbles,
    ripples,
    reduced,
    camTarget: new THREE.Vector3(0, lift + (paper || drops ? 5.4 : 4.6), 0),
    radius: lift ? 7.4 : paper || drops ? 6.6 : 5.9,
    update,
  }
}

function buildBurn(ctx: ThreeCtx, scene: Extract<Scene, { kind: 'burn' }>, reduced: boolean): Rig {
  const { scene: S } = ctx
  const group = new THREE.Group()
  S.add(group)
  const flame = new FlameSystem(S, ctx.camera)
  const bubbles = new Bubbles(S, 4)
  const ripples = new Ripples(S)
  let flameY = 0
  let width = 0.35
  let size = 2.4
  let splint: THREE.Group | null = null
  let splintFlame: FlameSystem | null = null
  if (scene.vessel === 'lamp') {
    const lamp = spiritLamp(1)
    group.add(lamp)
    flameY = lamp.userData.wickTop as number
    const lbl = textSprite(scene.fuel, { size: 0.62 })
    lbl.position.set(0, 0.6, 2.3)
    group.add(lbl)
  } else {
    const dish = new THREE.Mesh(
      lathe([
        [0, 0.6],
        [1.3, 0.6],
        [2.9, 1.7],
        [3.1, 1.95],
        [3.2, 2.05],
        [3.0, 2.05],
        [2.75, 1.78],
        [1.2, 0.82],
        [0, 0.82],
      ]),
      new THREE.MeshPhysicalMaterial({ color: 0xf6f3ec, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 }),
    )
    dish.castShadow = true
    dish.receiveShadow = true
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.6, 48), new THREE.MeshPhysicalMaterial({ color: 0xe9e4d8, roughness: 0.3, clearcoat: 0.8 }))
    foot.position.y = 0.3
    foot.castShadow = true
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), liquidMat('rgba(127, 200, 232, 0.5)'))
    pool.rotation.x = -Math.PI / 2
    pool.position.y = 1.08
    pool.renderOrder = 2
    group.add(dish, foot, pool)
    const lbl = textSprite(scene.fuel, { color: '#5a6a62', size: 0.6 })
    lbl.position.set(0, 1.5, 2.2)
    group.add(lbl)
    flameY = 1.5
    width = 1.3
    size = 3.0
    // splint waiting before it is lit
    splint = new THREE.Group()
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 4.2), new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 }))
    stick.position.z = 2.1
    stick.castShadow = true
    splint.add(stick)
    group.add(splint)
    splintFlame = new FlameSystem(S, ctx.camera)
  }
  // product labels rising from the flame
  const labels = [...scene.products, ...scene.products, scene.products[scene.products.length - 1]].map((s, i) => {
    const sp = textSprite(s, { size: 0.55 })
    sp.position.set(-1.4 + i * 0.7, flameY + 3, 0.5)
    sp.visible = false
    group.add(sp)
    return sp
  })

  const update: Rig['update'] = (dt, t, el, phase) => {
    const lit = phase !== 'idle'
    flame.update(dt, t, 0, flameY, 0, size, lit, width, reduced)
    if (splint && splintFlame) {
      splint.visible = !lit
      if (!lit) {
        const nx = Math.sin(t * 2.2) * 0.15
        splint.position.set(1.3 + nx, 2.0, 1.1)
        splint.lookAt(splint.position.x + 1, splint.position.y + 0.7, splint.position.z + 0.5)
        splintFlame.update(dt, t, splint.position.x, splint.position.y + 0.05, splint.position.z, 0.8, true, 0.35, reduced)
      } else splintFlame.update(dt, t, 0, -5, 0, 0.7, false)
    }
    labels.forEach((sp, i) => {
      sp.visible = lit
      if (!lit) return
      const u = ((el + i * 0.6) % 3) / 3
      sp.material.opacity = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8
      sp.position.y = flameY + 2.2 + u * 4.2
    })
  }
  return {
    group,
    flame,
    bubbles,
    ripples,
    reduced,
    camTarget: new THREE.Vector3(0, scene.vessel === 'lamp' ? 3.6 : 2.6, 0),
    radius: scene.vessel === 'lamp' ? 5.4 : 4.8,
    update,
  }
}

function buildFerment(ctx: ThreeCtx, scene: Extract<Scene, { kind: 'ferment' }>, reduced: boolean): Rig {
  const { scene: S } = ctx
  const group = new THREE.Group()
  S.add(group)
  const LEVEL = 2.1
  const glass = new THREE.Mesh(flaskGeometry(), glassMat())
  glass.renderOrder = 3
  glass.castShadow = true
  const liquidM = liquidMat('rgba(127, 200, 232, 0.35)')
  const liquid = new THREE.Mesh(flaskLiquidGeometry(LEVEL), liquidM)
  liquid.renderOrder = 2
  liquid.castShadow = true
  group.add(glass, liquid)
  const lbl = textSprite(scene.sugar, { size: 0.62 })
  lbl.position.set(3.4, 1.8, 0.6)
  group.add(lbl)

  const flame = new FlameSystem(S, ctx.camera)
  const bubbles = new Bubbles(S, 160)
  const ripples = new Ripples(S)

  // yeast grains
  const yeast = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe9d8a6, roughness: 0.9 }), 30)
  yeast.count = 0
  yeast.renderOrder = 1
  group.add(yeast)
  const grains = Array.from({ length: 30 }, () => ({ x: rnd(-1.4, 1.4), y: rnd(0.3, LEVEL - 0.2), z: rnd(-1.4, 1.4), vx: 0, vy: 0, vz: 0 }))
  // foam
  const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, roughness: 0.1, clearcoat: 1 }), 60)
  foam.count = 0
  foam.renderOrder = 2
  group.add(foam)
  const foamPts: { x: number; z: number; r: number }[] = []
  const rAt = (y: number) => lerp(2.35, 0.52, (y - 0.3) / (4.05 - 0.3))

  // balloon
  const balloonG = new THREE.Group()
  balloonG.position.set(0, 6.5, 0)
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xff8f7a, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.15, transparent: true, opacity: 0.94, sheen: 0.4, sheenColor: new THREE.Color(0xffd0c4) }))
  balloon.castShadow = true
  balloonG.add(balloon)
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 10, 32), new THREE.MeshStandardMaterial({ color: 0xff8f7a, roughness: 0.6 }))
  tie.rotation.x = Math.PI / 2
  tie.position.y = 6.42
  const gasLbl = textSprite(scene.gas, { color: '#22392f', size: 0.7 })
  gasLbl.material.opacity = 0
  gasLbl.material.depthTest = false
  gasLbl.renderOrder = 12
  group.add(balloonG, tie, gasLbl)

  const d = new THREE.Object3D()
  const update: Rig['update'] = (dt, t, el, phase) => {
    const running = phase === 'running'
    const started = phase !== 'idle'
    const a = cssToColor('rgba(127, 200, 232, 0.35)')
    const b = cssToColor('rgba(233, 216, 166, 0.45)')
    const u = clamp(el / 2)
    liquidM.color.copy(a.color).lerp(b.color, u)
    liquidM.opacity = clamp(lerp(a.alpha, b.alpha, u) + 0.18, 0.4, 0.9)
    liquid.scale.y = 1 + (running ? Math.sin(t * 3) * 0.004 : 0)

    if (started) {
      grains.forEach((g, i) => {
        g.vx += rnd(-1, 1) * 1.2 * dt
        g.vy += rnd(-1, 1) * 1.2 * dt + (running ? -0.15 * dt : 0)
        g.vz += rnd(-1, 1) * 1.2 * dt
        g.vx *= 0.96
        g.vy *= 0.96
        g.vz *= 0.96
        g.x += g.vx * dt
        g.y = clamp(g.y + g.vy * dt, 0.25, LEVEL - 0.15)
        g.z += g.vz * dt
        const lim = rAt(g.y) - 0.15
        const rr = Math.hypot(g.x, g.z)
        if (rr > lim) {
          g.x *= lim / rr
          g.z *= lim / rr
        }
        d.position.set(g.x, g.y, g.z)
        d.scale.setScalar(1)
        d.updateMatrix()
        yeast.setMatrixAt(i, d.matrix)
      })
      yeast.count = 30
      yeast.instanceMatrix.needsUpdate = true
      bubbles.acc += dt * (running ? (reduced ? 5 : 12) : 1.4)
      while (bubbles.acc > 1) {
        bubbles.acc -= 1
        const ang = rnd(0, 6.28)
        const rr = Math.sqrt(Math.random()) * 2.0
        bubbles.spawn(Math.cos(ang) * rr, 0.3, Math.sin(ang) * rr, LEVEL)
      }
      if (running && foamPts.length < 60 && Math.random() < dt * 9) {
        const ang = rnd(0, 6.28)
        const rr = Math.sqrt(Math.random()) * (rAt(LEVEL) - 0.15)
        foamPts.push({ x: Math.cos(ang) * rr, z: Math.sin(ang) * rr, r: rnd(0.6, 1.3) })
      }
      foamPts.forEach((f, i) => {
        d.position.set(f.x, LEVEL + 0.03 + Math.sin(t * 2 + f.x) * 0.01, f.z)
        d.scale.setScalar(f.r)
        d.updateMatrix()
        foam.setMatrixAt(i, d.matrix)
      })
      foam.count = foamPts.length
      foam.instanceMatrix.needsUpdate = true
    }
    bubbles.update(dt)
    ripples.update(dt)

    const k = started ? 0.22 + 0.78 * easeOut(clamp(el / RUN_S)) : 0.22
    const sx = 1.55 * k
    const sy = 1.9 * k
    balloon.scale.set(sx, sy, sx)
    balloon.position.y = sy * 0.92
    balloonG.rotation.z = phase === 'done' ? Math.sin(t * 1.6) * 0.04 : 0
    gasLbl.position.set(0, 6.5 + sy * 0.95, 0)
    gasLbl.material.opacity = clamp((k - 0.7) / 0.3)
    flame.update(dt, t, 0, -5, 0, 1, false)
  }
  return {
    group,
    flame,
    bubbles,
    ripples,
    reduced,
    camTarget: new THREE.Vector3(0, 4.6, 0),
    radius: 6.4,
    update,
  }
}

/* ====================================================================
   Component
   ==================================================================== */
export function SceneCanvas({ scene, phase, popped }: { scene: Scene; phase: Phase; popped: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ scene, phase, popped })
  useEffect(() => {
    props.current = { scene, phase, popped }
  })

  useThree(
    wrapRef,
    cvsRef,
    (ctx) => {
      const { renderer, scene: S, camera, canvas, perf } = ctx
      // "reduced" also covers low-end devices: fewer particles and bubbles
      const reduced = prefersReducedMotion() || perf.quality === 'low'
      renderer.shadowMap.enabled = perf.shadows
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      commonLighting(S)
      const sc = props.current.scene
      const rig = sc.kind === 'burn' ? buildBurn(ctx, sc, reduced) : sc.kind === 'ferment' ? buildFerment(ctx, sc, reduced) : buildTube(ctx, sc, reduced)

      camera.fov = 30
      camera.updateProjectionMatrix()
      // keep the whole apparatus in view whatever the canvas shape
      const dir = new THREE.Vector3(0.12, 0.3, 1).normalize()
      const fitCamera = () => {
        const vFov = THREE.MathUtils.degToRad(camera.fov)
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
        const dist = (rig.radius / Math.tan(Math.min(vFov, hFov) / 2)) * 1.02
        const cur = camera.position.clone().sub(rig.camTarget)
        const d = cur.lengthSq() > 0 ? cur.normalize() : dir
        camera.position.copy(rig.camTarget).addScaledVector(d, dist)
      }
      camera.position.copy(rig.camTarget).addScaledVector(dir, 10)
      fitCamera()
      const controls = new OrbitControls(camera, canvas)
      controls.target.copy(rig.camTarget)
      controls.enablePan = false
      controls.enableZoom = false
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.5
      controls.minPolarAngle = 1.0
      controls.maxPolarAngle = 1.5
      controls.minAzimuthAngle = -0.7
      controls.maxAzimuthAngle = 0.7
      controls.update()

      // phase timing lives here so a re-render never resets it
      let phase: Phase = 'idle'
      let runAt: number | null = null
      let poppedAt: number | null = null
      let now = 0

      return {
        resize: () => fitCamera(),
        update: (dt, t) => {
          now = t
          const p = props.current
          if (p.phase !== phase) {
            if (p.phase === 'idle') {
              runAt = null
              poppedAt = null
            } else if (p.phase === 'running' && runAt === null) runAt = now
            phase = p.phase
          }
          if (p.popped && poppedAt === null) poppedAt = now
          if (!p.popped) poppedAt = null
          const el = runAt === null ? 0 : now - runAt
          rig.update(dt, t, el, phase, poppedAt === null ? null : now - poppedAt)
          controls.update()
          return true
        },
        dispose: () => {
          controls.dispose()
          disposeTree(rig.group)
        },
      }
    },
    1.5,
  )

  return (
    <div ref={wrapRef} className="cv cv--scene" aria-hidden="true">
      <canvas ref={cvsRef} />
    </div>
  )
}
