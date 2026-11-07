import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { CATEGORY_ORDER, ELEMENTS } from '../data/elements'
import { useI18n } from '../i18n'
import { playTick, playWin } from '../sound'
import { elementsOf, ownerOf, today, type AppData, type ClassRoom, type SpinMode } from '../store'
import { isTypingSpace, prefersReducedMotion, randomInt } from '../util'
import { CardMode } from './CardMode'
import { ChalkSelect, Switch } from './controls'
import { PeriodicTable, type CellState, type Owner } from './PeriodicTable'
import { WinnerModal } from './WinnerModal'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  updateClass: (id: string, fn: (c: ClassRoom) => ClassRoom) => void
  onManage: () => void
}

type Phase = 'idle' | 'spinning' | 'landed'

/** Spin positions are atomic numbers; each element belongs to one student (see ownerOf). */
interface Plan {
  pool: number[]
  final: number
  start: number
  duration: number
  stop: boolean
}

const SOUND_KEY = 'element-roulette:sound'

export function SpinScreen({ data, setData, updateClass, onManage }: Props) {
  const { t, locale, elName, catLabel } = useI18n()
  const cls = data.classes.find((c) => c.id === data.activeClassId) ?? null
  const students = useMemo(() => cls?.students ?? [], [cls])

  const [absent, setAbsent] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<number | null>(null)
  const [trail, setTrail] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [now] = useState(() => new Date())
  const [cardBusy, setCardBusy] = useState(false)
  const mode = data.mode
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off'
    } catch {
      return true
    }
  })

  const timer = useRef<number | undefined>(undefined)
  const plan = useRef<Plan | null>(null)
  const currentRef = useRef<number | null>(null)
  const trailRef = useRef<number[]>([])
  const soundRef = useRef(sound)
  const tickRef = useRef<() => void>(() => {})

  useEffect(() => {
    soundRef.current = sound
    try {
      localStorage.setItem(SOUND_KEY, sound ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }, [sound])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const resetSpin = useCallback(() => {
    window.clearTimeout(timer.current)
    plan.current = null
    currentRef.current = null
    trailRef.current = []
    setCurrent(null)
    setTrail([])
    setPicked(null)
    setPhase('idle')
    setModalOpen(false)
  }, [])

  const count = students.length
  const shareAll = data.shareAll

  /** Indices of students who can be picked. */
  const eligible = useMemo(
    () =>
      students
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !(data.skipTested && s.tested) && !absent.has(s.id))
        .map(({ i }) => i),
    [students, data.skipTested, absent],
  )

  /** Every element owned by an eligible student — what the glow runs across. */
  const eligibleElements = useMemo(() => eligible.flatMap((i) => elementsOf(i, count, shareAll).map((el) => el.z)), [eligible, count, shareAll])

  const land = useCallback((z: number) => {
    plan.current = null
    currentRef.current = null
    trailRef.current = []
    setCurrent(null)
    setTrail([])
    setPicked(z)
    setPhase('landed')
    if (soundRef.current) playWin()
    timer.current = window.setTimeout(() => setModalOpen(true), 900)
  }, [])

  const tick = useCallback(() => {
    const p = plan.current
    if (!p) return
    const progress = Math.min(1, (performance.now() - p.start) / p.duration)
    if (progress >= 1 || p.stop) {
      land(p.final)
      return
    }
    let next = p.pool[randomInt(p.pool.length)]
    if (p.pool.length > 1) {
      while (next === currentRef.current) next = p.pool[randomInt(p.pool.length)]
    }
    if (currentRef.current !== null) trailRef.current = [currentRef.current, ...trailRef.current].slice(0, 3)
    currentRef.current = next
    setTrail(trailRef.current)
    setCurrent(next)
    if (soundRef.current) playTick()
    // Fast at first, then slowing down like a wheel losing speed.
    const delay = 55 + 430 * Math.pow(progress, 2.4)
    timer.current = window.setTimeout(() => tickRef.current(), delay)
  }, [land])

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  const spin = useCallback(() => {
    if (eligible.length === 0) return
    window.clearTimeout(timer.current)
    // Fair pick: choose the student first (students with 3 or 4 elements get the same chance),
    // then land on one of that student's elements.
    const winner = eligible[randomInt(eligible.length)]
    const owned = elementsOf(winner, count, shareAll)
    plan.current = {
      pool: eligibleElements,
      final: owned[randomInt(owned.length)].z,
      start: performance.now(),
      duration: prefersReducedMotion() ? 1200 : 4200,
      stop: false,
    }
    currentRef.current = null
    trailRef.current = []
    setPicked(null)
    setModalOpen(false)
    setPhase('spinning')
    tick()
  }, [eligible, eligibleElements, count, shareAll, tick])

  const stopEarly = useCallback(() => {
    if (!plan.current) return
    plan.current.stop = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => tickRef.current(), 250)
  }, [])

  // Space bar: spin / stop early — works with a presentation clicker too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || mode !== 'table' || modalOpen || isTypingSpace(e)) return
      e.preventDefault()
      if (phase === 'spinning') stopEarly()
      else spin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, mode, modalOpen, spin, stopEarly])

  const pickedIndex = picked !== null ? ownerOf(picked, count, shareAll) : null

  const states = useMemo(() => {
    const s: Record<number, CellState> = {}
    for (const el of ELEMENTS) {
      const i = ownerOf(el.z, count, shareAll)
      if (i === null) continue
      const st = students[i]
      s[el.z] = absent.has(st.id) ? 'absent' : data.skipTested && st.tested ? 'tested' : 'on'
    }
    trail.forEach((z) => (s[z] = 'trail'))
    if (current !== null) s[current] = 'glow'
    if (pickedIndex !== null && picked !== null) {
      elementsOf(pickedIndex, count, shareAll).forEach((el) => (s[el.z] = 'mine'))
      s[picked] = 'picked'
    }
    return s
  }, [students, count, shareAll, absent, data.skipTested, trail, current, picked, pickedIndex])

  const owners = useMemo(() => {
    const o: Record<number, Owner> = {}
    for (const el of ELEMENTS) {
      const i = ownerOf(el.z, count, shareAll)
      if (i === null) continue
      const st = students[i]
      o[el.z] = {
        order: i + 1,
        name: st.name,
        status: absent.has(st.id) ? 'absent' : st.tested ? 'tested' : 'on',
      }
    }
    return o
  }, [students, count, shareAll, absent])

  const setShareAll = (v: boolean) => {
    resetSpin()
    setData((d) => ({ ...d, shareAll: v }))
  }

  const pickedStudent = pickedIndex !== null ? students[pickedIndex] : undefined
  const pickedElement = picked !== null ? ELEMENTS[picked - 1] : undefined

  const closeModal = useCallback(() => setModalOpen(false), [])

  const markTestedId = (id: string) => {
    if (!cls) return
    updateClass(cls.id, (c) => ({
      ...c,
      students: c.students.map((s) => (s.id === id ? { ...s, tested: true, lastTestedAt: today() } : s)),
    }))
  }

  const markTested = () => {
    if (!pickedStudent) return
    markTestedId(pickedStudent.id)
    setModalOpen(false)
  }

  const setMode = (m: SpinMode) => {
    resetSpin()
    setData((d) => ({ ...d, mode: m }))
  }

  const markAbsent = () => {
    if (!pickedStudent) return
    setAbsent((a) => new Set(a).add(pickedStudent.id))
    resetSpin()
  }

  const startNewRound = () => {
    if (!cls) return
    updateClass(cls.id, (c) => ({
      ...c,
      students: c.students.map((s) => ({ ...s, tested: false })),
    }))
    setAbsent(new Set())
    resetSpin()
  }

  const testedCount = students.filter((s) => s.tested).length
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(now)
  const busy = phase === 'spinning' || cardBusy
  const allDone = !!cls && students.length > 0 && eligible.length === 0 && phase !== 'spinning'

  const switches = (
    <div className="spin-bar__switches">
      <Switch checked={shareAll} onChange={setShareAll} disabled={busy} title={t('shareAllHint')}>
        {t('shareAll')}
      </Switch>
      <Switch checked={data.skipTested} onChange={(v) => setData((d) => ({ ...d, skipTested: v }))} disabled={busy}>
        {t('skipTested')}
        {testedCount > 0 ? ` (${testedCount})` : ''}
      </Switch>
    </div>
  )

  return (
    <div className="board">
      <header className="topbar">
        <div className="topbar__title">
          <h1 className="chalk-title">{t('appTitle')}</h1>
          <span className="chalk-sub">
            {dateLabel}
            {cls ? ` · ${cls.name}` : ''}
          </span>
        </div>
        <div className="topbar__controls">
          {data.classes.length > 0 && (
            <>
              <span className="chalk-label" aria-hidden="true">
                {t('classLabel')}
              </span>
              <ChalkSelect
                id="class-select"
                label={t('classLabel')}
                value={data.activeClassId ?? ''}
                disabled={busy}
                onChange={(v) => setData((d) => ({ ...d, activeClassId: v }))}
                options={data.classes.map((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: t('studentsCount', { n: c.students.length }),
                }))}
              />
            </>
          )}
          <div className="seg" role="group" aria-label={t('modeLabel')}>
            {(['table', 'card'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`seg__btn${mode === m ? ' seg__btn--on' : ''}`}
                aria-pressed={mode === m}
                disabled={busy}
                onClick={() => setMode(m)}
              >
                {m === 'table' ? t('modeTable') : t('modeCard')}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={sound ? t('soundOff') : t('soundOn')}
            title={sound ? t('soundOff') : t('soundOn')}
            aria-pressed={sound}
            onClick={() => setSound((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              {sound ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
          </button>
          <button type="button" className="link-btn" onClick={onManage} disabled={busy}>
            {t('manageClasses')}
          </button>
        </div>
      </header>

      <main className="spin-main">
        {cls && mode === 'card' && students.length > 0 ? (
          <CardMode
            students={students}
            eligible={eligible}
            shareAll={shareAll}
            sound={sound}
            className={cls.name}
            switches={switches}
            allDone={allDone}
            onMarkTested={markTestedId}
            onAbsent={(id) => setAbsent((a) => new Set(a).add(id))}
            onNewRound={startNewRound}
            onBusyChange={setCardBusy}
          />
        ) : (
          <>
            <div className="table-area">
              {!cls ? (
                <div className="empty">
                  <p className="chalk-title chalk-title--md">{t('noClasses')}</p>
                  <p>{t('noClassesBody')}</p>
                  <button type="button" className="btn btn--solid" onClick={onManage}>
                    {t('createClass')}
                  </button>
                </div>
              ) : (
                <PeriodicTable states={states} owners={owners} showTips={phase !== 'spinning'}>
                  <ul className="legend" aria-label={t('groupsAria')}>
                    {CATEGORY_ORDER.map((c) => (
                      <li key={c} className={`legend__item cat-text--${c}`}>
                        <i className={`legend__swatch cat--${c}`} />
                        {catLabel(c)}
                      </li>
                    ))}
                  </ul>
                </PeriodicTable>
              )}
            </div>

            {cls && (
              <div className="spin-bar">
                <div className="spin-bar__status" aria-live="polite">
                  {students.length === 0 ? (
                    <div className="row row--wrap">
                      <span className="chalk-sub">{t('classEmpty', { name: cls.name })}</span>
                      <button type="button" className="btn btn--small" onClick={onManage}>
                        {t('addStudents')}
                      </button>
                    </div>
                  ) : allDone ? (
                    <div className="landed">
                      <span className="landed__name">{t('everyoneDone', { name: cls.name })}</span>
                    </div>
                  ) : phase === 'landed' && pickedStudent && pickedElement && pickedIndex !== null ? (
                    <div className="landed">
                      <span className={`landed__sym cat-text--${pickedElement.category}`}>{pickedElement.symbol}</span>
                      <div className="landed__text">
                        <span className="landed__name">
                          #{pickedIndex + 1} · {pickedStudent.name}
                        </span>
                        <span className="landed__sub">{elName(pickedElement)}</span>
                      </div>
                      {!modalOpen && (
                        <button type="button" className="btn btn--small" onClick={() => setModalOpen(true)}>
                          {t('showCard')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="chalk-sub">
                      {phase === 'spinning'
                        ? t('shuffling', { n: eligible.length })
                        : t('inDraw', {
                            n: eligible.length,
                            total: students.length,
                          })}
                    </span>
                  )}
                </div>

                {students.length > 0 && (
                  <div className="spin-bar__actions">
                    {switches}
                    {allDone ? (
                      <button type="button" className="btn btn--big btn--solid" onClick={startNewRound}>
                        {t('newRound')}
                      </button>
                    ) : phase === 'spinning' ? (
                      <button type="button" className="btn btn--big btn--solid" onClick={stopEarly}>
                        {t('stop')}
                      </button>
                    ) : (
                      <button type="button" className="btn btn--big" onClick={spin} disabled={eligible.length === 0}>
                        {phase === 'landed' ? t('spinAgain') : t('spin')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {modalOpen && pickedStudent && pickedElement && cls && pickedIndex !== null && (
        <WinnerModal
          element={pickedElement}
          owned={elementsOf(pickedIndex, count, shareAll)}
          order={pickedIndex + 1}
          studentName={pickedStudent.name}
          className={cls.name}
          onMarkTested={markTested}
          onSpinAgain={spin}
          onAbsent={markAbsent}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
