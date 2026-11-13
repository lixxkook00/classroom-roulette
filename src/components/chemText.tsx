import { Fragment, type ReactNode } from 'react'
import type { Cond, ElectronConfig, Equation } from '../data/chem'
import { useI18n } from '../i18n'

/** "Ca(OH)2" → Ca(OH)<sub>2</sub>; a leading number is the coefficient and stays full size. */
export function Species({ text }: { text: string }) {
  const m = /^(\d*)(.*)$/.exec(text)!
  const parts: ReactNode[] = []
  const re = /(\d+)|([^\d]+)/g
  let r: RegExpExecArray | null
  let i = 0
  while ((r = re.exec(m[2]))) parts.push(r[1] ? <sub key={i++}>{r[1]}</sub> : <Fragment key={i++}>{r[2]}</Fragment>)
  return (
    <span className="species">
      {m[1] && <span className="species__coef">{m[1]}</span>}
      {parts}
    </span>
  )
}

export function EquationView({ eq, cond }: Equation) {
  const { t } = useI18n()
  const [left, arrow, right] = eq.split(/ (→|⇌) /)
  const side = (s: string) =>
    s.split(' + ').map((sp, i) => (
      <Fragment key={i}>
        {i > 0 && <span className="eq__plus">+</span>}
        <Species text={sp} />
      </Fragment>
    ))
  const condLabel: Record<Cond, string> = {
    heat: 't°',
    cat: t('condCat'),
    light: t('condLight'),
    spark: t('condSpark'),
    concHeat: t('condConcHeat'),
    electro: t('condElectro'),
  }
  return (
    <span className="eq">
      {side(left)}
      <span className="eq__arrow">
        {cond && <span className="eq__cond">{condLabel[cond]}</span>}
        <span>{arrow === '⇌' ? '⇌' : '⟶'}</span>
      </span>
      {side(right)}
    </span>
  )
}

export function ConfigView({ config }: { config: ElectronConfig }) {
  return (
    <span className="econf">
      {config.core && <span className="econf__core">[{config.core}]</span>}
      {config.parts.map((p, i) => (
        <span key={i} className="econf__sub">
          {p.n}
          {p.l}
          <sup>{p.e}</sup>
        </span>
      ))}
    </span>
  )
}

export function SpeakerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

export function QrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  )
}
