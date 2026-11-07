import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ClassesScreen } from './components/ClassesScreen'
import { SpinScreen } from './components/SpinScreen'
import { LangProvider, useI18n } from './i18n'
import { useAppData } from './store'

type View = 'spin' | 'classes'

// Hash-based view so refreshes keep the page and static hosting (Vercel) needs no rewrites.
const viewFromHash = (): View => (window.location.hash === '#/classes' ? 'classes' : 'spin')

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown }
const supportsVT = typeof document !== 'undefined' && 'startViewTransition' in document
if (!supportsVT && typeof document !== 'undefined') document.documentElement.classList.add('no-vt')

/** Swap screens with a slide (View Transitions API), falling back to a CSS enter animation. */
function transition(to: View, apply: () => void) {
  const doc = document as DocWithVT
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || reduced) return apply()
  document.documentElement.dataset.nav = to === 'classes' ? 'forward' : 'back'
  doc.startViewTransition(() => flushSync(apply))
}

function Credit() {
  const { t } = useI18n()
  return (
    <div className="credit">
      {t('credit')} Le Quang Qui
    </div>
  )
}

function Screens() {
  const { data, setData, updateClass } = useAppData()
  const [view, setView] = useState<View>(viewFromHash)

  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    // Also covers the browser's back/forward buttons.
    const onHash = () => {
      const next = viewFromHash()
      if (next !== viewRef.current) {
        viewRef.current = next
        transition(next, () => setView(next))
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (v: View) => {
    window.location.hash = v === 'classes' ? '/classes' : '/'
  }

  return (
    <div className="frame">
      {view === 'classes' ? (
        <ClassesScreen data={data} setData={setData} updateClass={updateClass} onBack={() => go('spin')} />
      ) : (
        <SpinScreen key={data.activeClassId ?? 'none'} data={data} setData={setData} updateClass={updateClass} onManage={() => go('classes')} />
      )}
      <Credit />
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
