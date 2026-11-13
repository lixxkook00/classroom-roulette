import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { electronConfig, equationsFor, matterState, neutronCount, shellCounts } from '../data/chem'
import { ELEMENTS } from '../data/elements'
import { NAME_VI_EXTRA } from '../data/facts.vi'
import { lookOf } from '../data/looks'
import { englishName, ipa } from '../data/pronunciation'
import { useI18n } from '../i18n'
import { canSpeak, speakEnglish, useAccent, useHasVoice } from '../speech'
import { BohrAtom } from './BohrAtom'
import type { StageView } from './atom3d/ElementStage'
import { ConfigView, EquationView, SpeakerIcon } from './chemText'

interface Props {
  z: number
  onClose: () => void
  onNavigate: (z: number) => void
}

// WebGL stage (three.js) loads on demand; the SVG atom shows until it arrives.
const ElementStage = lazy(() => import('./atom3d/ElementStage'))
const VIEW_KEY = 'element-roulette:atom-view'
const SHELL_LETTERS = ['K', 'L', 'M', 'N', 'O', 'P', 'Q']
const FORM_KEY = { nugget: 'formNugget', ingot: 'formIngot', crystal: 'formCrystal', powder: 'formPowder', gas: 'formGas', liquid: 'formLiquid', droplets: 'formDroplets', unknown: 'formUnknown' } as const

const STATE_KEY = { gas: 'stateGas', liquid: 'stateLiquid', solid: 'stateSolid', unknown: 'stateUnknown' } as const

const ICON: Record<string, ReactNode> = {
  z: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M9 10l3-2" />,
  mass: <path d="M6 20h12l-2-11H8L6 20zM9 9a3 3 0 0 1 6 0" />,
  period: <path d="M4 6h16M4 12h16M4 18h16" />,
  group: <path d="M6 4v16M12 4v16M18 4v16" />,
  gas: <path d="M5 15a4 4 0 0 1 2-7.5A5 5 0 0 1 17 8a4 4 0 0 1 1 7.9M8 19h8M10 22h4" />,
  liquid: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />,
  solid: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  unknown: <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />,
  flask: <path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.5-2.5L14 9V3M7.5 15h9" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
}

