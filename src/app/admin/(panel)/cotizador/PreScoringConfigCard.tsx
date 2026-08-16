'use client'

/**
 * PreScoringConfigCard — configura el TTL del pre-scoring de afianzamiento
 * (validez del estudio + ventana de autorización) dentro de /admin/cotizador.
 *
 * Fuente única de la config de plataforma: el back la lee/escribe y proxya al
 * micro de agentes. Dos horas enteras en rango 1..720 (hasta 30 días). Sigue el
 * patrón del resto del admin: `useApiQuery` para cargar al montar, `adminApi`
 * vía `cotizador.ts`, y mensajes INLINE (el admin no tiene toast system).
 *
 * PATCH selectivo: solo se mandan los campos que cambiaron respecto al server —
 * el back acepta un body parcial. "Guardar" se bloquea sin cambios o con algún
 * valor inválido.
 */

import { useEffect, useState } from 'react'

import { ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  getPreScoringConfig,
  updatePreScoringConfig,
  type PreScoringConfig,
  type PreScoringConfigUpdate,
} from '@/lib/admin/cotizador'

const MIN_HOURS = 1
const MAX_HOURS = 720

/** Entero en rango [1..720], o null si el texto no es un valor válido. */
function parseHours(raw: string): number | null {
  const t = raw.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  if (!Number.isInteger(n) || n < MIN_HOURS || n > MAX_HOURS) return null
  return n
}

/** "72 h ≈ 3 días" — el equivalente en días para que las horas se entiendan. */
function hoursToDays(h: number): string {
  const d = Math.round((h / 24) * 10) / 10
  const txt = Number.isInteger(d) ? String(d) : d.toFixed(1)
  return `${h} h ≈ ${txt} ${d === 1 ? 'día' : 'días'}`
}

/** El micro devuelve `{ success:false, error }`; el back NestJS, `{ message }`. */
function configErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | undefined
    return body?.error ?? err.message
  }
  return err instanceof Error ? err.message : fallback
}

const RANGE_HINT = `Entero entre ${MIN_HOURS} y ${MAX_HOURS} horas (hasta 30 días).`

function Field({
  id,
  label,
  value,
  onChange,
  help,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  help: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-fg mb-1.5">
        {label}
      </label>
      <input
        id={id}
        className="input tabular-nums"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p className="mt-1 text-xs text-bad">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-fg-subtle">{help}</p>
      )}
    </div>
  )
}

export function PreScoringConfigCard() {
  const { data, isLoading, error, refetch } = useApiQuery<PreScoringConfig>(
    (signal) => getPreScoringConfig(signal),
    [],
  )

  // `server` es la config confirmada (para comparar cambios y PATCH selectivo).
  // Se hidrata desde el GET y se refresca con lo que devuelve el PATCH, así el
  // mensaje de éxito no depende de un refetch que pisaría el estado de edición.
  const [server, setServer] = useState<PreScoringConfig | null>(null)
  const [reuse, setReuse] = useState('')
  const [wait, setWait] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    setServer(data)
    setReuse(String(data.resultReuseTtlHours))
    setWait(String(data.authorizationWaitHours))
  }, [data])

  const reuseH = parseHours(reuse)
  const waitH = parseHours(wait)

  const changedReuse = server != null && reuseH != null && reuseH !== server.resultReuseTtlHours
  const changedWait = server != null && waitH != null && waitH !== server.authorizationWaitHours
  const hasChanges = changedReuse || changedWait
  const allValid = reuseH != null && waitH != null
  const canSave = hasChanges && allValid && !saving

  function edit(setter: (v: string) => void) {
    return (v: string) => {
      setter(v)
      setSaved(false)
      setSaveError(null)
    }
  }

  async function save() {
    if (!canSave) return
    const body: PreScoringConfigUpdate = {}
    if (changedReuse) body.resultReuseTtlHours = reuseH!
    if (changedWait) body.authorizationWaitHours = waitH!

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await updatePreScoringConfig(body)
      setServer(updated)
      setReuse(String(updated.resultReuseTtlHours))
      setWait(String(updated.authorizationWaitHours))
      setSaved(true)
    } catch (err) {
      setSaveError(configErrorMessage(err, 'No se pudo guardar la configuración.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-label">pre-scoring de afianzamiento</div>
        <span className="pill pill-info">TTL</span>
      </div>
      <p className="text-sm text-fg-muted">
        Cuánto vale un estudio ya completado antes de relanzar uno nuevo, y cuánto se espera la
        autorización del candidato. Aplica a todo el pre-scoring de afianzamiento.
      </p>

      {isLoading && !server && (
        <p className="text-sm text-fg-muted">Cargando configuración…</p>
      )}

      {error && !server && (
        <div className="card p-4 border-l-4 border-l-bad">
          <p className="text-sm text-bad">{configErrorMessage(error, 'No se pudo cargar la configuración.')}</p>
          <button className="btn btn-ghost h-8 px-2 mt-2" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {server && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="prescoring-reuse-ttl"
              label="Validez del estudio (horas)"
              value={reuse}
              onChange={edit(setReuse)}
              help={reuseH != null ? hoursToDays(reuseH) : RANGE_HINT}
              error={reuseH == null ? RANGE_HINT : undefined}
            />
            <Field
              id="prescoring-authorization-wait"
              label="Espera de autorización del candidato (horas)"
              value={wait}
              onChange={edit(setWait)}
              help={waitH != null ? hoursToDays(waitH) : RANGE_HINT}
              error={waitH == null ? RANGE_HINT : undefined}
            />
          </div>

          {saveError && (
            <div className="card p-3 border-l-4 border-l-bad">
              <p className="text-sm text-bad">{saveError}</p>
            </div>
          )}
          {saved && !saveError && (
            <div className="card p-3 border-l-4 border-l-ok">
              <p className="text-sm text-ok">Configuración guardada.</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={save} disabled={!canSave}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
