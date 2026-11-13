import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AtomKind, Molecule } from '../../data/organic'
import { layoutRect } from '../../rotate'
import { prefersReducedMotion } from '../../util'
import { easeInOut, lerp, textSprite, textTexture, useThree, YELLOW } from './three/common'

/*
 * Ball-and-stick model in WebGL: physically shaded spheres and cylinders under studio lighting,
 * orbit by dragging (auto-rotates when idle), tap an atom to pick it. "formula" morphs the model
 * flat into the structural formula (letters + thin bonds) and back.
 */

const RADIUS: Record<AtomKind, number> = { C: 0.5, O: 0.47, N: 0.47, Cl: 0.6, H: 0.32 } // Å-ish
const COLOR: Record<AtomKind, number> = { C: 0x2f3533, H: 0xf2f4f1, O: 0xd93a2b, N: 0x3b57d6, Cl: 0x48a93c }
const LETTER: Record<AtomKind, string> = { C: '#f1f5ee', H: '#22392f', O: '#ffffff', N: '#ffffff', Cl: '#ffffff' }
const FLAT_LETTER: Record<AtomKind, string> = { C: '#f1f5ee', H: '#f1f5ee', O: '#ff9e8a', N: '#a9b8ff', Cl: '#d4ee8a' }
const BOND_R = 0.13
const UP = new THREE.Vector3(0, 1, 0)

interface Props {
  mol: Molecule
  formula?: boolean
  showGroup?: boolean
  groupLabel?: string
  picked?: string | null
  onPick?: (id: string) => void
  counted?: Map<string, number>
  mini?: boolean
  label?: string
}

interface AtomNode {
  id: string
  kind: AtomKind
  p3: THREE.Vector3
  p2: THREE.Vector3
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  outline: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  letter: THREE.Sprite
  flatTex: THREE.Texture
  sphereTex: THREE.Texture
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  num: THREE.Sprite | null
}

interface BondNode {
  a: AtomNode
  b: AtomNode
  order: number
  meshes: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[]
}

