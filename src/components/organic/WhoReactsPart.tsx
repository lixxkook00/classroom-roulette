import { useState } from 'react'
import type { WhoReacts } from '../../data/organic'
import { playCorrect, playTick, playWrong } from '../../sound'
import { Chem, Equation } from './shared'
import { soundOn, UI, useL } from './labKit'

/** "Which of these react?" — the class picks cards, then Check reveals the answers and equations. */
export function WhoReactsPart({ games }: { games: WhoReacts[] }) {
  const L = useL()
  const [g, setG] = useState(0)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)
  const game = games[g]

  const toggle = (i: number) => {
    if (checked) return
    const next = new Set(picked)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setPicked(next)
    if (soundOn()) playTick()
  }

  const right = game.items.filter((it, i) => it.reacts === picked.has(i)).length

  const check = () => {
    setChecked(true)
    if (soundOn()) (right === game.items.length ? playCorrect : playWrong)()
  }

  const reset = (next = g) => {
    setG(next)
    setPicked(new Set())
    setChecked(false)
  }

  return (
    <div className="who">
      <div className="who__head">
        <h2 className="chalk-title chalk-title--md">
          <Chem text={L(game.question)} />
        </h2>
        {games.length > 1 && (
          <div className="seg" role="group">
            {games.map((_, i) => (
              <button key={i} type="button" className={`seg__btn${i === g ? ' seg__btn--on' : ''}`} onClick={() => reset(i)}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="muted">{L(UI.whoHint)}</p>

      <div className="who__grid">
        {game.items.map((it, i) => {
          const on = picked.has(i)
          const state = !checked ? '' : it.reacts === on ? ' is-right' : ' is-wrong'
          return (
            <button
              key={it.label}
              type="button"
              className={`who__card${on ? ' is-picked' : ''}${checked && it.reacts ? ' is-reacts' : ''}${state}`}
              aria-pressed={on}
              onClick={() => toggle(i)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="who__label">
                <Chem text={it.label} />
              </span>
              {it.name && <span className="who__name">{L(it.name)}</span>}
              {checked && (
                <span className="who__answer">
                  {it.reacts && it.left && it.right ? <Equation left={it.left} right={it.right} /> : <strong>✗ {L(UI.whyNot)}</strong>}
                  {it.why && (
                    <span className="who__why">
                      <Chem text={L(it.why)} />
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="row row--wrap who__foot">
        {!checked ? (
          <button type="button" className="btn btn--solid" onClick={check}>
            {L(UI.check)}
          </button>
        ) : (
          <>
            <span className={`who__score${right === game.items.length ? ' is-full' : ''}`}>{L(UI.whoScore, { s: right, n: game.items.length })}</span>
            <button type="button" className="btn btn--small" onClick={() => reset()}>
              {L(UI.retry)}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
