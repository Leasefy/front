'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, CheckCircle, UserPlus } from '@phosphor-icons/react'
import { Alert, KeyValueList, MonoLabel, Presence, SegmentedControl } from '@leasefy/cadence'
import { adminApi, ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { Pill } from '@/components/admin/Pill'
import { legible, urgencia } from '@/lib/admin/textos-del-admin'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EscalationDetail {
  id: string
  tenant_id: string
  debtor_id: string | null
  call_id: string | null
  // Not exposed by the back today — keep optional so the block degrades gracefully
  reason?: string | null
  urgency: string
  status: string
  assigned_to: string | null
  resolution: string | null
  created_at: string
  resolved_at: string | null
  debtor_name: string | null
  phone_primary: string | null
  document_number: string | null
  debtor_email: string | null
  legal_name: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ESTADO_DE_LA_ESCALACION: Record<string, string> = {
  open: 'Abierta',
  assigned: 'En curso',
  resolved: 'Resuelta',
}

/** /admin/escalations/:id — detail + assign/resolve (FRONT.md §6.14 · BACK.md §8.11). */
export default function EscalationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error, refetch } = useApiQuery<EscalationDetail>(
    (signal) => adminApi(`/escalations/${id}`, { signal }),
    [id],
  )

  const [mode, setMode] = useState<'assign' | 'resolve' | null>(null)
  const [assignee, setAssignee] = useState('')
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={6} /></div>
  if (error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={error} onReintentar={refetch} /></div>
  if (!data) return null

  const isOpen = data.status === 'open' || data.status === 'assigned'

  // Client-side validation mirrors BACK.md §8.11.
  const assigneeValid = EMAIL_RE.test(assignee.trim())
  const resolutionValid = resolution.trim().length >= 1 && resolution.length <= 4000

  const canAssign = mode === 'assign' && assigneeValid && !submitting
  const canResolve = mode === 'resolve' && resolutionValid && !submitting

  async function onAssign() {
    if (!canAssign) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await adminApi(`/escalations/${id}/assign`, {
        method: 'POST',
        body: { assignee: assignee.trim() },
      })
      setMode(null)
      setAssignee('')
      refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Concurrency guard: status changed since we loaded the page
        setSubmitError('Otra persona del equipo ya la asignó o la resolvió. Te mostramos cómo quedó.')
        refetch()
      } else {
        setSubmitError(mensajeDelAdmin(err, { accion: 'asignar la escalación' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function onResolve() {
    if (!canResolve) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await adminApi(`/escalations/${id}/resolve`, {
        method: 'POST',
        body: { resolution },
      })
      setMode(null)
      setResolution('')
      refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Concurrency guard: status changed since we loaded the page
        setSubmitError('Otra persona del equipo ya la resolvió. Te mostramos cómo quedó.')
        refetch()
      } else {
        setSubmitError(mensajeDelAdmin(err, { accion: 'resolver la escalación' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  function cancelAction() {
    setMode(null)
    setAssignee('')
    setResolution('')
    setSubmitError(null)
  }

  const u = urgencia(data.urgency)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/escalations" label="Volver a escalaciones" />
      <PageHeader
        title={isOpen ? 'Escalación abierta' : `Resuelta el ${fmtDateTime(data.resolved_at)}`}
        description={
          <>
            {data.legal_name ?? 'Sin inmobiliaria'} · {data.debtor_name ?? 'Deudor sin nombre'}
            {data.phone_primary ? (
              <>
                {' '}· <span className="font-mono tabular-nums">{data.phone_primary}</span>
              </>
            ) : null}
          </>
        }
        right={
          <Pill tone={u.tono} dot>
            Urgencia {u.nombre.toLowerCase()}
          </Pill>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Qué pasó" className="lg:col-span-2">
          <div className="space-y-5">
            {data.reason ? (
              <div className="space-y-1.5">
                <MonoLabel className="block">Razón</MonoLabel>
                <p className="whitespace-pre-wrap leading-relaxed text-fg">{data.reason}</p>
              </div>
            ) : (
              <p className="text-body-sm text-fg-muted">El agente no dejó una razón escrita.</p>
            )}

            {data.call_id && (
              <div className="space-y-1.5">
                <MonoLabel className="block">Llamada relacionada</MonoLabel>
                <Link
                  href={`/admin/calls/${data.call_id}`}
                  className="group inline-flex items-center gap-1.5 text-body-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver la llamada
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            {data.resolution && (
              <div className="space-y-1.5">
                <MonoLabel className="block">Cómo se resolvió</MonoLabel>
                <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-fg">{data.resolution}</p>
              </div>
            )}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Datos">
          <KeyValueList
            compact
            items={[
              { label: 'Estado', value: ESTADO_DE_LA_ESCALACION[data.status] ?? legible(data.status) },
              { label: 'La tiene', value: <span className="break-all">{data.assigned_to ?? 'Nadie'}</span> },
              { label: 'Cédula', value: <span className="font-mono tabular-nums">{data.document_number ?? '—'}</span> },
              { label: 'Correo del deudor', value: <span className="break-all">{data.debtor_email ?? '—'}</span> },
              { label: 'Creada', value: <span className="font-mono tabular-nums">{fmtDateTime(data.created_at)}</span> },
              ...(data.resolved_at
                ? [{ label: 'Resuelta', value: <span className="font-mono tabular-nums">{fmtDateTime(data.resolved_at)}</span> }]
                : []),
            ]}
          />
        </Tarjeta>
      </div>

      {isOpen && (
        <Tarjeta titulo="Qué hacer" descripcion="Queda en la bitácora de auditoría con tu correo y la hora.">
          <div className="space-y-5">
            <SegmentedControl<'assign' | 'resolve'>
              aria-label="Qué hacer con la escalación"
              value={mode ?? ('' as 'assign')}
              onChange={(v) => {
                setMode(v)
                setSubmitError(null)
              }}
              options={[
                // Asignar sólo mientras esté abierta (el back exige status='open').
                ...(data.status === 'open'
                  ? [{ value: 'assign' as const, ariaLabel: 'Asignarla', label: <span className="flex items-center gap-1.5"><UserPlus className="h-4 w-4" aria-hidden="true" />Asignarla</span> }]
                  : []),
                { value: 'resolve' as const, ariaLabel: 'Marcarla resuelta', label: <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" aria-hidden="true" />Marcarla resuelta</span> },
              ]}
            />

            <Presence show={mode === 'assign'}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="asignar-a">Correo de quien la atiende</Label>
                  <Input
                    id="asignar-a"
                    type="email"
                    className="max-w-md"
                    placeholder="ops@leasefy.co"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    aria-invalid={assignee && !assigneeValid ? true : undefined}
                  />
                  {assignee && !assigneeValid ? <p className="text-body-sm text-danger">Ese correo no es válido.</p> : null}
                </div>
                {submitError ? <Alert variant="danger">{submitError}</Alert> : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onAssign} disabled={!canAssign} isLoading={submitting} hideArrow>
                    {submitting ? 'Guardando…' : 'Asignar'}
                  </Button>
                  <Button variant="outline" onClick={cancelAction} disabled={submitting} hideArrow>
                    Cancelar
                  </Button>
                </div>
              </div>
            </Presence>

            <Presence show={mode === 'resolve'}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Label htmlFor="resolucion">Cómo se resolvió</Label>
                    <MonoLabel className={resolution.length > 4000 ? 'text-danger' : undefined}>
                      {resolution.length.toLocaleString('es-CO')} / 4.000
                    </MonoLabel>
                  </div>
                  <Textarea
                    id="resolucion"
                    className="min-h-[120px]"
                    placeholder="Qué se hizo. P. ej.: lo llamé, aceptó un plan de 3 cuotas y le mandé el enlace por WhatsApp."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    aria-invalid={resolution.length > 4000 || (resolution.length > 0 && resolution.trim().length === 0) || undefined}
                  />
                  {resolution.length > 4000 && (
                    <p className="text-body-sm text-danger">No puede pasar de 4.000 caracteres.</p>
                  )}
                  {resolution.trim().length === 0 && resolution.length > 0 && (
                    <p className="text-body-sm text-danger">Escribe qué se hizo.</p>
                  )}
                </div>
                {submitError ? <Alert variant="danger">{submitError}</Alert> : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onResolve} disabled={!canResolve} isLoading={submitting} hideArrow>
                    {submitting ? 'Guardando…' : 'Marcar resuelta'}
                  </Button>
                  <Button variant="outline" onClick={cancelAction} disabled={submitting} hideArrow>
                    Cancelar
                  </Button>
                </div>
              </div>
            </Presence>
          </div>
        </Tarjeta>
      )}
    </div>
  )
}
