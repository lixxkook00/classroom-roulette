import { useEffect, type ReactNode } from 'react'
import type { Element } from '../data/elements'
import { useI18n } from '../i18n'
import type { Question } from '../store'
import { isWide } from '../media'
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
  actions: ReactNode
}


/** Student in the top-left, then the teacher's question (and its audio / video). */
export function QuestionStage({ element, order, studentName, className, info, actions }: StageProps) {
  const { t } = useI18n()
  const q = info.question
  const long = q.text.length > 160
  return (
    <div className={`qstage${isWide(q) ? ' qstage--wide' : ''}`}>
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
        {q.media && <MediaView media={q.media} big={isWide(q)} />}
      </div>

      <div className="qstage__actions">{actions}</div>
    </div>
  )
}

/** ✓ / ✗ buttons that grade the answer (and trigger the fireworks / fizzle). */
export function GradeButtons({ onCorrect, onWrong }: { onCorrect: () => void; onWrong: () => void }) {
  const { t } = useI18n()
  return (
    <>
      <button type="button" className="btn grade grade--right" onClick={onCorrect}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <div className={`winner winner--question${isWide(stage.info.question) ? ' winner--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="winner-name">
        <button type="button" className="icon-btn winner__close" aria-label={t('close')} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <QuestionStage
          {...stage}
          actions={
            <>
              <GradeButtons onCorrect={onCorrect} onWrong={onWrong} />
              {canChangeQuestion && (
                <button type="button" className="btn" onClick={onAnother}>
                  {t('anotherQuestion')}
                </button>
              )}
              <button type="button" className="btn btn--link" onClick={onClose}>
                {t('close')}
              </button>
            </>
          }
        />
      </div>
    </div>
  )
}
