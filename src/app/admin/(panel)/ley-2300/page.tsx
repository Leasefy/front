'use client'

import { Buildings, PhoneCall, Scales, Users, WarningOctagon } from '@phosphor-icons/react'
import { FranjaDeCifras, MonoLabel } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { legible } from '@/lib/admin/textos-del-admin'


// ─── Types (co-located, per FRONT.md §6.19) ────────────────────────────────

/** Heatmap cell: call volume per (dow × hour) in the last 30d. */
interface HeatmapCellRow {
  /** 0=Sun, 1=Mon, …, 6=Sat (EXTRACT(dow) in America/Bogota). */
  dow: number | string
  /** 0–23 (EXTRACT(hour) in America/Bogota). */
  hour: number | string
  /** Call count for this bucket. */
  count: number | string
}

interface ViolationRow {
  id: string
  timestamp: string
  event_type: string
  tenant_id: string | null
  legal_name: string | null
  debtor_id: string | null
  debtor_name: string | null
  channel: string | null
  details: Record<string, unknown> | null
}

/**
 * GET /api/v1/admin/ley-2300 (ADMIN-API-CONTRACT.md — Ley 2300).
 * 30d window, America/Bogota. Counts arrive as numeric strings.
 */
interface Ley2300Response {
  stats: {
    total_calls: string
    total_violations: string
    debtors_affected: string
    tenants_affected: string
  }
  heatmap: HeatmapCellRow[]
  violations: ViolationRow[]
}

// ─── Ley 2300/2023 Art. 7 window logic (BACK.md §7.2) ────────────────────
// Kept client-side per BACK.md note ("can stay client-side OR move here").

/**
 * Returns true when the given dow/hour slot is inside the legal contact window.
 * @param dow  0=Sun, 1=Mon…5=Fri, 6=Sat
 * @param hour 0–23
 */
