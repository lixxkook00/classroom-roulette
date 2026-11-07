import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useI18n } from '../i18n'
import { deleteMedia } from '../media'
import { uid, type AppData, type Question, type QuestionMedia, type QuestionSet } from '../store'
import { draftFrom, draftReady, emptyDraft, resolveDraft, type MediaDraft } from '../mediaDraft'
import { MediaField } from './MediaField'
import { MediaBadge, MediaView } from './MediaView'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
}

/** "Bộ câu hỏi": the teacher writes questions (text + optional mp3 / mp4 / YouTube). */
export function QuestionSetsPanel({ data, setData }: Props) {
  const { t } = useI18n()
  const sets = data.questionSets
  const [activeId, setActiveId] = useState<string | null>(sets[0]?.id ?? null)
  const active = sets.find((s) => s.id === activeId) ?? null

  // Question form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [qMedia, setQMedia] = useState<MediaDraft>(emptyDraft)
  const [aMedia, setAMedia] = useState<MediaDraft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const updateSet = (id: string, fn: (s: QuestionSet) => QuestionSet) =>
    setData((d) => ({ ...d, questionSets: d.questionSets.map((s) => (s.id === id ? fn(s) : s)) }))

  /** Removes a question's stored files (YouTube links have nothing to remove). */
  const dropFiles = (...ms: (QuestionMedia | undefined)[]) => ms.forEach((m) => m && m.kind !== 'youtube' && void deleteMedia(m.ref))

  const resetForm = () => {
    setEditingId(null)
    setText('')
    setAnswer('')
    setQMedia(emptyDraft())
    setAMedia(emptyDraft())
  }

  const createSet = () => {
    const set: QuestionSet = { id: uid(), name: t('defaultQSetName', { n: sets.length + 1 }), questions: [] }
    setData((d) => ({ ...d, questionSets: [...d.questionSets, set] }))
    setActiveId(set.id)
    resetForm()
  }

  const deleteSet = () => {
    if (!active || !window.confirm(t('confirmDeleteQSet', { name: active.name, n: active.questions.length }))) return
    active.questions.forEach((q) => dropFiles(q.media, q.answerMedia))
    const rest = sets.filter((s) => s.id !== active.id)
    setData((d) => ({
      ...d,
      questionSets: d.questionSets.filter((s) => s.id !== active.id),
      activeQuestionSetId: d.activeQuestionSetId === active.id ? null : d.activeQuestionSetId,
    }))
    setActiveId(rest[0]?.id ?? null)
    resetForm()
  }

  const canSave = !!active && (text.trim() !== '' || qMedia.attach !== 'none') && draftReady(qMedia) && draftReady(aMedia) && !busy

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!active || !canSave) return
    setBusy(true)
    try {
      const old = editingId ? active.questions.find((q) => q.id === editingId) : undefined
      const media = await resolveDraft(qMedia)
      const answerMedia = await resolveDraft(aMedia)
      // Remove replaced / dropped files from storage.
      if (old?.media && old.media.ref !== media?.ref) dropFiles(old.media)
      if (old?.answerMedia && old.answerMedia.ref !== answerMedia?.ref) dropFiles(old.answerMedia)

      const q: Question = { id: editingId ?? uid(), text: text.trim(), media, answer: answer.trim() || undefined, answerMedia }
      updateSet(active.id, (s) => ({
        ...s,
        questions: editingId ? s.questions.map((x) => (x.id === editingId ? q : x)) : [...s.questions, q],
      }))
      resetForm()
      textRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const edit = (q: Question) => {
    setEditingId(q.id)
    setText(q.text)
    setAnswer(q.answer ?? '')
    setQMedia(draftFrom(q.media))
    setAMedia(draftFrom(q.answerMedia))
    textRef.current?.focus()
  }

  const remove = (q: Question) => {
    if (!active || !window.confirm(t('confirmDeleteQ'))) return
    dropFiles(q.media, q.answerMedia)
    updateSet(active.id, (s) => ({ ...s, questions: s.questions.filter((x) => x.id !== q.id) }))
    if (editingId === q.id) resetForm()
  }

  const move = (i: number, dir: -1 | 1) => {
    if (!active) return
    updateSet(active.id, (s) => {
      const j = i + dir
      if (j < 0 || j >= s.questions.length) return s
      const qs = [...s.questions]
      ;[qs[i], qs[j]] = [qs[j], qs[i]]
      return { ...s, questions: qs }
    })
  }

  const editingIndex = editingId && active ? active.questions.findIndex((q) => q.id === editingId) : -1

  return (
    <div className="classes sets">
      <aside className="classes__aside">
        <nav aria-label={t('classesTabQuestions')} className="class-list">
          {sets.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`class-card${s.id === active?.id ? ' class-card--active' : ''}`}
              aria-current={s.id === active?.id ? 'true' : undefined}
              onClick={() => {
                setActiveId(s.id)
                resetForm()
              }}
            >
              <span className="class-card__name">{s.name || '—'}</span>
              <span className="class-card__meta">{t('qCount', { n: s.questions.length })}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn--dashed" onClick={createSet}>
          + {t('newQSet')}
        </button>
        <p className="backup__hint">{t('qFileNote')}</p>
      </aside>

      <main className="classes__main qeditor">
        {!active ? (
          <div className="empty">
            <p>{t('noQSets')}</p>
            <button type="button" className="btn btn--solid" onClick={createSet}>
              + {t('newQSet')}
            </button>
          </div>
        ) : (
          <>
            <div className="class-head">
              <div className="stack stack--tight grow">
                <label htmlFor="qset-name" className="sr-only">
                  {t('qSetName')}
                </label>
                <input
                  id="qset-name"
                  className="chalk-input chalk-input--big set-editor__name"
                  value={active.name}
                  placeholder={t('qSetNamePlaceholder')}
                  onChange={(e) => updateSet(active.id, (s) => ({ ...s, name: e.target.value }))}
                />
                <span className="muted">{t('qCount', { n: active.questions.length })}</span>
              </div>
              <button type="button" className="btn btn--small btn--danger" onClick={deleteSet}>
                {t('deleteSet')}
              </button>
            </div>

            <form className="panel qform" onSubmit={save}>
              <div className="qform__grid">
                <div className="qform__col">
                  <label htmlFor="q-text" className="qform__label">
                    {editingIndex >= 0 ? t('qEditing', { n: editingIndex + 1 }) : t('qText')}
                  </label>
                  <textarea
                    id="q-text"
                    ref={textRef}
                    className="chalk-input chalk-textarea qform__text"
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('qTextPlaceholder')}
                  />
                  <MediaField id="q-media" draft={qMedia} onChange={setQMedia} />
                </div>
                <div className="qform__col qform__col--answer">
                  <label htmlFor="q-answer" className="qform__label qform__label--answer">
                    {t('qAnswer')}
                  </label>
                  <textarea
                    id="q-answer"
                    className="chalk-input chalk-textarea qform__answer"
                    rows={2}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t('qAnswerPlaceholder')}
                  />
                  <MediaField id="a-media" draft={aMedia} onChange={setAMedia} />
                </div>
              </div>
              <div className="row qform__actions">
                {editingId && (
                  <button type="button" className="btn btn--link btn--small" onClick={resetForm}>
                    {t('cancel')}
                  </button>
                )}
                <button type="submit" className="btn btn--solid btn--small" disabled={!canSave}>
                  {editingId ? t('qSave') : t('qAdd')}
                </button>
              </div>
            </form>

            <div className="qlist">
              {active.questions.length === 0 ? (
                <p className="muted qlist__empty">{t('noQuestions')}</p>
              ) : (
                <ol>
                  {active.questions.map((q, i) => (
                    <li key={q.id} className={editingId === q.id ? 'is-editing' : undefined}>
                      <span className="qlist__n">{i + 1}</span>
                      <div className="qlist__body">
                        {q.text && <p className="qlist__text">{q.text}</p>}
                        {q.answer && (
                          <p className="qlist__answer">
                            <b>{t('answerLabel')}:</b> {q.answer}
                          </p>
                        )}
                        {q.answerMedia && (
                          <details className="qlist__media">
                            <summary>
                              <span className="qlist__answer">
                                <b>{t('answerLabel')}:</b>
                              </span>{' '}
                              <MediaBadge media={q.answerMedia} />
                            </summary>
                            <MediaView media={q.answerMedia} />
                          </details>
                        )}
                        {q.media && (
                          <details className="qlist__media">
                            <summary>
                              <MediaBadge media={q.media} />
                            </summary>
                            <MediaView media={q.media} />
                          </details>
                        )}
                      </div>
                      <div className="roster__actions">
                        <button type="button" className="icon-btn" aria-label={t('moveUp', { name: `${i + 1}` })} onClick={() => move(i, -1)} disabled={i === 0}>
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={t('moveDown', { name: `${i + 1}` })}
                          onClick={() => move(i, 1)}
                          disabled={i === active.questions.length - 1}
                        >
                          ↓
                        </button>
                        <button type="button" className="icon-btn" aria-label={t('edit', { name: `${i + 1}` })} onClick={() => edit(q)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                          </svg>
                        </button>
                        <button type="button" className="icon-btn" aria-label={t('remove', { name: `${i + 1}` })} onClick={() => remove(q)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
