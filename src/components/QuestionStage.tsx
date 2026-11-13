import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Element } from '../data/elements'
import { useI18n } from '../i18n'
import type { Question } from '../store'
import { hasAnswerVideo, isWide } from '../media'
import { playLock } from '../sound'
import { MediaView } from './MediaView'

export interface QuestionInfo {
  question: Question
  /** 1-based position in the set, and the set size. */
  index: number
  total: number
}

interface StageProps {
  element: Element
  order: number
  studentName: string
  className: string
  info: QuestionInfo
  onCorrect: () => void
  onWrong: () => void
  /** Shown only before the answer is revealed (e.g. "Câu khác"). */
  beforeReveal?: ReactNode
  /** Always shown at the end of the button row (back, absent, close). */
  extra?: ReactNode
}

const soundOn = () => {
  try {
    return localStorage.getItem('element-roulette:sound') !== 'off'
  } catch {
    return true
  }
}

/** Student in the top-left, then the teacher's question (and its audio / video). */
export function QuestionStage({ element, order, studentName, className, info, onCorrect, onWrong, beforeReveal, extra }: StageProps) {
  const { t } = useI18n()
  const q = info.question
  const long = q.text.length > 160
  // Which question's answer is showing (so a new question starts hidden again).
  const [revealedFor, setRevealedFor] = useState<string | null>(null)
  const hasAnswer = !!(q.answer || q.answerMedia)
  const showingAnswer = hasAnswer && revealedFor === q.id
  const revealed = !hasAnswer || showingAnswer
  const wide = isWide(q)
  // When the answer is a video, it takes the question video's place so it can be big.
  const hideQuestionMedia = showingAnswer && hasAnswerVideo(q)
  const answerRef = useRef<HTMLDivElement>(null)
  const checkRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (revealedFor === q.id) answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [revealedFor, q.id])

  useEffect(() => {
    // Focus after the popup has painted: focusing forces a layout that would delay its first frame.
    const raf = requestAnimationFrame(() => checkRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [q.id])

  const reveal = () => {
    if (soundOn()) playLock()
    setRevealedFor(q.id)
  }
  return (
    <div className={`qstage${wide ? ' qstage--wide' : ''}${showingAnswer ? ' qstage--answered' : ''}`}>
      <header className="qstage__who">
        <span className={`qstage__tile cat--${element.category}`}>
          <small>{element.z}</small>
          {element.symbol}
        </span>
        <div className="qstage__who-text">
          <h2 id="winner-name" className="qstage__name">
            {studentName}
          </h2>
          <span className="qstage__meta">
            #{order} · {className} · {t('questionOf', { i: info.index, n: info.total })}
          </span>
        </div>
      </header>

      <div className="qstage__body" key={q.id}>
        {q.text && <p className={`qstage__text${long ? ' qstage__text--long' : ''}`}>{q.text}</p>}
        {q.media && !hideQuestionMedia && <MediaView media={q.media} big={wide && !showingAnswer} />}
        {showingAnswer && (
          <div className="qstage__answer" ref={answerRef}>
            <span className="qstage__answer-label">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {t('answerLabel')}
            </span>
            {q.answer && <p>{q.answer}</p>}
            {q.answerMedia && <MediaView media={q.answerMedia} big={hasAnswerVideo(q)} />}
          </div>
        )}
      </div>

      <div className="qstage__actions">
        {revealed ? (
          <GradeButtons onCorrect={onCorrect} onWrong={onWrong} />
        ) : (
          <>
            <button ref={checkRef} type="button" className="btn btn--solid btn--check" onClick={reveal}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t('checkAnswer')}
            </button>
            {beforeReveal}
          </>
        )}
        {extra}
      </div>
    </div>
  )
}

/** ✓ / ✗ buttons that grade the answer (and trigger the fireworks / fizzle). */
export function GradeButtons({ onCorrect, onWrong }: { onCorrect: () => void; onWrong: () => void }) {
  const { t } = useI18n()
  return (
    <>
      <button type="button" className="btn grade grade--right" onClick={onCorrect}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {t('answerRight')}
      </button>
      <button type="button" className="btn grade grade--wrong" onClick={onWrong}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        {t('answerWrong')}
      </button>
    </>
  )
}

interface ModalProps extends Omit<StageProps, 'actions'> {
  canChangeQuestion: boolean
  onCorrect: () => void
  onWrong: () => void
  onAnother: () => void
  onClose: () => void
}

/** Stand-alone question popup (used by the mystery-card mode). */
export function QuestionModal({ canChangeQuestion, onCorrect, onWrong, onAnother, onClose, ...stage }: ModalProps) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay overlay--question" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`winner winner--question${isWide(stage.info.question) ? ' winner--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-name"
      >
        <button type="button" className="icon-btn winner__close" aria-label={t('close')} onClick={onClose}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <QuestionStage
          {...stage}
          onCorrect={onCorrect}
          onWrong={onWrong}
          beforeReveal={
            canChangeQuestion && (
              <button type="button" className="btn" onClick={onAnother}>
                {t('anotherQuestion')}
              </button>
            )
          }
          extra={
            <button type="button" className="btn btn--link" onClick={onClose}>
              {t('close')}
            </button>
          }
        />
      </div>
    </div>
  )
}
