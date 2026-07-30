'use client'

import { useRouter } from 'next/navigation'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import {
  fetchPendingReview,
  CONFIANZA_TONE,
  type PendingReviewItem,
} from '@/lib/admin/avaluos'

// Left-border urgency by confidence: low confidence needs the most eyes.
function confianzaBorder(item: PendingReviewItem): string {
  switch (item.confianza?.nivel) {
    case 'baja':
      return 'border-l-bad'
    case 'media':
      return 'border-l-warn'
    default:
      return 'border-l-brand'
  }
}

function AvaluoCard({ item }: { item: PendingReviewItem }) {
  const router = useRouter()
  const band =
    item.bandLowCop != null || item.bandHighCop != null
      ? `${fmtCOP(item.bandLowCop)} – ${fmtCOP(item.bandHighCop)}`
      : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/avaluos/${item.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/avaluos/${item.id}`)}
      className={`card border-l-4 ${confianzaBorder(item)} p-4 flex items-start gap-4 hover:bg-bg-hover transition-colors cursor-pointer`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          {item.confianza && (
            <Pill tone={CONFIANZA_TONE[item.confianza.nivel]}>
              confianza {item.confianza.nivel}
            </Pill>
          )}
          <span className="font-medium text-fg tabular-nums">{fmtCOP(item.valueCop)}</span>
          {band && <span className="text-fg-subtle text-xs font-mono">{band}</span>}
          {item.canonLey820?.capped && (
            <Pill tone="warn">Ley 820 · tope aplicado</Pill>
          )}
        </div>
        {item.narrativaEs && (
          <div className="text-sm text-fg-muted leading-snug mb-2 line-clamp-2">
            {item.narrativaEs}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
          <span>{item.method || '—'}</span>
          <span>{item.comps.length} comps</span>
          <span>{item.adjustments.length} ajustes</span>
          <span className="text-fg-dim normal-case tracking-normal">{item.slug}</span>
        </div>
      </div>
      <div className="text-fg-subtle">→</div>
    </div>
  )
}

/**
 * /admin/avaluos — cola de avalúos por firmar.
 *
 * La inmobiliaria solicita el avalúo; el modelo arma la propuesta de valor y la
 * deja en `en_revisión`. Acá Portofino/Leasefy revisa y firma el certificado
 * (o lo rechaza). Fuente: GET /avaluos/pending-review (solo `en_revisión`,
 * 50 más recientes). El endpoint no expone fechas, así que no hay antigüedad.
 */
export default function AvaluosPage() {
  const { data, isLoading, error } = useApiQuery<{ items: PendingReviewItem[] }>(
    (signal) => fetchPendingReview(signal),
    [],
  )

  const items = data?.items ?? []

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="avalúos"
        title="Firma de certificados"
        description="Avalúos con propuesta de valor lista, pendientes de revisión y firma del certificado."
        right={
          <div className="card px-4 py-3 text-center">
            <div className="text-2xl font-semibold text-fg tabular-nums">
              {isLoading ? '—' : items.length}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              por firmar
            </div>
          </div>
        }
      />

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        cola · más recientes primero
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : items.length === 0 ? (
        <EmptyBlock title="Sin avalúos por firmar" hint="La cola está vacía." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <AvaluoCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
