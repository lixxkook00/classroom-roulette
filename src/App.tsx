import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Section } from './components/ClassesScreen'
import { ExploreScreen } from './components/ExploreScreen'
import { GuessScreen, type SharedSet } from './components/GuessScreen'
import { PinDialog } from './components/PinDialog'
import { LangProvider, useI18n } from './i18n'
import { cleanElements, useAppData, type QuestionSet } from './store'
import { useLandscape } from './rotate'
import { supportsViewTransitions, viewTransition } from './util'

/** Tabs, in the order they appear (also decides which way the board slides). */
const VIEWS = ['spin', 'table', 'guess', 'lab', 'classes'] as const
type View = (typeof VIEWS)[number]

/** What students see on a device that hasn't been unlocked with the teacher password. */
const STUDENT_VIEWS: View[] = ['table', 'guess', 'lab']

// Hash routes: refreshes keep the page and static hosting (Vercel) needs no rewrites.
// e.g. #/table, #/guess?set=1,9,17&name=Halogen, #/guess?mine=<set id>
const HASH: Record<View, string> = { spin: '#/', table: '#/table', guess: '#/guess', lab: '#/lab', classes: '#/classes' }

interface Route {
  view: View
  params: URLSearchParams
}

function readRoute(): Route {
  const [path, query = ''] = window.location.hash.split('?')
  const view = VIEWS.find((v) => v !== 'spin' && path === HASH[v]) ?? 'spin'
  return { view, params: new URLSearchParams(query) }
}

if (!supportsViewTransitions && typeof document !== 'undefined') document.documentElement.classList.add('no-vt')

/* ---------- teacher unlock, remembered per device ---------- */
const UNLOCK_KEY = 'element-roulette:teacher'
const isUnlocked = () => {
  try {
    // Stores the password hash, so changing the password locks every device again.
    return localStorage.getItem(UNLOCK_KEY) === __TEACHER_PIN_HASH__ || sessionStorage.getItem(UNLOCK_KEY) === __TEACHER_PIN_HASH__
  } catch {
    return false
  }
}
function saveUnlock(on: boolean, remember = true) {
  try {
    localStorage.removeItem(UNLOCK_KEY)
    sessionStorage.removeItem(UNLOCK_KEY)
    if (on) (remember ? localStorage : sessionStorage).setItem(UNLOCK_KEY, __TEACHER_PIN_HASH__)
  } catch {
    /* ignore */
  }
}

const ICONS: Record<View | 'lock' | 'key' | 'rotate', ReactNode> = {
  spin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="5" height="5" rx="1" />
      <rect x="16" y="4" width="5" height="5" rx="1" />
      <rect x="3" y="11" width="18" height="5" rx="1" />
      <rect x="7" y="18" width="12" height="2.5" rx="1" />
    </>
  ),
  guess: (
    <>
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
      <rect x="3" y="3" width="18" height="18" rx="3" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  classes: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  rotate: (
    <>
      <rect x="7" y="2.5" width="10" height="17" rx="2" transform="rotate(-90 12 11)" />
      <path d="M3 17a9 9 0 0 0 9 4.5M12 21.5l-1.6-2.2M12 21.5l-2.4 1" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </>
  ),
}

const TAB_LABEL = { spin: 'tabSpin', table: 'tabTable', guess: 'tabGuess', lab: 'tabLab', classes: 'tabClasses' } as const

function TabIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

function Tabs({ view, teacher, onTeacher, onLock }: { view: View; teacher: boolean; onTeacher: () => void; onLock: () => void }) {
  const { t } = useI18n()
  const views = teacher ? VIEWS : STUDENT_VIEWS
  const landscape = useLandscape()
  return (
    <nav className="tabs" aria-label={t('tabsAria')}>
      {views.map((v) => (
        <a
          key={v}
          href={HASH[v]}
          className={`tab${v === view ? ' tab--on' : ''}`}
          aria-current={v === view ? 'page' : undefined}
          title={t(TAB_LABEL[v])}
        >
          <TabIcon name={v} />
          <span className="tab__label">{t(TAB_LABEL[v])}</span>
        </a>
      ))}
      <span className="tabs__spacer" />
      {landscape.available && (
        <button
          type="button"
          className={`tab tab--tool${landscape.active ? ' tab--on-tool' : ''}`}
          onClick={landscape.toggle}
          title={t(landscape.active ? 'rotateOff' : 'rotateOn')}
          aria-label={t(landscape.active ? 'rotateOff' : 'rotateOn')}
          aria-pressed={landscape.active}
        >
          <TabIcon name="rotate" />
        </button>
      )}
      {teacher ? (
        <button type="button" className="tab tab--tool" onClick={onLock} title={t('lockTitle')} aria-label={t('lockTitle')}>
          <TabIcon name="lock" />
          <span className="tab__label">{t('lock')}</span>
        </button>
      ) : (
        <button type="button" className="tab tab--tool" onClick={onTeacher} title={t('pinTitle')}>
          <TabIcon name="key" />
          <span className="tab__label">{t('teacher')}</span>
        </button>
      )}
    </nav>
  )
}

