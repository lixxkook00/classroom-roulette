/*
 * Turns whatever a teacher pastes — cells copied from Excel / Google Sheets, a CSV file,
 * a numbered list from Word or Zalo — into a clean list of student names.
 *
 * Handles the usual Vietnamese class-list layout too: STT | Mã HS | Họ đệm | Tên | Ngày sinh | Giới tính
 * (the "Họ đệm" and "Tên" columns are joined into one name).
 */

export type ColumnKind = 'name' | 'family' | 'given' | 'text' | 'number' | 'date' | 'gender' | 'empty'

export interface Column {
  index: number
  /** Header text if the first row is a header, else '' */
  header: string
  kind: ColumnKind
  samples: string[]
}

export interface Table {
  rows: string[][]
  /** Best guess whether row 0 is a header. */
  headerGuess: boolean
  columns: Column[]
  /** Columns to join into the name, best guess. */
  nameColumns: number[]
}

const strip = (s: string) =>
  s
    .normalize('NFC')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim()

/** Minimal CSV/TSV line splitter that understands "quoted, cells". */
function splitLine(line: string, delim: string): string[] {
  if (delim === '') return [line]
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"' && cur.trim() === '') {
      quoted = true
      cur = ''
    } else if (ch === delim) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

function detectDelimiter(lines: string[]): string {
  if (lines.some((l) => l.includes('\t'))) return '\t'
  for (const d of [';', ',']) {
    const counts = lines.map((l) => splitLine(l, d).length - 1)
    const withDelim = counts.filter((c) => c > 0).length
    // Most lines split the same way → treat as CSV. Names never contain ; or , in a class list.
    if (withDelim >= Math.max(1, lines.length * 0.6)) return d
  }
  return ''
}

const HEADER_WORDS = [
  'stt', 'tt', 'so tt', 'no', 'no.', '#', 'ho', 'ho dem', 'ho va ten', 'ho va ten dem', 'ho ten', 'ten',
  'name', 'full name', 'fullname', 'first name', 'last name', 'surname', 'given name', 'family name',
  'student', 'students', 'hoc sinh', 'ma', 'ma hs', 'ma hoc sinh', 'id', 'gioi tinh', 'gender', 'sex',
  'ngay sinh', 'dob', 'birthday', 'lop', 'class', 'ghi chu', 'note', 'notes', 'email', 'sdt',
]

function headerRole(h: string): ColumnKind | null {
  const f = fold(h)
  if (['ten', 'first name', 'given name', 'firstname'].includes(f)) return 'given'
  if (['ho', 'ho dem', 'ho va ten dem', 'ho va dem', 'last name', 'surname', 'family name', 'lastname'].includes(f)) return 'family'
  if (['ho va ten', 'ho ten', 'name', 'full name', 'fullname', 'student', 'hoc sinh', 'ten hoc sinh', 'ho ten hoc sinh'].includes(f)) return 'name'
  return null
}

const isNumberish = (v: string) => /^\d+[.)]?$/.test(v) || (/\d/.test(v) && /^[A-Za-z0-9_-]{4,}$/.test(v))
const isDate = (v: string) => /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}$/.test(v)
const GENDERS = new Set(['nam', 'nu', 'male', 'female', 'm', 'f', 'boy', 'girl'])
const isGender = (v: string) => GENDERS.has(fold(v))
const hasLetters = (v: string) => /\p{L}/u.test(v)

function classify(values: string[]): ColumnKind {
  const vals = values.filter(Boolean)
  if (vals.length === 0) return 'empty'
  const share = (fn: (v: string) => boolean) => vals.filter(fn).length / vals.length
  if (share(isNumberish) >= 0.8) return 'number'
  if (share(isDate) >= 0.8) return 'date'
  if (share(isGender) >= 0.8) return 'gender'
  if (share(hasLetters) >= 0.8) return 'text'
  return 'empty'
}

const wordCount = (v: string) => (v ? v.split(' ').length : 0)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Removes "1.", "01)", "12 -" style numbering a teacher may have typed before a name. */
export function stripNumbering(s: string): string {
  return s.replace(/^\s*(?:\d+|[a-z])\s*[.):\-–]\s*/i, '').replace(/^\s*\d+\s+(?=\p{L})/u, '')
}

