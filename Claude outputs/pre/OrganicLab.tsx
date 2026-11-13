import { useMemo, useState } from 'react'
import { LESSONS, type Lesson } from '../../data/organic'
import type { QuestionSet } from '../../store'
import { studentUrl, viewTransition } from '../../util'
import { QrIcon } from '../chemText'
import { ChalkSelect } from '../controls'
import { QrDialog } from '../QrDialog'
import { ComparePart, MoleculePart } from './MoleculeParts'
import { MixPart } from './MixPart'
import { QuizPart } from './QuizPart'
import { ReactPart } from './ReactPart'
import { Chem } from './shared'
import { UI, useL } from './labKit'
import { WhoReactsPart } from './WhoReactsPart'

type Part = 'molecule' | 'compare' | 'mix' | 'react' | 'who' | 'quiz'

const LAST_KEY = 'element-roulette:lab-lesson'

function partsOf(lesson: Lesson): Part[] {
  const out: Part[] = ['molecule']
  if (lesson.compare && lesson.compare.length > 1) out.push('compare')
  if (lesson.mixer) out.push('mix')
  if (lesson.reactions.length) out.push('react')
  if (lesson.whoReacts?.length) out.push('who')
  if (lesson.quiz.length) out.push('quiz')
  return out
}

function initialLesson(fromLink: string | null): Lesson {
  let id = fromLink
  if (!id)
    try {
      id = localStorage.getItem(LAST_KEY)
    } catch {
      /* ignore */
    }
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0]
}

interface Props {
  /** Lesson id from the link (#/lab?bai=27). */
  lessonId: string | null
  canShare: boolean
  onUseInRoulette?: (set: QuestionSet) => void
}

/** "Lab hữu cơ": one interactive page per organic chemistry lesson, built from the data in src/data/organic. */
export function OrganicLab({ lessonId, canShare, onUseInRoulette }: Props) {
  const L = useL()
  const [lesson, setLesson] = useState(() => initialLesson(lessonId))
  const parts = useMemo(() => partsOf(lesson), [lesson])
  const [part, setPart] = useState<Part>('molecule')
  const [qrOpen, setQrOpen] = useState(false)

  const choose = (id: string) => {
    const next = LESSONS.find((l) => l.id === id)
    if (!next || next.id === lesson.id) return
    try {
      localStorage.setItem(LAST_KEY, next.id)
    } catch {
      /* ignore */
    }
    // Keep the link in step so a refresh or a shared link opens the same lesson.
    window.history.replaceState(null, '', `#/lab?bai=${encodeURIComponent(next.id)}`)
    viewTransition(LESSONS.indexOf(next) > LESSONS.indexOf(lesson) ? 'forward' : 'back', () => {
      setLesson(next)
      setPart((p) => (partsOf(next).includes(p) ? p : 'molecule'))
    })
  }

  const current = parts.includes(part) ? part : 'molecule'

  return (
    <div className="board lab">
      <header className="topbar">
        <div className="topbar__title">
          <h1 className="chalk-title">
            {L(lesson.number)}: {L(lesson.title)}{' '}
            <span className="lab-formula-tag">
              <Chem text={lesson.badge} />
            </span>
          </h1>
          <span className="chalk-sub">{L(lesson.sub)}</span>
        </div>
        <div className="topbar__controls lab-controls">
          {LESSONS.length > 1 && (
            <div className="lab-lesson">
              <ChalkSelect
                value={lesson.id}
                label={L(UI.lesson)}
                options={LESSONS.map((l) => ({ value: l.id, label: `${L(l.number)} · ${L(l.title)}` }))}
                onChange={choose}
              />
            </div>
          )}
          {canShare && (
            <button type="button" className="btn btn--small qr-btn" onClick={() => setQrOpen(true)}>
              <QrIcon /> {L(UI.share)}
            </button>
          )}
          <div className="seg lab-parts" role="group" aria-label={L(UI.partsAria)}>
            {parts.map((p, n) => (
              <button key={p} type="button" className={`seg__btn${current === p ? ' seg__btn--on' : ''}`} aria-pressed={current === p} onClick={() => setPart(p)}>
                <span className="lab-parts__n">{n + 1}</span> {L(UI.parts[p])}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main key={`${lesson.id}-${current}`} className="lab__main">
        {current === 'molecule' ? (
          <MoleculePart lesson={lesson} />
        ) : current === 'compare' ? (
          <ComparePart lesson={lesson} />
        ) : current === 'mix' && lesson.mixer ? (
          <MixPart mixer={lesson.mixer} />
        ) : current === 'react' ? (
          <ReactPart lesson={lesson} />
        ) : current === 'who' && lesson.whoReacts ? (
          <WhoReactsPart games={lesson.whoReacts} />
        ) : (
          <QuizPart lesson={lesson} onUseInRoulette={onUseInRoulette} />
        )}
      </main>
      {qrOpen && <QrDialog title={`${L(lesson.number)}: ${L(lesson.title)}`} url={studentUrl(`lab?bai=${lesson.id}`)} onClose={() => setQrOpen(false)} />}
    </div>
  )
}
