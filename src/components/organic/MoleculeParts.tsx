import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { MOLECULES, type AtomKind, type Lesson, type Molecule } from '../../data/organic'
import { playLock, playTick, playWin } from '../../sound'
import { Molecule3D } from './Molecule3D'
import { Chem } from './shared'
import { formulaOf, HILL, soundOn, UI, useL } from './labKit'

/* ---------- Part: the lesson's molecule ---------- */
export function MoleculePart({ lesson }: { lesson: Lesson }) {
  const L = useL()
  const mol = MOLECULES[lesson.molecule]
  const [formula, setFormula] = useState(false)
  const [group, setGroup] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearInterval(timer.current), [])

  const order = useMemo(() => [...mol.atoms].sort((a, b) => HILL.indexOf(a.kind) - HILL.indexOf(b.kind)), [mol])
  const counted = new Map(order.slice(0, count).map((a, i) => [a.id, i + 1]))
  const tally: Partial<Record<AtomKind, number>> = {}
  for (const a of order.slice(0, count)) tally[a.kind] = (tally[a.kind] ?? 0) + 1
  const kinds = HILL.filter((k) => mol.atoms.some((a) => a.kind === k))

  const startCount = () => {
    window.clearInterval(timer.current)
    setGroup(false)
    setPicked(null)
    let n = 0
    setCount(0)
    timer.current = window.setInterval(() => {
      n += 1
      setCount(n)
      if (soundOn()) playTick()
      if (n >= order.length) {
        window.clearInterval(timer.current)
        if (soundOn()) playWin()
      }
    }, 380)
  }

  const toggleGroup = () => {
    window.clearInterval(timer.current)
    setCount(0)
    setPicked(null)
    if (!group && soundOn()) playLock()
    setGroup(!group)
  }

  const pickedAtom = picked ? mol.atoms.find((a) => a.id === picked) : null
  // Short name of the group for the button, e.g. "–OH" from "nhóm –OH (hydroxyl)".
  const groupShort = mol.group ? (/[–-][A-Z][A-Za-z]*|C[=≡]C/.exec(mol.group.label.en)?.[0] ?? L(mol.group.label)) : ''

  return (
    <div className="lab-grid">
      <div className="lab-stage">
        <Molecule3D
          mol={mol}
          formula={formula}
          showGroup={group}
          groupLabel={mol.group ? L(mol.group.label) : ''}
          picked={picked}
          counted={counted}
          onPick={(id) => setPicked((p) => (p === id ? null : id))}
          label={`${L(mol.name)} — ${mol.condensed}`}
        />
        <p className="lab-caption">
          {pickedAtom ? (
            <>
              <strong>{L(UI.atom[pickedAtom.kind])}</strong>
              {pickedAtom.note && <> — {L(pickedAtom.note)}</>}
            </>
          ) : group && mol.group ? (
            <Chem text={L(mol.group.note)} />
          ) : (
            <span className="muted">{L(UI.tapAtom)}</span>
          )}
        </p>
      </div>

      <aside className="lab-side">
        <div className="seg" role="group">
          <button type="button" className={`seg__btn${!formula ? ' seg__btn--on' : ''}`} aria-pressed={!formula} onClick={() => setFormula(false)}>
            {L(UI.ball)}
          </button>
          <button type="button" className={`seg__btn${formula ? ' seg__btn--on' : ''}`} aria-pressed={formula} onClick={() => setFormula(true)}>
            {L(UI.formula)}
          </button>
        </div>
        <div className="row row--wrap">
          {mol.group && (
            <button type="button" className={`btn btn--small${group ? '' : ' btn--warm'}`} onClick={toggleGroup}>
              {group ? L(UI.hideGroup) : L(UI.showGroup, { g: groupShort })}
            </button>
          )}
          <button type="button" className="btn btn--small" onClick={startCount}>
            {L(UI.count)}
          </button>
        </div>
        {count > 0 && (
          <div className="tally" aria-live="polite">
            {kinds.map((k) => (
              <span key={k} className={`tally__item atom-text--${k}`}>
                {k}
                <sub>{tally[k] ?? 0}</sub>
              </span>
            ))}
            {count >= order.length && (
              <span className="tally__result">
                → <Chem text={formulaOf(tally)} />
              </span>
            )}
          </div>
        )}
        <dl className="lab-facts">
          {lesson.facts.map((f) => (
            <div key={f.label.en} className="lab-facts__row">
              <dt>{L(f.label)}</dt>
              <dd>
                <Chem text={L(f.value)} />
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  )
}

/* ---------- Part: comparison worksheet (Phiếu học tập số 1) ---------- */
export function ComparePart({ lesson }: { lesson: Lesson }) {
  const L = useL()
  const mols = (lesson.compare ?? [lesson.molecule]).map((id) => MOLECULES[id])
  const [shown, setShown] = useState<Set<number>>(new Set())

  const rows: { label: string; value: (m: Molecule) => string }[] = [
    { label: L(UI.rowFormula), value: (m) => m.formula },
    { label: L(UI.rowCondensed), value: (m) => m.condensed },
    { label: L(UI.rowElements), value: (m) => m.elements },
    { label: L(UI.rowGroup), value: (m) => (m.group ? (/[–-][A-Z][A-Za-z]*|C[=≡]C/.exec(m.group.label.en)?.[0] ?? L(m.group.label)) : L(UI.none)) },
  ]
  const groupsShown = shown.has(3)

  const reveal = (r: number) => {
    if (shown.has(r)) return
    setShown(new Set(shown).add(r))
    if (soundOn()) playLock()
  }

  return (
    <div className="compare">
      <div className="compare__head">
        <h2 className="chalk-title chalk-title--md">{L(UI.compareTitle)}</h2>
        <span className="muted">{L(UI.compareHint)}</span>
        <span className="grow" />
        <button
          type="button"
          className="btn btn--small"
          onClick={() => {
            if (shown.size === rows.length) setShown(new Set())
            else {
              setShown(new Set(rows.map((_, i) => i)))
              if (soundOn()) playWin()
            }
          }}
        >
          {shown.size === rows.length ? L(UI.hideAll) : L(UI.revealAll)}
        </button>
      </div>
      <div className="compare__scroll">
        <table className="compare__table" style={{ '--cols': mols.length } as CSSProperties}>
          <thead>
            <tr>
              <th />
              {mols.map((m) => (
                <th key={m.id} className={m.id === lesson.molecule ? 'is-target' : undefined}>
                  <Molecule3D mol={m} mini showGroup={groupsShown} label={`${L(m.name)} — ${m.condensed}`} />
                  <span className="compare__name">{L(m.name)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">{r.label}</th>
                {mols.map((m) => {
                  const target = m.id === lesson.molecule
                  const hidden = target && !shown.has(i)
                  return (
                    <td key={m.id} className={target ? 'is-target' : undefined}>
                      {hidden ? (
                        <button type="button" className="compare__blank" onClick={() => reveal(i)}>
                          ……
                        </button>
                      ) : (
                        <span className={target ? 'compare__val' : undefined}>
                          <Chem text={r.value(m)} />
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