// Teacher-only screens load on demand, so students' phones only download the table and the game.
const SpinScreen = lazy(() => import('./components/SpinScreen').then((m) => ({ default: m.SpinScreen })))
const ClassesScreen = lazy(() => import('./components/ClassesScreen').then((m) => ({ default: m.ClassesScreen })))
// The organic lab brings WebGL (three.js) with it, so it only loads when that tab is opened.
const OrganicLab = lazy(() => import('./components/organic/OrganicLab').then((m) => ({ default: m.OrganicLab })))

const SITE_NAME = { vi: 'Lớp KHTN thầy Lê Quang Quí', en: 'Mr. Lê Quang Quí’s Natural Science Class' }

/** Browser-tab title per tab, e.g. "Bảng tuần hoàn thông minh · Lớp KHTN thầy Lê Quang Quí". */
function useDocumentTitle(view: View) {
  const { t, lang } = useI18n()
  useEffect(() => {
    const page = { spin: t('appTitle'), table: t('exploreTitle'), guess: t('guessTitle'), lab: t('labTitle'), classes: t('myClasses') }[view]
    document.title = `${page} · ${SITE_NAME[lang]}`
  }, [view, lang, t])
}

function Credit() {
  const { t } = useI18n()
  return <div className="credit">{t('credit')}</div>
}

/** A set of elements shared by link: #/guess?set=1,9,17&name=Halogen */
function sharedSetFrom(params: URLSearchParams): SharedSet | null {
  const raw = params.get('set')
  if (!raw) return null
  const elements = cleanElements(raw.split(','))
  return elements.length ? { name: params.get('name') || '', elements } : null
}

function Screens() {
  const { data, setData, updateClass } = useAppData()
  const [route, setRoute] = useState<Route>(readRoute)
  const [teacher, setTeacher] = useState(isUnlocked)
  const [pinOpen, setPinOpen] = useState(false)
  const [afterUnlock, setAfterUnlock] = useState<View>('spin')

  // Students only get the two learning tabs; anything else lands on the table.
  const allowed = teacher || STUDENT_VIEWS.includes(route.view)
  const view: View = allowed ? route.view : 'table'

  useEffect(() => {
    if (!allowed) window.history.replaceState(null, '', HASH.table)
  }, [allowed, route])

  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    // Tabs are plain links, so this also covers the browser's back/forward buttons.
    const onHash = () => {
      const next = readRoute()
      const cur = viewRef.current
      if (next.view === cur) return setRoute(next)
      viewRef.current = next.view
      viewTransition(VIEWS.indexOf(next.view) > VIEWS.indexOf(cur) ? 'forward' : 'back', () => setRoute(next))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((hash: string) => {
    window.location.hash = hash
  }, [])

  const askTeacher = (then: View) => {
    setAfterUnlock(then)
    setPinOpen(true)
  }

  // One animation per switch: the hash change slides the board.
  const unlock = (remember: boolean) => {
    saveUnlock(true, remember)
    setPinOpen(false)
    setTeacher(true)
    go(HASH[afterUnlock])
  }

  const lock = () => {
    saveUnlock(false)
    if (STUDENT_VIEWS.includes(view)) setTeacher(false)
    else viewTransition('back', () => setTeacher(false))
  }

  useDocumentTitle(view)

  // "Lab hữu cơ" → a question set for the spin screen. Same name = update that set, so its id (and any round) stays.
  const addLabQuestions = useCallback(
    (set: QuestionSet) =>
      setData((d) => {
        const old = d.questionSets.find((s) => s.name === set.name)
        const next = old ? { ...set, id: old.id } : set
        return {
          ...d,
          questionSets: old ? d.questionSets.map((s) => (s.id === old.id ? next : s)) : [...d.questionSets, next],
          activeQuestionSetId: next.id,
        }
      }),
    [setData],
  )

  const params = route.params
  const shared = view === 'guess' ? sharedSetFrom(params) : null
  const mine = view === 'guess' ? params.get('mine') : null

  return (
    <div className="frame">
      <Tabs view={view} teacher={teacher} onTeacher={() => askTeacher('spin')} onLock={lock} />
      <Suspense fallback={<div className="board" />}>
        {view === 'classes' ? (
          <ClassesScreen
            key={params.get('tab') ?? ''}
            data={data}
            setData={setData}
            updateClass={updateClass}
            onPlaySet={(id) => go(`#/guess?mine=${encodeURIComponent(id)}`)}
            initialSection={(['sets', 'questions'] as Section[]).find((s) => s === params.get('tab'))}
          />
        ) : view === 'table' ? (
          <ExploreScreen canShare={teacher} />
        ) : view === 'lab' ? (
          <OrganicLab lessonId={params.get('bai')} canShare={teacher} key={params.get('bai') ?? ''} onUseInRoulette={teacher ? addLabQuestions : undefined} />
        ) : view === 'guess' ? (
          <GuessScreen
            key={`${shared ? params.get('set') : ''}|${mine ?? ''}`}
            sets={teacher ? data.elementSets : []}
            shared={shared}
            initialSetId={mine}
            canShare={teacher}
          />
        ) : (
          <SpinScreen key={data.activeClassId ?? 'none'} data={data} setData={setData} updateClass={updateClass} onManage={() => go(HASH.classes)} onManageQuestions={() => go('#/classes?tab=questions')} />
        )}
      </Suspense>
      <Credit />
      {pinOpen && <PinDialog onUnlock={unlock} onClose={() => setPinOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <Screens />
    </LangProvider>
  )
}
