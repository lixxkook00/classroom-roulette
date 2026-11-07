import { useEffect } from 'react'
import { useI18n } from '../i18n'
import type { QuestionRound } from '../store'

interface Props {
  round: QuestionRound
  setName: string
  className: string
  /** Questions in the set that were never answered this round. */
  remaining: number
  onNewRound: () => void
  onClose: () => void
}

/** End-of-round summary: score, who answered what, and a CSV for the grade book. */
export function RoundSummary({ round, setName, className, remaining, onNewRound, onClose }: Props) {
  const { t, locale } = useI18n()
  const right = round.results.filter((r) => r.correct).length
  const wrong = round.results.length - right
  const pct = round.results.length ? Math.round((right / round.results.length) * 100) : 0
  const time = (iso: string) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = [t('colNo'), t('colStudent'), t('qText'), t('roundResult'), t('roundTime')]
    const rows = round.results.map((r, i) => [String(i + 1), r.studentName, r.questionText, r.correct ? t('resultRight') : t('resultWrong'), time(r.at)])
    const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${className}-${setName}-${round.startedAt.slice(0, 10)}.csv`.replace(/[\\/:*?"<>|]+/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="summary" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <h2 id="summary-title" className="chalk-title chalk-title--md">
          {t('summaryTitle')}
        </h2>
        <span className="summary__sub">
          {className} · {setName}
        </span>

        <div className="summary__stats">
          <div className="stat">
            <b>{round.results.length}</b>
            <span>{t('statAsked')}</span>
          </div>
          <div className="stat stat--right">
            <b>{right}</b>
            <span>{t('resultRight')}</span>
          </div>
          <div className="stat stat--wrong">
            <b>{wrong}</b>
            <span>{t('resultWrong')}</span>
          </div>
          <div className="stat">
            <b>{pct}%</b>
            <span>{t('statAccuracy')}</span>
          </div>
        </div>
        {round.results.length > 0 && (
          <div className="summary__bar" aria-hidden="true">
            <span style={{ flexGrow: right }} className="summary__bar-right" />
            <span style={{ flexGrow: wrong }} className="summary__bar-wrong" />
          </div>
        )}
        {remaining > 0 && <p className="muted">{t('summaryRemaining', { n: remaining })}</p>}

        {round.results.length === 0 ? (
          <p className="muted">{t('summaryEmpty')}</p>
        ) : (
          <ol className="summary__list">
            {round.results.map((r, i) => (
              <li key={i} className={r.correct ? 'is-right' : 'is-wrong'}>
                <span className="summary__mark" aria-label={r.correct ? t('resultRight') : t('resultWrong')}>
                  {r.correct ? '✓' : '✗'}
                </span>
                <span className="summary__who">{r.studentName}</span>
                <span className="summary__q">{r.questionText}</span>
                <span className="summary__time">{time(r.at)}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="summary__actions">
          {round.results.length > 0 && (
            <button type="button" className="btn btn--small" onClick={downloadCsv}>
              {t('downloadCsv')}
            </button>
          )}
          <button type="button" className="btn btn--link btn--small" onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className="btn btn--solid btn--small" onClick={onNewRound}>
            {t('roundNew')}
          </button>
        </div>
      </div>
    </div>
  )
}
