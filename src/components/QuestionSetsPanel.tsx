import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useI18n } from '../i18n'
import { deleteMedia, putMedia, youTubeId } from '../media'
import { uid, type AppData, type MediaKind, type Question, type QuestionMedia, type QuestionSet } from '../store'
import { MediaBadge, MediaView } from './MediaView'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
}

type Attach = 'none' | MediaKind

const ACCEPT: Record<'audio' | 'video', string> = { audio: 'audio/*,.mp3,.m4a,.wav,.ogg', video: 'video/*,.mp4,.webm,.mov' }

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
  const [attach, setAttach] = useState<Attach>('none')
  const [file, setFile] = useState<File | null>(null)
  const [keptMedia, setKeptMedia] = useState<QuestionMedia | undefined>(undefined)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const updateSet = (id: string, fn: (s: QuestionSet) => QuestionSet) =>
    setData((d) => ({ ...d, questionSets: d.questionSets.map((s) => (s.id === id ? fn(s) : s)) }))

  const resetForm = () => {
    setEditingId(null)
    setText('')
    setAnswer('')
    setAttach('none')
    setFile(null)
    setKeptMedia(undefined)
    setLink('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const createSet = () => {
    const set: QuestionSet = { id: uid(), name: t('defaultQSetName', { n: sets.length + 1 }), questions: [] }
    setData((d) => ({ ...d, questionSets: [...d.questionSets, set] }))
    setActiveId(set.id)
    resetForm()
  }

  const deleteSet = () => {
    if (!active || !window.confirm(t('confirmDeleteQSet', { name: active.name, n: active.questions.length }))) return
    active.questions.forEach((q) => q.media && q.media.kind !== 'youtube' && void deleteMedia(q.media.ref))
    const rest = sets.filter((s) => s.id !== active.id)
    setData((d) => ({
      ...d,
      questionSets: d.questionSets.filter((s) => s.id !== active.id),
      activeQuestionSetId: d.activeQuestionSetId === active.id ? null : d.activeQuestionSetId,
    }))
    setActiveId(rest[0]?.id ?? null)
    resetForm()
  }

  const ytValid = attach !== 'youtube' || !!youTubeId(link)
  const mediaReady = attach === 'none' || (attach === 'youtube' ? !!youTubeId(link) : !!file || keptMedia?.kind === attach)
  const canSave = !!active && (text.trim() !== '' || attach !== 'none') && mediaReady && !busy

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!active || !canSave) return
    setBusy(true)
    try {
      const old = editingId ? active.questions.find((q) => q.id === editingId)?.media : undefined
      let media: QuestionMedia | undefined
      if (attach === 'youtube') media = { kind: 'youtube', ref: link.trim() }
      else if ((attach === 'audio' || attach === 'video') && file) {
        const id = await putMedia(uid(), file)
        media = { kind: attach, ref: id, name: file.name }
      } else if (attach !== 'none' && keptMedia?.kind === attach) media = keptMedia

      // Remove a replaced / dropped file from storage.
      if (old && old.kind !== 'youtube' && old.ref !== media?.ref) void deleteMedia(old.ref)

      const q: Question = { id: editingId ?? uid(), text: text.trim(), media, answer: answer.trim() || undefined }
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
    setAttach(q.media?.kind ?? 'none')
    setKeptMedia(q.media)
    setLink(q.media?.kind === 'youtube' ? q.media.ref : '')
    setFile(null)
    textRef.current?.focus()
  }

  const remove = (q: Question) => {
    if (!active || !window.confirm(t('confirmDeleteQ'))) return
    if (q.media && q.media.kind !== 'youtube') void deleteMedia(q.media.ref)
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
  const bigFile = file && file.size > 200 * 1024 * 1024 ? Math.round(file.size / 1024 / 1024) : 0

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
              <label htmlFor="q-text" className="chalk-label">
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
              <div className="qform__row">
                <span className="muted">{t('qAttach')}:</span>
                <div className="seg" role="radiogroup" aria-label={t('qAttach')}>
                  {(['none', 'audio', 'video', 'youtube'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={attach === k}
                      className={`seg__btn${attach === k ? ' seg__btn--on' : ''}`}
                      onClick={() => {
                        setAttach(k)
                        setFile(null)
                        if (fileRef.current) fileRef.current.value = ''
                      }}
                    >
                      {k === 'none' ? t('qNone') : k === 'audio' ? t('qAudio') : k === 'video' ? t('qVideo') : t('qYoutube')}
                    </button>
                  ))}
                </div>

                {(attach === 'audio' || attach === 'video') && (
                  <>
                    <button type="button" className="btn btn--small" onClick={() => fileRef.current?.click()}>
                      {t('qChooseFile')}
                    </button>
                    <span className="qform__file">{file?.name ?? (keptMedia?.kind === attach ? keptMedia.name : '')}</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPT[attach]}
                      hidden
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </>
                )}
                {attach === 'youtube' && (
                  <>
                    <label htmlFor="q-yt" className="sr-only">
                      {t('qYoutubeLink')}
                    </label>
                    <input
                      id="q-yt"
                      className="chalk-input qform__link"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://youtu.be/…"
                      spellCheck={false}
                    />
                  </>
                )}
              </div>
              <label htmlFor="q-answer" className="chalk-label qform__answer-label">
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
              {!ytValid && link.trim() !== '' && <span className="qform__warn">{t('qYoutubeBad')}</span>}
              {bigFile > 0 && <span className="qform__warn">{t('qFileBig', { mb: bigFile })}</span>}
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
