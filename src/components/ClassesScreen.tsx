import { useEffect, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'
import { ELEMENTS, MAX_STUDENTS } from '../data/elements'
import { LangToggle, useI18n } from '../i18n'
import { QUALITY_EVENT, qualitySetting, setQualitySetting, quality, type QualitySetting } from '../perf'
import { viewTransition } from '../util'
import { ElementSetsPanel } from './ElementSetsPanel'
import { QuestionSetsPanel } from './QuestionSetsPanel'
import { ImportDialog } from './ImportDialog'
import { elementsOf, perStudent, newStudent, parseBackup, today, uid, type AppData, type ClassRoom, type Student } from '../store'

interface Props {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  updateClass: (id: string, fn: (c: ClassRoom) => ClassRoom) => void
  onPlaySet: (id: string) => void
  /** Which inner tab to open first (from the link #/classes?tab=…). */
  initialSection?: Section
}

export type Section = 'students' | 'sets' | 'questions'
const SECTIONS: Section[] = ['students', 'sets', 'questions']

const Icon = {
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  down: <path d="M12 5v14M5 12l7 7 7-7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4z" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  plus: <path d="M12 5v14M5 12h14" />,
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function ClassesScreen({ data, setData, updateClass, onPlaySet, initialSection = 'students' }: Props) {
  const { t, elName } = useI18n()
  const cls = data.classes.find((c) => c.id === data.activeClassId) ?? null

  const [creating, setCreating] = useState(data.classes.length === 0)
  const [newClassName, setNewClassName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [importText, setImportText] = useState<string | null>(null)
  const [section, setSection] = useState<Section>(initialSection)
  const [addName, setAddName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rangeLabel = (c: ClassRoom) => {
    if (c.students.length === 0) return t('noStudentsYet')
    const n = c.students.length
    if (!data.shareAll) return t('classRangeOne', { n, b: ELEMENTS[n - 1].symbol })
    return t('classRange', { n, per: perStudent(n, true) })
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    if (iso === today()) return t('today')
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y.slice(2)}`
  }

  const selectClass = (id: string) => {
    setData((d) => ({ ...d, activeClassId: id }))
    setRenaming(false)
    setEditingId(null)
  }

  const createClass = (e: FormEvent) => {
    e.preventDefault()
    const name = newClassName.trim()
    if (!name) return
    const c: ClassRoom = { id: uid(), name, students: [] }
    setData((d) => ({ ...d, classes: [...d.classes, c], activeClassId: c.id }))
    setNewClassName('')
    setCreating(false)
  }

  const saveRename = (e: FormEvent) => {
    e.preventDefault()
    if (!cls) return
    const name = renameValue.trim()
    if (name) updateClass(cls.id, (c) => ({ ...c, name }))
    setRenaming(false)
  }

  const deleteClass = () => {
    if (!cls) return
    if (!window.confirm(t('confirmDelete', { name: cls.name, n: cls.students.length }))) return
    setData((d) => {
      const classes = d.classes.filter((c) => c.id !== cls.id)
      return { ...d, classes, activeClassId: classes[0]?.id ?? null }
    })
  }

  const setStudents = (fn: (s: Student[]) => Student[]) => {
    if (cls) updateClass(cls.id, (c) => ({ ...c, students: fn(c.students).slice(0, MAX_STUDENTS) }))
  }

  const addStudent = (e: FormEvent) => {
    e.preventDefault()
    const name = addName.trim()
    if (!name || !cls || cls.students.length >= MAX_STUDENTS) return
    setStudents((s) => [...s, newStudent(name)])
    setAddName('')
  }

  // Ctrl+V anywhere on the page (outside a text field) opens the import dialog with the pasted list.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null
      if (!cls || section !== 'students' || importText !== null || el?.closest('input, textarea, [contenteditable="true"]')) return
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text.trim()) return
      e.preventDefault()
      setImportText(text)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [cls, importText, section])

  const applyImport = (names: string[], mode: 'append' | 'replace') => {
    if (names.length === 0 || !cls) return
    if (mode === 'replace' && cls.students.length > 0 && !window.confirm(t('confirmReplace', { n: cls.students.length, name: cls.name }))) return
    const room = mode === 'replace' ? MAX_STUDENTS : MAX_STUDENTS - cls.students.length
    const added = names.slice(0, room).map(newStudent)
    setStudents((s) => (mode === 'replace' ? added : [...s, ...added]))
    setMessage(
      names.length > room ? t('addedOverflow', { n: added.length, max: MAX_STUDENTS, m: names.length - room }) : t('added', { n: added.length }),
    )
    setImportText(null)
  }

  const move = (index: number, dir: -1 | 1) => {
    setStudents((s) => {
      const j = index + dir
      if (j < 0 || j >= s.length) return s
      const copy = [...s]
      ;[copy[index], copy[j]] = [copy[j], copy[index]]
      return copy
    })
  }

  const saveEdit = (e: FormEvent) => {
    e.preventDefault()
    const name = editValue.trim()
    if (name && editingId) setStudents((s) => s.map((st) => (st.id === editingId ? { ...st, name } : st)))
    setEditingId(null)
  }

  const removeStudent = (st: Student) => {
    if (!window.confirm(t('confirmRemove', { name: st.name }))) return
    setStudents((s) => s.filter((x) => x.id !== st.id))
  }

  const toggleTested = (id: string, tested: boolean) =>
    setStudents((s) => s.map((st) => (st.id === id ? { ...st, tested, lastTestedAt: tested ? (st.lastTestedAt ?? today()) : st.lastTestedAt } : st)))

  const clearTested = () => setStudents((s) => s.map((st) => ({ ...st, tested: false })))

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lop-khtn-thay-qui-sao-luu-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    const parsed = parseBackup(await file.text())
    if (!parsed) {
      setMessage(t('badBackup'))
      return
    }
    if (!window.confirm(t('confirmRestore', { n: parsed.classes.length }))) return
    setData(parsed)
    setMessage(t('restored', { n: parsed.classes.length }))
  }

  const full = !!cls && cls.students.length >= MAX_STUDENTS
  const testedCount = cls?.students.filter((s) => s.tested).length ?? 0

  return (
    <div className="board">
      <header className="topbar">
        <div className="topbar__title">
          <h1 className="chalk-title">{t('myClasses')}</h1>
          <span className="chalk-sub">{section === 'sets' ? t('setsSub') : section === 'questions' ? t('qsSub') : data.shareAll ? t('myClassesSub') : t('myClassesSubOne')}</span>
        </div>
        <div className="topbar__controls">
          <div className="seg" role="tablist" aria-label={t('myClasses')}>
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                role="tab"
                aria-selected={section === sec}
                className={`seg__btn${section === sec ? ' seg__btn--on' : ''}`}
                onClick={() => sec !== section && viewTransition(SECTIONS.indexOf(sec) > SECTIONS.indexOf(section) ? 'forward' : 'back', () => setSection(sec))}
              >
                {sec === 'students' ? t('classesTabStudents') : sec === 'sets' ? t('classesTabSets') : t('classesTabQuestions')}
              </button>
            ))}
          </div>
          <LangToggle />
        </div>
      </header>

      {section === 'sets' ? (
        <ElementSetsPanel data={data} setData={setData} onPlay={onPlaySet} />
      ) : section === 'questions' ? (
        <QuestionSetsPanel data={data} setData={setData} />
      ) : (
        <div className="classes">
          <aside className="classes__aside">
            <nav aria-label={t('myClasses')} className="class-list">
              {data.classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`class-card${c.id === cls?.id ? ' class-card--active' : ''}`}
                  aria-current={c.id === cls?.id ? 'true' : undefined}
                  onClick={() => selectClass(c.id)}
                >
                  <span className="class-card__name">{c.name}</span>
                  <span className="class-card__meta">{rangeLabel(c)}</span>
                </button>
              ))}
            </nav>

            {creating ? (
              <form className="stack" onSubmit={createClass}>
                <label htmlFor="new-class" className="chalk-label">
                  {t('newClassName')}
                </label>
                <input
                  id="new-class"
                  className="chalk-input"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder={t('newClassPlaceholder')}
                  autoFocus
                />
                <div className="row">
                  <button type="submit" className="btn btn--solid btn--small" disabled={!newClassName.trim()}>
                    {t('create')}
                  </button>
                  {data.classes.length > 0 && (
                    <button type="button" className="btn btn--link btn--small" onClick={() => setCreating(false)}>
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <button type="button" className="btn btn--dashed" onClick={() => setCreating(true)}>
                <Svg>{Icon.plus}</Svg>
                {t('newClass')}
              </button>
            )}

            <div className="backup">
              <span className="chalk-label">{t('graphics')}</span>
              <p className="backup__hint">{t('graphicsHint')}</p>
              <GraphicsSwitch />
            </div>

            <div className="backup">
              <span className="chalk-label">{t('backup')}</span>
              <p className="backup__hint">{t('backupHint')}</p>
              <div className="row">
                <button type="button" className="btn btn--small" onClick={exportBackup}>
                  {t('export')}
                </button>
                <button type="button" className="btn btn--small" onClick={() => fileRef.current?.click()}>
                  {t('import')}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void importBackup(f)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          </aside>

          <main className="classes__main">
            {message && (
              <div className="notice notice--inline" role="status">
                <span>{message}</span>
                <button type="button" className="btn btn--link btn--small" onClick={() => setMessage(null)}>
                  {t('ok')}
                </button>
              </div>
            )}

            {!cls ? (
              <div className="empty">
                <p className="chalk-title chalk-title--md">{t('createFirst')}</p>
                <p>{t('createFirstBody')}</p>
              </div>
            ) : (
              <>
                <div className="class-head">
                  {renaming ? (
                    <form className="row" onSubmit={saveRename}>
                      <label htmlFor="rename" className="sr-only">
                        {t('className')}
                      </label>
                      <input
                        id="rename"
                        className="chalk-input chalk-input--big"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn--solid btn--small">
                        {t('save')}
                      </button>
                      <button type="button" className="btn btn--link btn--small" onClick={() => setRenaming(false)}>
                        {t('cancel')}
                      </button>
                    </form>
                  ) : (
                    <div className="stack stack--tight">
                      <h2 className="chalk-title chalk-title--lg">{cls.name}</h2>
                      <span className="muted">
                        {t('studentsCount', { n: cls.students.length })}
                        {testedCount > 0 ? ` · ${t('testedNote', { n: testedCount })}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="row row--wrap">
                    <button
                      type="button"
                      className="btn btn--small"
                      onClick={() => {
                        setRenameValue(cls.name)
                        setRenaming(true)
                      }}
                    >
                      {t('rename')}
                    </button>
                    <button type="button" className="btn btn--small btn--solid" onClick={() => setImportText('')}>
                      {t('pasteList')}
                    </button>
                    <button type="button" className="btn btn--small btn--warm" onClick={clearTested} disabled={testedCount === 0}>
                      {t('clearTested')}
                    </button>
                    <button type="button" className="btn btn--small btn--danger" onClick={deleteClass}>
                      {t('deleteClass')}
                    </button>
                  </div>
                </div>

                <form className="panel panel--row" onSubmit={addStudent}>
                  <div className="stack grow">
                    <label htmlFor="add-name" className="chalk-label">
                      {full ? t('classFull', { max: MAX_STUDENTS }) : t('addStudentLabel', { n: cls.students.length + 1 })}
                    </label>
                    <input
                      id="add-name"
                      className="chalk-input"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder={t('fullName')}
                      disabled={full}
                    />
                  </div>
                  <button type="submit" className="btn btn--solid" disabled={!addName.trim() || full}>
                    {t('add')}
                  </button>
                </form>
                <p className="muted tip">{t('pasteTip')}</p>

                {cls.students.length > 0 && (
                  <div className="roster-scroll">
                    <table className="roster">
                      <thead>
                        <tr>
                          <th scope="col">{t('colNo')}</th>
                          <th scope="col">{t('colElement')}</th>
                          <th scope="col">{t('colStudent')}</th>
                          <th scope="col">{t('colLast')}</th>
                          <th scope="col">{t('colTested')}</th>
                          <th scope="col" className="roster__actions-head">
                            {t('colEdit')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cls.students.map((st, i) => {
                          const owned = elementsOf(i, cls.students.length, data.shareAll)
                          return (
                            <tr key={st.id} className={st.tested ? 'is-tested' : undefined}>
                              <td className="roster__no">{i + 1}</td>
                              <td className="roster__owned">
                                <div className="owned">
                                  {owned.map((el) => (
                                    <span
                                      key={el.z}
                                      className={`mini-tile ${st.tested ? 'mini-tile--tested' : `cat--${el.category}`}`}
                                      title={`${el.z} ${elName(el)}`}
                                    >
                                      <span className="mini-tile__num">{el.z}</span>
                                      {el.symbol}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="roster__name">
                                {editingId === st.id ? (
                                  <form className="row" onSubmit={saveEdit}>
                                    <label htmlFor={`edit-${st.id}`} className="sr-only">
                                      {t('fullName')}
                                    </label>
                                    <input
                                      id={`edit-${st.id}`}
                                      className="chalk-input"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                                      autoFocus
                                    />
                                    <button type="submit" className="btn btn--solid btn--small">
                                      {t('save')}
                                    </button>
                                  </form>
                                ) : (
                                  <span className="roster__name-text">{st.name}</span>
                                )}
                              </td>
                              <td className="roster__date">{formatDate(st.lastTestedAt)}</td>
                              <td className="roster__checkcell">
                                <input
                                  type="checkbox"
                                  className="roster__check"
                                  checked={st.tested}
                                  onChange={(e) => toggleTested(st.id, e.target.checked)}
                                  aria-label={t('testedAria', { name: st.name })}
                                />
                              </td>
                              <td className="roster__actcell">
                                <div className="roster__actions">
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={t('moveUp', { name: st.name })}
                                    onClick={() => move(i, -1)}
                                    disabled={i === 0}
                                  >
                                    <Svg>{Icon.up}</Svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={t('moveDown', { name: st.name })}
                                    onClick={() => move(i, 1)}
                                    disabled={i === cls.students.length - 1}
                                  >
                                    <Svg>{Icon.down}</Svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={t('edit', { name: st.name })}
                                    onClick={() => {
                                      setEditingId(st.id)
                                      setEditValue(st.name)
                                    }}
                                  >
                                    <Svg>{Icon.edit}</Svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={t('remove', { name: st.name })}
                                    onClick={() => removeStudent(st)}
                                  >
                                    <Svg>{Icon.trash}</Svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {cls && importText !== null && (
        <ImportDialog
          className={cls.name}
          existingNames={cls.students.map((s) => s.name)}
          initialText={importText}
          onAdd={applyImport}
          onClose={() => setImportText(null)}
        />
      )}
    </div>
  )
}

/** Đồ hoạ 3D: auto (measured on this device) / light / full. Takes effect at once. */
function GraphicsSwitch() {
  const { t } = useI18n()
  const [setting, setSetting] = useState<QualitySetting>(qualitySetting)
  const [effective, setEffective] = useState(quality)
  useEffect(() => {
    const on = () => {
      setSetting(qualitySetting())
      setEffective(quality())
    }
    window.addEventListener(QUALITY_EVENT, on)
    return () => window.removeEventListener(QUALITY_EVENT, on)
  }, [])
  const pick = (v: QualitySetting) => {
    setQualitySetting(v)
    setSetting(v)
    setEffective(quality())
  }
  return (
    <div className="row row--wrap">
      <div className="seg" role="group" aria-label={t('graphics')}>
        {(['auto', 'low', 'high'] as const).map((v) => (
          <button key={v} type="button" className={`seg__btn${setting === v ? ' seg__btn--on' : ''}`} aria-pressed={setting === v} onClick={() => pick(v)}>
            {t(v === 'auto' ? 'gfxAuto' : v === 'low' ? 'gfxLow' : 'gfxHigh')}
          </button>
        ))}
      </div>
      {setting === 'auto' && <span className="muted">{t(effective === 'low' ? 'gfxNowLow' : 'gfxNowHigh')}</span>}
    </div>
  )
}
