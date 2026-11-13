import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { electronConfig, maskFact, matterState, resolveGuess } from '../data/chem'
import { ELEMENTS } from '../data/elements'
import { useI18n } from '../i18n'
import { playLock, playTick, playWin } from '../sound'
import { englishName } from '../data/pronunciation'
import { canSpeak, speakEnglish, useAccent } from '../speech'
import type { ElementSet } from '../store'
import { isTypingSpace, randomInt } from '../util'
import { ConfigView, QrIcon, SpeakerIcon } from './chemText'
import { ChalkSelect } from './controls'
import { studentUrl } from '../util'

// QR codes need the `qrcode` library only when a teacher opens the dialog.
const QrDialog = lazy(() => import('./QrDialog').then((m) => ({ default: m.QrDialog })))

/** A set that came in through a shared link / QR code. */
export interface SharedSet {
  name: string
  elements: number[]
}

interface Props {
  /** The teacher's own sets (empty on student devices). */
  sets: ElementSet[]
  shared: SharedSet | null
  /** Open this set straight away (from "Chơi bộ này"). */
  initialSetId: string | null
  canShare: boolean
}

/** 'easy' | 'medium' | 'hard' | 'all' | 'shared' | 'set:<id>' */
type Level = string
const LEVEL_MAX: Record<string, number> = { easy: 20, medium: 36, hard: 86, all: 118 }
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
const LEVEL_KEY = 'element-roulette:guess-level'
const HINTS = 9
const MAX_POINTS = 10

type Status = 'playing' | 'won' | 'revealed'

const STATE_KEY = { gas: 'stateGas', liquid: 'stateLiquid', solid: 'stateSolid', unknown: 'stateUnknown' } as const

function storedLevel(): Level | null {
  try {
    return localStorage.getItem(LEVEL_KEY)
  } catch {
    return null
  }
}

