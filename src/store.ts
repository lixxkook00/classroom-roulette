import { useCallback, useEffect, useState } from 'react'
import { ELEMENTS, MAX_STUDENTS, type Element } from './data/elements'

export interface Student {
  id: string
  name: string
  /** Picked and tested in an earlier spin — sits out until the marks are cleared. */
  tested: boolean
  /** ISO date (yyyy-mm-dd) of the last time this student was marked as tested. */
  lastTestedAt: string | null
}

export interface ClassRoom {
  id: string
  name: string
  students: Student[]
}

/*
 * Elements are handed out round-robin in list order, and every student always gets the
 * SAME number of elements, so nobody has a better chance of being landed on:
 * - shareAll on: floor(118 / class size) each. With 30 students that is 3 each —
 *   #1 owns H (1), Ga (31), Pm (61); #2 owns He, Ge, Sm; … — and elements 91–118 stay unused.
 * - shareAll off: one element each — #1 is H, #2 is He, …
 */

/** How many elements each student gets. */
export function perStudent(count: number, shareAll: boolean): number {
  if (count === 0) return 0
  return shareAll ? Math.floor(MAX_STUDENTS / count) : 1
}

/** Index (0-based) of the student who owns element z, or null if nobody does. */
export function ownerOf(z: number, count: number, shareAll: boolean): number | null {
  if (count === 0 || z > count * perStudent(count, shareAll)) return null
  return (z - 1) % count
}

/** Elements owned by the student at `index` in a class of `count` students. */
export function elementsOf(index: number, count: number, shareAll: boolean): Element[] {
  const last = count * perStudent(count, shareAll)
  const out: Element[] = []
  for (let z = index + 1; z <= last; z += count) out.push(ELEMENTS[z - 1])
  return out
}

export interface AppData {
  version: 1
  classes: ClassRoom[]
  activeClassId: string | null
  /** When true, students marked as tested are left out of the spin. */
  skipTested: boolean
  /** When true, the whole table is shared out equally; otherwise one element each. */
  shareAll: boolean
  /** 'table': glow runs across the periodic table. 'card': mystery card revealed clue by clue. */
  mode: SpinMode
  /** Teacher-made element lists for "Đoán nguyên tố". */
  elementSets: ElementSet[]
  /** Teacher-made question lists shown after a student is picked. */
  questionSets: QuestionSet[]
  /** Question set used on "Trả lời câu hỏi" (null = no questions). */
  activeQuestionSetId: string | null
  /** The running question round of each class (key = class id). */
  rounds: Record<string, QuestionRound>
}

export interface RoundResult {
  studentId: string
  studentName: string
  questionId: string
  questionText: string
  correct: boolean
  /** ISO time */
  at: string
}

/** A round: every question of the set is asked once; answered questions leave the round. */
export interface QuestionRound {
  setId: string
  startedAt: string
  /** Questions already answered in this round. */
  used: string[]
  results: RoundResult[]
}

export type MediaKind = 'audio' | 'video' | 'youtube'

export interface QuestionMedia {
  kind: MediaKind
  /** audio/video: id of the file in IndexedDB (see media.ts). youtube: the link. */
  ref: string
  /** Original file name, shown in the editor. */
  name?: string
}

export interface Question {
  id: string
  text: string
  media?: QuestionMedia
  /** The correct answer, revealed with "Kiểm tra đáp án". */
  answer?: string
}

export interface QuestionSet {
  id: string
  name: string
  questions: Question[]
}

export interface ElementSet {
  id: string
  name: string
  /** Atomic numbers, sorted. */
  elements: number[]
}

export type SpinMode = 'table' | 'card'

const STORAGE_KEY = 'element-roulette:v1'

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const today = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const newStudent = (name: string): Student => ({
  id: uid(),
  name: name.trim(),
  tested: false,
  lastTestedAt: null,
})

function demoData(): AppData {
  const names = [
    'Nguyễn An Bình', 'Trần Bảo Châu', 'Lê Minh Đức', 'Phạm Thu Hà', 'Hoàng Gia Khang',
    'Vũ Ngọc Lan', 'Đặng Quốc Minh', 'Bùi Khánh Linh', 'Đỗ Thành Nam', 'Ngô Phương Thảo',
    'Dương Hải Phong', 'Trần Bảo Ngọc', 'Lý Gia Hân', 'Phan Đức Huy', 'Võ Minh Thư',
  ]
  const demo: ClassRoom = { id: uid(), name: 'Lớp mẫu (Demo)', students: names.map(newStudent) }
  return { version: 1, classes: [demo], activeClassId: demo.id, skipTested: true, shareAll: true, mode: 'table', elementSets: [], questionSets: [], activeQuestionSetId: null, rounds: {} }
}

