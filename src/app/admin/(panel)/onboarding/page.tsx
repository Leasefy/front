'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'

// ── Types co-located with the screen (BACK.md §8.23 · FRONT.md §6.27) ─────────

interface InflightRow {
  id: string
  created_at: string
  expires_at: string
  legal_name: string | null
}

interface LiveAgencyRow {
  tenant_id: string
  legal_name: string
  created_at: string
  /** MIN(calls.initiated_at) for this tenant — null if no calls yet. */
  first_call: string | null
  /** MIN(payments.paid_at) WHERE status='approved' — null if no payments yet. */
  first_payment: string | null
}

/** GET /api/v1/admin/onboarding (ADMIN-API-CONTRACT.md — Onboarding). */
interface OnboardingResponse {
  inFlight: InflightRow[]
  /** Last 30 live agencies with funnel timestamps. */
  liveAgencies: LiveAgencyRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type FunnelStage = 'first_payment' | 'first_call' | 'configured'

/** Derives funnel stage client-side from timestamps (FRONT.md §6.27). */
function funnelStage(row: LiveAgencyRow): FunnelStage {
  if (row.first_payment) return 'first_payment'
  if (row.first_call) return 'first_call'
  return 'configured'
}

function stageTone(s: FunnelStage): PillTone {
  return s === 'first_payment' ? 'ok' : s === 'first_call' ? 'info' : 'neutral'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /onboarding — pipeline de nuevas inmobiliarias (BACK.md §8.23 · FRONT.md §6.27). */
export default function OnboardingPage() {
  const { data, isLoading, error } = useApiQuery<OnboardingResponse>(
    (signal) => adminApi('/onboarding', { signal }),
    [],
  )

  const inflightColumns: Column<InflightRow>[] = [
    {
      header: 'Agencia',
      cell: (r) => (
        <span className="font-medium">{r.legal_name ?? '(pendiente)'}</span>
      ),
    },
    {
      header: 'Inició',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
    {
      header: 'Expira',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {fmtDateTime(r.expires_at)}
        </span>
      ),
    },
  ]

  const liveColumns: Column<LiveAgencyRow>[] = [
    {
      header: 'Agencia',
      cell: (r) => <span className="font-medium">{r.legal_name}</span>,
    },
    {
      header: 'Alta',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {fmtDateTime(r.created_at)}
        </span>
      ),
    },
    {
      header: 'Primera llamada',
      cell: (r) =>
        r.first_call ? (
          <span className="font-mono text-xs tabular-nums">{fmtDateTime(r.first_call)}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Primer pago',
      cell: (r) =>
        r.first_payment ? (
          <span className="font-mono text-xs tabular-nums">{fmtDateTime(r.first_payment)}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Stage',
      cell: (r) => {
        const s = funnelStage(r)
        return <Pill tone={stageTone(s)}>{s}</Pill>
      },
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="20 · onboarding"
        title="Pipeline nuevas inmobiliarias"
        description="Sesiones en proceso + últimas 30 agencias en el funnel: configurada → primera llamada → primer pago."
      />

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        en proceso · onboarding_sessions activas
      </div>
      <div className="mb-8">
        <DataTable
          columns={inflightColumns}
          rows={data?.inFlight}
          getKey={(r) => r.id}
          isLoading={isLoading}
          error={error}
          emptyTitle="Sin onboarding en proceso"
        />
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        funnel · primer call / primer pago (últimas 30 agencias)
      </div>
      <DataTable
        columns={liveColumns}
        rows={data?.liveAgencies}
        getKey={(r) => r.tenant_id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin agencias registradas"
      />
    </div>
  )
}
