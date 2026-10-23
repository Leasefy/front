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
import { AvaluoRegistros } from './AvaluoRegistros'
import { Card, MonoLabel, Stagger, StaggerItem } from '@leasefy/cadence'
import { SealCheck } from '@phosphor-icons/react'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
import { legible } from '@/lib/admin/textos-del-admin'

// Left-border urgency by confidence: low confidence needs the most eyes.

/**
 * WHOSE avalúo — one identity line above the confidence row so the reviewer sees
 * the owner at a glance. `agencyName != null` ⇒ came through an inmobiliaria (show
 * the agency, then the owner as the underlying client); otherwise it's a
 * particular. Null on both ⇒ anonymous / legacy draft.
 */
function AvaluoIdentity({ item }: { item: PendingReviewItem }) {
  const { ownerName, agencyName } = item

  if (!ownerName && !agencyName) {
    return (
      <div className="mb-1 text-caption text-fg-muted">Sin identificar</div>
    )
  }

  return (
    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
      <MonoLabel>
        {agencyName ? 'inmobiliaria' : 'propietario'}
      </MonoLabel>
      {agencyName && <span className="text-body-sm font-medium text-fg">{agencyName}</span>}
      {agencyName && ownerName && <span className="text-fg-subtle">·</span>}
      {ownerName && (
        <span className={agencyName ? 'text-body-sm text-fg-muted' : 'text-body-sm font-medium text-fg'}>
          {ownerName}
        </span>
      )}
    </div>
  )
}

function AvaluoCard({ item }: { item: PendingReviewItem }) {
  const router = useRouter()
  const band =
    item.bandLowCop != null || item.bandHighCop != null
      ? `${fmtCOP(item.bandLowCop)} – ${fmtCOP(item.bandHighCop)}`
      : null

  return (
    // Glow up 22-10: la tarjeta de Cadence (antes la clase vieja `card` de admin.css), sin flecha decorativa ni
    // códigos (método, slug): el valor en mono y la narrativa en letra de lectura.
    <Card
      interactive
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/avaluos/${item.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/avaluos/${item.id}`)}
      className="cursor-pointer p-4"
    >
      <AvaluoIdentity item={item} />
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-subtitle tabular-nums text-fg">{fmtCOP(item.valueCop)}</span>
        {band && <span className="font-mono text-caption tabular-nums text-fg-muted">{band}</span>}
        {item.confianza && (
          <Pill tone={CONFIANZA_TONE[item.confianza.nivel]}>Confianza {item.confianza.nivel}</Pill>
        )}
        {item.canonLey820?.capped && <Pill tone="warn">Ley 820 · tope aplicado</Pill>}
      </div>
      {item.narrativaEs && (
        <p className="mb-2 line-clamp-2 text-body-sm leading-snug text-fg-muted">{item.narrativaEs}</p>
      )}
      <p className="text-caption text-fg-muted">
        {item.method ? `${legible(item.method)} · ` : ''}
        <span className="font-mono tabular-nums">{item.comps.length}</span> {item.comps.length === 1 ? 'comparable' : 'comparables'} ·{' '}
        <span className="font-mono tabular-nums">{item.adjustments.length}</span> {item.adjustments.length === 1 ? 'ajuste' : 'ajustes'}
      </p>
    </Card>
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
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Avalúos"
        description="Revisa la propuesta de valor de cada avalúo y firma su certificado (o recházalo)."
        junto={
          !isLoading ? (
            <Pill tone={items.length > 0 ? 'warn' : 'neutral'} dot={items.length > 0}>
              {items.length === 1 ? '1 por firmar' : `${items.length} por firmar`}
            </Pill>
          ) : null
        }
      />

      {/* Glow up 22-10: el trabajo (la cola por firmar) y el historial en pestañas; antes, el historial debajo de
          un separador con un título de otra familia. */}
      <PestanasDeLaFicha
        etiqueta="Secciones de los avalúos"
        pestanas={[
          {
            id: 'por-firmar',
            etiqueta: 'Por firmar',
            cuenta: isLoading ? null : items.length,
            contenido: isLoading ? (
              <LoadingBlock label="Cargando los avalúos por firmar" />
            ) : error ? (
              <ErrorBlock error={error} />
            ) : items.length === 0 ? (
              <EmptyBlock
                title="Nada por firmar"
                hint="Cuando el modelo arme una propuesta de valor, aparece aquí. Los más recientes van primero."
                tono="exito"
                icono={<SealCheck weight="duotone" />}
              />
            ) : (
              <Stagger className="space-y-2">
                {items.map((item) => (
                  <StaggerItem key={item.id}>
                    <AvaluoCard item={item} />
                  </StaggerItem>
                ))}
              </Stagger>
            ),
          },
          {
            id: 'historial',
            etiqueta: 'Historial por estado',
            contenido: (
              <div className="space-y-3">
                <p className="text-body-sm text-fg-muted">Todos los certificados de avalúo, por estado: no sólo la cola por firmar.</p>
                <AvaluoRegistros />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
