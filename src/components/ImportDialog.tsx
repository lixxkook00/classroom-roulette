import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { MAX_STUDENTS } from '../data/elements'
import { useI18n } from '../i18n'
import { buildNames, nameKey, parseTable } from '../smartImport'
import { Switch } from './controls'

interface Props {
  className: string
  existingNames: string[]
  initialText?: string
  onAdd: (names: string[], mode: 'append' | 'replace') => void
  onClose: () => void
}

export function ImportDialog({ className, existingNames, initialText = '', onAdd, onClose }: Props) {
  const { t } = useI18n()
  const [text, setText] = useState(initialText)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // User overrides; null = use the automatic guess for the current text.
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null)
  const [columnsOverride, setColumnsOverride] = useState<number[] | null>(null)
  const [fixCaps, setFixCaps] = useState(true)
  const [skipDupes, setSkipDupes] = useState(true)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    textRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setNewText = (v: string) => {
    setText(v)
    setHeaderOverride(null)
    setColumnsOverride(null)
    setError(null)
  }

  const table = useMemo(() => parseTable(text), [text])
  const hasHeader = headerOverride ?? table.headerGuess
  const columns = columnsOverride ?? table.nameColumns

  const names = useMemo(() => buildNames(table, { hasHeader, columns, fixCaps }), [table, hasHeader, columns, fixCaps])

  const rows = useMemo(() => {
    const seen = new Set(existingNames.map(nameKey))
    return names.map((name) => {
      const key = nameKey(name)
      const dupe = seen.has(key)
      seen.add(key)
      return { name, dupe }
    })
  }, [names, existingNames])

  const ready = skipDupes ? rows.filter((r) => !r.dupe).map((r) => r.name) : rows.map((r) => r.name)

  // When replacing, names already in the class aren't duplicates — only repeats inside the paste are.
  const readyForReplace = useMemo(() => {
    if (!skipDupes) return names
    const seen = new Set<string>()
    return names.filter((n) => {
      const k = nameKey(n)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [names, skipDupes])
  const multiColumn = table.columns.length > 1

  const toggleColumn = (i: number) => {
    const set = new Set(columns)
    if (set.has(i)) set.delete(i)
    else set.add(i)
    setColumnsOverride([...set].sort((a, b) => a - b))
  }

  const readFile = async (file: File) => {
    if (/\.xlsx?$/i.test(file.name)) {
      setError(t('xlsxHint'))
      return
    }
    try {
      const buf = await file.arrayBuffer()
      // Excel "CSV (UTF-8)" exports start with a BOM; older Windows exports may be UTF-16.
      let content = new TextDecoder('utf-8').decode(buf)
      if (content.includes('\u0000')) content = new TextDecoder('utf-16le').decode(buf)
      setNewText(content.replace(/^﻿/, ''))
    } catch {
      setError(t('fileError'))
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void readFile(f)
    else {
      const dropped = e.dataTransfer.getData('text/plain')
      if (dropped) setNewText(dropped)
    }
  }

  const columnLabel = (c: (typeof table.columns)[number]) => c.header || t('columnN', { n: c.index + 1 })

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`import${dragging ? ' import--drag' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false)
        }}
        onDrop={onDrop}
      >
        <header className="import__head">
          <div>
            <h2 id="import-title" className="chalk-title chalk-title--md">
              {t('importTitle')} · {className}
            </h2>
            <p className="muted">{t('importHelp')}</p>
          </div>
          <button type="button" className="icon-btn" aria-label={t('close')} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="import__body">
          <div className="import__input">
            <label htmlFor="import-text" className="sr-only">
              {t('importPlaceholder')}
            </label>
            <textarea
              id="import-text"
              ref={textRef}
              className="chalk-input chalk-textarea import__text"
              value={text}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={t('importPlaceholder')}
              spellCheck={false}
            />
            <div className="row row--wrap">
              <button type="button" className="btn btn--small" onClick={() => fileRef.current?.click()}>
                {t('chooseFile')}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,text/csv,text/plain,.xlsx,.xls"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void readFile(f)
                  e.target.value = ''
                }}
              />
              <span className="muted">.csv · .txt</span>
            </div>
            {error && (
              <p className="import__error" role="alert">
                {error}
              </p>
            )}

            {text.trim() !== '' && (
              <div className="import__options">
                {multiColumn && (
                  <fieldset className="import__cols">
                    <legend className="chalk-label">{t('columnsLabel')}</legend>
                    <div className="row row--wrap">
                      {table.columns.map((c) => {
                        const on = columns.includes(c.index)
                        return (
                          <button
                            key={c.index}
                            type="button"
                            className={`colchip${on ? ' colchip--on' : ''}`}
                            aria-pressed={on}
                            onClick={() => toggleColumn(c.index)}
                          >
                            <span className="colchip__name">{columnLabel(c)}</span>
                            <span className="colchip__sample">{c.samples[0] ?? '—'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )}
                <div className="import__switches">
                  {table.rows.length > 1 && (
                    <Switch checked={hasHeader} onChange={setHeaderOverride}>
                      {t('hasHeader')}
                    </Switch>
                  )}
                  <Switch checked={fixCaps} onChange={setFixCaps}>
                    {t('fixCaps')}
                  </Switch>
                  <Switch checked={skipDupes} onChange={setSkipDupes}>
                    {t('skipDupes')}
                  </Switch>
                </div>
              </div>
            )}
          </div>

          <div className="import__preview">
            <span className="chalk-label">{t('readyCount', { n: ready.length })}</span>
            {rows.length === 0 ? (
              <p className="muted import__empty">{t('previewEmpty')}</p>
            ) : (
              <ol className="import__list">
                {rows.map((r, i) => (
                  <li key={i} className={r.dupe ? (skipDupes ? 'is-skipped' : 'is-dupe') : undefined}>
                    <span className="import__name">{r.name}</span>
                    {r.dupe && <span className="badge">{t('dupe')}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <footer className="import__foot">
          <button type="button" className="btn btn--link btn--small" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn--small"
            disabled={readyForReplace.length === 0}
            onClick={() => onAdd(readyForReplace.slice(0, MAX_STUDENTS), 'replace')}
          >
            {t('replaceList')}
          </button>
          <button type="button" className="btn btn--solid btn--small" disabled={ready.length === 0} onClick={() => onAdd(ready, 'append')}>
            {t('addToEnd')}
          </button>
        </footer>
      </div>
    </div>
  )
}
