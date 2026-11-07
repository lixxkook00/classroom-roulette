import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { hashPin } from '../pin'
import { Switch } from './controls'

interface Props {
  onUnlock: (remember: boolean) => void
  onClose: () => void
}

export function PinDialog({ onUnlock, onClose }: Props) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [remember, setRemember] = useState(true)
  const [wrong, setWrong] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (hashPin(pin) === __TEACHER_PIN_HASH__) onUnlock(remember)
    else {
      setWrong((n) => n + 1)
      setPin('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pin" role="dialog" aria-modal="true" aria-labelledby="pin-title" onSubmit={submit}>
        <svg className="pin__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </svg>
        <h2 id="pin-title" className="chalk-title chalk-title--md">
          {t('pinTitle')}
        </h2>
        <p className="muted">{t('pinBody')}</p>
        <label htmlFor="pin-input" className="sr-only">
          {t('pinLabel')}
        </label>
        <input
          id="pin-input"
          ref={inputRef}
          key={wrong}
          className={`chalk-input pin__input${wrong ? ' pin__input--wrong' : ''}`}
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder={t('pinLabel')}
          autoComplete="current-password"
        />
        {wrong > 0 && (
          <span className="pin__error" role="alert">
            {t('pinWrong')}
          </span>
        )}
        <Switch checked={remember} onChange={setRemember}>
          {t('pinRemember')}
        </Switch>
        <div className="row pin__actions">
          <button type="button" className="btn btn--link btn--small" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn--solid btn--small" disabled={!pin.trim()}>
            {t('pinUnlock')}
          </button>
        </div>
      </form>
    </div>
  )
}
