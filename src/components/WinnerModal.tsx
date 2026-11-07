import { useEffect, useRef } from 'react'
import type { Element } from '../data/elements'
import { useI18n } from '../i18n'

interface Props {
  element: Element
  /** Every element this student owns (including `element`). */
  owned: Element[]
  order: number
  studentName: string
  className: string
  onMarkTested: () => void
  onSpinAgain: () => void
  onAbsent: () => void
  onClose: () => void
}

export function WinnerModal({ element, owned, order, studentName, className, onMarkTested, onSpinAgain, onAbsent, onClose }: Props) {
  const { t, elName, elFact, catLabel, groupLabel } = useI18n()
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    primaryRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="winner" role="dialog" aria-modal="true" aria-labelledby="winner-name">
        <button type="button" className="icon-btn winner__close" aria-label={t('close')} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="winner__tile-wrap">
          <div className={`winner__tile cat--${element.category}`}>
            <div className="winner__tile-top">
              <span>{element.z}</span>
              <span>{element.mass}</span>
            </div>
            <span className="winner__tile-sym">{element.symbol}</span>
            <span className="winner__tile-name">{elName(element)}</span>
          </div>
          <span className={`winner__cat cat-text--${element.category}`}>{catLabel(element.category)}</span>
        </div>

        <div className="winner__body">
          <span className="winner__meta">{t('studentNo', { n: order, cls: className })}</span>
          <h2 id="winner-name" className="winner__name">
            {studentName}
          </h2>
          <svg className="winner__squiggle" width="260" height="10" viewBox="0 0 260 10" fill="none" aria-hidden="true">
            <path d="M3 6c40-4 80 3 125-1s90 2 129-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="winner__fact">
            <span className="winner__fact-label">{t('funFact')}</span>
            <p>{elFact(element)}</p>
          </div>
          <div className="winner__chips">
            <span className="chip">{t('period', { n: element.period })}</span>
            <span className="chip">{groupLabel(element)}</span>
          </div>
          {owned.length > 1 && (
            <div className="winner__owned">
              <span className="winner__owned-label">{t('ownedElements')}:</span>
              {owned.map((el) => (
                <span
                  key={el.z}
                  className={`mini-tile cat--${el.category}${el.z === element.z ? ' mini-tile--current' : ''}`}
                  title={`${el.z} ${elName(el)}`}
                >
                  {el.symbol}
                </span>
              ))}
            </div>
          )}
          <div className="winner__actions">
            <button ref={primaryRef} type="button" className="btn btn--solid" onClick={onMarkTested}>
              {t('markTested')}
            </button>
            <button type="button" className="btn" onClick={onSpinAgain}>
              {t('spinAgain')}
            </button>
            <button type="button" className="btn btn--link" onClick={onAbsent}>
              {t('absent')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
