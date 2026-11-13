import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Lesson, QuizItem } from '../../data/organic'
import { playCorrect, playWrong } from '../../sound'
import type { QuestionSet } from '../../store'
import { isTypingSpace, randomInt } from '../../util'
import { Chem } from './shared'
import { LETTERS, toQuestionSet } from './toQuestionSet'
import { soundOn, UI, useL } from './labKit'

function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  lesson: Lesson
  /** Teacher only: save these questions as a question set for the spin screen. */
  onUseInRoulette?: (set: QuestionSet) => void
}

export function QuizPart({ lesson, onUseInRoulette }: Props) {
  const L = useL()
  const periods = lesson.periods ?? []
  const [period, setPeriod] = useState<number | null>(null)
  const pool = useMemo(() => lesson.quiz.filter((q) => period === null || q.period === period), [lesson, period])
  const [order, setOrder] = useState(() => shuffled(pool))
  const [i, setI] = useState(0)
  const [choice, setChoice] = useState<number | null>(null) // tf: 1 = true, 0 = false; mcq: option index
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const q = order[i] as QuizItem | undefined

  const restart = useCallback((list: QuizItem[]) => {
    setOrder(shuffled(list))
    setI(0)
    setChoice(null)
    setScore(0)
    setOver(false)
  }, [])

  const pickPeriod = (p: number | null) => {
    setPeriod(p)
    restart(lesson.quiz.filter((x) => p === null || x.period === p))
  }

  const isRight = (item: QuizItem, c: number) => (item.kind === 'tf' ? (c === 1) === item.answer : c === item.answer)

  const answer = useCallback(
    (c: number) => {
      if (!q || choice !== null || over) return
      if (q.kind === 'mcq' && c >= q.options.length) return
      setChoice(c)
      const ok = isRight(q, c)
      if (ok) setScore((s) => s + 1)
      if (soundOn()) (ok ? playCorrect : playWrong)()
    },
    [choice, over, q],
  )

  const next = useCallback(() => {
    if (choice === null) return
    if (i + 1 >= order.length) return setOver(true)
    setI(i + 1)
    setChoice(null)
  }, [choice, i, order.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (e.key === ' ' || e.key === 'Enter') {
        if (isTypingSpace(e) || choice === null) return
        e.preventDefault()
        next()
      } else if (q.kind === 'tf') {
        if (k === 'd' || k === 'đ' || k === 't') answer(1)
        else if (k === 's' || k === 'f') answer(0)
      } else {
        const n = 'abcdef'.indexOf(k) >= 0 ? 'abcdef'.indexOf(k) : '123456'.indexOf(k)
        if (n >= 0) answer(n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer, next, choice, q])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(t)
  }, [toast])

  const useInRoulette = () => {
    if (!onUseInRoulette) return
    const name = `${L(lesson.number)} · ${L(lesson.title)}${period !== null ? ` (${L(UI.period, { n: period })})` : ''}`
    const set = toQuestionSet(name, pool, L, { yes: L(UI.yes), no: L(UI.no), tag: `${L(UI.tfTag)}` })
    onUseInRoulette(set)
    setToast(L(UI.added, { name, n: set.questions.length }))
  }

  const head = (
    <div className="quiz__top">
      {periods.length > 1 && (
        <div className="seg" role="group">
          <button type="button" className={`seg__btn${period === null ? ' seg__btn--on' : ''}`} aria-pressed={period === null} onClick={() => pickPeriod(null)}>
            {L(UI.all)}
          </button>
          {periods.map((p, n) => (
            <button key={n} type="button" className={`seg__btn${period === n + 1 ? ' seg__btn--on' : ''}`} aria-pressed={period === n + 1} title={L(p)} onClick={() => pickPeriod(n + 1)}>
              {L(UI.period, { n: n + 1 })}
            </button>
          ))}
        </div>
      )}
      {period !== null && periods[period - 1] && <span className="muted">{L(periods[period - 1])}</span>}
      <span className="grow" />
      {onUseInRoulette && (
        <button type="button" className="btn btn--small" title={L(UI.toRouletteTitle)} onClick={useInRoulette}>
          🎯 {L(UI.toRoulette)}
        </button>
      )}
    </div>
  )

  const toastEl = toast && (
    <div className="lab-toast" role="status">
      {toast}{' '}
      <a href="#/" className="lab-toast__link">
        {L(UI.open)} →
      </a>
    </div>
  )

  if (over || !q)
    return (
      <div className="quiz quiz--over">
        {head}
        <div className="quiz__card">
          <p className="quiz__final">{L(UI.final, { s: score, n: order.length })}</p>
          <div className="quiz__stars" aria-hidden="true">
            {order.map((_, k) => (
              <span key={k} className={k < score ? 'is-on' : ''} style={{ animationDelay: `${k * 80}ms` }}>
                ★
              </span>
            ))}
          </div>
          <button type="button" className="btn btn--big btn--solid" onClick={() => restart(pool)}>
            {L(UI.playAgain)}
          </button>
        </div>
        {toastEl}
      </div>
    )

  const ok = choice !== null && isRight(q, choice)
  return (
    <div className="quiz">
      {head}
      <p className="chalk-sub">{L(UI.scoreLine, { i: i + 1, n: order.length, s: score })}</p>
      <div className="quiz__progress" aria-hidden="true">
        <i style={{ width: `${((i + (choice !== null ? 1 : 0)) / order.length) * 100}%` }} />
      </div>
      <div key={`${period}-${i}`} className={`quiz__card${choice !== null ? (ok ? ' is-right' : ' is-wrong') : ''}`}>
        {q.kind === 'tf' && <span className="quiz__tag">{L(UI.tfTag)}</span>}
        <p className={`quiz__text${q.kind === 'mcq' ? ' quiz__text--mcq' : ''}`}>
          <Chem text={L(q.text)} />
        </p>
        {q.kind === 'tf' ? (
          <div className="quiz__btns">
            {[1, 0].map((v) => (
              <button
                key={v}
                type="button"
                className={`quiz__btn quiz__btn--${v ? 'yes' : 'no'}${choice === v ? ' is-picked' : ''}${choice !== null && (v === 1) === q.answer ? ' is-answer' : ''}`}
                onClick={() => answer(v)}
                disabled={choice !== null}
              >
                {v ? '✓' : '✗'} {L(v ? UI.yes : UI.no)}
              </button>
            ))}
          </div>
        ) : (
          <div className="quiz__opts">
            {q.options.map((o, n) => (
              <button
                key={n}
                type="button"
                className={`quiz__opt${choice === n ? ' is-picked' : ''}${choice !== null && n === q.answer ? ' is-answer' : ''}`}
                onClick={() => answer(n)}
                disabled={choice !== null}
              >
                <span className="quiz__letter">{LETTERS[n]}</span>
                <Chem text={L(o)} />
              </button>
            ))}
          </div>
        )}
        {choice !== null && (
          <div className="quiz__why">
            <strong>{L(ok ? UI.correct : UI.incorrect)}</strong>{' '}
            <span>
              <Chem text={L(q.why)} />
            </span>
          </div>
        )}
      </div>
      <div className="row quiz__foot">
        <span className="muted">{L(q.kind === 'tf' ? UI.keysTf : UI.keysMcq)}</span>
        {choice !== null && (
          <button type="button" className="btn btn--solid" onClick={next}>
            {i + 1 >= order.length ? L(UI.finish) : L(UI.next)} →
          </button>
        )}
      </div>
      {toastEl}
    </div>
  )
}
