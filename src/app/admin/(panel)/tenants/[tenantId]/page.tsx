'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Buildings,
  ChatCircleText,
  CurrencyCircleDollar,
  HandCoins,
  PhoneCall,
  ShieldCheck,
  UserSwitch,
  Users,
  Wallet,
} from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'
import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtCOP, fmtDateTime, fmtDuration } from '@/lib/admin/format'
import { legible, metricaDeLaInmobiliaria, resultadoDeLaLlamada, tonoDelResultado } from '@/lib/admin/textos-del-admin'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { KpiCard } from '@/components/admin/screen/KpiCard'
import { Pill } from '@/components/admin/Pill'
import { BackButton } from '@/components/ui/back-button'
import { NitDeLaInmobiliaria } from '@/components/admin/NitDeLaInmobiliaria'
// DIAN-FEEL (04-10-2026): la inmobiliaria como facturador de la cuenta de FEEL de Leasefy.
import { FacturadorFeelDeLaInmobiliaria } from '@/components/admin/FacturadorFeelDeLaInmobiliaria'

// ---------- Types ----------

interface CounterRow {
  label: string
  value: string
}

interface RecentCall {
  id: string
  initiated_at: string
  outcome: string | null
  duration_seconds: number | null
  debtor_name: string
}

interface RecentEvent {
  id: string
  event_type: string
  timestamp: string
}

/**
 * Response shape for GET /tenants/:tenantId (docs/ADMIN-API-CONTRACT.md):
 * nested `agency` object + counters [{label, value}] + recentCalls/recentEvents (8 each).
 */
interface TenantAgency {
  agency_id: string
  tenant_id: string
  legal_name: string
  nit: string
  billing_model: string
  primary_contact_email: string
  primary_contact_phone?: string | null
  created_at: string
}

interface TenantDetail {
  agency: TenantAgency
  counters: CounterRow[]
  recentCalls: RecentCall[]
  recentEvents: RecentEvent[]
}

/** Counters whose value is a COP amount (the rest are plain counts). */
const MONEY_COUNTERS = new Set(['paid_total'])

/** El ícono de cada métrica (neutro: son cifras, no botones). */
const ICONO_DE_LA_METRICA: Record<string, React.ReactNode> = {
  debtors_count: <Users />,
  calls_count: <PhoneCall />,
  calls_30d: <ChatCircleText />,
  open_promises_count: <HandCoins />,
  paid_total: <CurrencyCircleDollar />,
  open_escalations_count: <UserSwitch />,
  compliance_events_count: <ShieldCheck />,
  cartera_atrasada_count: <Wallet />,
}

// ---------- Page ----------

/** /tenants/:tenantId — agency detail (BACK.md §8.3 · FRONT.md §6.5). */
export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId

  const { data, isLoading, error, refetch } = useApiQuery<TenantDetail>(
    (signal) => adminApi(`/tenants/${tenantId}`, { signal }),
    [tenantId],
  )

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={8} /></div>

  // 404 — la inmobiliaria no existe
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <BackButton href="/admin/tenants" label="Volver a inmobiliarias" />
        <EmptyBlock
          icono={<Buildings weight="bold" />}
          title="No encontramos esta inmobiliaria"
          hint={`No hay ninguna con el id ${tenantId}.`}
        />
      </div>
    )
  }

  if (error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={error} onReintentar={refetch} /></div>
  if (!data) return null

  const callColumns: Column<RecentCall>[] = [
    {
      header: 'Deudor',
      cell: (r) => (
        <Link
          href={`/admin/calls/${r.id}`}
          className="font-medium text-fg underline-offset-4 transition-colors hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.debtor_name}
        </Link>
      ),
    },
    {
      header: 'Resultado',
      cell: (r) => <Pill tone={tonoDelResultado(r.outcome)}>{resultadoDeLaLlamada(r.outcome)}</Pill>,
    },
    {
      header: 'Duración',
      align: 'right',
      cell: (r) => <span className="font-mono tabular-nums text-fg-muted">{fmtDuration(r.duration_seconds)}</span>,
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-subtle">
          {fmtDateTime(r.initiated_at)}
        </span>
      ),
    },
  ]

  const eventColumns: Column<RecentEvent>[] = [
    {
      header: 'Evento',
      cell: (r) => <span className="text-fg">{legible(r.event_type)}</span>,
    },
    {
      header: 'Cuándo',
      align: 'right',
      cell: (r) => (
        <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-subtle">
          {fmtDateTime(r.timestamp)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/tenants" label="Volver a inmobiliarias" />
      <PageHeader
        title={data.agency.legal_name}
        description={
          // El NIT vive en su tarjeta (la de Leasefy y la del micro): acá quedaría
          // viejo después de corregirlo.
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{data.agency.primary_contact_email}</span>
            {data.agency.primary_contact_phone ? (
              <span className="font-mono tabular-nums">{data.agency.primary_contact_phone}</span>
            ) : null}
            <Pill tone="neutral">{legible(data.agency.billing_model)}</Pill>
          </span>
        }
      />

      {/* Las ocho cifras de la inmobiliaria. */}
      <section aria-label="Métricas" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.counters.map((c) => (
          <KpiCard
            key={c.label}
            label={metricaDeLaInmobiliaria(c.label)}
            value={MONEY_COUNTERS.has(c.label) ? fmtCOP(Number(c.value)) : Number(c.value)}
            icon={ICONO_DE_LA_METRICA[c.label]}
          />
        ))}
      </section>

      {/* El NIT del back (la fuente) y su corrección. */}
      <NitDeLaInmobiliaria tenantId={tenantId} />

      <FacturadorFeelDeLaInmobiliaria tenantId={tenantId} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <MonoLabel className="block">Últimas llamadas</MonoLabel>
          <DataTable
            columns={callColumns}
            rows={data.recentCalls}
            getKey={(r) => r.id}
            emptyTitle="Todavía no hay llamadas"
            aria-label="Últimas llamadas"
          />
        </section>

        <section className="space-y-3">
          <MonoLabel className="block">Eventos de cumplimiento recientes</MonoLabel>
          <DataTable
            columns={eventColumns}
            rows={data.recentEvents}
            getKey={(r) => r.id}
            emptyTitle="Sin eventos todavía"
            aria-label="Eventos de cumplimiento"
          />
        </section>
      </div>
    </div>
  )
}
