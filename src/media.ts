// Audio / video files for questions live in IndexedDB (localStorage is far too small for them).
// They stay on this device's browser; the JSON backup only carries the text and YouTube links.
import { useEffect, useState } from 'react'
import type { Question } from './store'

const DB_NAME = 'element-roulette-media'
const STORE = 'files'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const putMedia = (id: string, file: Blob) => run('readwrite', (s) => s.put(file, id)).then(() => id)
export const getMedia = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id))
export const deleteMedia = (id: string) => run('readwrite', (s) => s.delete(id)).catch(() => undefined)

/** Object URL for a stored file: undefined while loading, null if it isn't on this device. */
export function useMediaUrl(id: string | undefined): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (!id) return
    let alive = true
    let made: string | null = null
    getMedia(id)
      .then((blob) => {
        if (!alive) return
        made = blob ? URL.createObjectURL(blob) : null
        setUrl(made)
      })
      .catch(() => alive && setUrl(null))
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  return id ? url : null
}

/** YouTube video id from any common link form (watch, youtu.be, shorts, embed, live), or null. */
export function youTubeId(link: string): string | null {
  const s = link.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') return u.pathname.slice(1, 12) || null
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const m = /^\/(?:shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname)
      if (m) return m[1]
    }
  } catch {
    /* not a URL */
  }
  return null
}

/** Start time from a YouTube link (?t=90 or ?t=1m30s), in seconds. */
export function youTubeStart(link: string): number {
  try {
    const t = new URL(link.startsWith('http') ? link : `https://${link}`).searchParams.get('t') ?? ''
    if (/^\d+$/.test(t)) return Number(t)
    const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(t)
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0
  } catch {
    return 0
  }
}

const isVideo = (m: Question['media']) => !!m && m.kind !== 'audio'

/** True when a question (or its answer) has a video / YouTube clip, so the popup goes big. */
export const isWide = (q: Question | null | undefined) => !!q && (isVideo(q.media) || isVideo(q.answerMedia))

/** Video / YouTube attached to the question itself. */
export const hasQuestionVideo = (q: Question) => isVideo(q.media)
/** Video / YouTube attached to the answer. */
export const hasAnswerVideo = (q: Question) => isVideo(q.answerMedia)
