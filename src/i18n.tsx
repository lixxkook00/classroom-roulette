import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CATEGORY_LABEL, type Category, type Element } from './data/elements'
import { FACTS_VI, NAME_VI_EXTRA } from './data/facts.vi'

export type Lang = 'vi' | 'en'

const en = {
  appTitle: "Who's up today?",
  classLabel: 'Class',
  studentsCount: '{n} students',
  manageClasses: 'Manage classes',
  soundOff: 'Turn sound off',
  soundOn: 'Turn sound on',
  language: 'Language',
  groupsAria: 'Element groups',
  tableAria: 'Periodic table — every element belongs to a student in this class',
  noClasses: 'No classes yet',
  noClassesBody: 'Create a class and add your students — all 118 elements are shared out among them.',
  createClass: 'Create a class',
  classEmpty: '{name} has no students yet.',
  addStudents: 'Add students',
  everyoneDone: 'Everyone in {name} has had a turn!',
  newRound: 'Start a new round',
  showCard: 'Show card',
  shuffling: 'Shuffling {n} students… press Space to stop early',
  inDraw: '{n} of {total} students in the draw · Space to spin',
  skipTested: 'Skip students tested last time',
  stop: 'Stop!',
  spin: 'Spin',
  spinAgain: 'Spin again',
  markTested: 'Mark as tested',
  absent: 'Absent — skip',
  close: 'Close',
  studentNo: 'Student #{n} · {cls}',
  funFact: 'Fun fact!',
  period: 'Period {n}',
  group: 'Group {n}',
  fBlock: 'f-block',
  myClasses: 'My classes',
  myClassesSub: 'Elements are shared out equally in list order — with 30 students everyone gets 3: #1 has H, Ga and Pm.',
  back: '← Back to the spin',
  noStudentsYet: 'no students yet',
  classRange: '{n} students · {per} elements each',
  newClassName: 'New class name',
  newClassPlaceholder: 'e.g. 10A1',
  create: 'Create',
  cancel: 'Cancel',
  newClass: 'New class',
  backup: 'Backup',
  backupHint: 'Your classes are saved in this browser. Export a file to move them to another computer.',
  export: 'Export',
  import: 'Import',
  ok: 'OK',
  createFirst: 'Create your first class',
  createFirstBody: 'Give it a name on the left, then add students. The list order decides who owns which elements.',
  className: 'Class name',
  save: 'Save',
  testedNote: '{n} tested last time, so they sit out the next spin',
  rename: 'Rename',
  pasteList: 'Import a list',
  clearTested: 'Clear tested marks',
  deleteClass: 'Delete class',
  addToEnd: 'Add to the end',
  replaceList: 'Replace the list',
  addStudentLabel: 'Add student #{n}',
  ownedElements: 'Their elements',
  classFull: 'This class is full — the table has {max} elements',
  fullName: 'Full name',
  add: 'Add',
  colNo: '#',
  colElement: 'Elements',
  colStudent: 'Student',
  colLast: 'Last tested',
  colTested: 'Tested last time',
  colEdit: 'Edit',
  today: 'today',
  moveUp: 'Move {name} up',
  moveDown: 'Move {name} down',
  edit: 'Edit {name}',
  remove: 'Remove {name}',
  testedAria: '{name} was tested last time',
  confirmDelete: "Delete {name} and its {n} students? This can't be undone.",
  confirmReplace: 'Replace all {n} students in {name}?',
  confirmRemove: 'Remove {name}? The elements will be shared out again.',
  added: 'Added {n} students.',
  addedOverflow: 'Added {n} students — the table only has {max} elements, so {m} were left out.',
  badBackup: "That file doesn't look like an Element Roulette backup.",
  confirmRestore: 'Replace everything here with the {n} classes from this backup?',
  restored: 'Restored {n} classes from the backup.',
  credit: 'Made by',
  modeLabel: 'Mode',
  modeTable: 'Table',
  modeCard: 'Mystery card',
  slotCategory: 'Element type',
  slotStudent: 'Student',
  cardIdle: 'Press Spin — the card reveals the winner one clue at a time.',
  cardRolling: 'Revealing the clues…',
  markedTested: 'Marked as tested',
  shareAll: 'Use the whole table',
  shareAllHint: 'On: the table is shared out so every student gets the same number of elements (3 each for 30 students). Off: one element per student.',
  myClassesSubOne: 'Each student gets one element in list order — #1 is H, #2 is He…',
  classRangeOne: '{n} students · H → {b}',
  tipNoStudent: 'No student',
  tipTested: 'Tested last time',
  tipAbsent: 'Absent today',
  tipMass: 'Atomic mass',
  tipPeriod: 'Period',
  tipGroup: 'Group',
  importTitle: 'Add students from a list',
  importHelp: 'Paste from Excel, Google Sheets, Word or Zalo — or drop a .csv / .txt file here.',
  importPlaceholder: 'Paste here (Ctrl+V)…',
  chooseFile: 'Choose file',
  columnsLabel: 'Which columns make the name?',
  columnN: 'Column {n}',
  hasHeader: 'First row is a header',
  fixCaps: 'Fix ALL-CAPS names',
  skipDupes: 'Skip duplicates',
  readyCount: '{n} names ready',
  dupe: 'duplicate',
  previewEmpty: 'Names will appear here as soon as you paste.',
  pasteTip: 'Tip: press Ctrl+V anywhere on this page to paste a list.',
  fileError: "Couldn't read that file. Save it as .csv or .txt, or copy the cells and paste them.",
  xlsxHint: 'Excel files: open the file, select the names and copy (Ctrl+C), then paste here.',
}

