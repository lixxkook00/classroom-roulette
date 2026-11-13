import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { neutronCount, shellCounts } from '../../data/chem'
import { ELEMENTS, type Category } from '../../data/elements'
import { lookOf, type Look } from '../../data/looks'
import { prefersReducedMotion } from '../../util'
import { disposeTree, dotTexture, rnd, textSprite, useThree, type ThreeCtx } from '../organic/three/common'

/*
 * The element card's 3-D stage (WebGL, loaded on demand):
 *   atom — nucleus of protons + neutrons with electrons orbiting on tilted shells
 *   real — what the element looks like: a lump of metal, crystals, powder, a glowing gas tube…
 */

export type StageView = 'atom' | 'real'

/** Same colours as the CSS element groups. */
const CAT_HEX: Record<Category, number> = {
  alkali: 0xff9e8a,
  'alkaline-earth': 0xffc97a,
  transition: 0xa9b8ff,
  'post-transition': 0x8fe3c0,
  metalloid: 0xd4ee8a,
  nonmetal: 0xf1f5ee,
  halogen: 0x7fe0e8,
  'noble-gas': 0xd3b3ff,
  lanthanide: 0xffb3d9,
  actinide: 0xf7a8c4,
}

interface Props {
  z: number
  view: StageView
  shellLabels: string[] // K L M …
}

interface Rig {
  group: THREE.Group
  radius: number
  target: THREE.Vector3
  elevation: number
  update: (dt: number, t: number) => void
}

const lathe = (pts: [number, number][], segs = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs)

const glassMat = () =>
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.03, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.02, envMapIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide })

