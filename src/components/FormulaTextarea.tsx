import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, TextareaHTMLAttributes } from 'react'
import { formatFormulas, formulaEdits, toSub, toSup } from '../chemFormat'
import { useI18n } from '../i18n'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

const SYMBOLS = ['→', '⇌', '↑', '↓', 'Δ', '°', '·'] as const
type Mode = 'sub' | 'sup' | null

/** Replaces a range through the browser's editing pipeline so Ctrl+Z still works. */
function replaceRange(el: HTMLTextAreaElement, start: number, end: number, text: string) {
  el.setSelectionRange(start, end)
  if (!document.execCommand('insertText', false, text)) {
    el.setRangeText(text, start, end, 'end')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/**
 * A textarea that understands chemistry: H2O → H₂O, Fe3+ → Fe³⁺ as you type, plus a small
 * toolbar for sub/superscript and reaction arrows. The value stays plain text.
 */
export const FormulaTextarea = forwardRef<HTMLTextAreaElement, Props>(function FormulaTextarea(
  { value, onChange, className, onBlur, onKeyDown, ...rest },
  ref,
) {
  const { t } = useI18n()
  const elRef = useRef<HTMLTextAreaElement>(null)
  const busy = useRef(false)
  const [mode, setMode] = useState<Mode>(null)
  useImperativeHandle(ref, () => elRef.current as HTMLTextAreaElement)

  // Format finished formulas (never the one under the caret) once React has rendered the keystroke.
  const autoFormat = () => {
    requestAnimationFrame(() => {
      const el = elRef.current
      if (!el || busy.current || document.activeElement !== el) return
      const caret = el.selectionStart
      if (caret !== el.selectionEnd) return
      const edits = formulaEdits(el.value, caret)
      if (!edits.length) return
      busy.current = true
      for (const [s, e, r] of edits.reverse()) replaceRange(el, s, e, r)
      el.setSelectionRange(caret, caret) // same length, so the caret stays put
      busy.current = false
    })
  }

  const insert = (text: string) => {
    const el = elRef.current
    if (!el) return
    el.focus()
    replaceRange(el, el.selectionStart, el.selectionEnd, text)
  }

  const script = (m: 'sub' | 'sup') => {
    const el = elRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    if (s !== e) {
      // Convert the selection and keep it selected.
      el.focus()
      replaceRange(el, s, e, (m === 'sub' ? toSub : toSup)(el.value.slice(s, e)))
      el.setSelectionRange(s, e)
      return
    }
    setMode((cur) => (cur === m ? null : m))
    el.focus()
  }

  const keyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e)
    if (!mode || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Escape') {
      setMode(null)
      return
    }
    if (e.key.length !== 1) return
    const mapped = (mode === 'sub' ? toSub : toSup)(e.key)
    if (mapped === e.key) {
      setMode(null) // any other character ends the sub/superscript run
      return
    }
    e.preventDefault()
    insert(mapped)
  }

  // Toolbar buttons keep the textarea focused (and its selection) by not taking focus.
  const keep = (e: MouseEvent) => e.preventDefault()

  return (
    <div className="ftx">
      <textarea
        {...rest}
        ref={elRef}
        className={`${className ?? ''} ftx__input`}
        value={value}
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value)
          autoFormat()
        }}
        onKeyDown={keyDown}
        onBlur={(e) => {
          setMode(null)
          const formatted = formatFormulas(e.target.value)
          if (formatted !== e.target.value) onChange(formatted)
          onBlur?.(e)
        }}
      />
      <div className="ftx__bar" role="toolbar" aria-label={t('fxToolbar')}>
        <button
          type="button"
          className="ftx__btn"
          aria-pressed={mode === 'sub'}
          title={t('fxSub')}
          onMouseDown={keep}
          onClick={() => script('sub')}
        >
          x<sub>2</sub>
        </button>
        <button
          type="button"
          className="ftx__btn"
          aria-pressed={mode === 'sup'}
          title={t('fxSup')}
          onMouseDown={keep}
          onClick={() => script('sup')}
        >
          x<sup>2+</sup>
        </button>
        <span className="ftx__sep" aria-hidden="true" />
        {SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            className="ftx__btn"
            title={t('fxInsert', { s })}
            onMouseDown={keep}
            onClick={() => insert(s)}
          >
            {s}
          </button>
        ))}
        <span className="ftx__hint">{t('fxHint')}</span>
      </div>
    </div>
  )
})
