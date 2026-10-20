'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowCounterClockwise, CheckCircle, Phone, Scales } from '@phosphor-icons/react'
import {
  Alert,
  CodeBlock,
  KeyValueList,
  MonoLabel,
  Presence,
  RadioCard,
  RadioCardGroup,
} from '@leasefy/cadence'
import { adminApi, ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { resultadoDeLaRevision, tipoDeDecision } from '@/lib/admin/textos-del-admin'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

type Outcome = 'upheld' | 'overridden' | 'escalated'

/** Las tres salidas, con su porqué. */
const SALIDAS: Array<{ valor: Outcome; titulo: string; detalle: string; icono: React.ReactNode }> = [
  {
    valor: 'upheld',
    titulo: 'Aprobar',
    detalle: 'El agente la ejecuta tal como la propuso.',
    icono: <CheckCircle className="h-5 w-5 text-success" weight="fill" aria-hidden="true" />,
  },
  {
    valor: 'overridden',
    titulo: 'Modificar',
    detalle: 'No se ejecuta así: escribe qué cambiarías y por qué.',
    icono: <ArrowCounterClockwise className="h-5 w-5 text-warning" weight="bold" aria-hidden="true" />,
  },
  {
    valor: 'escalated',
    titulo: 'Escalar a un abogado',
    detalle: 'Necesita revisión legal antes de cualquier paso.',
    icono: <Scales className="h-5 w-5 text-danger" weight="fill" aria-hidden="true" />,
  },
]

const NOTES_PLACEHOLDER: Record<Outcome, string> = {
  upheld: 'Una nota de la revisión (opcional)',
  overridden: 'Qué cambiarías de la propuesta y por qué',
  escalated: 'Por qué necesita un abogado',
}

const VARIANTE_DE_LA_REVISION: Record<string, 'success' | 'warning' | 'danger'> = {
  upheld: 'success',
  overridden: 'warning',
  escalated: 'danger',
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

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={6} /></div>
  if (error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={error} onReintentar={refetch} /></div>
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
        setSubmitError('Otra persona del equipo ya la revisó. Te mostramos cómo quedó.')
        refetch()
      } else {
        setSubmitError(mensajeDelAdmin(err, { accion: 'registrar la decisión' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/approvals" label="Volver a aprobaciones" />
      <PageHeader
        title={pending ? 'Revisa y decide' : `Revisada · ${resultadoDeLaRevision(data.review_outcome)}`}
        description={
          <>
            {data.legal_name ?? 'Sin inmobiliaria'} · {data.debtor_name ?? 'Deudor sin nombre'}
            {data.document_number ? (
              <>
                {' '}· CC <span className="font-mono tabular-nums">{data.document_number}</span>
              </>
            ) : null}
          </>
        }
      />

      {!pending && (
        <Alert
          variant={VARIANTE_DE_LA_REVISION[data.review_outcome ?? ''] ?? 'info'}
          title={`Ya revisada: ${resultadoDeLaRevision(data.review_outcome).toLowerCase()}`}
        >
          Por <span className="font-mono">{data.reviewed_by ?? 'alguien del equipo'}</span>
          {data.reviewed_at ? ` · ${fmtDateTime(data.reviewed_at)}` : ''}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Tarjeta titulo="Lo que propone el agente" className="lg:col-span-2">
          <div className="space-y-5">
            <KeyValueList
              items={[
                { label: 'Tipo', value: tipoDeDecision(data.decision_type) },
                { label: 'Modelo', value: <span className="font-mono">{data.model_used}</span> },
                {
                  label: 'Confianza',
                  value: (
                    <span className="font-mono tabular-nums">
                      {data.confidence_score != null
                        ? `${(Number(data.confidence_score) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`
                        : '—'}
                    </span>
                  ),
                },
                { label: 'Creada', value: <span className="font-mono tabular-nums">{fmtDateTime(data.created_at)}</span> },
              ]}
            />
            <CodeBlock language="json" filename="Propuesta" code={JSON.stringify(data.decision_payload ?? {}, null, 2)} />
            {data.human_override_payload ? (
              <CodeBlock
                language="json"
                filename="Lo que se cambió"
                code={JSON.stringify(data.human_override_payload, null, 2)}
              />
            ) : null}
          </div>
        </Tarjeta>

        <Tarjeta titulo="El deudor">
          <div className="space-y-5">
            <KeyValueList
              compact
              items={[
                { label: 'Nombre', value: data.debtor_name ?? '—' },
                { label: 'Cédula', value: <span className="font-mono tabular-nums">{data.document_number ?? '—'}</span> },
                { label: 'Teléfono', value: <span className="font-mono tabular-nums">{data.phone_primary ?? '—'}</span> },
                { label: 'Correo', value: <span className="break-all">{data.debtor_email ?? '—'}</span> },
                { label: 'Inmobiliaria', value: data.legal_name ?? '—' },
              ]}
            />
            <div className="space-y-2">
              <MonoLabel className="block">Últimas 5 llamadas</MonoLabel>
              {(data.calls ?? []).length === 0 ? (
                <p className="text-body-sm text-fg-muted">Todavía no lo han llamado.</p>
              ) : (
                <ul className="divide-y divide-border-faint">
                  {(data.calls ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                      <span className="flex items-center gap-2 text-fg-muted">
                        <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="font-mono tabular-nums">{fmtDateTime(c.initiated_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-fg">{c.outcome ?? '—'}</span>
                        {c.qa_score ? (
                          <MonoLabel className="tabular-nums">Calidad {Number(c.qa_score).toFixed(0)}</MonoLabel>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Tarjeta>
      </div>

      {pending && (
        <Tarjeta titulo="Tu decisión" descripcion="Queda en la bitácora de auditoría con tu correo y la hora.">
          <div className="space-y-5">
            <RadioCardGroup
              value={mode ?? ''}
              onValueChange={(v) => {
                setMode(v as Outcome)
                setSubmitError(null)
              }}
              className="grid gap-3 md:grid-cols-3"
              aria-label="Qué hacer con la propuesta"
            >
              {SALIDAS.map((s) => (
                <RadioCard
                  key={s.valor}
                  value={s.valor}
                  label={
                    <span className="flex items-center gap-2">
                      {s.icono}
                      {s.titulo}
                    </span>
                  }
                  description={s.detalle}
                />
              ))}
            </RadioCardGroup>

            <Presence show={mode !== null}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Label htmlFor="notas-de-la-revision">Notas</Label>
                    <MonoLabel className={notesTooLong ? 'text-danger' : undefined}>
                      {notes.length.toLocaleString('es-CO')} / 2.000
                    </MonoLabel>
                  </div>
                  <Textarea
                    id="notas-de-la-revision"
                    className="min-h-[110px]"
                    placeholder={mode ? NOTES_PLACEHOLDER[mode] : ''}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    aria-invalid={notesTooLong || undefined}
                  />
                  {notesTooLong ? (
                    <p className="text-body-sm text-danger">Las notas no pueden pasar de 2.000 caracteres.</p>
                  ) : null}
                </div>

                {submitError ? <Alert variant="danger">{submitError}</Alert> : null}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={onSubmit} disabled={!canSubmit} isLoading={submitting} hideArrow>
                    {submitting ? 'Guardando…' : 'Confirmar la decisión'}
                  </Button>
                  <Button
                    variant="outline"
                    hideArrow
                    onClick={() => {
                      setMode(null)
                      setNotes('')
                      setSubmitError(null)
                    }}
                    disabled={submitting}
                  >
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
