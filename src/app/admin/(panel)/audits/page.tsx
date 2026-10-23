'use client'

import { useState } from 'react'
import { DownloadSimple, ShieldCheck } from '@phosphor-icons/react'
import { Alert } from '@leasefy/cadence'
import { adminApi, adminApiUrl } from '@/lib/admin/api'
import { getSupabase } from '@/lib/supabase/client'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { canal, eventoDeCumplimiento, resumenDeLosDatos } from '@/lib/admin/textos-del-admin'
import { BarraDeFiltros, Desplegable, Filtro, FiltroDeFechas } from '@/components/admin/screen/Filtros'
import { Button } from '@/components/ui/button'
import { CajonDelDetalle } from '@/components/admin/screen/CajonDelDetalle'

const PAGE_SIZE = 100

// ── Types ──────────────────────────────────────────────────────────────────

interface EventRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
  channel: string | null
  details: Record<string, unknown> | null
  evidence_url: string | null
}

interface AuditFacets {
  eventTypes: string[]
  tenants: Array<{ tenant_id: string; legal_name: string | null }>
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /audits — Compliance events table with facet selects + CSV export (FRONT.md §6.8 · BACK.md §8.13). */
/** Los detalles en palabras (sólo lo que tiene nombre; ids y códigos, al cajón y al Excel). */
function resumenDeLosDetalles(detalles: unknown): string {
  // Ronda 28 (revisora r27): sin el canal, que ya tiene su columna («Detalles: Canal: Correo» lo repetía).
  const sinCanal =
    detalles && typeof detalles === 'object' && !Array.isArray(detalles)
      ? Object.fromEntries(Object.entries(detalles as Record<string, unknown>).filter(([k]) => !/^(channel|canal)$/i.test(k)))
      : detalles
  return resumenDeLosDatos(sinCanal) || 'Ábrelo para ver los detalles'
}

export default function AuditsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const type   = get('type')
  const tenant = get('tenant')
  const from   = get('from')
  const to     = get('to')

  const events = useApiQuery<Paginated<EventRow>>(
    (signal) => adminApi('/audits', { query: { type, tenant, from, to, page }, signal }),
    [type, tenant, from, to, page],
  )

  const facets = useApiQuery<AuditFacets>(
    (signal) => adminApi('/audits/facets', { signal }),
    [],
  )

