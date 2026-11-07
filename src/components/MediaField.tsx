import { useRef } from 'react'
import { useI18n } from '../i18n'
import { youTubeId } from '../media'
import type { MediaDraft } from '../mediaDraft'

const ACCEPT: Record<'audio' | 'video', string> = { audio: 'audio/*,.mp3,.m4a,.wav,.ogg', video: 'video/*,.mp4,.webm,.mov' }

/** "Đính kèm: Không · Âm thanh · Video · YouTube" with a file picker or link box. */
export function MediaField({ id, draft, onChange }: { id: string; draft: MediaDraft; onChange: (d: MediaDraft) => void }) {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const { attach, file, kept, link } = draft
  const bigFile = file && file.size > 200 * 1024 * 1024 ? Math.round(file.size / 1024 / 1024) : 0

  return (
    <>
      <div className="qform__row">
        <span className="muted">{t('qAttach')}:</span>
        <div className="seg" role="radiogroup" aria-label={t('qAttach')}>
          {(['none', 'audio', 'video', 'youtube'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={attach === k}
              className={`seg__btn${attach === k ? ' seg__btn--on' : ''}`}
              onClick={() => {
                onChange({ ...draft, attach: k, file: null })
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              {k === 'none' ? t('qNone') : k === 'audio' ? t('qAudio') : k === 'video' ? t('qVideo') : t('qYoutube')}
            </button>
          ))}
        </div>

        {(attach === 'audio' || attach === 'video') && (
          <>
            <button type="button" className="btn btn--small" onClick={() => fileRef.current?.click()}>
              {t('qChooseFile')}
            </button>
            <span className="qform__file">{file?.name ?? (kept?.kind === attach ? kept.name : '')}</span>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT[attach]}
              hidden
              onChange={(e) => onChange({ ...draft, file: e.target.files?.[0] ?? null })}
            />
          </>
        )}
        {attach === 'youtube' && (
          <>
            <label htmlFor={`${id}-yt`} className="sr-only">
              {t('qYoutubeLink')}
            </label>
            <input
              id={`${id}-yt`}
              className="chalk-input qform__link"
              value={link}
              onChange={(e) => onChange({ ...draft, link: e.target.value })}
              placeholder="https://youtu.be/…"
              spellCheck={false}
            />
          </>
        )}
      </div>
      {attach === 'youtube' && link.trim() !== '' && !youTubeId(link) && <span className="qform__warn">{t('qYoutubeBad')}</span>}
      {bigFile > 0 && <span className="qform__warn">{t('qFileBig', { mb: bigFile })}</span>}
    </>
  )
}
