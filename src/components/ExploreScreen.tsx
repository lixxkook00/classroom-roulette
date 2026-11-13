import { Suspense, lazy, useCallback, useMemo, useState, type FormEvent } from 'react'
import { fold, resolveGuess } from '../data/chem'
import { CATEGORY_ORDER, ELEMENTS, type Category, type Element } from '../data/elements'
import { NAME_VI_EXTRA } from '../data/facts.vi'
import { useI18n } from '../i18n'
import { QrIcon } from './chemText'
import { ElementDetail } from './ElementDetail'
import { useLandscape } from '../rotate'
import { studentUrl } from '../util'
import { PeriodicTable, type CellState } from './PeriodicTable'

// QR codes need the `qrcode` library only when a teacher opens the dialog.
const QrDialog = lazy(() => import('./QrDialog').then((m) => ({ default: m.QrDialog })))

/** Does a search box query match this element? (number, symbol, English or Vietnamese name, no accents needed) */
function matches(el: Element, q: string): boolean {
  const raw = q.trim()
  if (!raw) return false
  if (/^\d+$/.test(raw)) return el.z === Number(raw)
  if (el.symbol.toLowerCase() === raw.toLowerCase()) return true
  const f = fold(raw)
  if (!f) return false
  if (resolveGuess(raw) === el.z) return true
  return fold(el.name).startsWith(f) || fold(NAME_VI_EXTRA[el.symbol] ?? '').startsWith(f)
}

/** "Bảng tuần hoàn thông minh": students click any element to learn about it. */
export function ExploreScreen({ canShare }: { canShare: boolean }) {
  const { t, catLabel } = useI18n()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Category | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  const found = useMemo(() => ELEMENTS.filter((el) => matches(el, query)), [query])
  const landscape = useLandscape()

  const states = useMemo(() => {
    const s: Record<number, CellState> = {}
    const searching = query.trim() !== ''
    const hits = new Set(found.map((e) => e.z))
    for (const el of ELEMENTS) {
      if (searching) s[el.z] = hits.has(el.z) ? 'mine' : 'dim'
      else if (filter) s[el.z] = el.category === filter ? 'on' : 'dim'
      else s[el.z] = 'on'
    }
    return s
  }, [query, found, filter])

  const pick = useCallback((z: number) => setSelected(z), [])
  const close = useCallback(() => setSelected(null), [])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    if (found[0]) setSelected(found[0].z)
  }

  return (
    <div className="board">
      <header className="topbar">
        <div className="topbar__title">
          <h1 className="chalk-title">{t('exploreTitle')}</h1>
          <span className="chalk-sub">{t('exploreSub')}</span>
        </div>
        <form className="topbar__controls search" role="search" onSubmit={onSearch}>
          <label htmlFor="el-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <span className="search__box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="el-search"
              className="search__input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
            />
          </span>
          {query.trim() !== '' && found.length === 0 && <span className="muted">{t('noMatch')}</span>}
          {canShare && (
            <button type="button" className="btn btn--small qr-btn" onClick={() => setQrOpen(true)}>
              <QrIcon /> {t('share')}
            </button>
          )}
        </form>
      </header>

      <main className="spin-main">
        <div className="table-area">
          <PeriodicTable states={states} showTips={selected === null} onPick={pick}>
            <div className="legend legend--filter" role="group" aria-label={t('groupsAria')}>
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`legend__item legend__btn cat-text--${c}${filter === c ? ' legend__btn--on' : ''}`}
                  aria-pressed={filter === c}
                  onClick={() => setFilter((f) => (f === c ? null : c))}
                >
                  <i className={`legend__swatch cat--${c}`} />
                  {catLabel(c)}
                </button>
              ))}
            </div>
          </PeriodicTable>
        </div>
        {filter && (
          <button type="button" className="btn btn--link btn--small" onClick={() => setFilter(null)}>
            {t('filterAll')}
          </button>
        )}
        {landscape.available && !landscape.active && (
          <button type="button" className="btn btn--small rotate-cta" onClick={landscape.toggle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="7" y="2.5" width="10" height="17" rx="2" transform="rotate(-90 12 11)" />
              <path d="M3 17a9 9 0 0 0 9 4.5M12 21.5l-1.6-2.2M12 21.5l-2.4 1" />
            </svg>
            {t('rotateCta')}
          </button>
        )}
      </main>

      {selected !== null && <ElementDetail z={selected} onClose={close} onNavigate={setSelected} />}
      {qrOpen && (
        <Suspense fallback={null}>
          <QrDialog title={t('qrTable')} url={studentUrl('table')} onClose={() => setQrOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
