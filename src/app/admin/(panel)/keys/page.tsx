'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: KeyStatus): PillTone {
  return s === 'ok' ? 'ok' : s === 'warn' ? 'warn' : s === 'overdue' ? 'bad' : 'muted'
}

/** Calendar days since an ISO date; null when never rotated. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

function statusLabel(s: KeyStatus): string {
  if (s === 'ok') return 'OK'
  if (s === 'warn') return `⚠ rota en ≤${KEY_ROTATION_WARN_DAYS}d`
  if (s === 'overdue') return 'VENCIDA'
  return 'nunca'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /keys — API key rotation ledger (BACK.md §8.22 · FRONT.md §6.30). */
export default function KeysPage() {
  const { data: keys, isLoading, error } = useApiQuery<KeyRow[]>(
    (signal) => adminApi('/keys', { signal }),
    [],
  )

  const counts = {
    ok:      (keys ?? []).filter((k) => k.status === 'ok').length,
    warn:    (keys ?? []).filter((k) => k.status === 'warn').length,
    overdue: (keys ?? []).filter((k) => k.status === 'overdue').length,
    never:   (keys ?? []).filter((k) => k.status === 'never').length,
  }

  const columns: Column<KeyRow>[] = [
    {
      header: 'Key',
      cell: (r) => <span className="font-medium text-fg">{r.label}</span>,
    },
    {
      header: 'Env var',
      cell: (r) => (
        <code className="font-mono text-[11px] text-fg-muted">{r.env_var}</code>
      ),
    },
    {
      header: 'Presente',
      cell: (r) =>
        r.env_present ? (
          <Pill tone="ok">presente</Pill>
        ) : (
          <Pill tone="warn">missing</Pill>
        ),
    },
    {
      header: 'Última rotación',
      cell: (r) => (
        <span className="font-mono text-xs text-fg-muted">
          {r.last_rotated_at ?? <span className="text-bad">nunca</span>}
        </span>
      ),
    },
    {
      header: 'Días',
      align: 'right',
      cell: (r) => {
        const d = daysSince(r.last_rotated_at)
        return (
          <span className="tabular-nums font-mono text-xs">
            {d != null ? `${d}d` : '—'}
          </span>
        )
      },
    },
    {
      header: 'Status',
      cell: (r) => (
        <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>
      ),
    },
    {
      header: 'Notas',
      cell: (r) => <span className="text-xs text-fg-muted">{r.notes ?? '—'}</span>,
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="24 · keys"
        title="Rotación de API keys"
        description={`Ley 2157 / SAGRILAFT: rotar cada 90 días. Warn en últimos ${KEY_ROTATION_WARN_DAYS}d. Nunca se muestran los valores de las keys.`}
      />

      <div className="grid grid-cols-4 gap-3 mb-8">
        <KpiCard label="OK"        value={counts.ok}      tone="ok" />
        <KpiCard label="Warn"      value={counts.warn}    tone="warn" />
        <KpiCard label="Vencidas"  value={counts.overdue} tone="bad" />
        <KpiCard label="Nunca rot" value={counts.never} />
      </div>

      {isLoading && (
        <div className="card p-8 flex items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-brand animate-pulse" />
            cargando
          </span>
        </div>
      )}

      {error && (
        <div className="card p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-bad flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 bg-bad" />
            error
          </div>
          <p className="text-sm text-fg-muted">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && (
        <DataTable
          columns={columns}
          rows={keys ?? []}
          getKey={(r) => r.env_var}
          emptyTitle="Sin keys registradas"
          emptyHint="El backend no encontró entradas en el ledger de rotación."
        />
      )}

      <div className="card p-4 border-l-4 border-l-brand mt-6 text-xs text-fg-muted">
        Fuente:{' '}
        <code className="font-mono">src/config/key-rotation-log.ts</code> en el backend —
        el commit en git es el audit trail. Pendiente migrar a{' '}
        <code className="font-mono">agent.api_key_rotations</code> + audit_log + Doppler/Infisical.
      </div>
    </div>
  )
}