/** Smooth lumpiness for rocks and nuggets. */
function roughen(geo: THREE.BufferGeometry, amp: number, freq: number, seed = 0) {
  const p = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n =
      Math.sin(v.x * freq + seed) * Math.cos(v.y * freq * 1.3 + seed * 2) +
      0.5 * Math.sin(v.y * freq * 2.1 + v.z * freq * 1.7 + seed) +
      0.25 * Math.cos((v.x + v.z) * freq * 3.3 + seed * 3)
    v.multiplyScalar(1 + n * amp)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

/* ====================================================================
   Atom
   ==================================================================== */
function buildAtom(ctx: ThreeCtx, z: number, shellLabels: string[], reduced: boolean, still: boolean): Rig {
  const { scene } = ctx
  const el = ELEMENTS[z - 1]
  const color = CAT_HEX[el.category]
  const group = new THREE.Group()
  scene.add(group)

  scene.add(new THREE.HemisphereLight(0xf1f5ee, 0x22392f, 0.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.8)
  key.position.set(4, 6, 6)
  scene.add(key)

  // ---- nucleus: protons + neutrons packed in a ball
  const protons = z
  const neutrons = neutronCount(el)
  const N = protons + neutrons
  const rn = 0.22
  const R = rn * Math.cbrt(N) * 1.12
  const nucleus = new THREE.Group()
  group.add(nucleus)
  const sphereGeo = new THREE.SphereGeometry(rn, reduced ? 10 : 20, reduced ? 8 : 14)
  const pMat = new THREE.MeshStandardMaterial({ color: 0xff8a74, roughness: 0.45, metalness: 0.05 })
  const nMat = new THREE.MeshStandardMaterial({ color: 0xc8d2db, roughness: 0.5, metalness: 0.05 })
  const pMesh = new THREE.InstancedMesh(sphereGeo, pMat, protons)
  const nMesh = new THREE.InstancedMesh(sphereGeo, nMat, neutrons)
  const d = new THREE.Object3D()
  // golden-spiral packing, protons and neutrons interleaved
  // spread protons evenly through the ball (Bresenham-style mix)
  const kinds: ('p' | 'n')[] = []
  let acc = 0
  for (let i = 0; i < N; i++) {
    acc += protons
    if (acc >= N) {
      acc -= N
      kinds.push('p')
    } else kinds.push('n')
  }
  let pi = 0
  let ni = 0
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const r = R * Math.cbrt((i + 0.5) / N)
    const y = 1 - (2 * (i + 0.5)) / N
    const rad = Math.sqrt(1 - y * y)
    const th = golden * i
    d.position.set(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r)
    d.updateMatrix()
    if (kinds[i] === 'p' && pi < protons) pMesh.setMatrixAt(pi++, d.matrix)
    else if (ni < neutrons) nMesh.setMatrixAt(ni++, d.matrix)
    else pMesh.setMatrixAt(pi++, d.matrix)
  }
  nucleus.add(pMesh, nMesh)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color, transparent: true, opacity: 0.35, depthWrite: false }))
  glow.scale.setScalar(R * 5)
  group.add(glow)
  const core = new THREE.PointLight(color, 6, 12, 2)
  group.add(core)

  // ---- shells
  const shells = shellCounts(z)
  const r0 = R + 1.0
  const step = Math.max(0.75, 3.2 / shells.length)
  const rings: { g: THREE.Group; r: number; n: number; speed: number; electrons: THREE.Group[]; phase: number }[] = []
  const eGeo = new THREE.SphereGeometry(0.11, reduced ? 8 : 16, reduced ? 6 : 12)
  const eMat = new THREE.MeshStandardMaterial({ color: 0xf6e27a, emissive: 0xf6e27a, emissiveIntensity: 0.9, roughness: 0.3 })
  const haloMat = new THREE.SpriteMaterial({ map: dotTexture(), color: 0xf6e27a, transparent: true, opacity: 0.55, depthWrite: false })
  shells.forEach((n, i) => {
    const r = r0 + step * i
    const g = new THREE.Group()
    g.rotation.set(0.5 + i * 0.32 * (i % 2 ? -1 : 1), 0, i * 0.55)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, reduced ? 4 : 6, reduced ? 96 : 160), new THREE.MeshBasicMaterial({ color: 0xf1f5ee, transparent: true, opacity: 0.35 }))
    g.add(ring)
    const electrons: THREE.Group[] = []
    for (let k = 0; k < n; k++) {
      const e = new THREE.Group()
      const m = new THREE.Mesh(eGeo, eMat)
      const h = new THREE.Sprite(haloMat)
      h.scale.setScalar(0.55)
      e.add(m, h)
      g.add(e)
      electrons.push(e)
    }
    const lbl = textSprite(`${shellLabels[i] ?? ''} ${n}`, { color: '#f1f5ee', size: 0.42 })
    lbl.position.set(r + 0.55, 0, 0)
    lbl.material.depthTest = false
    g.add(lbl)
    group.add(g)
    rings.push({ g, r, n, speed: (i % 2 ? -1 : 1) * (1.4 / Math.pow(i + 1, 0.7)), electrons, phase: i * 0.7 })
  })
  const outer = r0 + step * (shells.length - 1)

  const update = (dt: number, t: number) => {
    if (!still) {
      nucleus.rotation.y += dt * 0.25
      nucleus.rotation.x += dt * 0.11
    }
    glow.material.opacity = 0.3 + 0.06 * Math.sin(t * 2)
    for (const s of rings) {
      const a0 = still ? s.phase : s.phase + t * s.speed
      s.electrons.forEach((e, k) => {
        const a = a0 + (k / s.n) * Math.PI * 2
        e.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r, 0)
      })
    }
  }
  return { group, radius: outer + 1.1, target: new THREE.Vector3(0, 0, 0), elevation: 0.35, update }
}

/* ====================================================================
   Real-life sample
   ==================================================================== */
function benchLighting(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xf1f5ee, 0x1b2f26, 0.4))
  const key = new THREE.DirectionalLight(0xfff3e0, 1.6)
  key.position.set(4, 8, 5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = key.shadow.camera.bottom = -6
  key.shadow.camera.right = key.shadow.camera.top = 6
  key.shadow.camera.near = 1
  key.shadow.camera.far = 25
  key.shadow.bias = -0.0005
  key.shadow.radius = 4
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbfe3ff, 0.5)
  fill.position.set(-5, 3, -3)
  scene.add(fill)
  const bench = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.ShadowMaterial({ opacity: 0.32 }))
  bench.rotation.x = -Math.PI / 2
  bench.receiveShadow = true
  scene.add(bench)
}

function pedestal(color = 0x2a3531) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.22, 64), new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }))
  m.position.y = 0.11
  m.receiveShadow = true
  m.castShadow = true
  return m
}

