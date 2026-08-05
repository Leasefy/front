'use client'

import { useMemo, useState } from 'react'
import { ApiError } from '@/lib/admin/api'
import {
  savePhotoDescriptions,
  PHOTO_DESCRIPTION_MAX_CHARS,
  type PhotoDetail,
  type PhotoDescriptionViolation,
  type PhotoDescriptionsRejected,
} from '@/lib/admin/avaluos'

/** Human-readable reason for a rejected edit (the Ley-1673 fence codes). */
function reasonLabel(v: PhotoDescriptionViolation): string {
  switch (v.reason) {
    case 'too_long':
      return `Supera ${PHOTO_DESCRIPTION_MAX_CHARS} caracteres.`
    case 'lexicon':
      return `Términos no permitidos (Ley 1673): ${(v.violations ?? []).join(', ')}.`
    default:
      return 'Descripción inválida.'
  }
}

/** Narrow an unknown ApiError body to the micro's 422 rejection envelope. */
function asRejection(body: unknown): PhotoDescriptionsRejected | null {
  if (body && typeof body === 'object' && Array.isArray((body as PhotoDescriptionsRejected).violations)) {
    return body as PhotoDescriptionsRejected
  }
  return null
}

/**
 * PhotoDescriptionsEditor — the reviewer corrects the AI-drafted per-photo
 * captions BEFORE signing (the "mármol → cerámica" fix). Every edit passes the
 * micro's Ley-1673 fence on save: a single violation rejects the WHOLE request
 * (422) and persists nothing, so we surface each rejected key inline and keep the
 * reviewer's text in place to fix.
 *
 * Editable only while the cert is in review (the parent gates rendering); a later
 * save on a frozen cert returns 409, surfaced as a banner.
 */
export function PhotoDescriptionsEditor({ id, photos }: { id: string; photos: PhotoDetail[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(photos.map((p) => [p.key, p.description])),
  )
  const [violations, setViolations] = useState<Record<string, PhotoDescriptionViolation>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const initial = useMemo(
    () => Object.fromEntries(photos.map((p) => [p.key, p.description])),
    [photos],
  )
  const dirty = photos.some((p) => (drafts[p.key] ?? '') !== (initial[p.key] ?? ''))

  function setOne(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
    // Clear a stale violation for this key as the reviewer retypes.
    setViolations((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    setViolations({})
    try {
      const edits = photos.map((p) => ({ key: p.key, description: drafts[p.key] ?? '' }))
      await savePhotoDescriptions(id, edits)
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const rejection = asRejection(err.body)
        if (rejection) {
          setViolations(Object.fromEntries(rejection.violations.map((v) => [v.key, v])))
          setError('Algunas descripciones no cumplen la Ley 1673. Corregí las marcadas y volvé a guardar.')
        } else {
          setError('Descripciones rechazadas por el validador.')
        }
      } else if (err instanceof ApiError && err.status === 409) {
        setError('Este avalúo ya no está en revisión — las descripciones quedaron congeladas al firmar.')
      } else if (err instanceof ApiError && err.status === 403) {
        setError('El servicio de avalúos rechazó la edición (403). Refrescá la sesión e intentá de nuevo.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Error de red al guardar.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (photos.length === 0) {
    return <div className="text-xs text-fg-muted">Este avalúo no tiene fotos.</div>
  }

  return (
    <div className="space-y-4">
      {photos.map((p, i) => {
        const value = drafts[p.key] ?? ''
        const v = violations[p.key]
        const tooLong = value.length > PHOTO_DESCRIPTION_MAX_CHARS
        return (
          <div key={p.key} className="pb-4 border-b border-bg-border last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                foto {i + 1}
              </span>
              <span
                className={
                  'font-mono text-[10px] tabular-nums ' +
                  (tooLong ? 'text-bad' : 'text-fg-subtle')
                }
              >
                {value.length} / {PHOTO_DESCRIPTION_MAX_CHARS}
              </span>
            </div>
            <textarea
              className={'textarea min-h-[64px] ' + (v ? 'border-bad' : '')}
              placeholder="Descripción de la foto (prosa de anexo, nunca el valor)"
              value={value}
              onChange={(e) => setOne(p.key, e.target.value)}
            />
            {v && <p className="text-sm text-bad mt-1">{reasonLabel(v)}</p>}
          </div>
        )
      })}

      {error && (
        <div className="card p-3 border-bad/40">
          <p className="text-sm text-bad">{error}</p>
        </div>
      )}
      {saved && <p className="text-sm text-ok">Descripciones guardadas.</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !dirty}
        className="btn btn-primary"
      >
        {saving ? 'Guardando…' : 'Guardar descripciones'}
      </button>
    </div>
  )
}
