import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ELEMENTS, type Element } from '../data/elements'
import { useI18n } from '../i18n'
import { playLock, playTick, playWin } from '../sound'
import { elementsOf, type Student } from '../store'
import { isTypingSpace, pickOther, prefersReducedMotion, randomInt } from '../util'

/*
 * "Mystery card" mode: one big card is on screen from the start. Pressing Spin rolls every
 * field like a slot machine, then the fields lock one by one —
 *   1. element type  2. period  3. the element itself  4. the student —
 * and the finished card is the winner card. While a field is still rolling, the values it
 * shows are narrowed down by the fields already locked, so the class can start guessing.
 *
 * The winner is drawn up front exactly as in table mode (student first, then one of their
 * elements), so the reveal order does not change anybody's chance.
 */

interface Props {
  students: Student[]
  /** Indices of students who can be picked. */
  eligible: number[]
  /** Students shown while rolling (everyone here today, tested or not — keeps the suspense). */
  present: number[]
  shareAll: boolean
  sound: boolean
  className: string
  /** Switches rendered in the bottom bar (share-all, skip-tested). */
  switches: ReactNode
  allDone: boolean
  onMarkTested: (studentId: string) => void
  onAbsent: (studentId: string) => void
  onNewRound: () => void
  onBusyChange: (busy: boolean) => void
  /** Floating question-set button, shown at the left of the bottom bar. */
  picker: ReactNode
  hasQuestions: boolean
  onShowQuestion: (studentIndex: number, z: number) => void
  /** True while a question popup is open: Space must not re-roll the card. */
  paused: boolean
}

type Phase = 'idle' | 'rolling' | 'done'

/** When each field locks, in ms from the start: category, period, element, student. */
const LOCK_TIMES = [1300, 2300, 3400, 5000]
const STEPS = LOCK_TIMES.length

