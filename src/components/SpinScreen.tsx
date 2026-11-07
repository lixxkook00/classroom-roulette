import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { CATEGORY_ORDER, ELEMENTS } from '../data/elements'
import { useI18n } from '../i18n'
import { playTick, playWin } from '../sound'
import { elementsOf, ownerOf, today, type AppData, type ClassRoom, type QuestionRound, type RoundResult, type SpinMode } from '../store'
import { isTypingSpace, nowIso, prefersReducedMotion, randomInt, viewTransition } from '../util'
import { CardMode } from './CardMode'
import { Celebration } from './Celebration'
import { QuestionPicker } from './QuestionPicker'
import { RoundSummary } from './RoundSummary'
import { QuestionModal, type QuestionInfo } from './QuestionStage'
import { ChalkSelect, Switch } from './controls'
import { PeriodicTable, type CellState, type Owner } from './PeriodicTable'
import { WinnerModal } from './WinnerModal'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  updateClass: (id: string, fn: (c: ClassRoom) => ClassRoom) => void
  onManage: () => void
  onManageQuestions: () => void
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

export function SpinScreen({ data, setData, updateClass, onManage, onManageQuestions }: Props) {
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
  const [questionId, setQuestionId] = useState<string | null>(null)
  // Mystery-card mode shows the question in its own popup.
  const [cardQuestion, setCardQuestion] = useState<{ index: number; z: number } | null>(null)
  const [celebrate, setCelebrate] = useState<{ kind: 'correct' | 'wrong'; name: string; left: number } | null>(null)
  const [summary, setSummary] = useState<{ round: QuestionRound; setName: string; remaining: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
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
  /**
   * Who the glow runs over: everyone who is here today — including students tested last time,
   * so nobody can relax. Only `eligible` students can actually be picked.
   */
  const present = useMemo(() => students.map((s, i) => ({ s, i })).filter(({ s }) => !absent.has(s.id)).map(({ i }) => i), [students, absent])
  const glowElements = useMemo(() => present.flatMap((i) => elementsOf(i, count, shareAll).map((el) => el.z)), [present, count, shareAll])

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
      pool: glowElements,
      final: owned[randomInt(owned.length)].z,
      start: performance.now(),
      duration: prefersReducedMotion() ? 1200 : 4200,
      stop: false,
    }
    currentRef.current = null
    trailRef.current = []
    setPicked(null)
    setModalOpen(false)
    setQuestionId(null)
    setPhase('spinning')
    tick()
  }, [eligible, glowElements, count, shareAll, tick])

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
      // Tested students look exactly like everyone else — they're just quietly left out of the draw.
      s[el.z] = absent.has(st.id) ? 'absent' : 'on'
    }
    trail.forEach((z) => (s[z] = 'trail'))
    if (current !== null) s[current] = 'glow'
    if (pickedIndex !== null && picked !== null) {
      elementsOf(pickedIndex, count, shareAll).forEach((el) => (s[el.z] = 'mine'))
      s[picked] = 'picked'
    }
    return s
  }, [students, count, shareAll, absent, trail, current, picked, pickedIndex])

  const owners = useMemo(() => {
    const o: Record<number, Owner> = {}
    for (const el of ELEMENTS) {
      const i = ownerOf(el.z, count, shareAll)
      if (i === null) continue
      const st = students[i]
      o[el.z] = {
        order: i + 1,
        name: st.name,
        status: absent.has(st.id) ? 'absent' : 'on',
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

  /* ---------- Questions & rounds ---------- */
  const qset = data.questionSets.find((s) => s.id === data.activeQuestionSetId && s.questions.length > 0) ?? null
  const storedRound = cls ? data.rounds[cls.id] : undefined
  /** The running round for this class and the chosen set. */
  const round = storedRound && qset && storedRound.setId === qset.id ? storedRound : null
  const usedIds = new Set(round?.used ?? [])
  const remainingQs = qset ? qset.questions.filter((q) => !usedIds.has(q.id)) : []

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const startRound = (announce = true) => {
    if (!cls || !qset) return
    const r: QuestionRound = { setId: qset.id, startedAt: nowIso(), used: [], results: [] }
    setData((d) => ({ ...d, rounds: { ...d.rounds, [cls.id]: r } }))
    setQuestionId(null)
    if (announce) showToast(t('roundStarted', { n: qset.questions.length }))
    return r
  }

  const dropRound = () => {
    if (!cls) return
    setData((d) => {
      const rounds = { ...d.rounds }
      delete rounds[cls.id]
      return { ...d, rounds }
    })
    setQuestionId(null)
  }

  /** Ends the round: shows the results, then clears it. */
  const endRound = () => {
    if (!round || !qset) return
    if (round.results.length > 0 && !window.confirm(t('confirmEndRound'))) return
    setSummary({ round, setName: qset.name, remaining: remainingQs.length })
    dropRound()
  }

  /** Draws a question that hasn't been answered in this round (starting a round if needed). */
  const pickQuestion = () => {
    if (!qset) return
    if (!round) startRound(false)
    const used = round ? usedIds : new Set<string>()
    let pool = qset.questions.filter((q) => !used.has(q.id) && q.id !== questionId)
    if (pool.length === 0) pool = qset.questions.filter((q) => !used.has(q.id))
    if (pool.length === 0) return
    setQuestionId(pool[randomInt(pool.length)].id)
  }

  const questionInfo: QuestionInfo | null = (() => {
    if (!qset || !questionId) return null
    const i = qset.questions.findIndex((q) => q.id === questionId)
    return i < 0 ? null : { question: qset.questions[i], index: qset.questions.length - remainingQs.length + 1, total: qset.questions.length }
  })()
  const canChangeQuestion = remainingQs.filter((q) => q.id !== questionId).length > 0

  const setQuestionSet = (id: string | null) => {
    if (round && round.results.length > 0 && id !== qset?.id && !window.confirm(t('confirmChangeSet'))) return
    if (round && id !== qset?.id) {
      setSummary({ round, setName: qset!.name, remaining: remainingQs.length })
      dropRound()
    }
    setQuestionId(null)
    setData((d) => ({ ...d, activeQuestionSetId: id }))
  }

  /** Correct / wrong: the question leaves the round, the student is marked, then the show. */
  const grade = (studentIndex: number, correct: boolean) => {
    const st = students[studentIndex]
    const q = questionInfo?.question
    if (!cls || !st || !q || !qset) return
    const result: RoundResult = { studentId: st.id, studentName: st.name, questionId: q.id, questionText: q.text || '—', correct, at: nowIso() }
    const base = round ?? { setId: qset.id, startedAt: nowIso(), used: [], results: [] }
    const next: QuestionRound = { ...base, used: [...base.used.filter((u) => u !== q.id), q.id], results: [...base.results, result] }
    setData((d) => ({
      ...d,
      rounds: { ...d.rounds, [cls.id]: next },
      classes: d.classes.map((c) => (c.id === cls.id ? { ...c, students: c.students.map((s) => (s.id === st.id ? { ...s, tested: true, lastTestedAt: today() } : s)) } : c)),
    }))
    setQuestionId(null)
    setModalOpen(false)
    setCardQuestion(null)
    if (mode === 'table') resetSpin()
    setCelebrate({ kind: correct ? 'correct' : 'wrong', name: st.name, left: qset.questions.filter((x) => !next.used.includes(x.id)).length })
  }

  const afterCelebrate = () => {
    const c = celebrate
    setCelebrate(null)
    if (!c || !qset) return
    if (c.left === 0 && cls && data.rounds[cls.id]) {
      // Every question has been answered: show the results.
      setSummary({ round: data.rounds[cls.id], setName: qset.name, remaining: 0 })
      dropRound()
    } else if (c.left > 0) showToast(t('roundToast', { n: c.left }))
  }

  const openCardQuestion = (index: number, z: number) =>
    viewTransition('question', () => {
      if (!questionId) pickQuestion()
      setCardQuestion({ index, z })
    })

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
    if (m === mode) return
    viewTransition(`mode-${m}`, () => {
      resetSpin()
      setData((d) => ({ ...d, mode: m }))
    })
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

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(now)
  const busy = phase === 'spinning' || cardBusy

  const picker = (
    <QuestionPicker
      sets={data.questionSets}
      activeId={qset?.id ?? null}
      onChange={setQuestionSet}
      onManage={onManageQuestions}
      disabled={busy}
      round={qset ? { active: !!round, left: remainingQs.length, total: qset.questions.length } : null}
      onStartRound={() => startRound()}
      onEndRound={endRound}
    />
  )
  const allDone = !!cls && students.length > 0 && eligible.length === 0 && phase !== 'spinning'

  const switches = (
    <div className="spin-bar__switches">
      <Switch checked={shareAll} onChange={setShareAll} disabled={busy} ariaLabel={t('shareAll')}>
        <svg className="switch__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="5" height="5" rx="1" />
          <rect x="16" y="4" width="5" height="5" rx="1" />
          <rect x="3" y="11" width="18" height="5" rx="1" />
          <rect x="7" y="18" width="12" height="2.5" rx="1" />
        </svg>
      </Switch>
      {/* Icon only, so students watching the projector can't tell some of them are safe. */}
      <Switch
        checked={data.skipTested}
        onChange={(v) => setData((d) => ({ ...d, skipTested: v }))}
        disabled={busy}
        ariaLabel={t('skipTested')}
      >
        <svg className="switch__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20" />
          <path d="M16 11l2 2 4-4" />
        </svg>
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
        </div>
      </header>

      <main className={`spin-main spin-main--${mode}`}>
        {cls && mode === 'card' && students.length > 0 ? (
          <CardMode
            students={students}
            eligible={eligible}
            present={present}
            shareAll={shareAll}
            sound={sound}
            className={cls.name}
            switches={switches}
            allDone={allDone}
            onMarkTested={markTestedId}
            onAbsent={(id) => setAbsent((a) => new Set(a).add(id))}
            onNewRound={startNewRound}
            onBusyChange={(b) => {
              setCardBusy(b)
              if (b) setQuestionId(null)
            }}
            picker={picker}
            hasQuestions={!!qset && remainingQs.length > 0}
            onShowQuestion={openCardQuestion}
            paused={cardQuestion !== null}
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
            {cls && <p className="rotate-hint">{t('rotateHint')}</p>}

            {cls && (
              <div className="spin-bar">
                {picker}
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
                        ? t('shuffling', { n: students.length })
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
          question={questionInfo}
          hasQuestions={!!qset && remainingQs.length > 0}
          onShowQuestion={() => !questionId && pickQuestion()}
          onAnotherQuestion={pickQuestion}
          canChangeQuestion={canChangeQuestion}
          onCorrect={() => grade(pickedIndex, true)}
          onWrong={() => grade(pickedIndex, false)}
          onMarkTested={markTested}
          onSpinAgain={spin}
          onAbsent={markAbsent}
          onClose={closeModal}
        />
      )}

      {cardQuestion && cls && questionInfo && students[cardQuestion.index] && (
        <QuestionModal
          element={ELEMENTS[cardQuestion.z - 1]}
          order={cardQuestion.index + 1}
          studentName={students[cardQuestion.index].name}
          className={cls.name}
          info={questionInfo}
          canChangeQuestion={canChangeQuestion}
          onCorrect={() => grade(cardQuestion.index, true)}
          onWrong={() => grade(cardQuestion.index, false)}
          onAnother={() => viewTransition('question', pickQuestion)}
          onClose={() => viewTransition('question', () => setCardQuestion(null))}
        />
      )}

      {celebrate && <Celebration kind={celebrate.kind} studentName={celebrate.name} sound={sound} onDone={afterCelebrate} />}

      {summary && cls && (
        <RoundSummary
          round={summary.round}
          setName={summary.setName}
          className={cls.name}
          remaining={summary.remaining}
          onClose={() => setSummary(null)}
          onNewRound={() => {
            setSummary(null)
            startRound()
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
