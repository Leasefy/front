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

import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import {
  getPreScoringConfig,
  updatePreScoringConfig,
  type PreScoringConfig,
  type PreScoringConfigUpdate,
} from '@/lib/admin/cotizador'
import { Card, Eyebrow } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBlock } from '@/components/admin/screen/states'

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

/**
 * El micro devuelve `{ success:false, error }`; el back NestJS, `{ message }`.
 * 02-10-2026: delega la regla de oro en `mensajeDelAdmin` (antes, un
 * `TypeError` de JavaScript o «Failed to fetch» salían crudos).
 */
function configErrorMessage(err: unknown, fallback: string, accion: string): string {
  return mensajeDelAdmin(err, { porDefecto: fallback, accion })
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
      <label htmlFor={id} className="mb-1.5 block text-body-sm font-medium text-fg">
        {label}
      </label>
      <Input
        id={id}
        className="tabular-nums"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p className="mt-1 text-caption text-danger">{error}</p>
      ) : (
        <p className="mt-1 text-caption text-fg-muted">{help}</p>
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
      setSaveError(configErrorMessage(err, 'No se pudo guardar la configuración.', 'guardar la configuración'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Ronda 26 (revisora): sin «Pre-scoring» ni «TTL» (VOZ: «score» no se dice) y sin la pastilla azul. */}
      <div>
        <Eyebrow>Estudio previo para el afianzamiento</Eyebrow>
        <p className="mt-2 text-body-sm text-fg-muted">
          Cuánto vale un estudio ya hecho antes de pedir uno nuevo, y cuánto se espera la autorización del candidato.
        </p>
      </div>

      {isLoading && !server && (
        <p className="text-body-sm text-fg-muted">Cargando configuración…</p>
      )}

      {error && !server && (
        <ErrorBlock error={error} onReintentar={refetch} titulo="No pudimos cargar la configuración del estudio" suelto={false} />
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

          {/* Ronda 30 (revisora: sin tarjeta dentro de tarjeta): el resultado de guardar es una línea. */}
          {saveError && <p role="alert" className="text-body-sm text-danger">{saveError}</p>}
          {saved && !saveError && <p role="status" className="text-body-sm text-success">Configuración guardada.</p>}

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" hideArrow onClick={save} disabled={!canSave} isLoading={saving}>
              Guardar los plazos
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