function isAllowed(dow: number, hour: number): boolean {
  // Mon–Fri: 07:00–19:00
  if (dow >= 1 && dow <= 5) return hour >= 7 && hour < 19
  // Sat: 08:00–15:00
  if (dow === 6) return hour >= 8 && hour < 15
  // Sun: prohibited
  return false
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = [
  { dow: 1, name: 'Lun' },
  { dow: 2, name: 'Mar' },
  { dow: 3, name: 'Mié' },
  { dow: 4, name: 'Jue' },
  { dow: 5, name: 'Vie' },
  { dow: 6, name: 'Sáb' },
  { dow: 0, name: 'Dom' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => h)

const DAY_NAMES: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

/**
 * Una casilla del mapa: verde (del tema) si es horario permitido, roja si no;
 * más intensa con más intentos. Los colores salen de los tokens de Cadence
 * (`--success`, `--danger`) mezclados con transparente, para claro y oscuro.
 */
function HeatmapCell({
  n,
  max,
  allowed,
  dow,
  hour,
}: {
  n: number
  max: number
  allowed: boolean
  dow: number
  hour: number
}) {
  const intensity = max > 0 ? Math.min(1, n / max) : 0
  const mezcla = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${Math.round(pct)}%, transparent)`
  const background =
    n > 0
      ? allowed
        ? mezcla('--success', 18 + intensity * 62)
        : mezcla('--danger', 28 + intensity * 62)
      : allowed
        ? 'var(--surface-muted)'
        : mezcla('--danger', 10)

  const tooltip = `${DAY_NAMES[dow]} ${String(hour).padStart(2, '0')}:00 · ${n} ${n === 1 ? 'intento' : 'intentos'} · ${
    allowed ? 'permitido' : 'fuera de horario'
  }`

  return (
    <div
      title={tooltip}
      className="flex h-7 w-7 items-center justify-center rounded-[6px] font-mono text-[10px] tabular-nums text-fg"
      style={{ background }}
    >
      {n > 0 ? n : ''}
    </div>
  )
}

/** /ley-2300 — Compliance window monitoring (BACK.md §8.15 + §7.2 · FRONT.md §6.19). */
export default function Ley2300Page() {
  const { data, isLoading, error, refetch } = useApiQuery<Ley2300Response>(
    (signal) => adminApi('/ley-2300', { signal }),
    [],
  )

  const heatmapMap = new Map<string, number>()
  for (const cell of data?.heatmap ?? []) {
    heatmapMap.set(`${Number(cell.dow)}-${Number(cell.hour)}`, Number(cell.count) || 0)
  }
  const maxN = Math.max(1, ...Array.from(heatmapMap.values()))

  const violations = data?.violations ?? []

  const violationColumns: Column<ViolationRow>[] = [
    {
      header: 'Cuándo',
      orden: (v) => v.timestamp,
      ordenPrimero: 'desc',
      texto: (v) => fmtDateTime(v.timestamp),
      cell: (v) => <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">{fmtDateTime(v.timestamp)}</span>,
    },
    {
      header: 'Tipo',
      orden: (v) => v.event_type,
      texto: (v) => legible(v.event_type),
      cell: (v) => <Pill tone={v.event_type.includes('inbound') ? 'muted' : 'bad'}>{legible(v.event_type)}</Pill>,
    },
    { header: 'Canal', orden: (v) => v.channel, texto: (v) => (v.channel ? legible(v.channel) : ''), cell: (v) => <span className="text-fg-muted">{v.channel ? legible(v.channel) : '—'}</span> },
    { header: 'Deudor', orden: (v) => v.debtor_name, texto: (v) => v.debtor_name, cell: (v) => <span className="block max-w-[180px] truncate">{v.debtor_name ?? '—'}</span> },
    { header: 'Inmobiliaria', orden: (v) => v.legal_name, texto: (v) => v.legal_name, cell: (v) => <span className="block max-w-[160px] truncate text-fg-muted">{v.legal_name ?? '—'}</span> },
    {
      header: 'Detalles',
      texto: (v) => (v.details ? JSON.stringify(v.details) : ''),
      cell: (v) => (
        <span className="block max-w-[260px] truncate font-mono text-caption text-fg-muted" title={v.details ? JSON.stringify(v.details) : undefined}>
          {v.details ? JSON.stringify(v.details).slice(0, 100) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Ley 2300"
        description="Las ventanas de contacto de la Ley 2300 de 2023 (art. 7): lunes a viernes de 7:00 a 19:00, sábados de 8:00 a 15:00; domingos y festivos, nunca. Últimos 30 días."
      />

      {isLoading && <LoadingBlock filas={6} />}
      {!isLoading && error && <ErrorBlock error={error} onReintentar={refetch} />}

      {data && (
        <>
          <FranjaDeCifras fila="lg">
            <KpiCard icon={<PhoneCall />} label="Llamadas · 30 días" value={Number(data.stats.total_calls) || 0} hint="Todas" />
            <KpiCard
              icon={<WarningOctagon />}
              label="Por fuera de la ley · 30 días"
              value={Number(data.stats.total_violations) || 0}
              hint="Por horario o por frecuencia"
              tone={Number(data.stats.total_violations) > 0 ? 'bad' : 'ok'}
            />
            <KpiCard icon={<Users />} label="Deudores afectados" value={Number(data.stats.debtors_affected) || 0} hint="Con al menos una" />
            <KpiCard
              icon={<Buildings />}
              label="Inmobiliarias afectadas"
              value={Number(data.stats.tenants_affected) || 0}
              hint="Con al menos una"
              tone={Number(data.stats.tenants_affected) > 0 ? 'warn' : 'ok'}
            />
          </FranjaDeCifras>

          <Tarjeta titulo="Intentos por día y hora" descripcion="Hora de Bogotá, últimos 30 días.">
            <div className="overflow-x-auto" data-lenis-prevent>
              <table className="border-separate border-spacing-[3px] text-caption">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap pb-1 pr-2 text-left">
                      <MonoLabel>Día / hora</MonoLabel>
                    </th>
                    {HOURS.map((h) => (
                      <th key={h} className="w-7 pb-1 text-center font-mono text-[10px] font-normal tabular-nums text-fg-subtle">
                        {String(h).padStart(2, '0')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d) => (
                    <tr key={d.dow}>
                      <td className="whitespace-nowrap pr-2 text-body-sm text-fg-muted">{d.name}</td>
                      {HOURS.map((h) => {
                        const n = heatmapMap.get(`${d.dow}-${h}`) ?? 0
                        const allowed = isAllowed(d.dow, h)
                        return (
                          <td key={h} className="p-0">
                            <HeatmapCell n={n} max={maxN} allowed={allowed} dow={d.dow} hour={h} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-fg-muted">
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-[4px]" style={{ background: 'color-mix(in srgb, var(--success) 50%, transparent)' }} />
                Permitido
              </span>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-[4px]" style={{ background: 'color-mix(in srgb, var(--danger) 55%, transparent)' }} />
                Fuera de horario (con intentos, es una falta)
              </span>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-[4px] bg-surface-muted" />
                Sin intentos, permitido
              </span>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-[4px]" style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }} />
                Sin intentos, prohibido
              </span>
            </div>
          </Tarjeta>

          <section className="space-y-3" aria-label="Faltas recientes">
            <MonoLabel className="block">
              <Scales className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Faltas recientes · 30 días ({violations.length.toLocaleString('es-CO')})
            </MonoLabel>
            <DataTable
              columns={violationColumns}
              rows={violations}
              getKey={(v) => v.id}
              emptyTitle="Ninguna falta: todo dentro del horario"
              emptyIcon={<Scales weight="bold" />}
              aria-label="Faltas a la Ley 2300"
              queSon={['falta', 'faltas']}
              buscar="Deudor, inmobiliaria o tipo"
              segmentos={[
                { valor: 'todas', nombre: 'Todas', cumple: () => true },
                { valor: 'salientes', nombre: 'Contactos fuera de horario', cumple: (v) => !v.event_type.includes('inbound') },
                { valor: 'entrantes', nombre: 'Entrantes', cumple: (v) => v.event_type.includes('inbound') },
              ]}
              ordenInicial={{ columna: 0, sentido: 'desc' }}
              exportar="faltas-ley-2300"
            />
          </section>
        </>
      )}
    </div>
  )
}
