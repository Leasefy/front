'use client'

import Link from 'next/link'
import { Card, MonoLabel, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { urgencia } from '@/lib/admin/textos-del-admin'
import { CajonDeLaFicha, useFichaEnLaUrl } from '@/components/admin/screen/CajonDeLaFicha'
import { DetalleDeLaEscalacion } from './DetalleDeLaEscalacion'
import { Buscador } from '@/components/admin/screen/Filtros'

// Board rows are a slim projection (LIMIT 200, bare array — no pagination
// envelope). Full detail (assignee, resolution, call) lives in /escalations/:id.
interface EscalationRow {
  id: string
  tenant_id: string
  debtor_id: string | null
  status: string
  urgency: string
  created_at: string
  debtor_name: string | null
  legal_name: string | null
}

function EscalationCard({ row, onAbrir }: { row: EscalationRow; onAbrir: (id: string) => void }) {
  const u = urgencia(row.urgency)
  return (
    // El enlace queda (abrir en otra pestaña); el clic normal abre el cajón sin dejar el tablero.
    <Link
      href={`/admin/escalations/${row.id}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        onAbrir(row.id)
      }}
      className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card interactive className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <Pill tone={u.tono} dot>
            {u.nombre}
          </Pill>
          <MonoLabel className="whitespace-nowrap tabular-nums">{fmtDateTime(row.created_at)}</MonoLabel>
        </div>
        <div className="text-body-sm font-medium leading-snug text-fg">{row.debtor_name ?? 'Deudor sin nombre'}</div>
        <div className="truncate text-caption text-fg-muted">{row.legal_name ?? 'Sin inmobiliaria'}</div>
      </Card>
    </Link>
  )
}

function Columna({
  title,
  sub,
  rows,
  vacio,
  apagada = false,
  onAbrir,
}: {
  title: string
  sub: string
  rows: EscalationRow[]
  vacio: string
  apagada?: boolean
  onAbrir: (id: string) => void
}) {
  return (
    <Card variant="muted" className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <div>
          <h2 className="text-body font-medium text-fg">{title}</h2>
          <p className="text-caption text-fg-subtle">{sub}</p>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface px-2 font-mono text-caption tabular-nums text-fg">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-body-sm text-fg-muted">{vacio}</p>
      ) : (
        <Stagger className={`space-y-2 ${apagada ? 'opacity-75' : ''}`}>
          {rows.map((r) => (
            <StaggerItem key={r.id}>
              <EscalationCard row={r} onAbrir={onAbrir} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Card>
  )
}

const ESTADO: Record<string, { nombre: string; tono: 'bad' | 'info' | 'muted' }> = {
  open: { nombre: 'Abierta', tono: 'bad' },
  assigned: { nombre: 'En curso', tono: 'info' },
  resolved: { nombre: 'Resuelta', tono: 'muted' },
}
const RANGO_DE_URGENCIA: Record<string, number> = { live: 0, high: 1, medium: 2, low: 3 }

/**
 * /admin/escalations — los casos que un agente le pasó a una persona (FRONT.md
 * §6.13 · BACK.md §8.11). 20-10-2026: tabla de la plataforma por defecto
 * (buscar, pestañas, orden, Excel) y el tablero de 3 columnas como otra vista.
 */
export default function EscalationsPage() {
  const { get, setFilters } = useUrlFilters()
  // Ronda 26 (revisora r25): tomarla o resolverla en un cajón sobre la lista (antes otra página). `ver` ya
  // es la vista (tabla/tablero): el caso abierto va en `caso`.
  const { ver: caso, abrir } = useFichaEnLaUrl('caso')
  const vista = get('ver') === 'tablero' ? 'tablero' : 'tabla'
  const { data, isLoading, error, refetch } = useApiQuery<EscalationRow[]>(
    (signal) => adminApi('/escalations', { signal }),
    [],
  )

  const rows = data ?? []
  const abierta = caso ? rows.find((r) => r.id === caso) ?? null : null
  const open = rows.filter((r) => r.status === 'open')
  const assigned = rows.filter((r) => r.status === 'assigned')
  const resolved = rows.filter((r) => r.status === 'resolved')
  const busquedaDelTablero = (get('q') ?? '').trim().toLowerCase()
  const enLaBusqueda = (r: (typeof rows)[number]) =>
    !busquedaDelTablero || `${r.debtor_name ?? ''} ${r.legal_name ?? ''}`.toLowerCase().includes(busquedaDelTablero)

  const columnas: Column<EscalationRow>[] = [
    {
      header: 'Urgencia',
      orden: (r) => RANGO_DE_URGENCIA[r.urgency] ?? 9,
      texto: (r) => urgencia(r.urgency).nombre,
      cell: (r) => {
        const u = urgencia(r.urgency)
        return (
          <Pill tone={u.tono} dot>
            {u.nombre}
          </Pill>
        )
      },
    },
    {
      header: 'Deudor',
      orden: (r) => r.debtor_name,
      texto: (r) => r.debtor_name ?? 'Deudor sin nombre',
      cell: (r) => <span className="font-medium text-fg">{r.debtor_name ?? 'Deudor sin nombre'}</span>,
    },
    {
      header: 'Inmobiliaria',
      orden: (r) => r.legal_name,
      texto: (r) => r.legal_name ?? 'Sin inmobiliaria',
      cell: (r) => <span className="text-fg-muted">{r.legal_name ?? 'Sin inmobiliaria'}</span>,
    },
    {
      header: 'Estado',
      orden: (r) => r.status,
      texto: (r) => (ESTADO[r.status] ?? { nombre: r.status }).nombre,
      cell: (r) => {
        const e = ESTADO[r.status] ?? { nombre: r.status, tono: 'muted' as const }
        return <Pill tone={e.tono}>{e.nombre}</Pill>
      },
    },
    {
      header: 'Desde',
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.created_at),
      cell: (r) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(r.created_at)}</span>,
    },
  ]

  const cambiarVista = (
    <SegmentedControl<'tabla' | 'tablero'>
      size="sm"
      aria-label="Cómo verlas"
      value={vista}
      onChange={(v) => setFilters({ ver: v === 'tablero' ? 'tablero' : undefined })}
      options={[
        { value: 'tabla', label: 'Tabla' },
        { value: 'tablero', label: 'Tablero' },
      ]}
    />
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Escalaciones"
        description="Los casos que un agente le pasó a una persona. Toca uno para tomarlo o resolverlo."
        // Ronda 30 (revisora r27): sin escalaciones, el selector «Tabla | Tablero» no tiene nada que cambiar.
        acciones={data && data.length > 0 ? cambiarVista : undefined}
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántas esperan a alguien) en una cifra con la barra abiertas · en curso ·
          resueltas; antes, 3 cajas del mismo peso. */}
      {data && open.length + assigned.length === 0 ? (
        // Ronda 26 (T6): con todo en cero, UNA línea (antes un «0» de 40 px con la barra verde de otra cosa).
        <p className="rounded-lg border border-border bg-surface px-5 py-4 text-body-sm text-fg-muted" data-testid="escalaciones-esperan">
          Nadie espera a una persona.
          {resolved.length > 0 ? ` ${resolved.length.toLocaleString('es-CO')} ${resolved.length === 1 ? 'se resolvió' : 'se resolvieron'} en los últimos 7 días.` : ''}
        </p>
      ) : data ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Esperan a una persona"
            cifra={(open.length + assigned.length).toLocaleString('es-CO')}
            contexto={open.length > 0 ? `${open.length.toLocaleString('es-CO')} sin nadie asignado` : 'todas tienen a alguien'}
            tramos={[
              { clave: 'abiertas', etiqueta: 'Abiertas, sin nadie', monto: open.length, tono: 'critico', cifra: open.length.toLocaleString('es-CO'), siempre: true },
              { clave: 'en-curso', etiqueta: 'En curso', monto: assigned.length, tono: 'aviso', cifra: assigned.length.toLocaleString('es-CO'), siempre: true },
              { clave: 'resueltas', etiqueta: 'Resueltas en 7 días', monto: resolved.length, tono: 'exito', cifra: resolved.length.toLocaleString('es-CO'), siempre: true },
            ]}
            data-testid="escalaciones-esperan"
          />
        </div>
      ) : null}

      {vista === 'tabla' ? (
        <DataTable
          columns={columnas}
          rows={data}
          getKey={(r) => r.id}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle={data && data.length > 0 ? 'Nada por atender' : 'No hay escalaciones'}
          // Revisora r27 (T9): nada por atender es una buena noticia: la esfera verde, no la azul.
          emptyTono={data && data.length > 0 ? 'exito' : undefined}
          // Ronda 30 (revisora r27: el cero dicho cuatro veces): con historia, el vacío dice dónde está lo resuelto.
          emptyHint={
            data && data.length > 0
              ? 'Lo resuelto en los últimos 7 días está en «Resueltas».'
              : 'Cuando un agente le pase un caso a una persona, aparece aquí.'
          }
          aria-label="Escalaciones"
          onRowClick={(r) => abrir(r.id)}
          queSon={['escalación', 'escalaciones']}
          buscar="Deudor o inmobiliaria"
          segmentos={[
            { valor: 'pendientes', nombre: 'Por atender', cumple: (r) => r.status !== 'resolved' },
            { valor: 'open', nombre: 'Abiertas', cumple: (r) => r.status === 'open' },
            { valor: 'assigned', nombre: 'En curso', cumple: (r) => r.status === 'assigned' },
            { valor: 'resolved', nombre: 'Resueltas', cumple: (r) => r.status === 'resolved' },
            { valor: 'todas', nombre: 'Todas', cumple: () => true },
          ]}
          ordenInicial={{ columna: 0, sentido: 'asc' }}
          exportar="escalaciones"
        />
      ) : isLoading ? (
        <LoadingBlock filas={6} />
      ) : error ? (
        <ErrorBlock error={error} onReintentar={refetch} titulo="No pudimos cargar las escalaciones" />
      ) : (
        // Ronda 30 (mandato: con buscador): el tablero busca por deudor o inmobiliaria en sus tres columnas (la
        // búsqueda vive en la URL, la misma de la tabla).
        <div className="space-y-4">
          <div className="sm:max-w-sm">
            <Buscador
              id="buscar-en-el-tablero"
              value={get('q')}
              onChange={(v) => setFilters({ q: v || undefined })}
              placeholder="Deudor o inmobiliaria"
              aria-label="Buscar en el tablero por deudor o inmobiliaria"
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            <Columna title="Abiertas" sub="Sin nadie asignado" rows={open.filter(enLaBusqueda)} vacio={get('q') ? 'Nada con esa búsqueda.' : 'Nada abierto.'} onAbrir={abrir} />
            <Columna title="En curso" sub="Alguien las tiene" rows={assigned.filter(enLaBusqueda)} vacio={get('q') ? 'Nada con esa búsqueda.' : 'Nadie está atendiendo una ahora.'} onAbrir={abrir} />
            <Columna title="Resueltas" sub="Últimos 7 días" rows={resolved.filter(enLaBusqueda)} vacio={get('q') ? 'Nada con esa búsqueda.' : 'Ninguna resuelta esta semana.'} apagada onAbrir={abrir} />
          </div>
        </div>
      )}
      <CajonDeLaFicha
        ver={caso}
        onCerrar={() => abrir(null)}
        titulo={abierta?.debtor_name ?? 'La escalación'}
        descripcion={abierta?.legal_name ?? undefined}
        enlace={`/admin/escalations/${caso}`}
      >
        <DetalleDeLaEscalacion key={caso} id={caso} enCajon alCambiar={refetch} />
      </CajonDeLaFicha>
    </div>
  )
}
