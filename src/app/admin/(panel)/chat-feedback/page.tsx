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
 * 20-10-2026 (Nico: «que las tablas tengan paginación, filtros y todo lo que
 * tienen las tablas de la plataforma»): las valoraciones van en `DataTable`
 * (pestañas por veredicto, buscar, ordenar, Excel); la inmobiliaria se filtra
 * en el servidor y se ve con su nombre; la respuesta completa, en un cajón.
 */

import { useMemo, useState } from 'react'
import { ThumbsUp } from '@phosphor-icons/react'
import { Card, MonoLabel } from '@leasefy/cadence'

import { getChatFeedback, type ChatFeedbackRow } from '@/lib/admin/agent-api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { useTenantOptions } from '@/lib/admin/use-tenant-options'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Filtro, SelectorDeInmobiliaria } from '@/components/admin/screen/Filtros'
import { Pill } from '@/components/admin/Pill'
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'

/** El micro entrega como mucho 200 valoraciones por pedido (`admin-ai-hub-chat-feedback.ts`). */
const ULTIMAS = 200

const SEGMENTOS: Segmento<ChatFeedbackRow>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'abajo', nombre: 'Pulgar abajo', cumple: (f) => f.veredicto === 'down' },
  { valor: 'arriba', nombre: 'Pulgar arriba', cumple: (f) => f.veredicto === 'up' },
  { valor: 'cifra', nombre: 'La cifra está mal', cumple: (f) => f.cifraMal },
  { valor: 'leccion', nombre: 'Con lección', cumple: (f) => Boolean(f.leccionId) },
]

/** La semana en corto: «8 sep». */
function semanaCorta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function Veredicto({ fila }: { fila: ChatFeedbackRow }) {
  const arriba = fila.veredicto === 'up'
  return (
    <span className="flex flex-wrap gap-1.5">
      <Pill tone={arriba ? 'ok' : 'bad'}>{arriba ? 'Pulgar arriba' : 'Pulgar abajo'}</Pill>
      {fila.cifraMal ? <Pill tone="warn">La cifra está mal</Pill> : null}
      {fila.leccionId ? <Pill tone="info">Se creó una lección</Pill> : null}
    </span>
  )
}

export default function ChatFeedbackPage() {
  const { get, setFilters } = useUrlFilters()
  const agencyId = get('agencia')
  const [abierta, setAbierta] = useState<ChatFeedbackRow | null>(null)

  const { data, isLoading, error, refetch } = useApiQuery(
    (signal) => getChatFeedback({ ...(agencyId ? { agencyId } : {}), limit: ULTIMAS, signal }),
    [agencyId],
  )
  const inmobiliarias = useTenantOptions()
  const nombres = useMemo(
    () => new Map((inmobiliarias.data ?? []).map((t) => [t.tenant_id, t.legal_name])),
    [inmobiliarias.data],
  )
  const inmobiliaria = (id: string) => nombres.get(id) ?? `Inmobiliaria ${id.slice(0, 8)}`

  const semanas = data?.semanas ?? []

  const columnas: Column<ChatFeedbackRow>[] = [
    {
      header: 'Cuándo',
      cell: (f) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(f.createdAt)}</span>,
      orden: (f) => f.createdAt,
      ordenPrimero: 'desc',
      texto: (f) => fmtDateTime(f.createdAt),
    },
    {
      header: 'Pregunta',
      className: 'min-w-[260px]',
      cell: (f) => <span className="line-clamp-2 text-fg">{f.pregunta}</span>,
      texto: (f) => f.pregunta,
    },
    {
      header: 'Veredicto',
      cell: (f) => <Veredicto fila={f} />,
      orden: (f) => f.veredicto,
      texto: (f) => (f.veredicto === 'up' ? 'Pulgar arriba' : 'Pulgar abajo'),
    },
    {
      header: 'Lo que esperaba',
      className: 'min-w-[200px]',
      cell: (f) =>
        f.comentario ? (
          <span className="line-clamp-2 text-body-sm text-fg-muted">{f.comentario}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
      texto: (f) => f.comentario ?? '',
    },
    {
      header: 'Inmobiliaria',
      cell: (f) => <span title={f.agencyId}>{inmobiliaria(f.agencyId)}</span>,
      orden: (f) => inmobiliaria(f.agencyId),
      texto: (f) => inmobiliaria(f.agencyId),
    },
    {
      header: 'Quién',
      cell: (f) => <span className="text-caption text-fg-muted">{f.usuario}</span>,
      texto: (f) => f.usuario,
    },
  ]

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
                <MonoLabel className="block">{semanaCorta(s.semana)}</MonoLabel>
                <div className="mt-1 font-mono text-subtitle tabular-nums text-fg">
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

      <DataTable
        columns={columnas}
        rows={data?.filas}
        getKey={(f) => f.id}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="Todavía no hay valoraciones"
        emptyHint={agencyId ? 'Esta inmobiliaria todavía no ha marcado ninguna respuesta.' : 'Nadie ha marcado todavía una respuesta del chat con el pulgar.'}
        emptyIcon={<ThumbsUp weight="bold" />}
        aria-label="Valoraciones del chat"
        onRowClick={setAbierta}
        filaMarcada={(f) => f.id === abierta?.id}
        queSon={['valoración', 'valoraciones']}
        buscar="Buscar en la pregunta o el comentario"
        segmentos={SEGMENTOS}
        ordenInicial={{ columna: 0, sentido: 'desc' }}
        filtrosEnLaUrl={['agencia']}
        barra={
          <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
            <SelectorDeInmobiliaria
              id="filtro-inmobiliaria"
              value={agencyId ?? ''}
              onChange={(v) => setFilters({ agencia: v || undefined })}
            />
          </Filtro>
        }
        exportar="pulgares-del-chat"
        masEnElExcel={[
          { header: 'Respuesta del chat', texto: (f) => f.respuesta },
          { header: 'Herramientas', texto: (f) => f.herramientas.join(' · ') },
        ]}
      />
      {data?.filas.length ? (
        <p className="text-caption text-fg-subtle">
          Se ven las últimas {ULTIMAS} valoraciones{agencyId ? ' de esta inmobiliaria' : ''}, las más recientes primero.
        </p>
      ) : null}

      <Cajon abierto={abierta !== null} onOpenChange={(a) => (a ? null : setAbierta(null))} data-testid="detalle-del-pulgar">
        <CajonCabecera
          titulo={abierta?.pregunta ?? 'Valoración'}
          descripcion={abierta ? `${inmobiliaria(abierta.agencyId)} · ${abierta.usuario} · ${fmtDateTime(abierta.createdAt)}` : undefined}
        />
        <CajonCuerpo>
          {abierta ? (
            <div className="space-y-4">
              <Veredicto fila={abierta} />
              {abierta.comentario ? (
                <div className="space-y-1">
                  <MonoLabel className="block">Lo que esperaba</MonoLabel>
                  <p className="text-body-sm leading-snug text-fg">{abierta.comentario}</p>
                </div>
              ) : null}
              <div className="space-y-1">
                <MonoLabel className="block">La respuesta del chat</MonoLabel>
                <pre
                  className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-muted p-3 font-body text-caption leading-snug text-fg-muted"
                  data-lenis-prevent
                >
                  {abierta.respuesta}
                </pre>
              </div>
              {abierta.herramientas.length > 0 ? (
                <div className="space-y-1">
                  <MonoLabel className="block">Herramientas que usó</MonoLabel>
                  <p className="text-body-sm text-fg-muted">{abierta.herramientas.join(' · ')}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CajonCuerpo>
      </Cajon>
    </div>
  )
}
