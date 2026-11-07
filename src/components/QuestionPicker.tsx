import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { QuestionSet } from '../store'

interface Props {
  sets: QuestionSet[]
  activeId: string | null
  onChange: (id: string | null) => void
  onManage: () => void
  disabled?: boolean
  /** Round state for the chosen set (null when no set is chosen). */
  round: { active: boolean; left: number; total: number } | null
  onStartRound: () => void
  onEndRound: () => void
}

/** Floating button (bottom-left of "Trả lời câu hỏi") that chooses the question set. */
export function QuestionPicker({ sets, activeId, onChange, onManage, disabled, round, onStartRound, onEndRound }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = sets.find((s) => s.id === activeId) ?? null

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className="qdock">
      <div className={`qpick${open ? ' qpick--open' : ''}`} ref={rootRef}>
        <button
          type="button"
          className={`qpick__fab${active ? ' qpick__fab--on' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          title={t('qPickerLabel')}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
          <span className="qpick__text">
            <small>{t('qPickerLabel')}</small>
            <span>{active ? active.name : t('qPickerNone')}</span>
          </span>
          {active && <span className="qpick__count">{active.questions.length}</span>}
        </button>
        {open && (
          <div className="qpick__menu" role="menu">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!active}
              className={`qpick__item${!active ? ' qpick__item--on' : ''}`}
              onClick={() => choose(null)}
            >
              {t('qPickerNone')}
            </button>
            {sets.map((s) => (
              <button
                key={s.id}
                type="button"
                role="menuitemradio"
                aria-checked={s.id === activeId}
                className={`qpick__item${s.id === activeId ? ' qpick__item--on' : ''}`}
                onClick={() => choose(s.id)}
                disabled={s.questions.length === 0}
              >
                <span>{s.name || '—'}</span>
                <small>{t('qCount', { n: s.questions.length })}</small>
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className="qpick__item qpick__item--link"
              onClick={() => {
                setOpen(false)
                onManage()
              }}
            >
              {t('qPickerManage')}
            </button>
          </div>
        )}
      </div>
      {round &&
        (round.active ? (
          <div className="round">
            <div className="round__info">
              <small>{t('roundLabel')}</small>
              <span>{round.left > 0 ? t('roundLeft', { n: round.left, total: round.total }) : t('roundAllDone')}</span>
              <span className="round__bar" aria-hidden="true">
                <span style={{ width: `${((round.total - round.left) / Math.max(1, round.total)) * 100}%` }} />
              </span>
            </div>
            <button type="button" className="round__end" onClick={onEndRound} disabled={disabled} title={t('roundEnd')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>{t('roundEnd')}</span>
            </button>
          </div>
        ) : (
          <button type="button" className="round__start" onClick={onStartRound} disabled={disabled}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l12-7.5z" />
            </svg>
            {t('roundStart')}
          </button>
        ))}
    </div>
  )
}
