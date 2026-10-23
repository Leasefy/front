'use client'

import { useRouter } from 'next/navigation'
import { ChartBar } from '@phosphor-icons/react'
import { Progress } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { LoadingBlock } from '@/components/admin/screen/states'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { fallaDeCalidad } from '@/lib/admin/textos-del-admin'

/* ── Types (match ADMIN-API-CONTRACT.md — QA) ───────────────────────────── */

interface QaStats {
  total_calls: string
  scored_calls: string
  avg_qa_score: string | null
  compliant_count: string
  non_compliant_count: string
}

interface HistogramRow {
  bucket: string // width_bucket(0,100,10) → 1..10
  count: string
}

interface FlagRow {
  flag: string
  count: string
}

interface LowScoreRow {
  id: string
  initiated_at: string
  qa_score: string | null
  debtor_name: string | null
  legal_name: string | null
}

interface QaResponse {
  stats: QaStats | null
  histogram: HistogramRow[]
  topFlags: FlagRow[]
  lowScoreQueue: LowScoreRow[]
}

function num(s: string | null | undefined): number {
  if (s == null) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

/** El color de la barra de un tramo de puntaje. */
function colorDelTramo(desde: number): 'danger' | 'warning' | 'primary' | 'success' {
  if (desde < 50) return 'danger'
  if (desde < 70) return 'warning'
  if (desde < 90) return 'primary'
  return 'success'
}

/** /qa — QA scoring (BACK.md §8.12 · FRONT.md §6.16). 30-day window. */
export default function QaPage() {
  const router = useRouter()

  const qa = useApiQuery<QaResponse>(
    (signal) => adminApi('/qa', { signal }),
    [],
  )

  const stats = qa.data?.stats
  const dist = qa.data?.histogram ?? []
  const flags = qa.data?.topFlags ?? []
  const low = qa.data?.lowScoreQueue ?? []

  const maxBucket = Math.max(1, ...dist.map((d) => num(d.count)))
  const maxFlag = Math.max(1, ...flags.map((f) => num(f.count)))

  const lowColumns: Column<LowScoreRow>[] = [
    {
      header: 'Puntaje',
      align: 'right',
      orden: (r) => (r.qa_score ? Number(r.qa_score) : null),
      texto: (r) => (r.qa_score ? Number(r.qa_score) : null),
      cell: (r) => (
        <span className="font-mono tabular-nums text-danger">{r.qa_score ? Number(r.qa_score).toFixed(0) : '—'}</span>
      ),
    },
    { header: 'Deudor', orden: (r) => r.debtor_name, texto: (r) => r.debtor_name, cell: (r) => <span className="font-medium">{r.debtor_name ?? '—'}</span> },
    { header: 'Inmobiliaria', orden: (r) => r.legal_name, texto: (r) => r.legal_name, cell: (r) => <span className="block truncate text-fg-muted">{r.legal_name ?? '—'}</span> },
    {
      header: 'Cuándo',
      align: 'right',
      orden: (r) => r.initiated_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.initiated_at),
      cell: (r) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.initiated_at)}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Calidad de llamadas"
        description="Cómo puntúa el revisor automático las llamadas de los últimos 30 días y cuáles hay que escuchar."
      />

      {/* Glow up 22-10: LA RESPUESTA (el puntaje promedio y cuántas cumplen) en una cifra; después el trabajo
          —las llamadas para escuchar—; los repartos, plegados. Antes, 5 tarjetas del mismo peso y las gráficas
          antes de la lista. */}
      {qa.isLoading && !qa.data ? (
        <LoadingBlock label="Cargando la calidad de las llamadas" filas={3} />
      ) : stats && num(stats.scored_calls) === 0 ? (
        // Ronda 26 (revisora, bloqueante): sin llamadas calificadas no hay promedio; antes «0,0 / 100» inventado.
        <p className="rounded-lg border border-border bg-surface px-5 py-4 text-body-sm text-fg-muted" data-testid="qa-promedio">
          Sin llamadas calificadas en los últimos 30 días.
        </p>
      ) : stats ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Puntaje promedio · 30 días"
            cifra={`${num(stats.avg_qa_score).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 100`}
            contexto={`en ${num(stats.scored_calls).toLocaleString('es-CO')} ${num(stats.scored_calls) === 1 ? 'llamada' : 'llamadas'} con puntaje, de ${num(stats.total_calls).toLocaleString('es-CO')}`}
            tramos={[
              { clave: 'cumplen', etiqueta: 'Cumplen', monto: num(stats.compliant_count), tono: 'exito', cifra: num(stats.compliant_count).toLocaleString('es-CO'), siempre: true },
              { clave: 'no-cumplen', etiqueta: 'No cumplen', monto: num(stats.non_compliant_count), tono: 'critico', cifra: num(stats.non_compliant_count).toLocaleString('es-CO'), siempre: true },
            ]}
            data-testid="qa-promedio"
          />
        </div>
      ) : null}

      <section className="space-y-3" aria-label="Llamadas para revisar">
        <div>
          <h2 className="text-subtitle font-medium text-fg">Para escuchar</h2>
          <p className="text-body-sm text-fg-muted">Las 30 llamadas con puntaje más bajo (menor a 70). Toca una para abrirla.</p>
        </div>
        <DataTable
          columns={lowColumns}
          rows={low}
          getKey={(r) => r.id}
          isLoading={qa.isLoading}
          error={qa.error}
          onReintentar={qa.refetch}
          emptyTitle={stats && num(stats.scored_calls) === 0 ? 'Todavía no hay llamadas calificadas' : 'Ninguna llamada está por debajo de 70'}
          emptyTono="exito"
          emptyIcon={<ChartBar weight="duotone" />}
          aria-label="Llamadas para revisar"
          onRowClick={(r) => router.push(`/admin/calls/${r.id}`)}
          queSon={['llamada', 'llamadas']}
          buscar="Deudor o inmobiliaria"
          filasPorPagina={10}
          ordenInicial={{ columna: 0, sentido: 'asc' }}
          exportar="llamadas-para-revisar"
        />
      </section>

      <MasDetalles etiqueta="Ver cómo se reparten los puntajes y las alertas" etiquetaAbierto="Ocultar los repartos">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Cómo se reparten los puntajes" descripcion="De 0 a 100, en tramos de 10.">
          {dist.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Todavía no hay llamadas con puntaje.</p>
          ) : (
            <div className="space-y-2.5">
              {/* Los 10 tramos (1 a 10, como width_bucket) */}
              {Array.from({ length: 10 }, (_, i) => {
                const bkt = i + 1
                const from = i * 10
                const to = (i + 1) * 10
                const row = dist.find((d) => Number(d.bucket) === bkt)
                const n = row ? num(row.count) : 0
                return (
                  <div key={bkt} className="space-y-1">
                    <div className="flex items-baseline justify-between text-caption">
                      <span className="font-mono text-fg-muted">
                        {from}–{to}
                      </span>
                      <span className="font-mono tabular-nums text-fg">{n.toLocaleString('es-CO')}</span>
                    </div>
                    <Progress value={(n / maxBucket) * 100} color={colorDelTramo(from)} size="sm" label={`${from} a ${to}: ${n}`} />
                  </div>
                )
              })}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Alertas de cumplimiento" descripcion="Las más frecuentes de los últimos 30 días.">
          {flags.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Sin alertas. Bien.</p>
          ) : (
            <div className="space-y-2.5">
              {flags.map((f) => {
                const n = num(f.count)
                return (
                  <div key={f.flag} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-caption">
                      <span className="text-fg">
                        {fallaDeCalidad(f.flag)}
                      </span>
                      <span className="font-mono tabular-nums text-warning">{n.toLocaleString('es-CO')}</span>
                    </div>
                    <Progress value={(n / maxFlag) * 100} color="warning" size="xs" label={`${fallaDeCalidad(f.flag)}: ${n}`} />
                  </div>
                )
              })}
            </div>
          )}
        </Tarjeta>
      </div>
      </MasDetalles>

    </div>
  )
}
