import { useState, type Dispatch, type SetStateAction } from 'react'
import { CATEGORY_ORDER, ELEMENTS, type Category } from '../data/elements'
import { useI18n } from '../i18n'
import { cleanElements, uid, type AppData, type ElementSet } from '../store'
import { QrIcon } from './chemText'
import { PeriodicTable, type CellState } from './PeriodicTable'
import { QrDialog } from './QrDialog'
import { studentUrl } from '../util'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  onPlay: (id: string) => void
}

/** "Bộ nguyên tố": the teacher builds lists of elements for the guessing game by clicking the table. */
export function ElementSetsPanel({ data, setData, onPlay }: Props) {
  const { t, catLabel } = useI18n()
  const sets = data.elementSets
  const [activeId, setActiveId] = useState<string | null>(sets[0]?.id ?? null)
  const [qrOpen, setQrOpen] = useState(false)
  const active = sets.find((s) => s.id === activeId) ?? null

  const update = (id: string, fn: (s: ElementSet) => ElementSet) =>
    setData((d) => ({ ...d, elementSets: d.elementSets.map((s) => (s.id === id ? fn(s) : s)) }))

  const create = () => {
    const set: ElementSet = { id: uid(), name: t('defaultSetName', { n: sets.length + 1 }), elements: [] }
    setData((d) => ({ ...d, elementSets: [...d.elementSets, set] }))
    setActiveId(set.id)
  }

  const remove = () => {
    if (!active || !window.confirm(t('confirmDeleteSet', { name: active.name }))) return
    const rest = sets.filter((s) => s.id !== active.id)
    setData((d) => ({ ...d, elementSets: d.elementSets.filter((s) => s.id !== active.id) }))
    setActiveId(rest[0]?.id ?? null)
  }

  const toggle = (z: number) => {
    if (!active) return
    update(active.id, (s) => ({ ...s, elements: s.elements.includes(z) ? s.elements.filter((x) => x !== z) : cleanElements([...s.elements, z]) }))
  }

  /** Category chip: adds the whole group, or removes it if it's all in already. */
  const toggleCategory = (c: Category) => {
    if (!active) return
    const zs = ELEMENTS.filter((e) => e.category === c).map((e) => e.z)
    const all = zs.every((z) => active.elements.includes(z))
    update(active.id, (s) => ({ ...s, elements: all ? s.elements.filter((z) => !zs.includes(z)) : cleanElements([...s.elements, ...zs]) }))
  }

  // 118 cells — cheap enough to rebuild on every render.
  const chosen = new Set(active?.elements ?? [])
  const states: Record<number, CellState> = {}
  for (const el of ELEMENTS) states[el.z] = chosen.has(el.z) ? 'mine' : 'dim'

  const shareUrl = (s: ElementSet) => studentUrl(`guess?set=${s.elements.join(',')}&name=${encodeURIComponent(s.name)}`)

  return (
    <div className="classes sets">
      <aside className="classes__aside">
        <nav aria-label={t('classesTabSets')} className="class-list">
          {sets.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`class-card${s.id === active?.id ? ' class-card--active' : ''}`}
              aria-current={s.id === active?.id ? 'true' : undefined}
              onClick={() => setActiveId(s.id)}
            >
              <span className="class-card__name">{s.name || '—'}</span>
              <span className="class-card__meta">{t('setCount', { n: s.elements.length })}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn--dashed" onClick={create}>
          + {t('newSet')}
        </button>
        <p className="backup__hint">{t('setsSub')}</p>
      </aside>

      <main className="classes__main set-editor">
        {!active ? (
          <div className="empty">
            <p>{t('noSets')}</p>
            <button type="button" className="btn btn--solid" onClick={create}>
              + {t('newSet')}
            </button>
          </div>
        ) : (
          <>
            <div className="class-head">
              <div className="stack stack--tight grow">
                <label htmlFor="set-name" className="sr-only">
                  {t('setName')}
                </label>
                <input
                  id="set-name"
                  className="chalk-input chalk-input--big set-editor__name"
                  value={active.name}
                  placeholder={t('setNamePlaceholder')}
                  onChange={(e) => update(active.id, (s) => ({ ...s, name: e.target.value }))}
                />
                <span className="muted">{active.elements.length ? t('setCount', { n: active.elements.length }) : t('setEmpty')}</span>
              </div>
              <div className="row row--wrap">
                <button type="button" className="btn btn--small btn--solid" onClick={() => onPlay(active.id)} disabled={!active.elements.length}>
                  {t('playSet')}
                </button>
                <button type="button" className="btn btn--small qr-btn" onClick={() => setQrOpen(true)} disabled={!active.elements.length}>
                  <QrIcon /> {t('shareSet')}
                </button>
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => update(active.id, (s) => ({ ...s, elements: cleanElements([...s.elements, ...ELEMENTS.slice(0, 20).map((e) => e.z)]) }))}
                >
                  {t('addRange')}
                </button>
                <button type="button" className="btn btn--small btn--warm" onClick={() => update(active.id, (s) => ({ ...s, elements: [] }))} disabled={!active.elements.length}>
                  {t('clearSet')}
                </button>
                <button type="button" className="btn btn--small btn--danger" onClick={remove}>
                  {t('deleteSet')}
                </button>
              </div>
            </div>

            <div className="table-area">
              <PeriodicTable states={states} showTips onPick={toggle}>
                <div className="legend legend--filter" role="group" aria-label={t('quickAdd')}>
                  {CATEGORY_ORDER.map((c) => {
                    const zs = ELEMENTS.filter((e) => e.category === c)
                    const all = zs.every((e) => active.elements.includes(e.z))
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`legend__item legend__btn cat-text--${c}${all ? ' legend__btn--on' : ''}`}
                        aria-pressed={all}
                        onClick={() => toggleCategory(c)}
                      >
                        <i className={`legend__swatch cat--${c}`} />
                        {catLabel(c)}
                      </button>
                    )
                  })}
                </div>
              </PeriodicTable>
            </div>
          </>
        )}
      </main>
      {qrOpen && active && <QrDialog title={`${t('qrGuess')} · ${active.name}`} url={shareUrl(active)} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
