import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

interface Props {
  title: string
  url: string
  onClose: () => void
}

const isLocalHost = (url: string) => {
  try {
    const h = new URL(url).hostname
    return h === 'localhost' || h.startsWith('127.') || h === '0.0.0.0' || h === '[::1]'
  } catch {
    return false
  }
}

/** Big scannable QR code (dark on white, so every phone camera reads it) plus the link. */
export function QrDialog({ title, url, onClose }: Props) {
  const { t } = useI18n()
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#14261d', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the link is still visible to copy by hand */
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qr" role="dialog" aria-modal="true" aria-labelledby="qr-title">
        <button type="button" className="icon-btn qr__close" aria-label={t('close')} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 id="qr-title" className="chalk-title chalk-title--md">
          {t('qrTitle')}
        </h2>
        <span className="qr__what">{title}</span>
        {/* The SVG is generated locally by the qrcode library from our own URL. */}
        <div className="qr__code" role="img" aria-label={url} dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="qr__link">
          <code>{url}</code>
          <button type="button" className="btn btn--small" onClick={copy}>
            {copied ? t('qrCopied') : t('qrCopy')}
          </button>
        </div>
        {isLocalHost(url) && <p className="qr__warn">{t('qrLocal')}</p>}
      </div>
    </div>
  )
}
