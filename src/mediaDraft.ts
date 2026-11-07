// Helpers for the "Đính kèm" (attach) rows in the question editor.
import { putMedia, youTubeId } from './media'
import { uid, type MediaKind, type QuestionMedia } from './store'

export type Attach = 'none' | MediaKind

/** What the teacher has picked in an "Đính kèm" row (before saving). */
export interface MediaDraft {
  attach: Attach
  file: File | null
  /** Media already saved with the question (when editing). */
  kept?: QuestionMedia
  link: string
}

export const emptyDraft = (): MediaDraft => ({ attach: 'none', file: null, kept: undefined, link: '' })

export const draftFrom = (m?: QuestionMedia): MediaDraft => ({
  attach: m?.kind ?? 'none',
  file: null,
  kept: m,
  link: m?.kind === 'youtube' ? m.ref : '',
})

/** Has everything this attachment needs (a file or a valid link). */
export const draftReady = (d: MediaDraft) =>
  d.attach === 'none' || (d.attach === 'youtube' ? !!youTubeId(d.link) : !!d.file || d.kept?.kind === d.attach)

/** Stores a new file if needed and returns what to save with the question. */
export async function resolveDraft(d: MediaDraft): Promise<QuestionMedia | undefined> {
  if (d.attach === 'youtube') return { kind: 'youtube', ref: d.link.trim() }
  if ((d.attach === 'audio' || d.attach === 'video') && d.file) {
    const id = await putMedia(uid(), d.file)
    return { kind: d.attach, ref: id, name: d.file.name }
  }
  if (d.attach !== 'none' && d.kept?.kind === d.attach) return d.kept
  return undefined
}
