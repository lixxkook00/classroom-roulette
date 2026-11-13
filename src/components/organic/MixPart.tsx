import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Mixer } from '../../data/organic'
import { playCorrect, playWrong } from '../../sound'
import { randomInt } from '../../util'
import { soundOn, useL } from './labKit'

const CAP = 200 // beaker capacity, mL

const T = {
  free: { vi: 'Tự pha', en: 'Free mix' },
  challenge: { vi: 'Thử thách', en: 'Challenge' },
  ethanol: { vi: 'Ethylic alcohol', en: 'Ethanol' },
  water: { vi: 'Nước', en: 'Water' },
  empty: { vi: 'Đổ hết', en: 'Empty' },
  degree: { vi: 'Độ cồn', en: 'Alcohol degree' },
  note: {
    vi: 'Màu chỉ để dễ nhìn — thật ra cả hai đều không màu. Bỏ qua sự co thể tích khi trộn.',
    en: 'Colours are only for show — both liquids are colourless. Volume shrinkage on mixing is ignored.',
  },
  dilute: {
    vi: 'Trong cốc có {e} mL ethylic alcohol nguyên chất. Thêm bao nhiêu mL nước để được cồn {d}°?',
    en: 'The beaker holds {e} mL of pure ethanol. How much water must you add to get {d}°?',
  },
  make: { vi: 'Hãy pha {v} mL cồn {d}°.', en: 'Make {v} mL of {d}° alcohol.' },
  check: { vi: 'Kiểm tra', en: 'Check' },
  next: { vi: 'Thử thách khác', en: 'New challenge' },
  right: { vi: 'Chính xác! 🎉', en: 'Spot on! 🎉' },
  wrong: { vi: 'Chưa đúng — bây giờ là {d}° và {t} mL. Thử lại nhé!', en: 'Not yet — that is {d}° and {t} mL. Try again!' },
  solution: { vi: 'Lời giải', en: 'Solution' },
}

type Task = { kind: 'dilute'; ethanol: number; degree: number; water: number } | { kind: 'make'; volume: number; degree: number; ethanol: number; water: number }

/** Every puzzle with whole-number answers that fits the beaker. */
const TASKS: Task[] = (() => {
  const out: Task[] = []
  for (const ethanol of [10, 20, 25, 30, 40, 45, 50, 60, 70, 80])
    for (const degree of [10, 20, 25, 30, 40, 45, 50, 60, 70, 75, 80, 90]) {
      const total = (ethanol * 100) / degree
      if (Number.isInteger(total) && total - ethanol >= 5 && total <= CAP) out.push({ kind: 'dilute', ethanol, degree, water: total - ethanol })
    }
  for (const volume of [100, 120, 150, 200])
    for (const degree of [20, 25, 40, 45, 60, 70, 75, 80]) {
      const ethanol = (volume * degree) / 100
      if (Number.isInteger(ethanol)) out.push({ kind: 'make', volume, degree, ethanol, water: volume - ethanol })
    }
  return out
})()

const degreeOf = (e: number, w: number) => (e + w === 0 ? 0 : (e / (e + w)) * 100)
const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

function Beaker({ ethanol, water, pouring }: { ethanol: number; water: number; pouring: 'e' | 'w' | null }) {
  const total = ethanol + water
  const bottom = 330
  const span = 270
  const h = (Math.min(total, CAP) / CAP) * span
  const y = bottom - h
  const d = degreeOf(ethanol, water)
  const mix = `color-mix(in oklch, #f6e27a ${Math.round(d)}%, #7fc8e8)`
  const markY = (ml: number) => bottom - (ml / CAP) * span
  return (
    <svg className="beaker" viewBox="0 0 300 360" aria-hidden="true">
      {pouring && <rect className={`beaker__stream beaker__stream--${pouring}`} x={pouring === 'e' ? 118 : 168} y="0" width="12" height={y + 4} rx="6" />}
      <clipPath id="beaker-in">
        <path d="M62 40 V318 Q62 330 74 330 H226 Q238 330 238 318 V40 Z" />
      </clipPath>
      <g clipPath="url(#beaker-in)">
        {total > 0 && (
          <g className="beaker__liquid" style={{ '--mix': mix } as CSSProperties}>
            <rect x="40" y={y} width="220" height={h + 10} />
            <path className="beaker__wave" d={`M40 ${y} q27 -8 55 0 t55 0 t55 0 t55 0 t55 0 V${y + 14} H40 Z`} />
          </g>
        )}
        {total > 0 &&
          Array.from({ length: 7 }, (_, i) => (
            <circle key={i} className="beaker__bubble" cx={80 + i * 22} cy={bottom - 8} r={2 + (i % 3)} style={{ '--d': `${(i * 0.37) % 2}s` } as CSSProperties} />
          ))}
      </g>
      <path className="beaker__glass" d="M50 30 H62 V318 Q62 330 74 330 H226 Q238 330 238 318 V30 H250" />
      {[50, 100, 150, 200].map((ml) => (
        <g key={ml} className="beaker__mark">
          <line x1="238" x2="222" y1={markY(ml)} y2={markY(ml)} />
          <text x="244" y={markY(ml) + 5}>
            {ml}
          </text>
        </g>
      ))}
      {[25, 75, 125, 175].map((ml) => (
        <line key={ml} className="beaker__mark" x1="238" x2="229" y1={markY(ml)} y2={markY(ml)} />
      ))}
      <text className="beaker__unit" x="262" y="30">
        mL
      </text>
    </svg>
  )
}

