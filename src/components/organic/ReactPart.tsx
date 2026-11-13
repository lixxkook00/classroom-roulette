import { Fragment, useEffect, useRef, useState } from 'react'
import type { Lesson, Phase } from '../../data/organic'
import { playLock, playTick, playWin } from '../../sound'
import { SceneCanvas } from './SceneCanvas'
import { Arrow, Chem, Equation, Side } from './shared'
import { soundOn, UI, useL } from './labKit'

const RUN_MS = 3800

export function ReactPart({ lesson }: { lesson: Lesson }) {
  const L = useL()
  const [id, setId] = useState(lesson.reactions[0].id)
  const [phase, setPhase] = useState<Phase>('idle')
  const [shown, setShown] = useState(false)
  const [popped, setPopped] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const r = lesson.reactions.find((x) => x.id === id) ?? lesson.reactions[0]

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const reset = (next = id) => {
    window.clearTimeout(timer.current)
    setId(next)
    setPhase('idle')
    setShown(false)
    setPopped(false)
  }

  const start = () => {
    setPhase('running')
    if (soundOn()) playLock()
    timer.current = window.setTimeout(() => {
      setPhase('done')
      setShown(true)
      if (soundOn()) playWin()
    }, RUN_MS)
  }

  const pop = () => {
    setPopped(true)
    if (soundOn()) {
      playLock()
      playTick()
    }
  }

  const hasEq = r.right !== ''
  const products = hasEq ? r.right.split(' + ').length : 0

  return (
    <div className="lab-grid lab-grid--react">
      <nav className="react-list" aria-label={L(UI.parts.react)}>
        {lesson.reactions.map((x, i) => (
          <button key={x.id} type="button" className={`react-list__btn${x.id === r.id ? ' is-on' : ''}`} aria-pressed={x.id === r.id} onClick={() => reset(x.id)}>
            <span className="react-list__n">{i + 1}</span>
            <Chem text={L(x.title)} />
          </button>
        ))}
      </nav>

      <div className="lab-stage">
        <SceneCanvas key={r.id} scene={r.scene} phase={phase} popped={popped} />
        <div className="row row--wrap lab-actions">
          {phase === 'idle' && (
            <button type="button" className="btn btn--big btn--solid" onClick={start}>
              {L(r.start)}
            </button>
          )}
          {phase === 'running' && <span className="chalk-sub">{L(UI.running)}</span>}
          {phase === 'done' && r.scene.kind === 'tube' && r.scene.splint && !popped && (
            <button type="button" className="btn btn--warm" onClick={pop}>
              🔥 {L(UI.splint)}
            </button>
          )}
          {popped && <span className="pop-text">{L(UI.pop)}</span>}
          {phase !== 'idle' && (
            <button type="button" className="btn btn--small btn--link" onClick={() => reset()}>
              {L(UI.again)}
            </button>
          )}
        </div>
      </div>

      <aside className="lab-side">
        <h2 className="chalk-title chalk-title--md">
          <Chem text={L(r.title)} />
        </h2>
        <div className="lab-eq">
          {hasEq ? (
            <span className="eq">
              <Side text={r.left} />
              <Arrow cond={r.cond && L(r.cond)} />
              {shown ? (
                <span className="lab-eq__products">
                  <Side text={r.right} />
                </span>
              ) : (
                Array.from({ length: products }, (_, i) => (
                  <Fragment key={i}>
                    {i > 0 && <span className="eq__plus">+</span>}
                    <span className="qbox">?</span>
                  </Fragment>
                ))
              )}
            </span>
          ) : (
            <span className="muted">{L(UI.noEq)}</span>
          )}
        </div>
        {!shown ? (
          <>
            <p className="lab-hint">
              💡 <Chem text={L(r.hint)} />
            </p>
            <p className="muted">{hasEq ? L(UI.guess) : L(UI.guessNoEq)}</p>
            <button type="button" className="btn btn--small btn--link" onClick={() => setShown(true)}>
              {L(UI.reveal)}
            </button>
          </>
        ) : (
          <div className="stack lab-reveal">
            <div className="lab-note">
              <strong>{L(UI.observe)}</strong>
              <span>
                <Chem text={L(r.observe)} />
              </span>
            </div>
            <div className="lab-note">
              <strong>{L(UI.meaning)}</strong>
              <span>
                <Chem text={L(r.meaning)} />
              </span>
            </div>
            {r.extra && (
              <div className="lab-note">
                <span>
                  <Chem text={L(r.extra.note)} />
                </span>
                <Equation left={r.extra.left} right={r.extra.right} cond={r.extra.cond && L(r.extra.cond)} />
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