/** "Đoán nguyên tố": clues appear one at a time, from hard to easy; guess early for more points. */
export function GuessScreen({ sets, shared, initialSetId, canShare }: Props) {
  const { t, elName, elFact, catLabel, groupShort } = useI18n()
  const [accent] = useAccent()

  /** Elements a level draws from. */
  const poolFor = useCallback(
    (lvl: Level): number[] => {
      if (lvl === 'shared' && shared) return shared.elements
      if (lvl.startsWith('set:')) {
        const set = sets.find((s) => `set:${s.id}` === lvl)
        if (set && set.elements.length) return set.elements
      }
      return range(LEVEL_MAX[lvl] ?? LEVEL_MAX.medium)
    },
    [sets, shared],
  )

  const valid = (lvl: Level | null): lvl is Level =>
    !!lvl && (lvl in LEVEL_MAX || (lvl === 'shared' && !!shared) || sets.some((s) => `set:${s.id}` === lvl && s.elements.length > 0))

  const [level, setLevel] = useState<Level>(() => {
    if (shared) return 'shared'
    if (initialSetId && valid(`set:${initialSetId}`)) return `set:${initialSetId}`
    const stored = storedLevel()
    return valid(stored) ? stored : 'medium'
  })

  const recent = useRef<number[]>([])
  const pickTarget = useCallback(
    (lvl: Level) => {
      const pool = poolFor(lvl)
      let z = pool[randomInt(pool.length)]
      for (let i = 0; i < 20 && pool.length > 1 && recent.current.includes(z); i++) z = pool[randomInt(pool.length)]
      recent.current = [z, ...recent.current].slice(0, Math.max(0, Math.min(10, pool.length - 1)))
      return z
    },
    [poolFor],
  )

  const [target, setTarget] = useState(() => {
    const pool = poolFor(level)
    return pool[randomInt(pool.length)]
  })
  const [qrOpen, setQrOpen] = useState(false)
  const [shown, setShown] = useState(1)
  const [status, setStatus] = useState<Status>('playing')
  const [guess, setGuess] = useState('')
  const [wrong, setWrong] = useState<number[]>([])
  const [feedback, setFeedback] = useState<{ kind: 'bad' | 'warn'; text: string } | null>(null)
  const [score, setScore] = useState({ solved: 0, played: 0, points: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const el = ELEMENTS[target - 1]
  const points = MAX_POINTS - (shown - 1)

  const hints = useMemo<{ label: string; value: ReactNode; wide?: boolean }[]>(() => {
    const config = electronConfig(target)
    return [
      { label: t('slotCategory'), value: <span className={`cat-text--${el.category}`}>{catLabel(el.category)}</span> },
      { label: t('stateLabel'), value: t(STATE_KEY[matterState(target)]) },
      { label: t('tipPeriod'), value: el.period },
      { label: el.group ? t('tipGroup') : t('fBlock'), value: groupShort(el) },
      { label: t('econf'), value: <ConfigView config={config} />, wide: true },
      { label: t('tipMass'), value: el.mass },
      { label: t('funFact'), value: maskFact(elFact(el), el), wide: true },
      { label: t('atomicNumber'), value: el.z },
      { label: t('hintLetter'), value: `${el.symbol[0]}…` },
    ]
  }, [target, el, t, catLabel, groupShort, elFact])

  const newPuzzle = useCallback(
    (lvl: Level = level) => {
      setTarget(pickTarget(lvl))
      setShown(1)
      setStatus('playing')
      setGuess('')
      setWrong([])
      setFeedback(null)
      inputRef.current?.focus({ preventScroll: true })
    },
    [level, pickTarget],
  )

  const nextHint = useCallback(() => {
    if (status !== 'playing' || shown >= HINTS) return
    playLock()
    setShown(shown + 1)
  }, [status, shown])

  const reveal = () => {
    if (status !== 'playing') return
    setStatus('revealed')
    setFeedback(null)
    setShown(HINTS)
    setScore((s) => ({ ...s, played: s.played + 1 }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (status !== 'playing' || !guess.trim()) return
    const z = resolveGuess(guess)
    if (z === null) {
      setFeedback({ kind: 'warn', text: t('unknownGuess') })
      return
    }
    if (z === target) {
      setStatus('won')
      setFeedback(null)
      setScore((s) => ({ solved: s.solved + 1, played: s.played + 1, points: s.points + points }))
      playWin()
      return
    }
    if (wrong.includes(z)) {
      setFeedback({ kind: 'warn', text: t('alreadyGuessed') })
      return
    }
    // A wrong guess opens the next clue, so the class always moves forward.
    playTick()
    setWrong((w) => [...w, z])
    setFeedback({ kind: 'bad', text: t('wrongGuess') })
    setGuess('')
    setShown((n) => Math.min(HINTS, n + 1))
  }

  // Space: next hint (or a new puzzle once this one is over) — not while typing a guess.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingSpace(e)) return
      e.preventDefault()
      if (status === 'playing') nextHint()
      else newPuzzle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, nextHint, newPuzzle])

  const changeLevel = (lvl: string) => {
    setLevel(lvl)
    if (lvl !== 'shared') {
      try {
        localStorage.setItem(LEVEL_KEY, lvl)
      } catch {
        /* ignore */
      }
    }
    newPuzzle(lvl)
  }

  const levelOptions = [
    ...(shared ? [{ value: 'shared', label: shared.name || t('levelShared'), hint: t('setCount', { n: shared.elements.length }) }] : []),
    ...sets.filter((s) => s.elements.length > 0).map((s) => ({ value: `set:${s.id}`, label: s.name, hint: t('setCount', { n: s.elements.length }) })),
    { value: 'easy', label: t('levelEasy') },
    { value: 'medium', label: t('levelMedium') },
    { value: 'hard', label: t('levelHard') },
    { value: 'all', label: t('levelAll') },
  ]

  /** Link for students: plays the same set when it's a custom one. */
  const shareUrl = () => {
    const custom = level === 'shared' ? shared : sets.find((s) => `set:${s.id}` === level)
    if (!custom) return studentUrl('guess')
    const name = custom.name ? `&name=${encodeURIComponent(custom.name)}` : ''
    return studentUrl(`guess?set=${custom.elements.join(',')}${name}`)
  }

  const say = () => speakEnglish(englishName(el.symbol, el.name, accent), { accent })

  const done = status !== 'playing'

  return (
    <div className="board">
      <header className="topbar">
        <div className="topbar__title">
          <h1 className="chalk-title">{t('guessTitle')}</h1>
          <span className="chalk-sub">{t('guessSub')}</span>
        </div>
        <div className="topbar__controls">
          <span className="chalk-label" aria-hidden="true">
            {t('levelLabel')}
          </span>
          <ChalkSelect id="guess-level" label={t('levelLabel')} value={level} onChange={changeLevel} options={levelOptions} />
          {canShare && (
            <button type="button" className="btn btn--small qr-btn" onClick={() => setQrOpen(true)}>
              <QrIcon /> {t('share')}
            </button>
          )}
          <span className="guess__score" aria-live="polite">
            ✓ {score.solved}/{score.played} · {score.points}
          </span>
        </div>
      </header>

      <main className="spin-main guess-main">
        <div className="guess">
          <div className="guess__left">
            <div className={`guess__tile${done ? ` guess__tile--open cat--${el.category}` : ''}`} key={`${target}-${done}`}>
              {done ? (
                <>
                  <div className="guess__tile-top">
                    <span>{el.z}</span>
                    <span>{el.mass}</span>
                  </div>
                  <span className="guess__tile-sym">{el.symbol}</span>
                  <span className="guess__tile-name">{elName(el)}</span>
                </>
              ) : (
                <span className="mcard__q" aria-hidden="true">
                  ?
                </span>
              )}
            </div>
            {status === 'playing' ? (
              <span className="guess__points">{t('pointsLeft', { n: points })}</span>
            ) : status === 'won' ? (
              <span className="guess__result guess__result--win">
                {t('correct')} {t('scoreGot', { n: points })}
              </span>
            ) : (
              <span className="guess__result">{t('answerTitle')}</span>
            )}
            {done && (
              <button
                type="button"
                className="speak-btn speak-btn--text"
                onClick={say}
                disabled={!canSpeak}
                title={canSpeak ? t('pronounce') : t('noSpeech')}
              >
                <SpeakerIcon /> {englishName(el.symbol, el.name, accent)}
              </button>
            )}
          </div>

          <ol className="guess__hints">
            {hints.map((h, i) => {
              const open = i < shown
              return (
                <li key={i} className={`hint${open ? ' hint--open' : ''}${h.wide ? ' hint--wide' : ''}${i === shown - 1 && !done ? ' hint--new' : ''}`}>
                  <span className="hint__label">
                    <span className="hint__n">{i + 1}</span>
                    {open ? h.label : t('hintN', { n: i + 1 })}
                  </span>
                  <span className="hint__value">{open ? (i === 6 && done ? elFact(el) : h.value) : '? ? ?'}</span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="spin-bar guess-bar">
          <form className="guess__form" onSubmit={submit}>
            <label htmlFor="guess-input" className="sr-only">
              {t('yourGuess')}
            </label>
            <input
              id="guess-input"
              ref={inputRef}
              className="chalk-input guess__input"
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value)
                setFeedback(null)
              }}
              placeholder={done ? t('answerIs', { name: elName(el), sym: el.symbol }) : t('yourGuess')}
              disabled={done}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn--solid btn--small" disabled={done || !guess.trim()}>
              {t('guessBtn')}
            </button>
            {feedback && (
              <span className={`guess__feedback guess__feedback--${feedback.kind}`} role="status">
                {feedback.text}
              </span>
            )}
          </form>

          {wrong.length > 0 && (
            <div className="guess__wrong" aria-label={t('wrongList')}>
              {wrong.map((z) => (
                <span key={z} className="mini-tile mini-tile--tested" title={elName(ELEMENTS[z - 1])}>
                  {ELEMENTS[z - 1].symbol}
                </span>
              ))}
            </div>
          )}

          <div className="spin-bar__actions">
            {done ? (
              <button type="button" className="btn btn--big btn--solid" onClick={() => newPuzzle()}>
                {t('newPuzzle')}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn--link btn--small" onClick={reveal}>
                  {t('showAnswer')}
                </button>
                <button type="button" className="btn btn--big" onClick={nextHint} disabled={shown >= HINTS}>
                  {t('nextHint')}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      {qrOpen && (
        <Suspense fallback={null}>
          <QrDialog title={t('qrGuess')} url={shareUrl()} onClose={() => setQrOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