export function parseTable(text: string): Table {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
  if (lines.length === 0) return { rows: [], headerGuess: false, columns: [], nameColumns: [] }

  const delim = detectDelimiter(lines)
  let rows = lines.map((l) => splitLine(l, delim).map(strip))

  // Drop columns that are empty everywhere.
  const width = Math.max(...rows.map((r) => r.length))
  const keep = Array.from({ length: width }, (_, c) => rows.some((r) => (r[c] ?? '') !== '')).map((k, i) => (k ? i : -1)).filter((i) => i >= 0)
  rows = rows.map((r) => keep.map((c) => r[c] ?? ''))

  const first = rows[0]
  const headerGuess = first.some((c) => HEADER_WORDS.includes(fold(c))) && rows.length > 1
  const body = headerGuess ? rows.slice(1) : rows

  const columns: Column[] = keep.map((_, i) => {
    const header = headerGuess ? first[i] : ''
    const values = body.map((r) => r[i] ?? '')
    let kind = classify(values)
    const role = header ? headerRole(header) : null
    if (role && kind === 'text') kind = role
    return { index: i, header, kind, samples: values.filter(Boolean).slice(0, 3) }
  })

  return { rows, headerGuess, columns, nameColumns: guessNameColumns(columns, body) }
}

function guessNameColumns(columns: Column[], body: string[][]): number[] {
  const family = columns.find((c) => c.kind === 'family')
  const given = columns.find((c) => c.kind === 'given')
  if (family && given) return [family.index, given.index]
  const named = columns.find((c) => c.kind === 'name')
  if (named) return [named.index]

  const text = columns.filter((c) => c.kind === 'text' || c.kind === 'given' || c.kind === 'family')
  if (text.length === 0) return columns.length ? [columns[0].index] : []
  if (text.length === 1) return [text[0].index]

  // "Họ đệm | Tên" without headers: two neighbouring text columns, the second one mostly a single word.
  for (let i = 0; i < text.length - 1; i++) {
    const a = text[i]
    const b = text[i + 1]
    if (b.index !== a.index + 1) continue
    const bWords = avg(body.map((r) => wordCount(r[b.index] ?? '')))
    const aWords = avg(body.map((r) => wordCount(r[a.index] ?? '')))
    if (bWords <= 1.2 && aWords >= 1.5) return [a.index, b.index]
  }
  // Otherwise the column that looks most like full names (most words per cell).
  const best = [...text].sort(
    (x, y) => avg(body.map((r) => wordCount(r[y.index] ?? ''))) - avg(body.map((r) => wordCount(r[x.index] ?? ''))),
  )[0]
  return [best.index]
}

/** "NGUYỄN VĂN AN" / "nguyễn văn an" → "Nguyễn Văn An". Mixed-case names are left alone. */
export function fixCase(name: string): string {
  const letters = name.replace(/[^\p{L}]/gu, '')
  const allUpper = letters === letters.toLocaleUpperCase('vi')
  const allLower = letters === letters.toLocaleLowerCase('vi')
  if (!allUpper && !allLower) return name
  return name
    .toLocaleLowerCase('vi')
    .split(' ')
    .map((w) => (w ? w[0].toLocaleUpperCase('vi') + w.slice(1) : w))
    .join(' ')
}

export interface BuildOptions {
  hasHeader: boolean
  columns: number[]
  fixCaps: boolean
}

export function buildNames(table: Table, opts: BuildOptions): string[] {
  const body = opts.hasHeader ? table.rows.slice(1) : table.rows
  return body
    .map((r) => {
      let name = strip(opts.columns.map((c) => r[c] ?? '').join(' '))
      if (opts.columns.length === 1 && table.columns.length === 1) name = strip(stripNumbering(name))
      return opts.fixCaps ? fixCase(name) : name
    })
    .filter((n) => n !== '' && /\p{L}/u.test(n))
}

/** Case- and accent-insensitive key, for spotting duplicates. */
export const nameKey = (n: string) => fold(n).replace(/\s+/g, ' ')
