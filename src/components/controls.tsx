import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

interface SelectProps {
  id?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  /** Visible label text, also used as the accessible name. */
  label?: string
}

/** Chalk-styled dropdown (listbox pattern) — replaces the browser's native <select>. */
export function ChalkSelect({ id, value, options, onChange, disabled, label }: SelectProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = () => {
    setActive(selectedIndex)
    setOpen(true)
  }

  const choose = (i: number) => {
    const o = options[i]
    if (o) onChange(o.value)
    setOpen(false)
    btnRef.current?.focus()
  }

  const onButtonKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
      PageDown: () => Math.min(last, active + 8),
      PageUp: () => Math.max(0, active - 8),
    }
    if (moves[e.key]) {
      e.preventDefault()
      setActive(moves[e.key]())
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      setOpen(false)
      btnRef.current?.focus()
    } else if (e.key.length === 1) {
      // Type-ahead: jump to the next option starting with that letter.
      const ch = e.key.toLowerCase()
      const n = options.length
      for (let k = 1; k <= n; k++) {
        const i = (active + k) % n
        if (options[i].label.toLowerCase().startsWith(ch)) {
          setActive(i)
          break
        }
      }
    }
  }

  return (
    <div className={`cselect${open ? ' cselect--open' : ''}`} ref={rootRef}>
      <button
        ref={btnRef}
        id={baseId}
        type="button"
        className="cselect__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-label={label ? `${label}: ${selected?.label ?? ''}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
      >
        <span className="cselect__value">{selected?.label}</span>
        {selected?.hint && <span className="cselect__hint">{selected.hint}</span>}
        <svg className="cselect__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${baseId}-list`}
          className="cselect__list"
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${baseId}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${baseId}-opt-${i}`}
              data-i={i}
              role="option"
              aria-selected={o.value === value}
              className={`cselect__opt${i === active ? ' cselect__opt--active' : ''}${o.value === value ? ' cselect__opt--selected' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.hint && <span className="cselect__hint">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
  title?: string
  /** Accessible name when the visible label is only an icon. */
  ariaLabel?: string
}

/** Chalk on/off switch. */
export function Switch({ checked, onChange, children, disabled, title, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch${checked ? ' switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{children}</span>
    </button>
  )
}
