'use client'

import { useRouter } from 'next/navigation'
import { ChartBar, CheckCircle, Gauge as GaugeIcon, ListChecks, PhoneCall, WarningOctagon } from '@phosphor-icons/react'
import { FranjaDeCifras, MonoLabel, Progress } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { legible } from '@/lib/admin/textos-del-admin'

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
        <span className="font-mono font-medium tabular-nums text-danger">{r.qa_score ? Number(r.qa_score).toFixed(0) : '—'}</span>
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
        description="Cómo puntúa el revisor automático cada llamada de los últimos 30 días, qué alertas salen y cuáles hay que escuchar (puntaje menor a 70)."
      />

      <FranjaDeCifras fila="lg" aria-label="Resumen">
        <KpiCard icon={<PhoneCall />} label="Llamadas · 30 días" value={num(stats?.total_calls)} hint="Todas" />
        <KpiCard icon={<ListChecks />} label="Con puntaje" value={num(stats?.scored_calls)} hint="El revisor ya las escuchó" />
        <KpiCard
          icon={<GaugeIcon />}
          label="Puntaje promedio"
          value={`${num(stats?.avg_qa_score).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 100`}
        />
        <KpiCard icon={<CheckCircle />} label="Cumplen" value={num(stats?.compliant_count)} tone="ok" />
        <KpiCard icon={<WarningOctagon />} label="No cumplen" value={num(stats?.non_compliant_count)} tone="bad" />
      </FranjaDeCifras>

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
                      <span className="text-fg" title={f.flag}>
                        {legible(f.flag)}
                      </span>
                      <span className="font-mono tabular-nums text-warning">{n.toLocaleString('es-CO')}</span>
                    </div>
                    <Progress value={(n / maxFlag) * 100} color="warning" size="xs" label={`${f.flag}: ${n}`} />
                  </div>
                )
              })}
            </div>
          )}
        </Tarjeta>
      </div>

      <section className="space-y-3" aria-label="Llamadas para revisar">
        <MonoLabel className="block">Para revisar · puntaje menor a 70 · las 30 más bajas</MonoLabel>
        <DataTable
          columns={lowColumns}
          rows={low}
          getKey={(r) => r.id}
          isLoading={qa.isLoading}
          error={qa.error}
          onReintentar={qa.refetch}
          emptyTitle="Ninguna llamada está por debajo de 70"
          emptyIcon={<ChartBar weight="bold" />}
          aria-label="Llamadas para revisar"
          onRowClick={(r) => router.push(`/admin/calls/${r.id}`)}
          queSon={['llamada', 'llamadas']}
          buscar="Deudor o inmobiliaria"
          filasPorPagina={10}
          ordenInicial={{ columna: 0, sentido: 'asc' }}
          exportar="llamadas-para-revisar"
        />
      </section>
    </div>
  )
}
