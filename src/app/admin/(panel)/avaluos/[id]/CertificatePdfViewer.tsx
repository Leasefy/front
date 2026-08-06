'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/admin/api'
import { fetchAvaluoCertificatePdf } from '@/lib/admin/avaluos'

/**
 * CertificatePdfViewer — embeds the certificate PDF the back streams.
 *
 * The `/avaluos/:id/certificate` route is Bearer-gated, so its URL can NOT be
 * dropped into an `<iframe src>` directly (there is no way to attach the header).
 * Instead we fetch the bytes as a Blob, wrap them in an object URL, embed that,
 * and revoke it on unmount / id-change to avoid leaking the blob.
 *
 * Pre-payment the back serves the WATERMARKED preview, post-payment the clean
 * PDF — this viewer shows whatever the gate decides; it is read-only.
 */
export function CertificatePdfViewer({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Hold the object URL in a ref so the cleanup always revokes the latest one,
  // independent of the render that created it.
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchAvaluoCertificatePdf(id, controller.signal)
      .then((blob) => {
        if (cancelled) return
        const next = URL.createObjectURL(blob)
        objectUrl.current = next
        setUrl(next)
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return
        setError(err instanceof ApiError ? `No se pudo cargar el PDF (${err.status}).` : 'Error de red al cargar el PDF.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current)
        objectUrl.current = null
      }
    }
  }, [id])

  if (loading) {
    return <div className="text-xs text-fg-muted">Cargando certificado…</div>
  }
  if (error) {
    return <div className="text-sm text-bad">{error}</div>
  }
  if (!url) return null

  return (
    <iframe
      src={url}
      title="Certificado de avalúo (PDF)"
      className="w-full h-[600px] rounded border border-bg-border bg-white"
    />
  )
}
