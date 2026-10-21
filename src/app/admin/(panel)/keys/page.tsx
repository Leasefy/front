'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { FranjaDeCifras } from '@leasefy/cadence'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'
import { fmtFecha, fmtNumero } from '@/lib/admin/format'

// ── Types co-located with the screen (BACK.md §8.22 + §7.4 · FRONT.md §6.30) ─

/**
 * Status computed by the backend from KEY_ROTATION_DAYS=90 / WARN=14.
 * §7.4: warn when daysLeft ≤ 14, overdue when daysLeft < 0, never when
 * last_rotated_at is null (SAGRILAFT / Ley 2157).
 */
type KeyStatus = 'ok' | 'warn' | 'overdue' | 'never'

/** GET /api/v1/admin/keys row (ADMIN-API-CONTRACT.md — Keys). Never key values. */
interface KeyRow {
  env_var: string
  label: string
  notes: string | null
  /** ISO date or null if never rotated. */
  last_rotated_at: string | null
  /** Whether process.env[env_var] is set in the backend runtime. */
  env_present: boolean
  status: KeyStatus
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KEY_ROTATION_WARN_DAYS = 14 // KEY_ROTATION_DAYS=90, warn at ≤14 left

/** Lo más urgente primero al ordenar por estado. */
const ORDEN_DEL_ESTADO: Record<KeyStatus, number> = { overdue: 0, never: 1, warn: 2, ok: 3 }

const SEGMENTOS: Segmento<KeyRow>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'atender', nombre: 'Para atender', cumple: (k) => k.status !== 'ok' || !k.env_present },
  { valor: 'al-dia', nombre: 'Al día', cumple: (k) => k.status === 'ok' && k.env_present },
  { valor: 'faltan', nombre: 'Faltan en el servidor', cumple: (k) => !k.env_present },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: KeyStatus): PillTone {
  return s === 'ok' ? 'ok' : s === 'warn' ? 'warn' : s === 'overdue' ? 'bad' : 'muted'
}

/** Días de calendario desde una fecha; `null` si nunca se rotó. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

function statusLabel(s: KeyStatus): string {
  if (s === 'ok') return 'Al día'
  if (s === 'warn') return `Rotar en ${KEY_ROTATION_WARN_DAYS} días o menos`
  if (s === 'overdue') return 'Vencida'
  return 'Nunca rotada'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * /admin/keys — cuándo se rotó cada llave de un servicio externo (BACK.md §8.22).
 * Nunca muestra el valor de una llave. 19-10-2026: en español y con los estados
 * de carga y error de las demás pantallas.
 */
export default function KeysPage() {
  const { data: keys, isLoading, error, refetch } = useApiQuery<KeyRow[]>(
    (signal) => adminApi('/keys', { signal }),
    [],
  )

  const counts = {
    ok: (keys ?? []).filter((k) => k.status === 'ok').length,
    warn: (keys ?? []).filter((k) => k.status === 'warn').length,
    overdue: (keys ?? []).filter((k) => k.status === 'overdue').length,
    never: (keys ?? []).filter((k) => k.status === 'never').length,
  }

  const columns: Column<KeyRow>[] = [
    {
      header: 'Llave',
      orden: (r) => r.label,
      texto: (r) => r.label,
      cell: (r) => (
        <div>
          <div className="font-medium text-fg">{r.label}</div>
          <code className="font-mono text-caption text-fg-subtle">{r.env_var}</code>
        </div>
      ),
    },
    {
      header: 'En el servidor',
      orden: (r) => (r.env_present ? 1 : 0),
      texto: (r) => (r.env_present ? 'Puesta' : 'Falta'),
      cell: (r) =>
        r.env_present ? <Pill tone="ok">Puesta</Pill> : <Pill tone="warn">Falta</Pill>,
    },
    {
      header: 'Última rotación',
      orden: (r) => r.last_rotated_at,
      ordenPrimero: 'desc',
      texto: (r) => (r.last_rotated_at ? fmtFecha(r.last_rotated_at) : 'Nunca'),
      cell: (r) =>
        r.last_rotated_at ? (
          <div>
            <div className="whitespace-nowrap text-body-sm text-fg">{fmtFecha(r.last_rotated_at)}</div>
            <div className="text-caption text-fg-subtle">
              {(() => {
                const d = daysSince(r.last_rotated_at)
                return d == null ? '' : d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${fmtNumero(d)} días`
              })()}
            </div>
          </div>
        ) : (
          <span className="text-caption text-danger">Nunca</span>
        ),
    },
    {
      header: 'Estado',
      orden: (r) => ORDEN_DEL_ESTADO[r.status],
      texto: (r) => statusLabel(r.status),
      cell: (r) => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>,
    },
    {
      header: 'Notas',
      texto: (r) => r.notes,
      cell: (r) => <span className="text-caption text-fg-muted">{r.notes ?? '—'}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Llaves"
        description={`Las llaves de los servicios externos (Vapi, Wompi, Anthropic…). Por la Ley 2157 y SAGRILAFT se rotan cada 90 días; avisa cuando faltan ${KEY_ROTATION_WARN_DAYS} o menos. Nunca se muestra el valor de una llave.`}
      />

      <FranjaDeCifras fila="lg" aria-label="Cifras de las llaves">
        <KpiCard label="Al día" value={keys ? counts.ok : '—'} tone="ok" />
        <KpiCard label="Por rotar pronto" value={keys ? counts.warn : '—'} tone={counts.warn ? 'warn' : 'default'} />
        <KpiCard label="Vencidas" value={keys ? counts.overdue : '—'} tone={counts.overdue ? 'bad' : 'default'} />
        <KpiCard label="Nunca rotadas" value={keys ? counts.never : '—'} />
      </FranjaDeCifras>

      <DataTable
        columns={columns}
        rows={keys}
        getKey={(r) => r.env_var}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay llaves registradas"
        emptyHint="El registro de rotaciones del servidor está vacío."
        aria-label="Llaves"
        queSon={['llave', 'llaves']}
        buscar="Nombre de la llave o variable"
        textoExtra={(r) => r.env_var}
        segmentos={SEGMENTOS}
        ordenInicial={{ columna: 3, sentido: 'asc' }}
        exportar="llaves"
        masEnElExcel={[{ header: 'Variable', texto: (r) => r.env_var }]}
      />

      <p className="text-caption text-fg-muted">
        El registro vive en el código del servidor (<code className="font-mono">src/config/key-rotation-log.ts</code>):
        cada rotación se anota ahí y queda en el historial de git.
      </p>
    </div>
  )
}
