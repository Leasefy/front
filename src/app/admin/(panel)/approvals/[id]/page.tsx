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

interface RecentCall {
  id: string
  initiated_at: string
  outcome: string | null
  qa_score: string | null
}

interface ApprovalDetail {
  id: string
  tenant_id: string
  debtor_id: string
  decision_type: string
  decision_payload: Record<string, unknown>
  // pg NUMERIC arrives as string (::text cast) — convert before math
  confidence_score: string | null
  model_used: string
  reviewable: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  review_outcome: string | null
  human_override_payload: Record<string, unknown> | null
  created_at: string
  debtor_name: string | null
  phone_primary: string | null
  document_number: string | null
  debtor_email: string | null
  legal_name: string | null
  calls: RecentCall[]
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
      <div className={`text-sm text-fg mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-1">{label}</div>
      <pre className="card p-3 text-[11px] leading-relaxed text-fg-muted overflow-x-auto font-mono">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

type Outcome = 'upheld' | 'overridden' | 'escalated'

const OUTCOME_LABELS: Record<Outcome, string> = {
  upheld: '✓ Aprobar (upheld)',
  overridden: '↺ Override (modificar payload)',
  escalated: '⚠ Escalar a abogado',
}

const OUTCOME_ACTIVE_CLASS: Record<Outcome, string> = {
  upheld: 'bg-ok text-white border-ok',
  overridden: 'bg-warn text-white border-warn',
  escalated: 'bg-bad text-white border-bad',
}

const NOTES_PLACEHOLDER: Record<Outcome, string> = {
  upheld: 'Confirmación de revisión (opcional)',
  overridden: 'Explicá qué del payload modificarías y por qué',
  escalated: 'Razón de la escalación legal',
}

const reviewOutcomeTone: Record<string, PillTone> = {
  upheld: 'ok',
  overridden: 'warn',
  escalated: 'bad',
}

/** /admin/approvals/:id — decision detail + action (FRONT.md §6.12 · BACK.md §8.10). */
export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error, refetch } = useApiQuery<ApprovalDetail>(
    (signal) => adminApi(`/approvals/${id}`, { signal }),
    [id],
  )

  const [mode, setMode] = useState<Outcome | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>
  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
  if (!data) return null

  const pending = data.reviewable && !data.reviewed_at

  // Client-side validation mirrors BACK.md §8.10: notes ≤ 2000.
  const notesTooLong = notes.length > 2000
  const canSubmit = mode !== null && !notesTooLong && !submitting

  async function onSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await adminApi(`/approvals/${id}/decision`, {
        method: 'POST',
        body: { outcome: mode, notes: notes || undefined },
      })
      setMode(null)
      setNotes('')
      refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Concurrency guard: someone else reviewed it first
        setSubmitError('Esta decisión ya fue revisada por otro admin. Actualizando…')
        refetch()
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Error de red')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/approvals"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
        >
          ← Cola
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">
          {pending ? 'Revisar y decidir.' : `Revisado · ${data.review_outcome ?? '—'}`}
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          {data.legal_name ?? '(sin agencia)'} · deudor{' '}
          <span className="font-mono">{data.debtor_name ?? '—'}</span>
          {data.document_number ? ` · CC ${data.document_number}` : ''}
        </p>
      </div>

      {/* Already-reviewed banner */}
      {!pending && (
        <div
          className={
            'card p-4 border-l-4 ' +
            (data.review_outcome === 'upheld'
              ? 'border-l-ok'
              : data.review_outcome === 'overridden'
                ? 'border-l-warn'
                : 'border-l-fg-dim')
          }
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            ya revisado
          </div>
          <div className="text-sm text-fg mt-1">
            <Pill tone={reviewOutcomeTone[data.review_outcome ?? ''] ?? 'neutral'}>
              {data.review_outcome ?? '—'}
            </Pill>{' '}
            por{' '}
            <span className="font-mono">{data.reviewed_by ?? '?'}</span>
            {data.reviewed_at ? ` · ${fmtDateTime(data.reviewed_at)}` : ''}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
              decisión propuesta por el agente
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-bg-border">
              <Meta label="tipo" value={data.decision_type} />
              <Meta label="modelo" value={data.model_used} />
              <Meta
                label="confianza"
                value={
                  data.confidence_score != null
                    ? `${(Number(data.confidence_score) * 100).toFixed(1)}%`
                    : '—'
                }
              />
              <Meta label="creada" value={fmtDateTime(data.created_at)} />
            </div>
            <JsonBlock label="payload" value={data.decision_payload} />
            {data.human_override_payload && (
              <div className="mt-4">
                <JsonBlock label="override aplicado" value={data.human_override_payload} />
              </div>
            )}
          </div>
        </div>

        {/* Debtor context + last calls */}
        <div className="card p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            contexto del deudor
          </div>
          <Meta label="nombre" value={data.debtor_name ?? '—'} />
          <Meta label="cédula" value={data.document_number ?? '—'} mono />
          <Meta label="teléfono" value={data.phone_primary ?? '—'} mono />
          <Meta label="email" value={data.debtor_email ?? '—'} mono />
          <Meta label="agencia" value={data.legal_name ?? '—'} />

          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-4 mb-2">
            últimas 5 llamadas
          </div>
          {(data.calls ?? []).length === 0 ? (
            <div className="text-xs text-fg-muted">Sin llamadas previas.</div>
          ) : (
            <div className="space-y-1.5">
              {(data.calls ?? []).map((c) => (
                <div key={c.id} className="flex items-baseline justify-between text-xs">
                  <span className="text-fg-muted font-mono tabular-nums">
                    {fmtDateTime(c.initiated_at)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-fg">{c.outcome ?? '—'}</span>
                    {c.qa_score && (
                      <span className="font-mono text-[10px] text-fg-subtle tabular-nums">
                        qa {Number(c.qa_score).toFixed(0)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action card — only shown while pending */}
      {pending && (
        <div className="card p-5 border-t-4 border-t-brand">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
            acción
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {(['upheld', 'overridden', 'escalated'] as Outcome[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setMode(o)}
                className={'btn ' + (mode === o ? OUTCOME_ACTIVE_CLASS[o] : '')}
              >
                {OUTCOME_LABELS[o]}
              </button>
            ))}
          </div>

          {mode && (
            <>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  notas (opcional — quedan en audit trail) · {notes.length} / 2000
                </span>
                <textarea
                  className="textarea mt-2 min-h-[100px]"
                  placeholder={NOTES_PLACEHOLDER[mode]}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              {notesTooLong && (
                <p className="text-sm text-bad mt-1">
                  Las notas no pueden superar 2 000 caracteres.
                </p>
              )}

              {submitError && (
                <div className="card p-3 border-bad/40 mt-3">
                  <p className="text-sm text-bad">{submitError}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="btn btn-primary"
                >
                  {submitting ? 'Guardando…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(null)
                    setNotes('')
                    setSubmitError(null)
                  }}
                  disabled={submitting}
                  className="btn"
                >
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