function LockIcon() {
  return (
    <svg className="slot__lock" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function Slot({ label, value, locked, rolling, colorClass }: { label: string; value: string; locked: boolean; rolling: boolean; colorClass?: string }) {
  return (
    <div className={`slot${locked ? ' slot--locked' : ''}${rolling ? ' slot--rolling' : ''}`}>
      <span className="slot__label">
        {label}
        {locked && <LockIcon />}
      </span>
      <span className="slot__window">
        <span key={value} className={`slot__val ${colorClass ?? ''}`}>
          {value}
        </span>
      </span>
    </div>
  )
}

export function CardMode({
  students,
  eligible,
  present,
  shareAll,
  sound,
  className,
  switches,
  allDone,
  onMarkTested,
  onAbsent,
  onNewRound,
  onBusyChange,
  picker,
  hasQuestions,
  onShowQuestion,
  paused,
}: Props) {
  const { t, elName, elFact, catLabel, groupShort } = useI18n()
  const count = students.length

  const [phase, setPhase] = useState<Phase>('idle')
  const [locked, setLocked] = useState(0)
  const [shownZ, setShownZ] = useState<number | null>(null)
  const [shownStudent, setShownStudent] = useState<number | null>(null)
  const [final, setFinal] = useState<{ index: number; z: number } | null>(null)

  const timer = useRef<number | undefined>(undefined)
  const start = useRef(0)
  const lockTimes = useRef<number[]>(LOCK_TIMES)
  const lockedRef = useRef(0)
  const zRef = useRef<number | null>(null)
  const stuRef = useRef<number | null>(null)
  const finalRef = useRef<{ index: number; z: number } | null>(null)
  const soundRef = useRef(sound)
  const tickRef = useRef<() => void>(() => {})

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** Elements shown while rolling: everyone present, so tested students still flash by. */
  const pool = useMemo(() => present.flatMap((i) => elementsOf(i, count, shareAll).map((el) => el.z)), [present, count, shareAll])

  const finish = useCallback(() => {
    const f = finalRef.current
    if (!f) return
    zRef.current = f.z
    stuRef.current = f.index
    setShownZ(f.z)
    setShownStudent(f.index)
    setLocked(STEPS)
    setPhase('done')
    onBusyChange(false)
    if (soundRef.current) playWin()
  }, [onBusyChange])

  const tick = useCallback(() => {
    const f = finalRef.current
    if (!f) return
    const elapsed = performance.now() - start.current
    const nowLocked = lockTimes.current.filter((ms) => ms <= elapsed).length
    if (nowLocked > lockedRef.current) {
      lockedRef.current = nowLocked
      setLocked(nowLocked)
      if (soundRef.current && nowLocked < STEPS) playLock()
    }
    if (nowLocked >= STEPS) return finish()

    const target = ELEMENTS[f.z - 1]
    if (nowLocked < 3) {
      // Only show elements that still fit the clues already locked in.
      const fits = pool.filter((z) => {
        const el = ELEMENTS[z - 1]
        return (nowLocked < 1 || el.category === target.category) && (nowLocked < 2 || el.period === target.period)
      })
      zRef.current = pickOther(fits.length ? fits : [f.z], zRef.current)
    } else {
      zRef.current = f.z
    }
    stuRef.current = pickOther(present, stuRef.current)
    setShownZ(zRef.current)
    setShownStudent(stuRef.current)
    if (soundRef.current) playTick()

    const total = lockTimes.current[STEPS - 1]
    const delay = 55 + 240 * Math.pow(Math.min(1, elapsed / total), 2)
    timer.current = window.setTimeout(() => tickRef.current(), delay)
  }, [pool, present, finish])

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  const roll = useCallback(() => {
    if (eligible.length === 0) return
    window.clearTimeout(timer.current)
    const winner = eligible[randomInt(eligible.length)]
    const owned = elementsOf(winner, count, shareAll)
    const f = { index: winner, z: owned[randomInt(owned.length)].z }
    finalRef.current = f
    setFinal(f)
    const scale = prefersReducedMotion() ? 0.3 : 1
    lockTimes.current = LOCK_TIMES.map((ms) => ms * scale)
    lockedRef.current = 0
    setLocked(0)
    setPhase('rolling')
    onBusyChange(true)
    start.current = performance.now()
    tick()
  }, [eligible, count, shareAll, onBusyChange, tick])

  /** Space / Stop: lock the remaining fields quickly, one after another. */
  const hurry = useCallback(() => {
    const elapsed = performance.now() - start.current
    let k = 0
    lockTimes.current = lockTimes.current.map((ms) => (ms > elapsed ? elapsed + 380 * ++k : ms))
  }, [])

  const reset = () => {
    window.clearTimeout(timer.current)
    finalRef.current = null
    setFinal(null)
    setPhase('idle')
    setLocked(0)
    setShownZ(null)
    setShownStudent(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || paused || isTypingSpace(e)) return
      e.preventDefault()
      if (phase === 'rolling') hurry()
      else if (!allDone) roll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, allDone, paused, roll, hurry])

  const el: Element | null = shownZ !== null ? ELEMENTS[shownZ - 1] : null
  const student = shownStudent !== null ? students[shownStudent] : null
  const rolling = phase === 'rolling'
  const done = phase === 'done' && final !== null
  const winner = done ? students[final.index] : null
  const winnerElement = done ? ELEMENTS[final.z - 1] : null
  const tileLocked = locked >= 3

  return (
    <>
      <div className="cardmode">
        <div className={`mcard mcard--${phase}`}>
          <div className="mcard__tile-col">
            <div className={`mcard__tile${el ? ` cat--${el.category}` : ''}${tileLocked ? ' mcard__tile--locked' : ''}`}>
              {el ? (
                <div key={el.z} className="mcard__tile-inner">
                  <div className="mcard__tile-top">
                    <span>{el.z}</span>
                    <span>{el.mass}</span>
                  </div>
                  <span className="mcard__tile-sym">{el.symbol}</span>
                  <span className="mcard__tile-name">{elName(el)}</span>
                </div>
              ) : (
                <span className="mcard__q" aria-hidden="true">
                  ?
                </span>
              )}
              {tileLocked && <LockIcon />}
            </div>
            <ol className="mcard__steps" aria-hidden="true">
              {Array.from({ length: STEPS }, (_, i) => (
                <li key={i} className={i < locked ? 'is-done' : rolling && i === locked ? 'is-now' : undefined} />
              ))}
            </ol>
          </div>

          <div className="mcard__info">
            <div className="mcard__slots">
              <Slot
                label={t('slotCategory')}
                value={el ? catLabel(el.category) : '?'}
                locked={locked >= 1}
                rolling={rolling && locked < 1}
                colorClass={el ? `cat-text--${el.category}` : undefined}
              />
              <Slot label={t('tipPeriod')} value={el ? String(el.period) : '?'} locked={locked >= 2} rolling={rolling && locked < 2} />
              <Slot label={t('tipGroup')} value={el ? groupShort(el) : '?'} locked={locked >= 3} rolling={rolling && locked < 3} />
            </div>

            <div className={`mcard__student${locked >= 4 ? ' is-locked' : ''}${rolling && locked >= 3 ? ' is-final-roll' : ''}`}>
              <span className="mcard__student-label">
                {t('slotStudent')} {student && locked >= 4 ? `#${(shownStudent ?? 0) + 1}` : ''}
                {locked >= 4 && <LockIcon />}
              </span>
              <span className="mcard__name-window" aria-live="polite">
                <span key={student?.id ?? 'none'} className="mcard__name">
                  {student ? student.name : '? ? ?'}
                </span>
              </span>
            </div>

            {done && winner && winnerElement ? (
              <div className="mcard__reveal">
                <div className="winner__fact">
                  <span className="winner__fact-label">{t('funFact')}</span>
                  <p>{elFact(winnerElement)}</p>
                </div>
                <div className="mcard__actions">
                  {hasQuestions && final && (
                    <button type="button" className="btn btn--solid btn--small btn--question" onClick={() => onShowQuestion(final.index, final.z)}>
                      {t('showQuestion')} →
                    </button>
                  )}
                  {winner.tested ? (
                    <span className="mcard__marked">✓ {t('markedTested')}</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`btn btn--small${hasQuestions ? '' : ' btn--solid'}`}
                        onClick={() => {
                          onMarkTested(winner.id)
                        }}
                      >
                        {t('markTested')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--link btn--small"
                        onClick={() => {
                          onAbsent(winner.id)
                          reset()
                        }}
                      >
                        {t('absent')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="mcard__hint">{rolling ? t('cardRolling') : t('cardIdle')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="spin-bar">
        {picker}
        <div className="spin-bar__status" aria-live="polite">
          {allDone ? (
            <div className="landed">
              <span className="landed__name">{t('everyoneDone', { name: className })}</span>
            </div>
          ) : (
            <span className="chalk-sub">
              {rolling ? t('shuffling', { n: eligible.length }) : t('inDraw', { n: eligible.length, total: count })}
            </span>
          )}
        </div>
        <div className="spin-bar__actions">
          {switches}
          {allDone && !rolling ? (
            <button
              type="button"
              className="btn btn--big btn--solid"
              onClick={() => {
                reset()
                onNewRound()
              }}
            >
              {t('newRound')}
            </button>
          ) : rolling ? (
            <button type="button" className="btn btn--big btn--solid" onClick={hurry}>
              {t('stop')}
            </button>
          ) : (
            <button type="button" className="btn btn--big" onClick={roll} disabled={eligible.length === 0}>
              {done ? t('spinAgain') : t('spin')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