function Pour({ label, value, onChange, max, locked, kind }: { label: string; value: number; onChange: (v: number) => void; max: number; locked?: boolean; kind: 'e' | 'w' }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)))
  return (
    <div className={`pour pour--${kind}`}>
      <div className="pour__head">
        <span className="chalk-label">{label}</span>
        <span className="pour__val">{value} mL</span>
      </div>
      {!locked && (
        <>
          <input className="lab-range" type="range" min={0} max={max} step={1} value={value} onChange={(e) => set(Number(e.target.value))} aria-label={label} />
          <div className="row">
            {[-10, -1, 1, 10].map((s) => (
              <button key={s} type="button" className="btn btn--small pour__step" onClick={() => set(value + s)} disabled={s < 0 ? value === 0 : value >= max}>
                {s > 0 ? `+${s}` : s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function MixPart({ mixer }: { mixer: Mixer }) {
  const L = useL()
  const [mode, setMode] = useState<'free' | 'challenge'>('free')
  const [ethanol, setEthanol] = useState(40)
  const [water, setWater] = useState(60)
  const [pouring, setPouring] = useState<'e' | 'w' | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)
  const pourTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(pourTimer.current), [])

  const pour = (kind: 'e' | 'w') => {
    setPouring(kind)
    window.clearTimeout(pourTimer.current)
    pourTimer.current = window.setTimeout(() => setPouring(null), 450)
  }

  const newTask = useCallback(() => {
    const t = TASKS[randomInt(TASKS.length)]
    setTask(t)
    setEthanol(t.kind === 'dilute' ? t.ethanol : 0)
    setWater(0)
    setResult(null)
  }, [])

  const switchMode = (m: 'free' | 'challenge') => {
    setMode(m)
    setResult(null)
    if (m === 'challenge') newTask()
  }

  const degree = degreeOf(ethanol, water)
  const hidden = mode === 'challenge' && result !== 'right'

  const check = () => {
    if (!task) return
    const ok = ethanol === task.ethanol && water === task.water
    setResult(ok ? 'right' : 'wrong')
    if (soundOn()) (ok ? playCorrect : playWrong)()
  }

  return (
    <div className="lab-grid lab-grid--mix">
      <div className="lab-stage">
        <Beaker ethanol={ethanol} water={water} pouring={pouring} />
        <div className={`degree${result === 'right' ? ' degree--win' : ''}`} aria-live="polite">
          <span className="degree__label">{L(T.degree)}</span>
          <span className="degree__value">{hidden ? '?' : fmt(degree)}°</span>
        </div>
        <div className="dscale">
          <div className="dscale__bar">
            {mixer.marks.map((m) => (
              <span key={m.degree} className="dscale__mark" style={{ left: `${m.degree}%` }}>
                <i />
                <span className="dscale__label">{L(m.label)}</span>
              </span>
            ))}
            {!hidden && <span className="dscale__pointer" style={{ left: `${degree}%` }} />}
          </div>
        </div>
      </div>

      <aside className="lab-side">
        <div className="seg" role="group">
          {(['free', 'challenge'] as const).map((m) => (
            <button key={m} type="button" className={`seg__btn${mode === m ? ' seg__btn--on' : ''}`} aria-pressed={mode === m} onClick={() => switchMode(m)}>
              {L(T[m])}
            </button>
          ))}
        </div>

        {mode === 'challenge' && task && (
          <p className="lab-task">{task.kind === 'dilute' ? L(T.dilute, { e: task.ethanol, d: task.degree }) : L(T.make, { v: task.volume, d: task.degree })}</p>
        )}

        <Pour
          kind="e"
          label={L(T.ethanol)}
          value={ethanol}
          max={CAP - water}
          locked={mode === 'challenge' && task?.kind === 'dilute'}
          onChange={(v) => {
            setEthanol(v)
            setResult(null)
            pour('e')
          }}
        />
        <Pour
          kind="w"
          label={L(T.water)}
          value={water}
          max={CAP - ethanol}
          onChange={(v) => {
            setWater(v)
            setResult(null)
            pour('w')
          }}
        />

        {mode === 'free' ? (
          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--small btn--link"
              onClick={() => {
                setEthanol(0)
                setWater(0)
              }}
            >
              {L(T.empty)}
            </button>
          </div>
        ) : (
          <div className="row row--wrap">
            <button type="button" className="btn btn--solid btn--small" onClick={check} disabled={ethanol + water === 0}>
              {L(T.check)}
            </button>
            <button type="button" className="btn btn--small" onClick={newTask}>
              {L(T.next)}
            </button>
          </div>
        )}

        {result === 'right' && task && (
          <div className="lab-note lab-note--right">
            <strong>{L(T.right)}</strong>
            <span>
              {L(T.solution)}:{' '}
              {task.kind === 'dilute' ? (
                <>
                  V<sub>dd</sub> = {task.ethanol} × 100 : {task.degree} = {task.ethanol + task.water} mL → V<sub>{L(T.water).toLowerCase()}</sub> = {task.ethanol + task.water} − {task.ethanol} = {task.water} mL
                </>
              ) : (
                <>
                  V<sub>ethylic alcohol</sub> = {task.volume} × {task.degree} : 100 = {task.ethanol} mL → V<sub>{L(T.water).toLowerCase()}</sub> = {task.volume} − {task.ethanol} = {task.water} mL
                </>
              )}
            </span>
          </div>
        )}
        {result === 'wrong' && <div className="lab-note lab-note--wrong">{L(T.wrong, { d: fmt(degree), t: ethanol + water })}</div>}

        {mode === 'free' && (
          <div className="lab-formula">
            {L(T.degree)} = {ethanol} : {ethanol + water} × 100 = <strong>{fmt(degree)}°</strong>
          </div>
        )}
        <p className="muted">{L(mixer.definition)}</p>
        <p className="muted lab-small">{L(T.note)}</p>
      </aside>
    </div>
  )
}
