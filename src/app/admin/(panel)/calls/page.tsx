'use client'

import { PhoneCall, Waveform } from '@phosphor-icons/react'
import { adminApi, traerTodasLasPaginas } from '@/lib/admin/api'
import type { Paginated } from '@/lib/admin/types'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime, fmtDuration } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { CajonDeLaFicha, useFichaEnLaUrl } from '@/components/admin/screen/CajonDeLaFicha'
import { DetalleDeLaLlamada } from './DetalleDeLaLlamada'
import { BarraDeFiltros, Buscador, Desplegable, Filtro, SelectorDeInmobiliaria } from '@/components/admin/screen/Filtros'
import { RESULTADOS_DE_LLAMADA, resultadoDeLaLlamada, tonoDelResultado } from '@/lib/admin/textos-del-admin'

const PAGE_SIZE = 50

interface CallRow {
  id: string
  initiated_at: string | null
  duration_seconds: number | null
  outcome: string | null
  qa_score: string | null
  recording_url: string | null
  tenant_id: string | null
  debtor_name: string | null
  legal_name: string | null
}

/** /calls — cross-tenant call log (FRONT.md §6.6 · BACK.md §8.4). */
export default function CallsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  // Ronda 26 (revisora r25): la llamada se oye en un cajón sin perder la lista (antes otra página).
  const { ver, abrir } = useFichaEnLaUrl()
  const tenant = get('tenant')
  const outcome = get('outcome')
  const q = get('q')

  const calls = useApiQuery<Paginated<CallRow>>(
    (signal) => adminApi('/calls', { query: { tenant, outcome, q, page }, signal }),
    [tenant, outcome, q, page],
  )

  const abierta = ver ? calls.data?.data.find((r) => r.id === ver) ?? null : null

  const columns: Column<CallRow>[] = [
    { header: 'Deudor', texto: (r) => r.debtor_name, cell: (r) => <span className="font-medium text-fg">{r.debtor_name ?? '—'}</span> },
    { header: 'Inmobiliaria', texto: (r) => r.legal_name, cell: (r) => <span className="text-fg-muted">{r.legal_name ?? '—'}</span> },
    {
      header: 'Cuándo',
      align: 'right',
      texto: (r) => fmtDateTime(r.initiated_at),
      cell: (r) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.initiated_at)}</span>,
    },
    {
      header: 'Duración',
      align: 'right',
      texto: (r) => fmtDuration(r.duration_seconds),
      cell: (r) => <span className="font-mono tabular-nums">{fmtDuration(r.duration_seconds)}</span>,
    },
    { header: 'Resultado', texto: (r) => resultadoDeLaLlamada(r.outcome), cell: (r) => <Pill tone={tonoDelResultado(r.outcome)}>{resultadoDeLaLlamada(r.outcome)}</Pill> },
    {
      header: 'Calidad',
      align: 'right',
      texto: (r) => (r.qa_score != null ? Number(r.qa_score) : null),
      cell: (r) => <span className="font-mono tabular-nums">{r.qa_score != null ? Number(r.qa_score).toFixed(0) : '—'}</span>,
    },
    {
      header: 'Grabación',
      align: 'center',
      texto: (r) => Boolean(r.recording_url),
      cell: (r) =>
        r.recording_url ? (
          <Waveform className="mx-auto h-4 w-4 text-fg-muted" weight="fill" aria-label="Tiene grabación" />
        ) : (
          <span className="text-fg-subtle" aria-label="Sin grabación">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Llamadas" description="Las llamadas de los agentes en todas las inmobiliarias; toca una para oírla." />

      <DataTable
        columns={columns}
        rows={calls.data?.data}
        getKey={(r) => r.id}
        isLoading={calls.isLoading}
        error={calls.error}
        onReintentar={calls.refetch}
        emptyTitle={tenant || outcome || q ? 'No hay llamadas con estos filtros' : 'Todavía no hay llamadas'}
        emptyHint={tenant || outcome || q ? 'Prueba con otra inmobiliaria u otro resultado.' : 'Cuando Mori haga la primera, aparece aquí.'}
        emptyIcon={<PhoneCall weight="duotone" />}
        aria-label="Llamadas"
        onRowClick={(r) => abrir(r.id)}
        barra={
          // Los filtros viven en la URL: se comparten y sobreviven a recargar.
          <BarraDeFiltros>
            <Filtro etiqueta="Deudor" htmlFor="filtro-deudor" className="sm:min-w-64 sm:flex-1">
              <Buscador
                id="filtro-deudor"
                value={q}
                onChange={(v) => setFilters({ q: v }, { resetPage: true })}
                placeholder="Buscar por nombre…"
              />
            </Filtro>
            <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
              <SelectorDeInmobiliaria
                id="filtro-inmobiliaria"
                value={tenant}
                onChange={(v) => setFilters({ tenant: v }, { resetPage: true })}
              />
            </Filtro>
            <Filtro etiqueta="Resultado" htmlFor="filtro-resultado">
              <Desplegable
                id="filtro-resultado"
                value={outcome}
                onChange={(v) => setFilters({ outcome: v }, { resetPage: true })}
                todas="Todos los resultados"
                opciones={Object.entries(RESULTADOS_DE_LLAMADA).map(([valor, nombre]) => ({ valor, nombre }))}
              />
            </Filtro>
          </BarraDeFiltros>
        }
        paginacion={calls.data ? { page, total: calls.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['llamada', 'llamadas']}
        filtrosEnLaUrl={['q', 'tenant', 'outcome']}
        exportar="llamadas"
        traerTodoParaElExcel={() => traerTodasLasPaginas<CallRow>('/calls', { tenant, outcome, q })}
      />
      <CajonDeLaFicha
        ver={ver}
        onCerrar={() => abrir(null)}
        titulo={abierta?.debtor_name ?? 'La llamada'}
        descripcion={abierta ? [abierta.legal_name, fmtDateTime(abierta.initiated_at)].filter(Boolean).join(' · ') : undefined}
        enlace={`/admin/calls/${ver}`}
      >
        <DetalleDeLaLlamada key={ver} id={ver} enCajon />
      </CajonDeLaFicha>
    </div>
  )
}
