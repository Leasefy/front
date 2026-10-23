'use client'

import { BellSlash } from '@phosphor-icons/react'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { adminApi, traerTodasLasPaginas } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import type { Paginated } from '@/lib/admin/types'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { BarraDeFiltros, Buscador, Filtro } from '@/components/admin/screen/Filtros'
import { comoSeDetecto } from '@/lib/admin/textos-del-admin'

/** El canal de la baja, en palabras (antes «Voice», «Email»). */
const CANAL: Record<string, string> = { voice: 'Llamada', call: 'Llamada', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Correo', push: 'Notificación' }
const canal = (c: string | null | undefined) => (c ? CANAL[c] ?? 'Otro canal' : 'Llamada')

const PAGE_SIZE = 50

// ── Types ──────────────────────────────────────────────────────────────────

interface OptOutStats {
  total: string
  opt_out_invoked: string
  opt_out_request: string
  habeas_data_opt_out: string
}

// Contact PII (document/phone) is deliberately omitted by the back on this
// resource — only names are exposed (ADMIN-API-CONTRACT.md — Opt-outs).
interface OptOutRow {
  id: string
  event_type: string
  timestamp: string
  tenant_id: string
  legal_name: string | null
  debtor_id: string
  debtor_name: string | null
  channel: string | null
  detection: string | null
  matched_phrase: string | null
  call_id: string | null
  opt_out_channels: string[] | null
}

interface OptOutsResponse extends Paginated<OptOutRow> {
  stats: OptOutStats
}

// ── Screen ─────────────────────────────────────────────────────────────────

/** /opt-outs — Habeas Data registry (Ley 1581 + Ley 2300). Read-only. (FRONT.md §6.18 · BACK.md §8.16). */
export default function OptOutsPage() {
  const { get, page, setFilters, setPage } = useUrlFilters()
  const q = get('q')

  const result = useApiQuery<OptOutsResponse>(
    (signal) => adminApi('/opt-outs', { query: { q, page }, signal }),
    [q, page],
  )

  const stats = result.data?.stats

  const columns: Column<OptOutRow>[] = [
    {
      header: 'Cuándo',
      texto: (r) => fmtDateTime(r.timestamp),
      cell: (r) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.timestamp)}</span>,
    },
    { header: 'Deudor', texto: (r) => r.debtor_name, cell: (r) => <span className="block max-w-[200px] truncate font-medium text-fg">{r.debtor_name ?? '—'}</span> },
    { header: 'Inmobiliaria', texto: (r) => r.legal_name, cell: (r) => <span className="block max-w-[160px] truncate text-fg-muted">{r.legal_name ?? '—'}</span> },
    { header: 'Canal', texto: (r) => canal(r.channel), cell: (r) => <Pill tone="neutral">{canal(r.channel)}</Pill> },
    { header: 'Cómo se detectó', texto: (r) => (r.detection ? comoSeDetecto(r.detection) : ''), cell: (r) => <span className="text-fg-muted">{r.detection ? comoSeDetecto(r.detection) : '—'}</span> },
    {
      header: 'Lo que dijo',
      texto: (r) => r.matched_phrase,
      cell: (r) => (
        <span className="block max-w-[240px] truncate italic text-fg-muted">{r.matched_phrase ? `«${r.matched_phrase}»` : '—'}</span>
      ),
    },
    {
      header: 'Canales cerrados',
      texto: (r) => (r.opt_out_channels ?? []).map((c) => canal(c)).join(', '),
      cell: (r) => {
        const channels = r.opt_out_channels ?? []
        if (channels.length === 0) return <span className="text-fg-subtle">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {channels.map((c) => (
              <Pill key={c} tone="neutral">
                {canal(c)}
              </Pill>
            ))}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Bajas de contacto"
        description="Los deudores que pidieron no ser contactados: un registro que no se revoca."
        ayuda={
          <ParaEntenderMas etiqueta="Base legal" titulo="Las bajas de contacto" variante="secundario">
            <p className="text-body-sm text-fg-muted">
              Ley 1581 de 2012 (Habeas Data) y Ley 2300 de 2023 (art. 7). La baja no se revoca sin un consentimiento
              explícito y posterior del titular: para revertirla hace falta su autorización por escrito y el visto bueno
              del equipo legal de Leasefy. No se borra nada de aquí sin dejar rastro.
            </p>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántos pidieron la baja) y de dónde vino cada una; antes, 4 tarjetas del
          mismo peso con tonos rojo y ámbar. */}
      {stats && Number(stats.total ?? 0) === 0 ? null : stats ? (
        // Ronda 26 (T6): en cero no se pinta la cifra; lo dice el vacío de la tabla (una sola vez).
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Bajas de contacto"
            cifra={Number(stats.total ?? 0).toLocaleString('es-CO')}
            contexto="desde que existe Leasefy"
            tramos={[
              { clave: 'llamada', etiqueta: 'Lo pidió en la llamada', monto: Number(stats.opt_out_invoked ?? 0), tono: 'neutro', cifra: Number(stats.opt_out_invoked ?? 0).toLocaleString('es-CO'), siempre: true },
              { clave: 'solicitud', etiqueta: 'Por solicitud', monto: Number(stats.opt_out_request ?? 0), tono: 'neutro', cifra: Number(stats.opt_out_request ?? 0).toLocaleString('es-CO'), siempre: true },
              { clave: 'habeas', etiqueta: 'Habeas Data', monto: Number(stats.habeas_data_opt_out ?? 0), tono: 'neutro', cifra: Number(stats.habeas_data_opt_out ?? 0).toLocaleString('es-CO'), siempre: true },
            ]}
            data-testid="bajas-total"
          />
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={result.data?.data}
        getKey={(r) => r.id}
        isLoading={result.isLoading}
        error={result.error}
        onReintentar={result.refetch}
        emptyTitle={q ? 'Nadie con ese nombre pidió la baja' : 'Nadie ha pedido la baja todavía'}
        emptyIcon={<BellSlash weight="duotone" />}
        emptyTono={q ? undefined : "exito"}
        aria-label="Bajas de contacto"
        barra={
          <BarraDeFiltros>
            <Filtro etiqueta="Deudor" htmlFor="filtro-deudor" className="sm:min-w-72 sm:flex-1">
              <Buscador
                id="filtro-deudor"
                value={q}
                onChange={(v) => setFilters({ q: v }, { resetPage: true })}
                placeholder="Buscar por nombre…"
              />
            </Filtro>
          </BarraDeFiltros>
        }
        paginacion={result.data ? { page, total: result.data.total, pageSize: PAGE_SIZE, onPage: setPage } : undefined}
        queSon={['baja', 'bajas']}
        filtrosEnLaUrl={['q']}
        exportar="bajas-de-contacto"
        traerTodoParaElExcel={() => traerTodasLasPaginas<OptOutRow>('/opt-outs', { q })}
      />

    </div>
  )
}
