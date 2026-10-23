'use client'

import { PageHeader } from '@/components/admin/screen/PageHeader';
import { BackButton } from '@/components/ui/back-button';
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import {
  fetchPendingReview,
  fetchAvaluoDetail,
  signoffAvaluo,
  fmtBps,
  fmtBpsSigned,
  CONFIANZA_TONE,
  type PendingReviewItem,
  type AvaluoDetailResponse,
  type Adjustment,
} from '@/lib/admin/avaluos'
import { CertificatePdfViewer } from './CertificatePdfViewer'
import { PhotoDescriptionsEditor } from './PhotoDescriptionsEditor'
import { SignatureCanvas } from './SignatureCanvas'
import { Alert, Card, MonoLabel } from '@leasefy/cadence'
import { metodoDelAvaluo, suficiencia, tipoObservado } from '@/lib/admin/textos-del-admin'
// Ronda 30: faltaba la importación (al quedar resuelto, «Este avalúo quedó …» se caía con un ReferenceError).
import { avaluoStateMeta } from '@/lib/admin/avaluo-states'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-2 last:mb-0">
      <MonoLabel className="block">{label}</MonoLabel>
      <div className={`text-body-sm text-fg mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  )
}

function AdjustmentsList({ adjustments }: { adjustments: Adjustment[] }) {
  if (adjustments.length === 0) return <div className="text-caption text-fg-muted">Sin ajustes.</div>
  return (
    <div className="space-y-1">
      {adjustments.map((a, i) => (
        <div key={`${a.factor}-${i}`} className="flex items-baseline justify-between text-caption">
          <span className="text-fg-muted">{a.factor}</span>
          <span
            className={
              'font-mono tabular-nums ' +
              (a.pctBps > 0 ? 'text-success' : a.pctBps < 0 ? 'text-danger' : 'text-fg-muted')
            }
          >
            {fmtBpsSigned(a.pctBps)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

type Mode = 'approve' | 'reject'

const MODE_LABELS: Record<Mode, string> = {
  approve: 'Firmar el certificado',
  reject: 'Rechazar el avalúo',
}


/**
 * /admin/avaluos/:id — revisión de la propuesta + firma/rechazo.
 *
 * La data de decisión (valor, banda, narrativa, ajustes, comps, Ley 820,
 * confianza) sólo viaja en `pending-review`, así que la buscamos ahí por id.
 * `/detail` agrega comparables detallados + sufficiency + cobertura de banda +
 * las descripciones editables por foto (`photos`).
 *
 * El back admin ahora proxya el PDF del certificado (`/avaluos/:id/certificate`,
 * stream Bearer-gated) y las fotos/descripciones — el service token viaja
 * server-side, nunca al browser. Por eso el reviewer ve el PDF embebido, edita
 * las descripciones (fence Ley-1673) y firma con el canvas.
 */
export default function AvaluoDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const queue = useApiQuery<{ items: PendingReviewItem[] }>(
    (signal) => fetchPendingReview(signal),
    [id],
  )
  const detail = useApiQuery<AvaluoDetailResponse>(
    (signal) => fetchAvaluoDetail(id, signal),
    [id],
  )

  const [mode, setMode] = useState<Mode | null>(null)
  const [reason, setReason] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState<'firmado' | 'rechazado' | null>(null)

  const isLoading = queue.isLoading || detail.isLoading
  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock /></div>

  // The detail fetch is the source of truth for the record existing.
  if (detail.error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={detail.error} /></div>

  const item = queue.data?.items.find((i) => i.id === id) ?? null
  const d = detail.data
  // Pending == still in the review queue and not just decided this session.
  const pending = item != null && done == null

  const reasonTooLong = reason.length > 2000
  const rejectNeedsReason = mode === 'reject' && reason.trim().length === 0
  const canSubmit = mode !== null && !reasonTooLong && !rejectNeedsReason && !submitting

  async function onSubmit() {
    if (!canSubmit || mode == null) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body =
        mode === 'reject'
          ? { action: 'reject' as const, reason }
          : { action: 'approve' as const, ...(signatureImage ? { signatureImage } : {}) }
      const res = await signoffAvaluo(id, body)
      setDone(res.state)
      setMode(null)
      setReason('')
      setSignatureImage(null)
      queue.refetch()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // "illegal transition ..." → another admin already decided
        setSubmitError('Otra persona del equipo ya revisó este avalúo. Te mostramos cómo quedó…')
        queue.refetch()
      } else if (err instanceof ApiError && err.status === 422) {
        // The only 422 on signoff is an invalid signature image payload.
        setSubmitError('La firma dibujada no sirve. Bórrala y vuelve a dibujarla.')
      } else {
        setSubmitError(mensajeDelAdmin(err, { accion: 'registrar la decisión del avalúo' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const band = d?.band

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* GLOW UP 21-10: la vuelta y el encabezado de las demás pantallas del admin. */}
      <BackButton href="/admin/avaluos" label="Cola de avalúos" />
      <PageHeader
        title={pending ? 'Revisar y firmar' : done === 'rechazado' ? 'Avalúo rechazado' : 'Avalúo resuelto'}
        description={
          <>
            Certificado <span className="font-mono">{item?.slug ?? 'sin número'}</span>
            {item?.method ? ` · ${metodoDelAvaluo(item.method)}` : ''}
          </>
        }
      />

      {/* Resolved / not-pending banner */}
      {!pending && (
        <Alert
          variant={done === 'rechazado' ? 'danger' : done ? 'success' : 'info'}
          title={done ? `Este avalúo quedó ${avaluoStateMeta(done).label.toLowerCase()}` : 'Ya no está en la cola de firma'}
        >
          {done ? 'La decisión quedó en la bitácora.' : 'Fue resuelto o no está en revisión.'}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposed valuation (from pending-review item) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <MonoLabel className="block mb-3">
              propuesta de valor del modelo
            </MonoLabel>

            {item ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border">
                  <Meta label="Valor estimado" value={fmtCOP(item.valueCop)} mono />
                  <Meta
                    label="Banda"
                    value={
                      item.bandLowCop != null || item.bandHighCop != null
                        ? `${fmtCOP(item.bandLowCop)} – ${fmtCOP(item.bandHighCop)}`
                        : '—'
                    }
                    mono
                  />
                  <Meta label="Método" value={item.method ? metodoDelAvaluo(item.method) : '—'} />
                  <Meta
                    label="Confianza"
                    value={
                      item.confianza
                        ? `${item.confianza.nivel} · ancho ${fmtBps(item.confianza.anchoRelativoBps)}`
                        : '—'
                    }
                  />
                </div>

                {item.narrativaEs && (
                  <div className="mb-4">
                    <MonoLabel className="block mb-1">
                      narrativa
                    </MonoLabel>
                    <p className="text-body-sm text-fg-muted leading-relaxed">{item.narrativaEs}</p>
                  </div>
                )}

                <MonoLabel className="block mb-2">
                  ajustes aplicados
                </MonoLabel>
                <AdjustmentsList adjustments={item.adjustments} />
              </>
            ) : (
              <p className="text-body-sm text-fg-muted">
                La propuesta de valor sólo está disponible mientras el avalúo está en revisión.
              </p>
            )}
          </Card>

          {/* Glow up 22-10: la decisión justo debajo de la propuesta (antes al final, debajo del PDF). */}
      {pending && (
        <Card className="p-5 ">
          <MonoLabel className="block mb-3">tu decisión</MonoLabel>

          <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Qué hacer con el avalúo">
            {(['approve', 'reject'] as Mode[]).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? 'secondary' : 'outline'}
                aria-pressed={mode === m}
                hideArrow
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]}
              </Button>
            ))}
          </div>

          {mode && (
            <>
              {mode === 'approve' && (
                <div className="mb-4">
                  <MonoLabel>
                    firma (opcional · Ley 527 — firma electrónica)
                  </MonoLabel>
                  <div className="mt-2">
                    <SignatureCanvas onChange={setSignatureImage} disabled={submitting} />
                  </div>
                </div>
              )}

              {mode === 'reject' && (
                <label className="block">
                  <MonoLabel>
                    motivo del rechazo (obligatorio · queda en la bitácora) · {reason.length} / 2.000
                  </MonoLabel>
                  <Textarea
                    className="mt-2 min-h-[100px]"
                    placeholder="Explica por qué se rechaza el avalúo"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}

              {reasonTooLong && (
                <p className="text-body-sm text-danger mt-1">El motivo no puede superar 2 000 caracteres.</p>
              )}
              {rejectNeedsReason && (
                <p className="text-body-sm text-warning mt-1">Indica el motivo del rechazo antes de confirmar.</p>
              )}

              {submitError && (
                <Alert variant="danger" className="mt-3">
                  {submitError}
                </Alert>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  hideArrow
                  type="button"
                  variant={mode === 'reject' ? 'destructive' : 'default'}
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  isLoading={submitting}
                >
                  {submitting ? 'Guardando…' : mode === 'approve' ? 'Firmar' : 'Rechazar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={() => {
                    setMode(null)
                    setReason('')
                    setSignatureImage(null)
                    setSubmitError(null)
                  }}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

          {/* Detail: comparables */}
          <Card className="p-5">
            <MonoLabel className="block mb-3">
              comparables · {d?.comparables?.length ?? 0}
            </MonoLabel>
            {(d?.comparables ?? []).length === 0 ? (
              <div className="text-caption text-fg-muted">Sin comparables.</div>
            ) : (
              <div className="space-y-3">
                {d!.comparables.map((c) => (
                  <div key={c.id} className="pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-body-sm text-fg">{tipoObservado(c.observedType)}</span>
                      <span className="font-mono tabular-nums text-body-sm text-fg">
                        {fmtCOP(c.observedValue)}
                      </span>
                    </div>
                    <AdjustmentsList adjustments={c.adjustments} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Photo descriptions — editable while in review (Ley-1673 fenced) */}
          {pending && (d?.photos?.length ?? 0) > 0 && (
            <Card className="p-5">
              <MonoLabel className="block mb-1">
                descripciones de fotos · {d?.photos.length}
              </MonoLabel>
              <p className="text-caption text-fg-muted mb-4">
                Corrige la prosa de anexo antes de firmar. Se congela al firmar.
              </p>
              <PhotoDescriptionsEditor id={id} photos={d!.photos} />
            </Card>
          )}
        </div>

        {/* Sidebar: band coverage + sufficiency + Ley 820 */}
        <div className="space-y-4">
          <Card className="p-5">
            <MonoLabel className="block mb-3">
              banda y suficiencia
            </MonoLabel>
            {band ? (
              <>
                <Meta label="Banda" value={`${fmtCOP(band.lowCop)} – ${fmtCOP(band.highCop)}`} mono />
                <Meta label="Cobertura" value={fmtBps(band.coverageBps)} mono />
              </>
            ) : (
              <div className="mb-2">
                <Pill tone="bad">El modelo no pudo dar una banda</Pill>
              </div>
            )}
            {d?.sufficiency && (
              <>
                <Meta label="Suficiencia" value={suficiencia(d.sufficiency.status)} />
                <Meta label="Puntaje" value={fmtBps(d.sufficiency.scoreBps)} mono />
                <Meta label="Comparables usados" value={String(d.sufficiency.compCount)} mono />
              </>
            )}
          </Card>

          {item?.canonLey820 && (
            <Card className="p-5">
              <MonoLabel className="block mb-3">
                canon Ley 820
              </MonoLabel>
              <Meta label="Canon sugerido" value={fmtCOP(item.canonLey820.canonSugeridoCop)} mono />
              <Meta label="Tope legal" value={fmtCOP(item.canonLey820.topeLegalCop)} mono />
              {item.canonLey820.capped && (
                <div className="mb-2">
                  <Pill tone="warn">Tope aplicado</Pill>
                </div>
              )}
              <p className="text-caption text-fg-muted mt-1">{item.canonLey820.incrementoMaxNote}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Certificate PDF — the back streams it (preview pre-pago, clean post-pago) */}
      <Card className="p-5">
        <MonoLabel className="block mb-3">
          certificado (PDF)
        </MonoLabel>
        <CertificatePdfViewer id={id} />
      </Card>

    </div>
  )
}
