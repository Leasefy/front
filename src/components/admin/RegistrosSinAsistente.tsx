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

import { Alert, Stagger, StaggerItem } from '@leasefy/cadence'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { Pill } from '@/components/admin/Pill'
import { Button } from '@/components/ui/button'

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
  // (19-10-2026) Con muchas, la lista cerrada: antes empujaba la tabla de
  // inmobiliarias una pantalla entera hacia abajo.
  const [abierta, setAbierta] = useState<boolean | null>(null)
  if (filas.isLoading || filas.error || lista.length === 0) return null
  const verLista = abierta ?? lista.length <= 2

  return (
    <Alert
      variant="warning"
      title={
        lista.length === 1
          ? 'Un registro no abrió el asistente'
          : `${lista.length} registros no abrieron el asistente`
      }
      data-testid="registros-sin-asistente"
      // Es una sección que se queda, no un aviso que aparece: sin `role="alert"`.
      role="region"
      aria-label="Registros que no abrieron el asistente"
      className="[&_.alert-title]:text-fg"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-fg-muted">
          El dueño vio «No pudimos abrir tu registro». «Reintentar» lo vuelve a pedir y, si funciona, le manda la
          invitación por correo.
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          hideArrow
          aria-expanded={verLista}
          onClick={() => setAbierta(!verLista)}
          data-testid="ver-registros"
        >
          {verLista ? 'Ocultar' : `Ver ${lista.length === 1 ? 'el registro' : `los ${lista.length}`}`}
        </Button>
      </div>
      {verLista ? (
        <Stagger as="ul" className="mt-3 divide-y divide-border-faint overflow-hidden rounded-md border border-border bg-surface">
          {lista.map((f) => (
            <StaggerItem
              as="li"
              key={f.id}
              className="flex flex-col gap-2 px-3.5 py-3 text-fg sm:flex-row sm:items-center sm:gap-4"
              data-testid={`sin-asistente-${f.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{f.name}</span>
                  <Pill tone={f.provisioningStatus === 'FAILED' ? 'bad' : 'warn'}>{queLePaso(f)}</Pill>
                </div>
                <p className="mt-1 break-words text-caption text-fg-muted" data-testid="motivo">
                  {motivoDe(f)} · {f.invitationAttempts} {f.invitationAttempts === 1 ? 'intento' : 'intentos'} ·{' '}
                  {fmtDateTime(f.updatedAt)}
                </p>
                {respuesta[f.id] ? (
                  <span
                    role="status"
                    className={`mt-1.5 flex items-center gap-1.5 text-body-sm ${respuesta[f.id].ok ? 'text-success' : 'text-danger'}`}
                    data-testid="respuesta"
                  >
                    {respuesta[f.id].ok ? (
                      <CheckCircle className="h-4 w-4 shrink-0" weight="fill" aria-hidden="true" />
                    ) : (
                      <WarningCircle className="h-4 w-4 shrink-0" weight="fill" aria-hidden="true" />
                    )}
                    {respuesta[f.id].texto}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                hideArrow
                disabled={enCurso !== null}
                isLoading={enCurso === f.id}
                onClick={() => void reintentar(f.id)}
                data-testid="reintentar"
                className="shrink-0 self-start sm:self-center"
              >
                {enCurso === f.id ? 'Reintentando…' : 'Reintentar'}
              </Button>
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}
    </Alert>
  )
}