type Key = keyof typeof en

const vi: Record<Key, string> = {
  appTitle: 'Hôm nay ai trả bài?',
  classLabel: 'Lớp',
  studentsCount: '{n} học sinh',
  manageClasses: 'Quản lý lớp',
  soundOff: 'Tắt âm thanh',
  soundOn: 'Bật âm thanh',
  language: 'Ngôn ngữ',
  groupsAria: 'Nhóm nguyên tố',
  tableAria: 'Bảng tuần hoàn — mỗi nguyên tố thuộc về một học sinh của lớp',
  noClasses: 'Chưa có lớp nào',
  noClassesBody: 'Tạo lớp và thêm học sinh — cả 118 nguyên tố sẽ được chia cho các em.',
  createClass: 'Tạo lớp',
  classEmpty: 'Lớp {name} chưa có học sinh.',
  addStudents: 'Thêm học sinh',
  everyoneDone: 'Cả lớp {name} đều đã được gọi!',
  newRound: 'Bắt đầu vòng mới',
  showCard: 'Xem thẻ',
  shuffling: 'Đang xáo {n} học sinh… nhấn Space để dừng sớm',
  inDraw: '{n}/{total} học sinh trong lượt quay · nhấn Space để quay',
  skipTested: 'Bỏ qua học sinh đã kiểm tra lần trước',
  stop: 'Dừng!',
  spin: 'Quay',
  spinAgain: 'Quay lại',
  markTested: 'Đã kiểm tra',
  absent: 'Vắng — bỏ qua',
  close: 'Đóng',
  studentNo: 'Học sinh #{n} · {cls}',
  funFact: 'Bạn có biết?',
  period: 'Chu kì {n}',
  group: 'Nhóm {n}',
  fBlock: 'Khối f',
  myClasses: 'Lớp của tôi',
  myClassesSub: 'Nguyên tố được chia đều theo thứ tự danh sách — lớp 30 em thì mỗi em 3 nguyên tố: #1 có H, Ga và Pm.',
  back: '← Quay lại vòng quay',
  noStudentsYet: 'chưa có học sinh',
  classRange: '{n} học sinh · {per} nguyên tố/em',
  newClassName: 'Tên lớp mới',
  newClassPlaceholder: 'VD: 10A1',
  create: 'Tạo',
  cancel: 'Hủy',
  newClass: 'Lớp mới',
  backup: 'Sao lưu',
  backupHint: 'Dữ liệu lớp được lưu trong trình duyệt này. Xuất tệp để chuyển sang máy khác.',
  export: 'Xuất',
  import: 'Nhập',
  ok: 'OK',
  createFirst: 'Tạo lớp đầu tiên',
  createFirstBody: 'Đặt tên lớp ở bên trái rồi thêm học sinh. Thứ tự danh sách quyết định em nào giữ nguyên tố nào.',
  className: 'Tên lớp',
  save: 'Lưu',
  testedNote: '{n} em đã kiểm tra lần trước nên sẽ được bỏ qua ở lượt quay tới',
  rename: 'Đổi tên',
  pasteList: 'Nhập danh sách',
  clearTested: 'Xóa đánh dấu đã kiểm tra',
  deleteClass: 'Xóa lớp',
  addToEnd: 'Thêm vào cuối',
  replaceList: 'Thay cả danh sách',
  addStudentLabel: 'Thêm học sinh #{n}',
  ownedElements: 'Các nguyên tố của em',
  classFull: 'Lớp đã đủ — bảng chỉ có {max} nguyên tố',
  fullName: 'Họ và tên',
  add: 'Thêm',
  colNo: 'STT',
  colElement: 'Các nguyên tố',
  colStudent: 'Học sinh',
  colLast: 'Lần gần nhất',
  colTested: 'Đã kiểm tra',
  colEdit: 'Sửa',
  today: 'hôm nay',
  moveUp: 'Đưa {name} lên',
  moveDown: 'Đưa {name} xuống',
  edit: 'Sửa {name}',
  remove: 'Xóa {name}',
  testedAria: '{name} đã kiểm tra lần trước',
  confirmDelete: 'Xóa lớp {name} cùng {n} học sinh? Không thể hoàn tác.',
  confirmReplace: 'Thay toàn bộ {n} học sinh của lớp {name}?',
  confirmRemove: 'Xóa {name}? Các nguyên tố sẽ được chia lại.',
  added: 'Đã thêm {n} học sinh.',
  addedOverflow: 'Đã thêm {n} học sinh — bảng chỉ có {max} nguyên tố nên {m} tên bị bỏ qua.',
  badBackup: 'Tệp này không phải bản sao lưu của Element Roulette.',
  confirmRestore: 'Thay toàn bộ dữ liệu hiện tại bằng {n} lớp trong bản sao lưu?',
  restored: 'Đã khôi phục {n} lớp từ bản sao lưu.',
  credit: 'Thực hiện bởi',
  modeLabel: 'Chế độ',
  modeTable: 'Bảng',
  modeCard: 'Thẻ bí ẩn',
  slotCategory: 'Loại nguyên tố',
  slotStudent: 'Học sinh',
  cardIdle: 'Nhấn Quay — thẻ sẽ lật dần từng manh mối cho đến người được gọi.',
  cardRolling: 'Đang lật từng manh mối…',
  markedTested: 'Đã đánh dấu kiểm tra',
  shareAll: 'Dùng cả bảng',
  shareAllHint: 'Bật: chia bảng sao cho mọi em có số nguyên tố bằng nhau (lớp 30 em thì mỗi em 3). Tắt: mỗi em một nguyên tố.',
  myClassesSubOne: 'Mỗi học sinh nhận một nguyên tố theo thứ tự danh sách — #1 là H, #2 là He…',
  classRangeOne: '{n} học sinh · H → {b}',
  tipNoStudent: 'Chưa có học sinh',
  tipTested: 'Đã kiểm tra lần trước',
  tipAbsent: 'Vắng hôm nay',
  tipMass: 'Nguyên tử khối',
  tipPeriod: 'Chu kì',
  tipGroup: 'Nhóm',
  importTitle: 'Nhập danh sách học sinh',
  importHelp: 'Dán từ Excel, Google Sheets, Word hay Zalo — hoặc kéo thả tệp .csv / .txt vào đây.',
  importPlaceholder: 'Dán vào đây (Ctrl+V)…',
  chooseFile: 'Chọn tệp',
  columnsLabel: 'Cột nào là họ tên?',
  columnN: 'Cột {n}',
  hasHeader: 'Dòng đầu là tiêu đề',
  fixCaps: 'Sửa tên VIẾT HOA',
  skipDupes: 'Bỏ tên trùng',
  readyCount: 'Sẵn sàng {n} tên',
  dupe: 'trùng',
  previewEmpty: 'Tên sẽ hiện ở đây ngay khi bạn dán.',
  pasteTip: 'Mẹo: nhấn Ctrl+V ở bất kỳ đâu trên trang này để dán danh sách.',
  fileError: 'Không đọc được tệp này. Hãy lưu dạng .csv hoặc .txt, hoặc sao chép các ô rồi dán vào.',
  xlsxHint: 'Tệp Excel: mở tệp, chọn cột tên và sao chép (Ctrl+C), rồi dán vào đây.',
}

