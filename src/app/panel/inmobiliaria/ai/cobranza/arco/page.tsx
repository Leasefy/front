'use client'

/**
 * ARCO Inbox — Phase 36 plan 36-08.
 *
 * KPI strip + type-group Tabs + requests table with masked cédula,
 * SLA countdown badge, ArcoStatusBadge, per-row action link.
 *
 * Requirements: COBR-UI-12, XR-03
 * Decisions: D-36-05, D-36-11, D-36-12
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Hourglass,
  CheckCircle,
  Warning,
  ArrowSquareOut,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { useArcoRequests } from '@/lib/hooks/cobranza/use-arco-requests'
import { ArcoStatusBadge } from '@/components/inmobiliaria/cobranza/ArcoStatusBadge'
import { SlaCountdownBadge } from '@/components/inmobiliaria/cobranza/SlaCountdownBadge'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ArcoRequestRow } from '@/lib/hooks/cobranza/use-arco-requests'

type TabValue = 'all' | 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'

const TYPE_COLORS: Record<ArcoRequestRow['type'], string> = {
  acceso: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30',
  rectificacion: 'text-teal-700 bg-teal-50 dark:bg-teal-950/20',
  cancelacion: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20',
  oposicion: 'text-rose-700 bg-rose-50 dark:bg-rose-950/20',
}

function KpiSkeleton() {
  return (
    <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
  )
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: number | undefined
  isLoading: boolean
}

function KpiCard({ icon, label, value, isLoading }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">{label}</p>
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <p className="text-xl font-semibold text-neutral-900 dark:text-white">
              {value ?? 0}
            </p>
          )}
        </div>
        <div className="shrink-0 text-neutral-400">{icon}</div>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: ArcoRequestRow['type'] }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${TYPE_COLORS[type]}`}
    >
      {t(`inmobiliaria.ai.arco.type.${type}`)}
    </span>
  )
}

interface RequestsTableProps {
  requests: ArcoRequestRow[]
}

function RequestsTable({ requests }: RequestsTableProps) {
  const { t } = useI18n()

  if (requests.length === 0) {
    return (
      <NoDataYetBadge
        reason={t('inmobiliaria.ai.arco.empty')}
        phase={36}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-800/50">
          <tr>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.type')}
            </th>
            <th className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.requester')}
            </th>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.email')}
            </th>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.status')}
            </th>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.sla')}
            </th>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-left">
              {t('inmobiliaria.ai.arco.table.submitted')}
            </th>
            <th className="px-4 py-3 text-xs font-normal text-neutral-500 uppercase tracking-wide text-right">
              {t('inmobiliaria.ai.arco.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {requests.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <TypeBadge type={row.type} />
              </td>
              <td className="sticky left-0 z-10 bg-white dark:bg-[#1a1a1c] px-4 py-3 min-w-[180px]">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {row.requesterName}
                </p>
                <div className="mt-0.5">
                  <Mask field="cedula" value={row.requesterCedulaHash} />
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="text-sm text-neutral-500">{row.requesterEmail}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <ArcoStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <SlaCountdownBadge deadline={row.slaDeadline} type={row.type} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs font-mono tabular-nums text-neutral-500">
                  {new Date(row.submittedAt).toLocaleDateString()}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <Link href={`/panel/inmobiliaria/ai/cobranza/arco/${row.id}`}>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                    aria-label={t('inmobiliaria.ai.arco.actions.view', { name: row.requesterName })}
                  >
                    <ArrowSquareOut className="h-4 w-4" weight="regular" />
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ArcoInboxPage() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useArcoRequests()
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const requests = data?.requests ?? []
  const kpis = data?.kpis

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    return requests.filter((r) => r.type === activeTab)
  }, [requests, activeTab])

  const tabCounts = useMemo(() => {
    const counts: Record<TabValue, number> = {
      all: requests.length,
      acceso: 0,
      rectificacion: 0,
      cancelacion: 0,
      oposicion: 0,
    }
    for (const r of requests) {
      counts[r.type] = (counts[r.type] ?? 0) + 1
    }
    return counts
  }, [requests])

  // Rose badge if any overdue in group
  const hasOverdue = useMemo(() => {
    const check = (type: TabValue) => {
      const group = type === 'all' ? requests : requests.filter((r) => r.type === type)
      return group.some((r) => {
        const deadline = r.slaDeadline instanceof Date ? r.slaDeadline : new Date(r.slaDeadline)
        return deadline < new Date()
      })
    }
    return {
      all: check('all'),
      acceso: check('acceso'),
      rectificacion: check('rectificacion'),
      cancelacion: check('cancelacion'),
      oposicion: check('oposicion'),
    } as Record<TabValue, boolean>
  }, [requests])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.arco.title')}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
          aria-label={t('common.refresh')}
        >
          {t('common.refresh')}
        </button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="min-h-[44px] shrink-0"
            >
              {t('common.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Hourglass className="h-5 w-5" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.pendingVerification')}
          value={kpis?.pending}
          isLoading={isLoading && !data}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.onTime')}
          value={kpis?.onTime}
          isLoading={isLoading && !data}
        />
        <KpiCard
          icon={<Warning className="h-5 w-5 text-rose-500" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.overdue')}
          value={kpis?.overdue}
          isLoading={isLoading && !data}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-teal-500" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.resolved30d')}
          value={kpis?.resolvedLast30d}
          isLoading={isLoading && !data}
        />
      </div>

      {/* Type-group Tabs + Table */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="flex flex-wrap gap-1 h-auto">
          {(['all', 'acceso', 'rectificacion', 'cancelacion', 'oposicion'] as TabValue[]).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-indigo-500"
            >
              {t(`inmobiliaria.ai.arco.tab.${tab}`)}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-mono ${
                  hasOverdue[tab]
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {tabCounts[tab]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(['all', 'acceso', 'rectificacion', 'cancelacion', 'oposicion'] as TabValue[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading && !data ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4 space-y-3"
                  >
                    <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <RequestsTable requests={tab === activeTab ? filteredRequests : []} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
