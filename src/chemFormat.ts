// Turns typed chemistry into proper formulas using Unicode sub/superscripts:
// H2O → H₂O, Ca(OH)2 → Ca(OH)₂, Fe3+ → Fe³⁺, SO42- → SO₄²⁻, 2H2 + O2 → 2H₂ + O₂.
// Every converted character is still one character, so text length (and the caret) never move,
// and the result is plain text that works everywhere (popup, CSV, backup).
import { ELEMENTS } from './data/elements'

const SYMBOLS = new Set(ELEMENTS.map((e) => e.symbol))
const SUB: Record<string, string> = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋' }
const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' }

export const toSub = (s: string) => [...s].map((c) => SUB[c] ?? c).join('')
export const toSup = (s: string) => [...s].map((c) => SUP[c] ?? c).join('')

// coefficient? · formula (symbols, digits, brackets) · charge? — not glued to other letters/digits.
const TOKEN = /(?<![\p{L}\p{N}_])(\d*)((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*|\[(?:[A-Z][a-z]?\d*)+\]\d*)+)(\d*[+-])?(?![\p{L}\p{N}])/gu

/** Every element symbol in the formula is real (so "Bài", "OK", "A1" are left alone). */
function realFormula(f: string): boolean {
  const syms = f.match(/[A-Z][a-z]?/g) ?? []
  return syms.length > 0 && syms.every((s) => SYMBOLS.has(s))
}

function formatToken(coef: string, formula: string, charge: string | undefined): string | null {
  if (!realFormula(formula)) return null
  let body = formula
  let ch = charge ?? ''
  // A single atom with a charge: "Fe3+" is Fe³⁺, not Fe₃⁺.
  const single = /^([A-Z][a-z]?)(\d+)$/.exec(formula)
  if (ch && single) {
    body = single[1]
    ch = single[2] + ch
  }
  // Polyatomic ion written "SO42-": the last digit is the charge when the formula already
  // ends in a count (SO4 + 2-). "NH4+" keeps 4 as a count.
  else if (ch && /\d$/.test(ch) === false && /[A-Za-z)\]]\d\d$/.test(formula)) {
    body = formula.slice(0, -1)
    ch = formula.slice(-1) + ch
  }
  if (!/\d/.test(body) && !ch) return null // "CO", "NaCl": nothing to format
  // Charge after a formula needs at least one letter before it ("2-" alone is not an ion).
  return coef + body.replace(/\d+/g, (d) => toSub(d)) + toSup(ch)
}

/** Range of a formula to convert: [start, end, replacement]. */
type Edit = [number, number, string]

/**
 * Formula edits in `text`. The token the caret is touching is skipped — the teacher may still
 * be typing it ("Fe3" before the "+").
 */
export function formulaEdits(text: string, caret = -1): Edit[] {
  const edits: Edit[] = []
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0
    const end = start + m[0].length
    if (caret >= start && caret <= end) continue
    const out = formatToken(m[1], m[2], m[3])
    if (out && out !== m[0]) edits.push([start, end, out])
  }
  return edits
}

/** Formats every formula in the text. */
export function formatFormulas(text: string): string {
  let out = text
  for (const [s, e, r] of formulaEdits(text).reverse()) out = out.slice(0, s) + r + out.slice(e)
  return out
}
