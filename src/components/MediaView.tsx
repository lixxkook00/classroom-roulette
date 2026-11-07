import { useI18n } from '../i18n'
import { useMediaUrl, youTubeId, youTubeStart } from '../media'
import type { QuestionMedia } from '../store'

/** Plays a question's audio, video or YouTube clip. */
export function MediaView({ media, big = false }: { media: QuestionMedia; big?: boolean }) {
  const { t } = useI18n()
  const fileUrl = useMediaUrl(media.kind === 'youtube' ? undefined : media.ref)

  if (media.kind === 'youtube') {
    const id = youTubeId(media.ref)
    if (!id) return <p className="media-missing">{t('qYoutubeBad')}</p>
    const start = youTubeStart(media.ref)
    return (
      <div className={`media media--video${big ? ' media--big' : ''}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${start ? `&start=${start}` : ''}`}
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (fileUrl === undefined) return <div className="media media--loading" aria-busy="true" />
  if (fileUrl === null) return <p className="media-missing">{t('qFileMissing')}</p>

  return media.kind === 'audio' ? (
    <div className="media media--audio">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
      <audio controls src={fileUrl} preload="metadata" />
    </div>
  ) : (
    <div className={`media media--video${big ? ' media--big' : ''}`}>
      <video controls playsInline src={fileUrl} preload="metadata" />
    </div>
  )
}

export function MediaBadge({ media }: { media: QuestionMedia }) {
  const { t } = useI18n()
  const label = media.kind === 'audio' ? t('qAudio') : media.kind === 'video' ? t('qVideo') : t('qYoutube')
  return (
    <span className={`badge badge--${media.kind}`} title={media.name ?? media.ref}>
      {label}
      {media.name ? ` · ${media.name}` : ''}
    </span>
  )
}