  const [abierto, setAbierto] = useState<EventRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // The export endpoint only accepts Bearer auth in the Authorization header,
  // so a plain <a href> can never authenticate — download via fetch + Blob.
  async function onExport() {
    setExporting(true)
    setExportError(null)
    try {
      const sb = getSupabase()
      const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null
      if (!token) throw new Error('Tu sesión venció: vuelve a entrar.')
      const exportUrl = adminApiUrl('/audits/export.csv', {
        type:   type   || undefined,
        tenant: tenant || undefined,
        from:   from   || undefined,
        to:     to     || undefined,
      })
      const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Error ${res.status} al exportar`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(mensajeDelAdmin(err, { accion: 'exportar la auditoría' }))
    } finally {
      setExporting(false)
    }
  }


  // Ronda 28 (revisora r27, T15): sin deudor en ninguna fila de la página, sin la columna de «—».
  const sinDeudorEnNinguna = Boolean(events.data) && (events.data?.data ?? []).every((r) => !r.debtor_name)

  const todasLasColumnas: Column<EventRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.timestamp)}</span>
      ),
    },
    {
      header: 'Evento',
      cell: (r) => (
        // Ronda 30: sin el código del evento al pasar el mouse (está en el cajón y en el CSV).
        <span className="text-fg">
          {eventoDeCumplimiento(r.event_type)}
        </span>
      ),
    },
    {
      header: 'Inmobiliaria',
      cell: (r) => <span className="block max-w-[180px] truncate text-fg-muted">{r.legal_name ?? '—'}</span>,
    },
    {
      header: 'Deudor',
      cell: (r) => <span className="block max-w-[180px] truncate">{r.debtor_name ?? '—'}</span>,
    },
    {
      header: 'Canal',
      cell: (r) => <span className="text-fg-muted">{r.channel ? canal(r.channel) : '—'}</span>,
    },
    {
      header: 'Detalles',
      // Glow up 22-10: los datos en palabras (los dos primeros, con su nombre), nunca el JSON crudo en la fila;
      // completos en el cajón.
      cell: (r) => (
        <span className="block max-w-[420px] truncate text-caption text-fg-muted">{resumenDeLosDetalles(r.details)}</span>
      ),
    },
  ]

  const columns = sinDeudorEnNinguna ? todasLasColumnas.filter((c) => c.header !== 'Deudor') : todasLasColumnas

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Auditoría"
        description="Los eventos de cumplimiento: Habeas Data, Ley 2300, identidad y límites de los agentes."
      />

      {exportError && <Alert variant="danger">{exportError}</Alert>}

      <DataTable
        columns={columns}
        rows={events.data?.data}
        getKey={(r) => r.id}
        isLoading={events.isLoading}
        error={events.error}
        onReintentar={events.refetch}
        emptyTitle="No hay eventos con estos filtros"
        emptyHint="Prueba con otro tipo, otra inmobiliaria u otras fechas."
        emptyIcon={<ShieldCheck weight="duotone" />}
        aria-label="Eventos de cumplimiento"
        onRowClick={setAbierto}
        filaMarcada={(r) => r.id === abierto?.id}
        paginacion={events.data ? { page, total: events.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['evento', 'eventos']}
        filtrosEnLaUrl={['type', 'tenant', 'from', 'to']}
        acciones={
          <Button variant="outline" size="sm" hideArrow onClick={onExport} disabled={exporting} isLoading={exporting} className="gap-2">
            {exporting ? null : <DownloadSimple className="h-4 w-4" aria-hidden="true" />}
            {exporting ? 'Armando el CSV…' : 'Exportar a CSV (hasta 50.000)'}
          </Button>
        }
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Tipo de evento" htmlFor="filtro-tipo">
              <Desplegable
                id="filtro-tipo"
                value={type}
                onChange={(v) => setFilters({ type: v }, { resetPage: true })}
                todas="Todos los eventos"
                opciones={(facets.data?.eventTypes ?? []).map((t) => ({ valor: t, nombre: eventoDeCumplimiento(t) }))}
              />
            </Filtro>
            <Filtro etiqueta="Inmobiliaria" htmlFor="filtro-inmobiliaria">
              <Desplegable
                id="filtro-inmobiliaria"
                value={tenant}
                onChange={(v) => setFilters({ tenant: v }, { resetPage: true })}
                todas="Todas las inmobiliarias"
                opciones={(facets.data?.tenants ?? []).map((t) => ({ valor: t.tenant_id, nombre: t.legal_name ?? 'Inmobiliaria sin nombre' }))}
              />
            </Filtro>
            <FiltroDeFechas
              desde={from}
              hasta={to}
              onDesde={(v) => setFilters({ from: v }, { resetPage: true })}
              onHasta={(v) => setFilters({ to: v }, { resetPage: true })}
            />
          </BarraDeFiltros>
        }
      />

      <CajonDelDetalle
        abierto={abierto !== null}
        onCerrar={() => setAbierto(null)}
        titulo={abierto ? eventoDeCumplimiento(abierto.event_type) : 'Evento'}
        descripcion={abierto ? fmtDateTime(abierto.timestamp) : undefined}
        campos={
          abierto
            ? [
                { nombre: 'Código', valor: <code className="font-mono">{abierto.event_type}</code> },
                { nombre: 'Inmobiliaria', valor: abierto.legal_name ?? '—' },
                { nombre: 'Deudor', valor: abierto.debtor_name ?? '—' },
                { nombre: 'Canal', valor: abierto.channel ? canal(abierto.channel) : '—' },
                {
                  nombre: 'Evidencia',
                  valor: abierto.evidence_url ? (
                    <a href={abierto.evidence_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      Abrir la evidencia
                    </a>
                  ) : (
                    '—'
                  ),
                },
                { nombre: 'Registro', valor: <code className="font-mono">{abierto.id}</code> },
              ]
            : []
        }
        datos={abierto?.details}
        tituloDeLosDatos="Detalles"
      />
    </div>
  )
}
