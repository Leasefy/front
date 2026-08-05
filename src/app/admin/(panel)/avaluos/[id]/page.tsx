'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ApiError } from '@/lib/admin/api'
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

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{label}</div>
      <div className={`text-sm text-fg mt-0.5 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  )
}

function AdjustmentsList({ adjustments }: { adjustments: Adjustment[] }) {
  if (adjustments.length === 0) return <div className="text-xs text-fg-muted">Sin ajustes.</div>
  return (
    <div className="space-y-1">
      {adjustments.map((a, i) => (
        <div key={`${a.factor}-${i}`} className="flex items-baseline justify-between text-xs">
          <span className="text-fg-muted">{a.factor}</span>
          <span
            className={
              'font-mono tabular-nums ' +
              (a.pctBps > 0 ? 'text-ok' : a.pctBps < 0 ? 'text-bad' : 'text-fg-muted')
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
  approve: '✓ Firmar certificado',
  reject: '✗ Rechazar avalúo',
}

const MODE_ACTIVE_CLASS: Record<Mode, string> = {
  approve: 'bg-ok text-white border-ok',
  reject: 'bg-bad text-white border-bad',
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
  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>

  // The detail fetch is the source of truth for the record existing.
  if (detail.error) return <div className="p-6 lg:p-8"><ErrorBlock error={detail.error} /></div>

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
        setSubmitError('Este avalúo ya fue revisado por otro admin. Actualizando…')
        queue.refetch()
      } else if (err instanceof ApiError && err.status === 422) {
        // The only 422 on signoff is an invalid signature image payload.
        setSubmitError('La firma dibujada no es válida. Limpiala y volvé a dibujarla.')
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Error de red')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const band = d?.band

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/avaluos"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
        >
          ← Cola
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">
          {pending ? 'Revisar y firmar.' : done === 'rechazado' ? 'Avalúo rechazado.' : 'Avalúo resuelto.'}
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          <span className="font-mono">{item?.slug ?? id}</span>
          {item?.method ? ` · ${item.method}` : ''}
        </p>
      </div>

      {/* Resolved / not-pending banner */}
      {!pending && (
        <div
          className={
            'card p-4 border-l-4 ' + (done === 'rechazado' ? 'border-l-bad' : 'border-l-ok')
          }
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">estado</div>
          <div className="text-sm text-fg mt-1">
            {done ? (
              <Pill tone={done === 'rechazado' ? 'bad' : 'ok'}>{done}</Pill>
            ) : (
              'Este avalúo ya no está en la cola de firma (fue resuelto o no está en revisión).'
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposed valuation (from pending-review item) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
              propuesta de valor del modelo
            </div>

            {item ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-bg-border">
                  <Meta label="valor estimado" value={fmtCOP(item.valueCop)} mono />
                  <Meta
                    label="banda"
                    value={
                      item.bandLowCop != null || item.bandHighCop != null
                        ? `${fmtCOP(item.bandLowCop)} – ${fmtCOP(item.bandHighCop)}`
                        : '—'
                    }
                    mono
                  />
                  <Meta label="método" value={item.method || '—'} />
                  <Meta
                    label="confianza"
                    value={
                      item.confianza
                        ? `${item.confianza.nivel} · ancho ${fmtBps(item.confianza.anchoRelativoBps)}`
                        : '—'
                    }
                  />
                </div>

                {item.narrativaEs && (
                  <div className="mb-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-1">
                      narrativa
                    </div>
                    <p className="text-sm text-fg-muted leading-relaxed">{item.narrativaEs}</p>
                  </div>
                )}

                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-2">
                  ajustes aplicados
                </div>
                <AdjustmentsList adjustments={item.adjustments} />
              </>
            ) : (
              <p className="text-sm text-fg-muted">
                La propuesta de valor sólo está disponible mientras el avalúo está en revisión.
              </p>
            )}
          </div>

          {/* Detail: comparables */}
          <div className="card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
              comparables · {d?.comparables?.length ?? 0}
            </div>
            {(d?.comparables ?? []).length === 0 ? (
              <div className="text-xs text-fg-muted">Sin comparables.</div>
            ) : (
              <div className="space-y-3">
                {d!.comparables.map((c) => (
                  <div key={c.id} className="pb-3 border-b border-bg-border last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-fg">{c.observedType}</span>
                      <span className="font-mono tabular-nums text-sm text-fg">
                        {fmtCOP(c.observedValue)}
                      </span>
                    </div>
                    <AdjustmentsList adjustments={c.adjustments} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo descriptions — editable while in review (Ley-1673 fenced) */}
          {pending && (d?.photos?.length ?? 0) > 0 && (
            <div className="card p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-1">
                descripciones de fotos · {d?.photos.length}
              </div>
              <p className="text-xs text-fg-muted mb-4">
                Corregí la prosa de anexo antes de firmar. Se congela al firmar.
              </p>
              <PhotoDescriptionsEditor id={id} photos={d!.photos} />
            </div>
          )}
        </div>

        {/* Sidebar: band coverage + sufficiency + Ley 820 */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
              banda y suficiencia
            </div>
            {band ? (
              <>
                <Meta label="banda" value={`${fmtCOP(band.lowCop)} – ${fmtCOP(band.highCop)}`} mono />
                <Meta label="cobertura" value={fmtBps(band.coverageBps)} mono />
              </>
            ) : (
              <div className="mb-2">
                <Pill tone="bad">valuación rechazada (REFUSED)</Pill>
              </div>
            )}
            {d?.sufficiency && (
              <>
                <Meta label="suficiencia" value={d.sufficiency.status} />
                <Meta label="score" value={fmtBps(d.sufficiency.scoreBps)} mono />
                <Meta label="comps usados" value={String(d.sufficiency.compCount)} mono />
              </>
            )}
          </div>

          {item?.canonLey820 && (
            <div className={'card p-5 ' + (item.canonLey820.capped ? 'border-l-4 border-l-warn' : '')}>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
                canon Ley 820
              </div>
              <Meta label="canon sugerido" value={fmtCOP(item.canonLey820.canonSugeridoCop)} mono />
              <Meta label="tope legal" value={fmtCOP(item.canonLey820.topeLegalCop)} mono />
              {item.canonLey820.capped && (
                <div className="mb-2">
                  <Pill tone="warn">tope aplicado</Pill>
                </div>
              )}
              <p className="text-xs text-fg-muted mt-1">{item.canonLey820.incrementoMaxNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Certificate PDF — the back streams it (preview pre-pago, clean post-pago) */}
      <div className="card p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          certificado (PDF)
        </div>
        <CertificatePdfViewer id={id} />
      </div>

      {/* Action — only while pending */}
      {pending && (
        <div className="card p-5 border-t-4 border-t-brand">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">acción</div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {(['approve', 'reject'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={'btn ' + (mode === m ? MODE_ACTIVE_CLASS[m] : '')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {mode && (
            <>
              {mode === 'approve' && (
                <div className="mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                    firma (opcional · Ley 527 — firma electrónica)
                  </span>
                  <div className="mt-2">
                    <SignatureCanvas onChange={setSignatureImage} disabled={submitting} />
                  </div>
                </div>
              )}

              {mode === 'reject' && (
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                    motivo del rechazo (obligatorio · queda en audit trail) · {reason.length} / 2000
                  </span>
                  <textarea
                    className="textarea mt-2 min-h-[100px]"
                    placeholder="Explicá por qué se rechaza el avalúo"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}

              {reasonTooLong && (
                <p className="text-sm text-bad mt-1">El motivo no puede superar 2 000 caracteres.</p>
              )}
              {rejectNeedsReason && (
                <p className="text-sm text-warn mt-1">Indicá el motivo del rechazo antes de confirmar.</p>
              )}

              {submitError && (
                <div className="card p-3 border-bad/40 mt-3">
                  <p className="text-sm text-bad">{submitError}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={onSubmit} disabled={!canSubmit} className="btn btn-primary">
                  {submitting ? 'Guardando…' : mode === 'approve' ? 'Firmar' : 'Rechazar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(null)
                    setReason('')
                    setSignatureImage(null)
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
