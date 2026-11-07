import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { playCorrect, playWrong } from '../sound'
import { prefersReducedMotion } from '../util'

interface Props {
  kind: 'correct' | 'wrong'
  studentName: string
  sound: boolean
  onDone: () => void
}

const COLORS = ['#f6e27a', '#ff9e8a', '#7fe0e8', '#d3b3ff', '#d4ee8a', '#ffc97a', '#ffffff', '#ffb3d9']

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface Rocket {
  x: number
  y: number
  vy: number
  vx: number
  burstAt: number
  color: string
  done: boolean
}

/** Full-screen fireworks (correct) or a chemistry "fizzle" of smoke and bubbles (wrong). Click to skip. */
export function Celebration({ kind, studentName, sound, onDone }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)

  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (sound) (kind === 'correct' ? playCorrect : playWrong)()
    const reduced = prefersReducedMotion()
    const duration = reduced ? 1600 : kind === 'correct' ? 3400 : 2300
    const end = window.setTimeout(() => doneRef.current(), duration)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || reduced) return () => window.clearTimeout(end)

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const sparks: Spark[] = []
    const rockets: Rocket[] = []
    const start = performance.now()
    let raf = 0

    const burst = (x: number, y: number, color: string, n = 70) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 1.5 + Math.random() * 5.5
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 55 + Math.random() * 40, color: Math.random() < 0.75 ? color : '#ffffff', size: 1.5 + Math.random() * 2 })
      }
    }

    if (kind === 'correct') {
      for (let i = 0; i < 9; i++) {
        rockets.push({
          x: W * (0.12 + Math.random() * 0.76),
          y: H + 10,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -(H / 52) * (0.75 + Math.random() * 0.35),
          burstAt: 180 + i * 260 + Math.random() * 120,
          color: COLORS[i % COLORS.length],
          done: false,
        })
      }
      // Confetti rain straight away
      for (let i = 0; i < 90; i++) {
        sparks.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2.5, life: 0, max: 220, color: COLORS[i % COLORS.length], size: 3 + Math.random() * 3 })
      }
    }

    // Wrong: smoke puffs and bubbles rising from the middle
    const puffs: { x: number; y: number; r: number; vy: number; vx: number; a: number }[] = []
    const bubbles: { x: number; y: number; r: number; vy: number; wob: number }[] = []
    if (kind === 'wrong') {
      for (let i = 0; i < 22; i++) puffs.push({ x: W / 2 + (Math.random() - 0.5) * 220, y: H * 0.62 + Math.random() * 40, r: 20 + Math.random() * 30, vy: -(0.6 + Math.random() * 1.2), vx: (Math.random() - 0.5) * 1.2, a: 0.5 })
      for (let i = 0; i < 26; i++) bubbles.push({ x: W / 2 + (Math.random() - 0.5) * 360, y: H * 0.75 + Math.random() * 120, r: 3 + Math.random() * 9, vy: -(1 + Math.random() * 2.2), wob: Math.random() * 6 })
    }

    const frame = (now: number) => {
      const el = now - start
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)

      if (kind === 'correct') {
        ctx.globalCompositeOperation = 'lighter'
        for (const r of rockets) {
          if (r.done || el < r.burstAt - 700) continue
          r.x += r.vx
          r.y += r.vy
          r.vy *= 0.985
          ctx.fillStyle = r.color
          ctx.beginPath()
          ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2)
          ctx.fill()
          if (el >= r.burstAt || r.vy > -1) {
            r.done = true
            burst(r.x, r.y, r.color)
          }
        }
      } else {
        for (const p of puffs) {
          p.x += p.vx
          p.y += p.vy
          p.r += 0.6
          p.a *= 0.988
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
          g.addColorStop(0, `rgba(190, 196, 188, ${p.a})`)
          g.addColorStop(1, 'rgba(190, 196, 188, 0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(127, 224, 232, 0.75)'
        ctx.lineWidth = 2
        for (const b of bubbles) {
          b.y += b.vy
          b.wob += 0.08
          ctx.beginPath()
          ctx.arc(b.x + Math.sin(b.wob) * 4, b.y, b.r, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life++
        s.vx *= 0.985
        s.vy = s.vy * 0.985 + 0.06
        s.x += s.vx
        s.y += s.vy
        const a = Math.max(0, 1 - s.life / s.max)
        if (a <= 0) {
          sparks.splice(i, 1)
          continue
        }
        ctx.globalAlpha = a
        ctx.fillStyle = s.color
        ctx.fillRect(s.x, s.y, s.size, s.size)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(end)
    }
  }, [kind, sound])

  return (
    <div className={`celebrate celebrate--${kind}`} onClick={() => doneRef.current()} role="status" aria-live="assertive">
      <canvas ref={canvasRef} className="celebrate__canvas" aria-hidden="true" />
      <div className="celebrate__msg">
        {kind === 'correct' ? (
          <svg className="celebrate__icon" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M7 12.5l3.2 3.2L17 9" />
          </svg>
        ) : (
          <svg className="celebrate__icon" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.5-2.5L14 9V3" />
            <path d="M8 15c1.5-1 2.5 1 4 0s2.5 1 4 0" />
          </svg>
        )}
        <span className="celebrate__title">{kind === 'correct' ? t('celebrateCorrect') : t('celebrateWrong')}</span>
        <span className="celebrate__name">{studentName}</span>
      </div>
    </div>
  )
}
