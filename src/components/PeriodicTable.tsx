import { memo, useEffect, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { ELEMENTS, type Element } from '../data/elements'
import { useI18n } from '../i18n'

export type CellState = 'off' | 'on' | 'tested' | 'absent' | 'glow' | 'trail' | 'picked' | 'mine' | 'dim'

export interface Owner {
  order: number
  name: string
  status: 'on' | 'tested' | 'absent'
}

interface Props {
  /** Visual state for each atomic number. Missing = 'off'. */
  states: Record<number, CellState>
  /** Student who owns each element (missing = nobody). Leave out on screens without students. */
  owners?: Record<number, Owner>
  /** Tooltips are hidden while the wheel is spinning. */
  showTips: boolean
  /** Shown in the empty gap at the top of the table (rows 1–3, groups 3–12). */
  children?: ReactNode
  /** Makes every element a button (smart periodic table). */
  onPick?: (z: number) => void
}

interface Hover {
  el: Element
  rect: DOMRect
}

const TIP_W = 290

function Tooltip({ el, rect, owner, showOwner }: Hover & { owner?: Owner; showOwner: boolean }) {
  const { t, elName, catLabel, groupShort } = useI18n()
  const below = rect.top < 250
  const left = Math.min(Math.max(rect.left + rect.width / 2, TIP_W / 2 + 8), window.innerWidth - TIP_W / 2 - 8)
  const style = below ? { left, top: rect.bottom + 10 } : { left, top: rect.top - 10 }

  return (
    <div className={`etip${below ? ' etip--below' : ''}`} style={style} role="tooltip">
      <div className="etip__head">
        <div className={`etip__tile cat--${el.category}`}>
          <span className="etip__z">{el.z}</span>
          <span className="etip__sym">{el.symbol}</span>
        </div>
        <div className="etip__title">
          <span className="etip__name">{elName(el)}</span>
          <span className={`etip__cat cat-text--${el.category}`}>{catLabel(el.category)}</span>
        </div>
      </div>
      <dl className="etip__facts">
        <div>
          <dt>{t('tipMass')}</dt>
          <dd>{el.mass}</dd>
        </div>
        <div>
          <dt>{t('tipPeriod')}</dt>
          <dd>{el.period}</dd>
        </div>
        <div>
          <dt>{el.group ? t('tipGroup') : t('fBlock')}</dt>
          <dd>{groupShort(el)}</dd>
        </div>
      </dl>
      {showOwner && (
        <div className="etip__owner">
          {owner ? (
            <>
              <span className="etip__student">
                #{owner.order} · {owner.name}
              </span>
              {owner.status === 'tested' && <span className="badge">{t('tipTested')}</span>}
              {owner.status === 'absent' && <span className="badge">{t('tipAbsent')}</span>}
            </>
          ) : (
            <span className="muted">{t('tipNoStudent')}</span>
          )}
        </div>
      )}
    </div>
  )
}

/** Grid position plus an entrance delay that sweeps diagonally from H to the bottom-right. */
const cellStyle = (el: Element): CSSProperties =>
  ({ gridRow: el.row, gridColumn: el.col, '--d': `${Math.round((el.col + el.row * 1.6) * 16)}ms` }) as CSSProperties

/** One element tile. Memoised so a spin tick only re-renders the few cells whose state changed. */
const Cell = memo(function Cell({ el, state, hovered, label, onPick }: { el: Element; state: CellState; hovered: boolean; label?: string; onPick?: (z: number) => void }) {
  const classes = ['cell', `cell--${state}`]
  if (state === 'on' || state === 'trail' || state === 'mine' || state === 'dim') classes.push(`cat--${el.category}`)
  if (hovered) classes.push('cell--hover')
  const inner = (
    <>
      <span className="cell__num">{el.z}</span>
      <span className="cell__sym">{el.symbol}</span>
    </>
  )
  return onPick ? (
    <button type="button" data-z={el.z} className={`${classes.join(' ')} cell--btn`} style={cellStyle(el)} aria-label={label} onClick={() => onPick(el.z)}>
      {inner}
    </button>
  ) : (
    <div data-z={el.z} className={classes.join(' ')} style={cellStyle(el)}>
      {inner}
    </div>
  )
})

function PeriodicTableImpl({ states, owners, showTips, children, onPick }: Props) {
  const { t, elName } = useI18n()
  const [hover, setHover] = useState<Hover | null>(null)
  // Cells fly in once when the table appears (mode switch, class switch, page load).
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setEntering(false), 1400)
    return () => window.clearTimeout(id)
  }, [])

  const onOver = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-z]')
    if (!cell) return setHover(null)
    const z = Number(cell.dataset.z)
    if (hover?.el.z !== z) setHover({ el: ELEMENTS[z - 1], rect: cell.getBoundingClientRect() })
  }

  return (
    <>
      <div
        className={`ptable${entering ? ' ptable--enter' : ''}`}
        role={onPick ? 'group' : 'img'}
        aria-label={onPick ? t('exploreTitle') : t('tableAria')}
        onPointerOver={onOver}
        onPointerLeave={() => setHover(null)}
      >
        {ELEMENTS.map((el) => (
          <Cell key={el.z} el={el} state={states[el.z] ?? 'off'} hovered={showTips && hover?.el.z === el.z} label={onPick ? `${el.z} ${el.symbol} ${elName(el)}` : undefined} onPick={onPick} />
        ))}
        {children && <div className="ptable__inset">{children}</div>}
        <div className="cell cell--marker" style={{ gridRow: 6, gridColumn: 3 }} aria-hidden="true">
          <span className="cell__sym">57–71</span>
        </div>
        <div className="cell cell--marker" style={{ gridRow: 7, gridColumn: 3 }} aria-hidden="true">
          <span className="cell__sym">89–103</span>
        </div>
      </div>
      {showTips && hover && <Tooltip key={hover.el.z} {...hover} owner={owners?.[hover.el.z]} showOwner={!!owners} />}
    </>
  )
}

export const PeriodicTable = memo(PeriodicTableImpl)