function isAppData(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false
  const d = x as AppData
  return (
    Array.isArray(d.classes) &&
    d.classes.every(
      (c) =>
        c &&
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        Array.isArray(c.students) &&
        c.students.every((s) => s && typeof s.id === 'string' && typeof s.name === 'string'),
    )
  )
}

/** Normalises imported/stored data so older or hand-edited files still load. */
export function sanitize(x: AppData): AppData {
  const classes = x.classes.map((c) => ({
    id: c.id,
    name: c.name,
    students: c.students.slice(0, MAX_STUDENTS).map((s) => ({
      id: s.id,
      name: s.name,
      tested: !!s.tested,
      lastTestedAt: typeof s.lastTestedAt === 'string' ? s.lastTestedAt : null,
    })),
  }))
  const activeClassId = classes.some((c) => c.id === x.activeClassId)
    ? x.activeClassId
    : (classes[0]?.id ?? null)
  return { version: 1, classes, activeClassId, skipTested: x.skipTested !== false, shareAll: x.shareAll !== false,
    mode: x.mode === 'card' ? 'card' : 'table',
    elementSets: Array.isArray(x.elementSets)
      ? x.elementSets
          .filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string' && Array.isArray(s.elements))
          .map((s) => ({ id: s.id, name: s.name, elements: cleanElements(s.elements) }))
      : [],
    questionSets: cleanQuestionSets(x.questionSets),
    activeQuestionSetId:
      typeof x.activeQuestionSetId === 'string' && Array.isArray(x.questionSets) && x.questionSets.some((q) => q?.id === x.activeQuestionSetId)
        ? x.activeQuestionSetId
        : null,
    rounds: cleanRounds(x.rounds, classes.map((c) => c.id)),
  }
}

function cleanRounds(raw: unknown, classIds: string[]): Record<string, QuestionRound> {
  const out: Record<string, QuestionRound> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [cid, r] of Object.entries(raw as Record<string, QuestionRound>)) {
    if (!classIds.includes(cid) || !r || typeof r.setId !== 'string' || !Array.isArray(r.used) || !Array.isArray(r.results)) continue
    out[cid] = {
      setId: r.setId,
      startedAt: typeof r.startedAt === 'string' ? r.startedAt : new Date().toISOString(),
      used: r.used.filter((u) => typeof u === 'string'),
      results: r.results.filter((x) => x && typeof x.studentId === 'string' && typeof x.correct === 'boolean'),
    }
  }
  return out
}

/** Valid, unique, sorted atomic numbers. */
export function cleanElements(list: unknown[]): number[] {
  return [...new Set(list.map(Number).filter((z) => Number.isInteger(z) && z >= 1 && z <= MAX_STUDENTS))].sort((a, b) => a - b)
}

function cleanQuestionSets(raw: unknown): QuestionSet[] {
  if (!Array.isArray(raw)) return []
  const kinds: MediaKind[] = ['audio', 'video', 'youtube']
  return raw
    .filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string' && Array.isArray(s.questions))
    .map((s) => ({
      id: s.id,
      name: s.name,
      questions: (s.questions as Question[])
        .filter((q) => q && typeof q.id === 'string' && typeof q.text === 'string')
        .map((q) => ({
          id: q.id,
          text: q.text,
          answer: typeof q.answer === 'string' && q.answer.trim() ? q.answer : undefined,
          media:
            q.media && kinds.includes(q.media.kind) && typeof q.media.ref === 'string'
              ? { kind: q.media.kind, ref: q.media.ref, name: typeof q.media.name === 'string' ? q.media.name : undefined }
              : undefined,
        })),
    }))
}

export function parseBackup(text: string): AppData | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return isAppData(parsed) ? sanitize(parsed) : null
  } catch {
    return null
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = parseBackup(raw)
      if (parsed) return parsed
    }
  } catch {
    // Storage unavailable (private mode etc.) — fall through to demo data.
  }
  return demoData()
}

export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Ignore quota / private-mode errors; the app still works for this session.
    }
  }, [data])

  const updateClass = useCallback((id: string, fn: (c: ClassRoom) => ClassRoom) => {
    setData((d) => ({ ...d, classes: d.classes.map((c) => (c.id === id ? fn(c) : c)) }))
  }, [])

  return { data, setData, updateClass }
}
