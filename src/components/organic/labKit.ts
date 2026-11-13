import { useCallback } from 'react'
import type { AtomKind, Txt } from '../../data/organic'
import { useI18n } from '../../i18n'

export const SOUND_KEY = 'element-roulette:sound'

/** The sound switch lives on the spin screen; the lab follows it. */
export function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export type Fill = Record<string, string | number>

/** Picks the current language and fills {placeholders}. */
export function useL() {
  const { lang } = useI18n()
  return useCallback(
    (x: Txt, vars?: Fill) => x[lang].replace(/\{(\w+)\}/g, (_, k: string) => (vars && k in vars ? String(vars[k]) : `{${k}}`)),
    [lang],
  )
}

/** UI strings for the lab (kept here so i18n.tsx stays about the periodic table). */
export const UI = {
  tabTitle: { vi: 'Lab hữu cơ', en: 'Organic lab' },
  lesson: { vi: 'Bài học', en: 'Lesson' },
  partsAria: { vi: 'Các phần của bài', en: 'Lesson parts' },
  parts: {
    molecule: { vi: 'Phân tử', en: 'Molecule' },
    compare: { vi: 'So sánh', en: 'Compare' },
    mix: { vi: 'Độ cồn', en: 'Degree' },
    react: { vi: 'Thí nghiệm', en: 'Experiments' },
    who: { vi: 'Ai phản ứng?', en: 'Who reacts?' },
    quiz: { vi: 'Luyện tập', en: 'Practice' },
  },
  share: { vi: 'Chia sẻ', en: 'Share' },
  // molecule
  ball: { vi: 'Mô hình', en: 'Model' },
  formula: { vi: 'Công thức cấu tạo', en: 'Structural formula' },
  showGroup: { vi: 'Tìm nhóm {g}', en: 'Find {g}' },
  hideGroup: { vi: 'Bỏ đánh dấu', en: 'Clear highlight' },
  count: { vi: 'Đếm nguyên tử', en: 'Count the atoms' },
  tapAtom: { vi: 'Bấm vào một nguyên tử để xem đó là gì.', en: 'Tap an atom to see what it is.' },
  atom: {
    C: { vi: 'Carbon (C) — hoá trị IV', en: 'Carbon (C) — 4 bonds' },
    H: { vi: 'Hydrogen (H) — hoá trị I', en: 'Hydrogen (H) — 1 bond' },
    O: { vi: 'Oxygen (O) — hoá trị II', en: 'Oxygen (O) — 2 bonds' },
    N: { vi: 'Nitrogen (N) — hoá trị III', en: 'Nitrogen (N) — 3 bonds' },
    Cl: { vi: 'Chlorine (Cl) — hoá trị I', en: 'Chlorine (Cl) — 1 bond' },
  },
  // compare
  compareTitle: { vi: 'Phiếu học tập — So sánh cấu tạo', en: 'Worksheet — compare the structures' },
  compareHint: { vi: 'Bấm vào ô "……" để hiện đáp án.', en: 'Tap a “……” cell to reveal it.' },
  revealAll: { vi: 'Hiện tất cả', en: 'Reveal all' },
  hideAll: { vi: 'Ẩn lại', en: 'Hide again' },
  rowFormula: { vi: 'Công thức phân tử', en: 'Molecular formula' },
  rowCondensed: { vi: 'Công thức cấu tạo thu gọn', en: 'Condensed formula' },
  rowElements: { vi: 'Các nguyên tố trong phân tử', en: 'Elements' },
  rowGroup: { vi: 'Nhóm nguyên tử gây nên tính chất đặc trưng', en: 'Group behind its typical properties' },
  none: { vi: 'Không có', en: 'None' },
  // reactions
  guess: { vi: 'Đoán sản phẩm trước nhé!', en: 'Guess the products first!' },
  guessNoEq: { vi: 'Đoán hiện tượng trước nhé!', en: 'Guess what will happen first!' },
  reveal: { vi: 'Hiện đáp án', en: 'Show answer' },
  again: { vi: 'Làm lại', en: 'Reset' },
  observe: { vi: 'Hiện tượng', en: 'What we see' },
  meaning: { vi: 'Kết luận', en: 'Conclusion' },
  splint: { vi: 'Đưa que đóm đang cháy lại gần', en: 'Bring a burning splint' },
  pop: { vi: 'Bụp!', en: 'Pop!' },
  running: { vi: 'Đang phản ứng…', en: 'Reacting…' },
  noEq: { vi: 'Không viết phương trình', en: 'No equation' },
  // who reacts
  whoHint: { vi: 'Cả lớp chọn các chất phản ứng được, rồi bấm Kiểm tra.', en: 'Let the class pick the ones that react, then press Check.' },
  check: { vi: 'Kiểm tra', en: 'Check' },
  retry: { vi: 'Chọn lại', en: 'Try again' },
  whyNot: { vi: 'Không phản ứng', en: 'No reaction' },
  whoScore: { vi: 'Đúng {s}/{n} chất', en: '{s} of {n} right' },
  // quiz
  all: { vi: 'Tất cả', en: 'All' },
  period: { vi: 'Tiết {n}', en: 'Period {n}' },
  yes: { vi: 'Đúng', en: 'True' },
  no: { vi: 'Sai', en: 'False' },
  tfTag: { vi: 'Đúng hay sai?', en: 'True or false?' },
  correct: { vi: 'Chính xác!', en: 'Correct!' },
  incorrect: { vi: 'Chưa đúng!', en: 'Not quite!' },
  next: { vi: 'Câu tiếp', en: 'Next' },
  finish: { vi: 'Xem kết quả', en: 'See the score' },
  scoreLine: { vi: 'Câu {i}/{n} · Điểm: {s}', en: 'Question {i}/{n} · Score: {s}' },
  final: { vi: 'Cả lớp đúng {s}/{n} câu!', en: 'The class got {s} out of {n}!' },
  playAgain: { vi: 'Chơi lại', en: 'Play again' },
  keysTf: { vi: 'Phím Đ = Đúng · S = Sai · Space = câu tiếp', en: 'Keys: T = true · F = false · Space = next' },
  keysMcq: { vi: 'Phím A B C D · Space = câu tiếp', en: 'Keys: A B C D · Space = next' },
  toRoulette: { vi: 'Đưa vào "Trả lời câu hỏi"', en: 'Use in “Answer a question”' },
  toRouletteTitle: {
    vi: 'Tạo bộ câu hỏi từ các câu này để quay chọn học sinh trả lời',
    en: 'Make a question set from these so the spin picks who answers',
  },
  added: { vi: 'Đã tạo bộ câu hỏi "{name}" ({n} câu) và chọn sẵn ở tab Trả lời câu hỏi.', en: 'Created the question set “{name}” ({n} questions) and selected it on Answer a question.' },
  open: { vi: 'Mở', en: 'Open' },
} as const

export const HILL: AtomKind[] = ['C', 'H', 'Cl', 'N', 'O']

/** "C2H6O" from atom counts, in Hill order. */
export function formulaOf(counts: Partial<Record<AtomKind, number>>) {
  return HILL.filter((k) => counts[k]).map((k) => `${k}${counts[k] === 1 ? '' : counts[k]}`).join('')
}
