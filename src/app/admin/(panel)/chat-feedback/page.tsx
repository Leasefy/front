'use client'

/**
 * /admin/chat-feedback — dónde está fallando el chat.
 *
 * Nico, 2026-09-13: «Un pulgar arriba o abajo en cada respuesta… que las
 * preguntas reales alimenten el banco de preguntas.» Esta es la pantalla que
 * hace útil ese pulgar: las últimas valoraciones de TODAS las inmobiliarias, con
 * la pregunta, la respuesta, el comentario, y el porcentaje de pulgares arriba
 * semana a semana.
 *
 * Los datos salen del micro de agentes (schema `agent`), no del micro de admin:
 * `agentAdminApi` con el mismo bearer y la misma lista `ADMIN_EMAILS`.
 *
 * Patrón de pantalla: `/admin/approvals` (PageHeader + facetas + tarjetas),
 * design system del backoffice (`admin.css`), NO el de la app.
 */

import { useState } from 'react'
import { getChatFeedback, type ChatFeedbackRow } from '@/lib/admin/agent-api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { Card, Chip, MonoLabel, Stagger, StaggerItem } from '@leasefy/cadence'
import { ThumbsUp } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

/** La semana en corto: «8 sep». */
function semanaCorta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function FilaFeedback({ row }: { row: ChatFeedbackRow }) {
  const [abierto, setAbierto] = useState(false)
  const arriba = row.veredicto === 'up'

  return (
    <Card className="space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={arriba ? 'ok' : 'bad'}>{arriba ? 'Pulgar arriba' : 'Pulgar abajo'}</Pill>
        {row.cifraMal && <Pill tone="warn">La cifra está mal</Pill>}
        {row.leccionId && <Pill tone="info">Se creó una lección</Pill>}
        <span className="font-medium text-fg">{row.pregunta}</span>
      </div>

      {row.comentario && (
        <p className="text-body-sm leading-snug text-fg-muted">
          <span className="text-fg-subtle">Esperaba: </span>
          {row.comentario}
        </p>
      )}

      <Button type="button" variant="link" size="sm" hideArrow onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        {abierto ? 'Ocultar la respuesta' : 'Ver la respuesta del chat'}
      </Button>
      {abierto && (
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-muted p-3 font-body text-caption leading-snug text-fg-muted" data-lenis-prevent>
          {row.respuesta}
        </pre>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <MonoLabel title={row.agencyId}>Inmobiliaria {row.agencyId.slice(0, 8)}</MonoLabel>
        <MonoLabel>{row.usuario}</MonoLabel>
        {row.herramientas.length > 0 && <MonoLabel>{row.herramientas.join(' · ')}</MonoLabel>}
        <MonoLabel className="tabular-nums">{fmtDateTime(row.createdAt)}</MonoLabel>
      </div>
    </Card>
  )
}

export default function ChatFeedbackPage() {
  const { get, setFilters } = useUrlFilters()
  const veredicto = get('veredicto')
  const agencyId = get('agencia')

  const { data, isLoading, error, refetch } = useApiQuery(
    (signal) =>
      getChatFeedback({
        ...(veredicto === 'up' || veredicto === 'down' ? { veredicto } : {}),
        ...(agencyId ? { agencyId } : {}),
        limit: 100,
        signal,
      }),
    [veredicto, agencyId],
  )

  const filas = data?.filas ?? []
  const semanas = data?.semanas ?? []

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Pulgares del chat"
        description="El pulgar que dejó cada inmobiliaria en cada respuesta. Es lo que dice dónde falla el chat."
      />

      {/* Porcentaje de pulgares arriba por semana. Sin valoraciones esa semana
          no se pinta un 0 % — se dice que no hubo. */}
      <section className="space-y-3" aria-label="Pulgares arriba por semana">
      <MonoLabel className="block">Pulgares arriba por semana</MonoLabel>
      <div className="flex flex-wrap gap-2">
        {semanas.length === 0 && !isLoading ? (
          <span className="text-body-sm text-fg-subtle">Todavía no hay valoraciones.</span>
        ) : (
          semanas.map((s) => (
            <Card className="min-w-[96px] px-4 py-3" key={s.semana}>
              <MonoLabel className="block">
                {semanaCorta(s.semana)}
              </MonoLabel>
              <div className="mt-1 font-mono text-subtitle font-semibold tabular-nums text-fg">
                {s.porcentajeArriba === null ? '—' : `${s.porcentajeArriba} %`}
              </div>
              <div className="font-mono text-caption tabular-nums text-fg-subtle">
                {s.arriba} de {s.total}
              </div>
            </Card>
          ))
        )}
      </div>
      </section>

      {/* Facetas */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar las valoraciones">
        <Chip selected={!veredicto} onClick={() => setFilters({ veredicto: undefined })}>
          Todas
        </Chip>
        <Chip selected={veredicto === 'down'} onClick={() => setFilters({ veredicto: 'down' })}>
          Pulgar abajo
        </Chip>
        <Chip selected={veredicto === 'up'} onClick={() => setFilters({ veredicto: 'up' })}>
          Pulgar arriba
        </Chip>
        {agencyId && (
          <Chip selected removable onRemove={() => setFilters({ agencia: undefined })} onClick={() => setFilters({ agencia: undefined })}>
            Inmobiliaria {agencyId.slice(0, 8)}
          </Chip>
        )}
      </div>

      <MonoLabel className="block">Últimas valoraciones · las más recientes primero</MonoLabel>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} onReintentar={refetch} />
      ) : filas.length === 0 ? (
        <EmptyBlock
          icono={<ThumbsUp weight="bold" />}
          title="Todavía no hay valoraciones"
          hint="Nadie ha marcado todavía una respuesta del chat con el pulgar."
        />
      ) : (
        <Stagger className="space-y-2">
          {filas.map((f) => (
            <StaggerItem key={f.id}>
              <FilaFeedback row={f} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  )
}