const DICT: Record<Lang, Record<Key, string>> = { en, vi }

const CATEGORY_VI: Record<Category, string> = {
  alkali: 'Kim loại kiềm',
  'alkaline-earth': 'Kim loại kiềm thổ',
  transition: 'Kim loại chuyển tiếp',
  'post-transition': 'Kim loại sau chuyển tiếp',
  metalloid: 'Á kim',
  nonmetal: 'Phi kim',
  halogen: 'Halogen',
  'noble-gas': 'Khí hiếm',
  lanthanide: 'Họ lanthanide',
  actinide: 'Họ actinide',
}

// Group 1–18 → the A/B labels Vietnamese textbooks also use.
const GROUP_AB = ['IA', 'IIA', 'IIIB', 'IVB', 'VB', 'VIB', 'VIIB', 'VIIIB', 'VIIIB', 'VIIIB', 'IB', 'IIB', 'IIIA', 'IVA', 'VA', 'VIA', 'VIIA', 'VIIIA']

const LANG_KEY = 'element-roulette:lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return 'vi'
}

type Vars = Record<string, string | number>

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: Key, vars?: Vars) => string
  elName: (el: Element) => string
  elFact: (el: Element) => string
  catLabel: (c: Category) => string
  groupLabel: (el: Element) => string
  /** Group without the word "Group": '16' or 'VIA (16)'. */
  groupShort: (el: Element) => string
  locale: string
}