function Icon({ name }: { name: string }) {
  return (
    <svg className="lab-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  )
}

function Fact({ icon, label, children, wide }: { icon: string; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`lab-card${wide ? ' lab-card--wide' : ''}`}>
      <dt>
        <Icon name={icon} />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Element card for the smart periodic table: atom model, facts, pronunciation and equations. */
export function ElementDetail({ z, onClose, onNavigate }: Props) {
  const { t, lang, elFact, catLabel, groupShort } = useI18n()
  const el = ELEMENTS[z - 1]
  const config = electronConfig(z)
  const shells = shellCounts(z)
  const equations = equationsFor(el)
  const state = matterState(z)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [accent, setAccent] = useAccent()
  const hasVoice = useHasVoice(accent)
  const [speaking, setSpeaking] = useState<'normal' | 'slow' | null>(null)
  const name = englishName(el.symbol, el.name, accent)
  const look = lookOf(z)
  const [view, setViewState] = useState<StageView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'real' ? 'real' : 'atom'
    } catch {
      return 'atom'
    }
  })
  const setView = (v: StageView) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    // Focus after the popup has painted: focusing forces a layout that would delay its first frame.
    const raf = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && z < ELEMENTS.length) onNavigate(z + 1)
      else if (e.key === 'ArrowLeft' && z > 1) onNavigate(z - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [z, onClose, onNavigate])

  const say = (slow: boolean) => {
    if (!speakEnglish(name, { slow, accent })) return
    setSpeaking(slow ? 'slow' : 'normal')
    window.setTimeout(() => setSpeaking(null), slow ? 2400 : 1000)
  }

  const viName = lang === 'vi' ? NAME_VI_EXTRA[el.symbol] : undefined

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="edetail__nav edetail__nav--prev" aria-label={t('prevElement')} disabled={z === 1} onClick={() => onNavigate(z - 1)}>
        ‹
      </button>
      <div className={`edetail cat--${el.category}`} role="dialog" aria-modal="true" aria-labelledby="edetail-name">
        <button ref={closeRef} type="button" className="icon-btn edetail__close" aria-label={t('close')} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Left: the 3-D stage — atom model or the element in real life */}
        <div className="edetail__atom">
          <div className="seg estage__seg" role="group" aria-label={t('viewLabel')}>
            {(['atom', 'real'] as const).map((v) => (
              <button key={v} type="button" className={`seg__btn${view === v ? ' seg__btn--on' : ''}`} aria-pressed={view === v} onClick={() => setView(v)}>
                {t(v === 'atom' ? 'viewAtom' : 'viewReal')}
              </button>
            ))}
          </div>
          <div className="estage">
            <Suspense fallback={view === 'atom' ? <BohrAtom z={z} symbol={el.symbol} /> : <div className="estage__wait" />}>
              <ElementStage z={z} view={view} shellLabels={SHELL_LETTERS} />
            </Suspense>
            <span className="estage__hint">{t('dragHint')}</span>
          </div>
          {view === 'real' ? (
            <div className="elook">
              <div className="elook__chips">
                <span className={`chip cat-text--${el.category}`}>{t(FORM_KEY[look.form])}</span>
                <span className="chip">{t(STATE_KEY[state])}</span>
                {look.radioactive && <span className="chip chip--warn">☢ {t('radioactive')}</span>}
              </div>
              <p className="elook__text">{lang === 'vi' ? look.vi : look.en}</p>
            </div>
          ) : (
            <>
              <div className="particles">
                <span className="particle particle--p">
                  <b>{el.z}</b> p<sup>+</sup>
                </span>
                <span className="particle particle--n">
                  <b>{neutronCount(el)}</b> n<sup>0</sup>
                </span>
                <span className="particle particle--e">
                  <b>{el.z}</b> e<sup>−</sup>
                </span>
              </div>
              <span className="shells" title={t('shellsLabel')}>
                {shells.map((n, i) => (
                  <span key={i}>
                    <small>{SHELL_LETTERS[i]}</small>
                    {n}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>

        {/* Right: name, pronunciation, facts */}
        <div className="edetail__body">
          <div className="edetail__head">
            <div className="edetail__tile">
              <span className="edetail__tile-z">{el.z}</span>
              <span className="edetail__tile-sym">{el.symbol}</span>
              <span className="edetail__tile-mass">{el.mass}</span>
            </div>
            <div className="edetail__titles">
              <h2 id="edetail-name" className="edetail__name">
                {name}
                {viName && <span className="edetail__vi"> ({viName})</span>}
              </h2>
              <div className="pron">
                <span className="pron__ipa" lang="en">
                  {ipa(el.symbol, accent)}
                </span>
                <div className="accent" role="group" aria-label={t('accentLabel')}>
                  {(['uk', 'us'] as const).map((a) => (
                    <button key={a} type="button" className={`accent__btn${accent === a ? ' accent__btn--on' : ''}`} aria-pressed={accent === a} onClick={() => setAccent(a)}>
                      {a === 'uk' ? 'UK' : 'US'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`speak-btn${speaking === 'normal' ? ' speak-btn--on' : ''}`}
                  onClick={() => say(false)}
                  disabled={!canSpeak}
                  aria-label={`${t('pronounce')}: ${name}`}
                  title={canSpeak ? t('pronounce') : t('noSpeech')}
                >
                  <SpeakerIcon />
                </button>
                <button
                  type="button"
                  className={`speak-btn speak-btn--text${speaking === 'slow' ? ' speak-btn--on' : ''}`}
                  onClick={() => say(true)}
                  disabled={!canSpeak}
                  title={canSpeak ? t('pronounceSlow') : t('noSpeech')}
                >
                  {t('pronounceSlow')}
                </button>
              </div>
              {canSpeak && !hasVoice && <span className="pron__note">{t(accent === 'uk' ? 'noVoiceUk' : 'noVoiceUs')}</span>}
              <span className={`edetail__cat cat-text--${el.category}`}>{catLabel(el.category)}</span>
            </div>
          </div>

          <dl className="lab-grid">
            <Fact icon="z" label={t('atomicNumber')}>
              {el.z}
            </Fact>
            <Fact icon="mass" label={t('tipMass')}>
              {el.mass}
            </Fact>
            <Fact icon="period" label={t('tipPeriod')}>
              {el.period}
            </Fact>
            <Fact icon="group" label={el.group ? t('tipGroup') : t('fBlock')}>
              {groupShort(el)}
            </Fact>
            <Fact icon={state} label={t('stateLabel')}>
              {t(STATE_KEY[state])}
            </Fact>
            <Fact icon="z" label={`${t('econf')}${config.predicted ? ` ${t('predicted')}` : ''}`} wide>
              <ConfigView config={config} />
            </Fact>
          </dl>

          <div className="lab-note">
            <span className="lab-note__label">
              <Icon name="bulb" />
              {t('funFact')}
            </span>
            <p>{elFact(el)}</p>
          </div>

          <div className="lab-book">
            <span className="lab-book__label">
              <Icon name="flask" />
              {t('equations')}
            </span>
            {equations.length > 0 ? (
              <ul>
                {equations.map((e, i) => (
                  <li key={i}>
                    <EquationView {...e} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{el.category === 'noble-gas' ? t('noEqNoble') : t('noEqRare')}</p>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="edetail__nav edetail__nav--next" aria-label={t('nextElement')} disabled={z === ELEMENTS.length} onClick={() => onNavigate(z + 1)}>
        ›
      </button>
    </div>
  )
}