function metal(color: string, shiny?: boolean) {
  return new THREE.MeshStandardMaterial({ color, metalness: shiny ? 0.95 : 0.15, roughness: shiny ? 0.34 : 0.85, envMapIntensity: shiny ? 1.1 : 0.4 })
}

function buildSample(ctx: ThreeCtx, z: number, look: Look, reduced: boolean, still = false): Rig {
  const { scene } = ctx
  const group = new THREE.Group()
  scene.add(group)
  benchLighting(scene)
  const col = new THREE.Color(look.color)
  let radius = 3.2
  let elevation = 0.42
  const target = new THREE.Vector3(0, 1.1, 0)
  const anim: ((dt: number, t: number) => void)[] = []
  const spin = (o: THREE.Object3D, speed = 0.25) => anim.push((dt) => void (still || (o.rotation.y += dt * speed)))

  switch (look.form) {
    case 'nugget': {
      group.add(pedestal())
      const geo = roughen(mergeVertices(new THREE.IcosahedronGeometry(1.25, reduced ? 3 : 5)), 0.11, 1.7, z)
      const m = new THREE.Mesh(geo, metal(look.color, look.shiny))
      m.position.y = 0.22 + 1.1
      m.scale.set(1.15, 0.85, 1)
      m.rotation.set(0.3, 0.6, 0.1)
      m.castShadow = true
      group.add(m)
      spin(m)
      break
    }
    case 'ingot': {
      group.add(pedestal())
      const m = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.9, 1.4, 4, 0.14), metal(look.color, true))
      m.position.y = 0.22 + 0.45
      m.rotation.y = -0.5
      m.castShadow = true
      group.add(m)
      // a second smaller bar leaning on it
      const m2 = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.6, 0.9, 4, 0.1), metal(look.color, true))
      m2.position.set(0.5, 0.22 + 0.9 + 0.3, -0.1)
      m2.rotation.set(0, -0.2, 0.08)
      m2.castShadow = true
      group.add(m2)
      spin(group, 0.2)
      target.y = 0.8
      radius = 2.8
      break
    }
    case 'crystal': {
      group.add(pedestal())
      const mat = new THREE.MeshPhysicalMaterial({
        color: col,
        roughness: look.shiny ? 0.2 : 0.35,
        metalness: look.shiny ? 0.55 : 0.05,
        clearcoat: 0.6,
        clearcoatRoughness: 0.15,
        transmission: look.shiny ? 0 : 0.2,
        thickness: 0.8,
        envMapIntensity: 0.9,
        iridescence: z === 83 ? 1 : 0,
        iridescenceIOR: 1.6,
      })
      const cluster = new THREE.Group()
      for (let i = 0; i < 11; i++) {
        const h = rnd(0.7, 2.1)
        const geo = new THREE.CylinderGeometry(rnd(0.16, 0.3), rnd(0.28, 0.42), h, 6)
        const c = new THREE.Mesh(geo, mat)
        const a = (i / 11) * Math.PI * 2 + rnd(-0.3, 0.3)
        const rr = i === 0 ? 0 : rnd(0.3, 1.1)
        c.position.set(Math.cos(a) * rr, 0.22 + h * 0.42, Math.sin(a) * rr)
        c.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.5, 0.5))
        c.castShadow = true
        cluster.add(c)
      }
      group.add(cluster)
      spin(cluster)
      break
    }
    case 'powder': {
      // watch glass with a heap of powder
      const dish = new THREE.Mesh(
        lathe([
          [0, 0.02],
          [1.2, 0.12],
          [2.1, 0.5],
          [2.2, 0.56],
          [2.05, 0.56],
          [1.15, 0.2],
          [0, 0.1],
        ]),
        glassMat(),
      )
      dish.renderOrder = 3
      group.add(dish)
      const n = reduced ? 220 : 520
      const heap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, metalness: 0 }), n)
      const d = new THREE.Object3D()
      const Rh = 1.5
      const H = 1.0
      for (let i = 0; i < n; i++) {
        const rr = Math.sqrt(Math.random()) * Rh
        const a = rnd(0, 6.28)
        const top = H * (1 - rr / Rh)
        d.position.set(Math.cos(a) * rr, 0.12 + Math.random() * top + 0.04, Math.sin(a) * rr)
        d.scale.setScalar(rnd(0.7, 1.4))
        d.updateMatrix()
        heap.setMatrixAt(i, d.matrix)
      }
      heap.castShadow = true
      group.add(heap)
      spin(group, 0.2)
      target.y = 0.6
      radius = 2.8
      break
    }
    case 'gas': {
      // sealed discharge tube on a small stand
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x3a3f44, metalness: 0.6, roughness: 0.5 }))
      stand.position.y = 0.15
      stand.castShadow = true
      const cap = (y: number) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.35, 32), new THREE.MeshStandardMaterial({ color: 0x9aa39d, metalness: 0.85, roughness: 0.35 }))
        c.position.y = y
        return c
      }
      const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 3.6, 8, 32), glassMat())
      tube.position.y = 0.3 + 2.35
      tube.renderOrder = 3
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.4, 8, 24), new THREE.MeshBasicMaterial({ color: look.glow ?? look.color, transparent: true, opacity: look.glow ? 0.55 : 0.18, depthWrite: false }))
      inner.position.copy(tube.position)
      inner.renderOrder = 2
      group.add(stand, cap(0.45), cap(4.85), tube, inner)
      if (look.glow) {
        const light = new THREE.PointLight(look.glow, 8, 8, 2)
        light.position.set(0, 2.6, 0.4)
        group.add(light)
        const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: look.glow, transparent: true, opacity: 0.35, depthWrite: false }))
        haze.scale.set(2.6, 5.2, 1)
        haze.position.y = 2.6
        group.add(haze)
        anim.push((_, t) => {
          const f = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7)
          light.intensity = 8 * f
          haze.material.opacity = 0.32 * f
          inner.material.opacity = 0.5 * f
        })
      }
      target.y = 2.5
      radius = 3.4
      elevation = 0.25
      break
    }
    case 'liquid': {
      // stoppered bottle
      const bottle = new THREE.Mesh(
        lathe([
          [0, 0],
          [1.1, 0],
          [1.2, 0.2],
          [1.2, 2.2],
          [0.9, 2.7],
          [0.5, 2.9],
          [0.5, 3.4],
          [0.58, 3.5],
          [0.42, 3.5],
          [0.42, 2.85],
          [0.82, 2.6],
          [1.1, 2.15],
          [1.1, 0.25],
          [0, 0.1],
        ]),
        glassMat(),
      )
      bottle.renderOrder = 3
      const liquid = new THREE.Mesh(
        lathe([
          [0, 0.1],
          [1.08, 0.1],
          [1.08, 1.9],
          [0, 1.9],
        ]),
        new THREE.MeshPhysicalMaterial({ color: col, transparent: true, opacity: 0.9, roughness: 0.15, clearcoat: 0.4, depthWrite: false }),
      )
      liquid.renderOrder = 2
      liquid.castShadow = true
      const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.7, 24), new THREE.MeshPhysicalMaterial({ color: 0xcfd6d0, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 }))
      stopper.position.y = 3.65
      group.add(bottle, liquid, stopper)
      // fumes above the liquid (bromine)
      const fumes = Array.from({ length: 6 }, (_, i) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: col, transparent: true, opacity: 0.25, depthWrite: false }))
        s.position.set(rnd(-0.4, 0.4), 2.0 + i * 0.15, rnd(-0.3, 0.3))
        s.scale.setScalar(rnd(0.6, 1.1))
        s.userData.ph = i
        group.add(s)
        return s
      })
      anim.push((_, t) => fumes.forEach((s) => void (s.position.y = 2.0 + ((t * 0.3 + (s.userData.ph as number) * 0.2) % 1.2))))
      spin(group, 0.2)
      target.y = 1.7
      radius = 2.8
      break
    }
    case 'droplets': {
      const dish = new THREE.Mesh(
        lathe([
          [0, 0.02],
          [1.6, 0.1],
          [2.2, 0.55],
          [2.3, 0.6],
          [2.15, 0.6],
          [1.55, 0.22],
          [0, 0.12],
        ]),
        new THREE.MeshPhysicalMaterial({ color: 0xf6f3ec, roughness: 0.25, clearcoat: 1 }),
      )
      dish.castShadow = true
      dish.receiveShadow = true
      group.add(dish)
      const mat = new THREE.MeshStandardMaterial({ color: col, metalness: 1, roughness: 0.06, envMapIntensity: 1.6 })
      const sizes = [0.55, 0.32, 0.26, 0.2, 0.17, 0.14, 0.12, 0.1]
      sizes.forEach((r, i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat)
        const a = i * 2.4
        const rr = i === 0 ? 0 : 0.6 + i * 0.12
        b.position.set(Math.cos(a) * rr, 0.14 + r * 0.72, Math.sin(a) * rr)
        b.scale.set(1, 0.72, 1)
        b.castShadow = true
        group.add(b)
      })
      spin(group, 0.2)
      target.y = 0.5
      radius = 2.6
      elevation = 0.5
      break
    }
    case 'unknown': {
      // never seen: a ghostly wireframe atom
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5, 1)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 }))
      wire.position.y = 1.8
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 18), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.4 }))
      core.position.y = 1.8
      const q = textSprite('?', { color: '#f6e27a', size: 1.2 })
      q.position.set(0, 1.8, 0)
      q.material.depthTest = false
      group.add(wire, core, q)
      anim.push((dt, t) => {
        if (!still) {
          wire.rotation.y += dt * 0.5
          wire.rotation.x += dt * 0.2
        }
        core.scale.setScalar(1 + 0.08 * Math.sin(t * 3))
        q.material.opacity = 0.7 + 0.3 * Math.sin(t * 2)
      })
      target.y = 1.8
      radius = 2.6
      elevation = 0.2
      break
    }
  }

  if (look.radioactive) {
    const tag = textSprite('☢', { color: '#f6e27a', size: 0.7 })
    tag.position.set(1.9, 0.5, 1.4)
    tag.material.depthTest = false
    group.add(tag)
    anim.push((_, t) => void (tag.material.opacity = 0.6 + 0.4 * Math.sin(t * 2.5)))
  }

  return { group, radius, target, elevation, update: (dt, t) => anim.forEach((f) => f(dt, t)) }
}