export function Molecule3D({ mol, formula = false, showGroup = false, groupLabel = '', picked = null, onPick, counted, mini = false, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ mol, formula, showGroup, groupLabel, picked, onPick, counted, mini })
  useEffect(() => {
    props.current = { mol, formula, showGroup, groupLabel, picked, onPick, counted, mini }
  })

  useThree(
    wrapRef,
    cvsRef,
    ({ scene, camera, canvas, renderer, perf }) => {
      const reduced = prefersReducedMotion()
      const low = perf.quality === 'low'
      const { mol, mini } = props.current
      // Low quality: thumbnails are still pictures (one render), the main model keeps turning at 30 fps.
      const staticMini = mini && low

      /* ---- lights ---- */
      scene.add(new THREE.HemisphereLight(0xf1f5ee, 0x22392f, 0.55))
      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(4, 6, 6)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0xbfe3ff, 0.9)
      rim.position.set(-5, 2, -4)
      scene.add(rim)

      /* ---- geometry ---- */
      const sphereGeo = new THREE.SphereGeometry(1, low ? (mini ? 18 : 32) : mini ? 32 : 56, low ? (mini ? 12 : 20) : mini ? 20 : 36)
      const bondGeo = new THREE.CylinderGeometry(1, 1, 1, low ? 12 : mini ? 16 : 28, 1, true)
      const root = new THREE.Group()
      scene.add(root)

      // centre the molecule
      const raw = mol.atoms.map((a) => new THREE.Vector3(...(a.p ?? [(a.x - 320) / 110, -(a.y - 200) / 110, 0])))
      const c3 = raw.reduce((v, p) => v.add(p), new THREE.Vector3()).multiplyScalar(1 / raw.length)
      const xs = mol.atoms.map((a) => a.x)
      const ys = mol.atoms.map((a) => a.y)
      const c2x = (Math.min(...xs) + Math.max(...xs)) / 2
      const c2y = (Math.min(...ys) + Math.max(...ys)) / 2
      const S2 = 1 / 95 // px of the 640 × 400 layout → Å

      const atoms: AtomNode[] = mol.atoms.map((a, i) => {
        const mat = new THREE.MeshStandardMaterial({ color: COLOR[a.kind], roughness: a.kind === 'H' ? 0.42 : 0.3, metalness: 0.05, envMapIntensity: 0.9, transparent: true })
        const mesh = new THREE.Mesh(sphereGeo, mat)
        const r = RADIUS[a.kind]
        mesh.scale.setScalar(r)
        mesh.userData.id = a.id
        const outline = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: YELLOW, side: THREE.BackSide, transparent: true, opacity: 0.95 }))
        outline.visible = false
        const letter = textSprite(a.kind, { color: LETTER[a.kind], size: r * (a.kind === 'H' ? 1.0 : 1.05) })
        letter.material.depthTest = true
        const flatTex = textTexture(a.kind, FLAT_LETTER[a.kind]).tex
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false }))
        ring.visible = false
        ring.renderOrder = 6
        root.add(mesh, outline, letter, ring)
        return { id: a.id, kind: a.kind, p3: raw[i].clone().sub(c3), p2: new THREE.Vector3((a.x - c2x) * S2, -(a.y - c2y) * S2, 0), mesh, outline, letter, flatTex, sphereTex: letter.material.map!, ring, num: null }
      })
      const byId = new Map(atoms.map((a) => [a.id, a]))

      const bonds: BondNode[] = mol.bonds.map(([ia, ib, order = 1]) => {
        const meshes = Array.from({ length: order }, () => {
          const m = new THREE.Mesh(bondGeo, new THREE.MeshStandardMaterial({ color: 0xc9d0cc, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.8, transparent: true }))
          root.add(m)
          return m
        })
        return { a: byId.get(ia)!, b: byId.get(ib)!, order, meshes }
      })

      // functional-group ring (faces the camera) + label
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 72), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }))
      ring.visible = false
      ring.renderOrder = 5
      scene.add(ring)
      const groupLabelSprite = textSprite(' ', { color: '#f6e27a', size: 0.42 })
      groupLabelSprite.visible = false
      groupLabelSprite.material.depthTest = false
      groupLabelSprite.renderOrder = 6
      scene.add(groupLabelSprite)
      let lastGroupLabel = ''

      /* ---- camera & controls ---- */
      let extent = 0.8
      atoms.forEach((a) => (extent = Math.max(extent, a.p3.length() + RADIUS[a.kind])))
      let extent2 = 0.8
      atoms.forEach((a) => (extent2 = Math.max(extent2, a.p2.length() + 0.9)))
      const controls = new OrbitControls(camera, canvas)
      controls.enablePan = false
      controls.enableZoom = false
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.7
      controls.autoRotate = !reduced && !staticMini
      controls.autoRotateSpeed = mini ? 1.4 : 1.8
      controls.enabled = !mini
      const startYaw = mini ? (mol.atoms.length * 1.7) % 6.28 : -0.55
      camera.position.set(Math.sin(startYaw) * 10, 3.2, Math.cos(startYaw) * 10)
      controls.target.set(0, 0, 0)
      let dist = 10
      const fitCamera = () => {
        const vFov = THREE.MathUtils.degToRad(camera.fov)
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
        const e = flat > 0.5 ? extent2 : extent
        dist = (e / Math.tan(Math.min(vFov, hFov) / 2)) * (mini ? 1.08 : 1.15)
      }

      /* ---- picking ---- */
      const ray = new THREE.Raycaster()
      const ndc = new THREE.Vector2()
      const pick = (ev: PointerEvent): string | null => {
        const r = layoutRect(canvas)
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
        ray.setFromCamera(ndc, camera)
        const hit = ray.intersectObjects(
          atoms.map((a) => a.mesh),
          false,
        )[0]
        return hit ? (hit.object.userData.id as string) : null
      }
      let downAt: [number, number] | null = null
      const onDown = (e: PointerEvent) => (downAt = [e.clientX, e.clientY])
      const onUp = (e: PointerEvent) => {
        if (!downAt) return
        const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1])
        downAt = null
        if (moved < 6) {
          const id = pick(e)
          if (id) props.current.onPick?.(id)
        }
      }
      let hoverT = 0
      const onMove = (e: PointerEvent) => {
        const now = performance.now()
        if (now - hoverT < 60 || downAt) return
        hoverT = now
        canvas.style.cursor = pick(e) ? 'pointer' : 'grab'
      }
      const onKey = (e: KeyboardEvent) => {
        const { picked, onPick } = props.current
        if (!onPick) return
        const ids = atoms.map((a) => a.id)
        const i = picked ? ids.indexOf(picked) : -1
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onPick(ids[(i + 1) % ids.length])
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPick(ids[(i - 1 + ids.length) % ids.length])
        else return
        e.preventDefault()
      }
      if (!mini) {
        canvas.addEventListener('pointerdown', onDown)
        canvas.addEventListener('pointerup', onUp)
        canvas.addEventListener('pointermove', onMove)
        canvas.addEventListener('keydown', onKey)
      }

      /* ---- per-frame ---- */
      let flat = 0
      const tmp = new THREE.Vector3()
      const camDir = new THREE.Vector3()
      const dirV = new THREE.Vector3()
      const perp = new THREE.Vector3()
      const q = new THREE.Quaternion()
      const nums = new Map<string, THREE.Sprite>()

      let framesLeft = 3 // static thumbnails render a few frames (fonts, env) then stop
      let lastKey = ''
      const update = (dt: number) => {
        const { formula, showGroup, groupLabel, picked, counted } = props.current
        if (staticMini) {
          const key = `${showGroup}`
          if (key !== lastKey) {
            lastKey = key
            framesLeft = 3
          }
          if (framesLeft <= 0) return false
          framesLeft--
        }
        const target = formula ? 1 : 0
        if (flat !== target) flat = target > flat ? Math.min(1, flat + dt * 1.8) : Math.max(0, flat - dt * 1.8)
        const f = easeInOut(flat)

        // camera: free orbit for the model, glide to a front view for the formula
        controls.autoRotate = !reduced && !formula && !staticMini
        controls.enableRotate = !mini && !formula
        fitCamera()
        if (formula) {
          tmp.set(0, 0, dist)
          camera.position.lerp(tmp, 1 - Math.pow(0.001, dt))
        } else {
          const cur = camera.position.length()
          if (Math.abs(cur - dist) > 0.01) camera.position.multiplyScalar(lerp(cur, dist, 1 - Math.pow(0.001, dt)) / cur)
        }
        controls.update()
        camera.getWorldDirection(camDir)

        const inGroup = (id: string) => !!mol.group?.atoms.includes(id)
        const dimming = showGroup && !!mol.group

        for (const a of atoms) {
          a.mesh.position.lerpVectors(a.p3, a.p2, f)
          const r = RADIUS[a.kind]
          const sphereR = lerp(r, 0.001, f)
          a.mesh.scale.setScalar(Math.max(0.001, sphereR))
          const dim = dimming && !inGroup(a.id)
          a.mesh.material.opacity = dim ? 0.12 : 1
          a.mesh.material.emissive.setHex(showGroup && inGroup(a.id) ? YELLOW : 0x000000)
          a.mesh.material.emissiveIntensity = 0.18
          // letter sits on the sphere's camera-facing side; in formula mode it is the atom
          const flatMode = f > 0.5
          const letterH = lerp(r * (a.kind === 'H' ? 1.0 : 1.05), a.kind === 'H' ? 0.78 : 0.95, f)
          a.letter.position.copy(a.mesh.position).addScaledVector(camDir, -(sphereR * 1.02 + 0.01))
          a.letter.scale.set(letterH * (a.letter.userData.aspect as number), letterH, 1)
          a.letter.material.opacity = dim ? 0.3 : 1
          const isOn = picked === a.id || !!counted?.has(a.id)
          const wantTex = flatMode ? a.flatTex : a.sphereTex
          if (a.letter.material.map !== wantTex) {
            a.letter.material.map = wantTex
            a.letter.material.needsUpdate = true
          }
          a.letter.material.color.set(flatMode && isOn ? '#f6e27a' : '#ffffff')
          // picked / counted: outline sphere in 3-D, a ring around the letter in the formula
          a.outline.visible = isOn && !flatMode
          a.ring.visible = isOn && flatMode
          if (isOn) {
            a.outline.position.copy(a.mesh.position)
            a.outline.scale.setScalar(sphereR * 1.14)
            a.ring.position.copy(a.mesh.position).addScaledVector(camDir, -0.05)
            a.ring.quaternion.copy(camera.quaternion)
            a.ring.scale.setScalar(a.kind === 'H' ? 0.5 : 0.6)
          }
          // count number above the atom
          const n = counted?.get(a.id)
          let s = nums.get(a.id)
          if (n !== undefined) {
            if (!s) {
              s = textSprite(String(n), { color: '#f6e27a', size: 0.5 })
              s.material.depthTest = false
              s.renderOrder = 7
              scene.add(s)
              nums.set(a.id, s)
            }
            s.position.copy(a.mesh.position).add(tmp.set(0, Math.max(sphereR, 0.3) + 0.34, 0))
            s.visible = true
          } else if (s) s.visible = false
        }

        for (const b of bonds) {
          dirV.subVectors(b.b.mesh.position, b.a.mesh.position)
          const len = dirV.length()
          dirV.normalize()
          perp.crossVectors(dirV, tmp.set(0, 0, 1))
          if (perp.lengthSq() < 1e-4) perp.crossVectors(dirV, UP)
          perp.normalize()
          const r = lerp(BOND_R, 0.035, f)
          const dim = dimming && !(inGroup(b.a.id) && inGroup(b.b.id))
          const gapA = lerp(RADIUS[b.a.kind] * 0.8, b.a.kind === 'H' ? 0.5 : 0.6, f)
          const gapB = lerp(RADIUS[b.b.kind] * 0.8, b.b.kind === 'H' ? 0.5 : 0.6, f)
          const L = Math.max(0.05, len - gapA - gapB)
          q.setFromUnitVectors(UP, dirV)
          b.meshes.forEach((m, i) => {
            const off = b.order === 1 ? 0 : (i - (b.order - 1) / 2) * r * 2.6
            m.position.copy(b.a.mesh.position).addScaledVector(dirV, gapA + L / 2).addScaledVector(perp, off)
            m.quaternion.copy(q)
            m.scale.set(b.order === 1 ? r : r * 0.78, L, b.order === 1 ? r : r * 0.78)
            m.material.opacity = dim ? 0.12 : 1
            m.material.color.setHex(f > 0.5 ? 0xf1f5ee : 0xc9d0cc)
          })
        }

        // group ring + label
        if (showGroup && mol.group) {
          const g = mol.group.atoms.map((id) => byId.get(id)!)
          tmp.set(0, 0, 0)
          g.forEach((a) => tmp.add(a.mesh.position))
          tmp.multiplyScalar(1 / g.length)
          let gr = 0
          g.forEach((a) => (gr = Math.max(gr, a.mesh.position.distanceTo(tmp) + lerp(RADIUS[a.kind], 0.45, f) * 1.4)))
          ring.visible = true
          ring.position.copy(tmp).addScaledVector(camDir, -0.6)
          ring.quaternion.copy(camera.quaternion)
          ring.scale.setScalar(gr + 0.25)
          if (!mini && groupLabel) {
            if (groupLabel !== lastGroupLabel) {
              lastGroupLabel = groupLabel
              const { tex, aspect } = textTexture(groupLabel, '#f6e27a')
              groupLabelSprite.material.map = tex
              groupLabelSprite.material.needsUpdate = true
              groupLabelSprite.userData.aspect = aspect
            }
            const hgt = 0.42
            groupLabelSprite.scale.set(hgt * (groupLabelSprite.userData.aspect as number), hgt, 1)
            groupLabelSprite.position.copy(tmp).add(new THREE.Vector3(0, -(gr + 0.25) - 0.55, 0)).addScaledVector(camDir, -0.6)
            groupLabelSprite.visible = true
          }
        } else {
          ring.visible = false
          groupLabelSprite.visible = false
        }
        return true
      }

      return {
        update,
        resize: () => {
          framesLeft = 3
        },
        dispose: () => {
          controls.dispose()
          canvas.removeEventListener('pointerdown', onDown)
          canvas.removeEventListener('pointerup', onUp)
          canvas.removeEventListener('pointermove', onMove)
          canvas.removeEventListener('keydown', onKey)
          renderer.setAnimationLoop(null)
        },
      }
    },
    mini ? 1.5 : 2,
  )

  return (
    <div ref={wrapRef} className={`cv${mini ? ' cv--mini' : ' cv--mol'}`}>
      <canvas ref={cvsRef} role={mini ? 'img' : 'application'} aria-label={label ?? mol.condensed} tabIndex={mini ? -1 : 0} />
    </div>
  )
}