const Ctx = createContext<I18n | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = lang === 'vi' ? 'Element Roulette — Hôm nay ai trả bài?' : "Element Roulette — Who's up today?"
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const value = useMemo<I18n>(() => {
    const dict = DICT[lang]
    const t = (key: Key, vars?: Vars) =>
      dict[key].replace(/\{(\w+)\}/g, (_, k: string) => (vars && k in vars ? String(vars[k]) : `{${k}}`))
    return {
      lang,
      setLang,
      t,
      locale: lang === 'vi' ? 'vi-VN' : 'en-GB',
      elName: (el) => (lang === 'vi' && NAME_VI_EXTRA[el.symbol] ? `${el.name} (${NAME_VI_EXTRA[el.symbol]})` : el.name),
      elFact: (el) => (lang === 'vi' ? (FACTS_VI[el.z - 1] ?? el.fact) : el.fact),
      catLabel: (c) => (lang === 'vi' ? CATEGORY_VI[c] : CATEGORY_LABEL[c]),
      groupShort: (el) => (!el.group ? '—' : lang === 'vi' ? `${GROUP_AB[el.group - 1]} (${el.group})` : String(el.group)),
      groupLabel: (el) => {
        if (!el.group) return dict.fBlock
        return lang === 'vi' ? t('group', { n: `${GROUP_AB[el.group - 1]} (${el.group})` }) : t('group', { n: el.group })
      },
    }
  }, [lang, setLang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n must be used inside LangProvider')
  return v
}

export function LangToggle() {
  const { lang, setLang, t } = useI18n()
  return (
    <div className="lang" role="group" aria-label={t('language')}>
      {(['vi', 'en'] as const).map((l) => (
        <button key={l} type="button" className={`lang__btn${lang === l ? ' lang__btn--on' : ''}`} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l === 'vi' ? 'VI' : 'EN'}
        </button>
      ))}
    </div>
  )
}