/* ====================================================================
   Component
   ==================================================================== */
export default function ElementStage({ z, view, shellLabels }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ z, view, shellLabels })
  useEffect(() => {
    props.current = { z, view, shellLabels }
  })

  useThree(
    wrapRef,
    cvsRef,
    (ctx) => {
      const { renderer, scene, camera, canvas, perf } = ctx
      const reducedMotion = prefersReducedMotion()
      const reduced = reducedMotion || perf.quality === 'low'
      renderer.shadowMap.enabled = perf.shadows
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      camera.fov = 32
      camera.updateProjectionMatrix()

      const controls = new OrbitControls(camera, canvas)
      controls.enablePan = false
      controls.enableZoom = false
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.6
      controls.autoRotate = !reducedMotion
      controls.autoRotateSpeed = 0.9

      let rig: Rig | null = null
      let built = ''
      const build = () => {
        const { z, view, shellLabels } = props.current
        const key = `${z}|${view}`
        if (key === built) return
        built = key
        if (rig) {
          disposeTree(scene)
          scene.clear()
          scene.environment = ctx.env
        }
        rig = view === 'atom' ? buildAtom(ctx, z, shellLabels, reduced, reducedMotion) : buildSample(ctx, z, lookOf(z), reduced, reducedMotion)
        controls.target.copy(rig.target)
        controls.minPolarAngle = view === 'atom' ? 0.6 : 0.9
        controls.maxPolarAngle = view === 'atom' ? 2.4 : 1.5
        // start from a pleasant angle
        const dir = new THREE.Vector3(0.6, rig.elevation, 1).normalize()
        camera.position.copy(rig.target).addScaledVector(dir, 10)
        fit()
      }
      const fit = () => {
        if (!rig) return
        const vFov = THREE.MathUtils.degToRad(camera.fov)
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
        const dist = rig.radius / Math.tan(Math.min(vFov, hFov) / 2)
        const d = camera.position.clone().sub(rig.target).normalize()
        camera.position.copy(rig.target).addScaledVector(d, dist)
      }
      build()

      return {
        resize: fit,
        update: (dt, t) => {
          build()
          rig?.update(dt, t)
          controls.update()
          return true
        },
        dispose: () => controls.dispose(),
      }
    },
    2,
  )

  return (
    <div ref={wrapRef} className="estage__cv">
      <canvas ref={cvsRef} aria-hidden="true" />
    </div>
  )
}
