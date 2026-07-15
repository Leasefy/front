'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

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

function urgencyTone(u: string): PillTone {
  if (u === 'live') return 'bad'
  if (u === 'high') return 'warn'
  if (u === 'medium') return 'info'
  return 'muted'
}

function Meta({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{label}</div>
      <div className={`text-sm text-fg mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
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

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>
  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
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
        setSubmitError('La escalación ya fue asignada o resuelta por otro admin. Actualizando…')
        refetch()
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Error de red')
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
        setSubmitError('La escalación ya fue resuelta por otro admin. Actualizando…')
        refetch()
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Error de red')
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

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/escalations"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
        >
          ← Escalaciones
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">
          {isOpen ? 'Escalación abierta.' : `Resuelta · ${fmtDateTime(data.resolved_at)}`}
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          {data.legal_name ?? '(sin agencia)'} · deudor{' '}
          <span className="font-mono">{data.debtor_name ?? '—'}</span>
          {data.phone_primary ? ` · ${data.phone_primary}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 card p-5 space-y-5">
          {data.reason && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">
                razón
              </div>
              <p className="text-fg leading-relaxed whitespace-pre-wrap">{data.reason}</p>
            </div>
          )}

          {data.call_id && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">
                llamada relacionada
              </div>
              <Link
                href={`/admin/calls/${data.call_id}`}
                className="font-mono text-sm text-brand hover:underline"
              >
                /admin/calls/{data.call_id} →
              </Link>
            </div>
          )}

          {data.resolution && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">
                resolución
              </div>
              <p className="text-fg leading-relaxed whitespace-pre-wrap text-sm">
                {data.resolution}
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            metadata
          </div>
          <div className="mb-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">urgencia</div>
            <div className="mt-0.5">
              <Pill tone={urgencyTone(data.urgency)}>{data.urgency}</Pill>
            </div>
          </div>
          <Meta label="estado" value={data.status} mono />
          <Meta label="asignada a" value={data.assigned_to ?? '—'} mono />
          <Meta label="cédula" value={data.document_number ?? '—'} mono />
          <Meta label="email deudor" value={data.debtor_email ?? '—'} mono />
          <Meta label="creada" value={fmtDateTime(data.created_at)} />
          {data.resolved_at && (
            <Meta label="resuelta" value={fmtDateTime(data.resolved_at)} />
          )}
        </div>
      </div>

      {/* Action card — only while open or assigned */}
      {isOpen && (
        <div className="card p-5 border-t-4 border-t-brand">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            acción
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {/* Assign — only when status = 'open' (server guard: status='open') */}
            {data.status === 'open' && (
              <button
                type="button"
                onClick={() => setMode('assign')}
                className={'btn ' + (mode === 'assign' ? 'btn-primary' : '')}
              >
                Asignar a alguien
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('resolve')}
              className={'btn ' + (mode === 'resolve' ? 'bg-ok text-white border-ok' : '')}
            >
              ✓ Marcar resuelta
            </button>
          </div>

          {mode === 'assign' && (
            <>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  email del asignado
                </span>
                <input
                  type="email"
                  className="input mt-2"
                  placeholder="ops@leasefy.com"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                />
              </label>
              {assignee && !assigneeValid && (
                <p className="text-sm text-bad mt-1">Email inválido.</p>
              )}
              {submitError && (
                <div className="card p-3 border-bad/40 mt-3">
                  <p className="text-sm text-bad">{submitError}</p>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={onAssign}
                  disabled={!canAssign}
                  className="btn btn-primary"
                >
                  {submitting ? 'Guardando…' : 'Confirmar'}
                </button>
                <button type="button" onClick={cancelAction} disabled={submitting} className="btn">
                  Cancelar
                </button>
              </div>
            </>
          )}

          {mode === 'resolve' && (
            <>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  resolución (queda en el audit trail) · {resolution.length} / 4000
                </span>
                <textarea
                  className="textarea mt-2 min-h-[120px]"
                  placeholder="Qué se hizo para resolver. Ej: llamé al deudor, accedió a plan de 3 cuotas, link enviado por WA."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </label>
              {resolution.length > 4000 && (
                <p className="text-sm text-bad mt-1">
                  La resolución no puede superar 4 000 caracteres.
                </p>
              )}
              {resolution.trim().length === 0 && resolution.length > 0 && (
                <p className="text-sm text-bad mt-1">La resolución no puede estar vacía.</p>
              )}
              {submitError && (
                <div className="card p-3 border-bad/40 mt-3">
                  <p className="text-sm text-bad">{submitError}</p>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={onResolve}
                  disabled={!canResolve}
                  className="btn btn-primary"
                >
                  {submitting ? 'Guardando…' : 'Confirmar'}
                </button>
                <button type="button" onClick={cancelAction} disabled={submitting} className="btn">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
