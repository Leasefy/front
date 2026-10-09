'use client'

/**
 * Los registros de inmobiliaria que no abrieron el asistente (08-10-2026, Nico:
 * «No pudimos abrir tu registro» en producción con hola+2@leasefy.co).
 *
 * El back crea la inmobiliaria y le pide al micro que abra la sesión del
 * asistente (`/onboarding/start`). Si el micro contesta con un error, el dueño
 * ve el aviso y el motivo queda en la inmobiliaria (`lastInvitationError`) —
 * hasta hoy sólo se leía en la base. Acá se ve, con lo que contestó el micro, y
 * «Reintentar» lo vuelve a pedir y muestra la respuesta de ESE intento.
 *
 * Lista sólo lo que el back devuelve en `provisioning-pipeline`: lo pendiente,
 * lo fallido y lo ACTIVE que quedó a medias (sin el dueño adentro, o sin la
 * sesión del asistente). Una inmobiliaria sana no sale.
 */

import { useState } from 'react'

import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'

export interface FilaSinAsistente {
  id: string
  name: string
  provisioningStatus: 'PENDING' | 'ACTIVE' | 'FAILED'
  agentProvisionAttempts: number
  lastProvisionError: string | null
  invitationAttempts: number
  lastInvitationError: string | null
  agentSessionId?: string | null
  ownerCanEnter: boolean | null
  updatedAt: string
}

/** Qué le pasó, en palabras. */
export function queLePaso(f: FilaSinAsistente): string {
  if (f.provisioningStatus === 'FAILED') return 'No se pudo crear en el asistente'
  if (f.provisioningStatus === 'PENDING') return 'Todavía no se crea en el asistente'
  if (f.ownerCanEnter === false) return 'El dueño no puede entrar al asistente'
  return 'El asistente no abrió el registro'
}

/** El motivo que guardó el back, o lo que se sabe. */
export function motivoDe(f: FilaSinAsistente): string {
  return (
    f.lastInvitationError ??
    f.lastProvisionError ??
    'El back no guardó un motivo para esta inmobiliaria.'
  )
}

export function RegistrosSinAsistente() {
  const filas = useApiQuery<FilaSinAsistente[]>((signal) =>
    adminApi('/tenants/provisioning-pipeline', { signal }),
  )
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [respuesta, setRespuesta] = useState<Record<string, { ok: boolean; texto: string }>>({})

  const reintentar = async (id: string) => {
    setEnCurso(id)
    try {
      await adminApi(`/tenants/${id}/resend-invitation`, { method: 'POST' })
      setRespuesta((r) => ({
        ...r,
        [id]: { ok: true, texto: 'El asistente respondió bien: le llegó la invitación a la inmobiliaria.' },
      }))
    } catch (e) {
      const texto =
        e instanceof ApiError ? `El asistente volvió a fallar: ${e.message}` : 'No se pudo reintentar.'
      setRespuesta((r) => ({ ...r, [id]: { ok: false, texto } }))
    } finally {
      setEnCurso(null)
      filas.refetch()
    }
  }

  const lista = filas.data ?? []
  if (filas.isLoading || filas.error || lista.length === 0) return null

  return (
    <section className="mb-6 rounded-lg border border-border p-4" data-testid="registros-sin-asistente">
      <h2 className="text-sm font-semibold text-fg">Registros que no abrieron el asistente</h2>
      <p className="mt-1 text-xs text-fg-muted">
        El dueño vio «No pudimos abrir tu registro». El motivo es lo que contestó el asistente; «Reintentar» lo vuelve a
        pedir y, si funciona, le manda la invitación por correo a la inmobiliaria.
      </p>
      <ul className="mt-3 space-y-3">
        {lista.map((f) => (
          <li key={f.id} className="rounded-md border border-border p-3" data-testid={`sin-asistente-${f.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">{f.name}</span>
              <Pill tone={f.provisioningStatus === 'FAILED' ? 'bad' : 'warn'}>{queLePaso(f)}</Pill>
              <span className="text-xs text-fg-muted tabular-nums">
                {f.invitationAttempts} {f.invitationAttempts === 1 ? 'intento' : 'intentos'} · {fmtDateTime(f.updatedAt)}
              </span>
            </div>
            <p className="mt-2 break-words font-mono text-xs text-fg" data-testid="motivo">
              {motivoDe(f)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1 text-xs font-medium text-fg hover:bg-surface-muted disabled:opacity-50"
                disabled={enCurso !== null}
                onClick={() => void reintentar(f.id)}
                data-testid="reintentar"
              >
                {enCurso === f.id ? 'Reintentando…' : 'Reintentar'}
              </button>
              {respuesta[f.id] ? (
                <span
                  role="status"
                  className={`text-xs ${respuesta[f.id].ok ? 'text-fg' : 'text-red-600'}`}
                  data-testid="respuesta"
                >
                  {respuesta[f.id].texto}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
