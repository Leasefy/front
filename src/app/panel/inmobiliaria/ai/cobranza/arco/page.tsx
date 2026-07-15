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
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ArcoRequestRow } from '@/lib/hooks/cobranza/use-arco-requests'

type TabValue = 'all' | 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'

const TYPE_VARIANT: Record<
  ArcoRequestRow['type'],
  'default' | 'secondary' | 'warning' | 'destructive'
> = {
  acceso: 'default',
  rectificacion: 'secondary',
  cancelacion: 'warning',
  oposicion: 'destructive',
}

function KpiSkeleton() {
  return (
    <div className="h-6 w-16 rounded bg-surface-muted animate-pulse" />
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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs text-fg-muted">{label}</p>
          {isLoading ? (
            <KpiSkeleton />
          ) : (
            <p className="text-xl font-semibold text-fg">
              {value ?? 0}
            </p>
          )}
        </div>
        <div className="shrink-0 text-fg-subtle">{icon}</div>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: ArcoRequestRow['type'] }) {
  const { t } = useI18n()
  return <Badge variant={TYPE_VARIANT[type]}>{t(`inmobiliaria.ai.arco.type.${type}`)}</Badge>
}

interface RequestsTableProps {
  requests: ArcoRequestRow[]
}

function RequestsTable({ requests }: RequestsTableProps) {
  const { t } = useI18n()

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title={t('inmobiliaria.ai.cobranza.arco.empty.title')}
        description={t('inmobiliaria.ai.cobranza.arco.empty.description')}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface overflow-hidden">
      <Table className="min-w-full divide-y divide-border">
        <TableHeader className="bg-surface-muted">
          <TableRow>
            <TableHead>
              {t('inmobiliaria.ai.arco.table.type')}
            </TableHead>
            <TableHead className="sticky left-0 z-10 bg-surface-muted">
              {t('inmobiliaria.ai.arco.table.requester')}
            </TableHead>
            <TableHead>
              {t('inmobiliaria.ai.arco.table.email')}
            </TableHead>
            <TableHead>
              {t('inmobiliaria.ai.arco.table.status')}
            </TableHead>
            <TableHead>
              {t('inmobiliaria.ai.arco.table.sla')}
            </TableHead>
            <TableHead>
              {t('inmobiliaria.ai.arco.table.submitted')}
            </TableHead>
            <TableHead className="text-right">
              {t('inmobiliaria.ai.arco.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border-faint">
          {requests.map((row) => (
            <TableRow key={row.id} className="hover:bg-surface-muted transition-colors">
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <TypeBadge type={row.type} />
              </TableCell>
              <TableCell className="sticky left-0 z-10 bg-surface px-4 py-3 min-w-[180px]">
                <p className="text-sm font-medium text-fg">
                  {row.requesterName}
                </p>
                <div className="mt-0.5">
                  <Mask field="cedula" value={row.requesterCedulaHash} />
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <p className="text-sm text-fg-muted">{row.requesterEmail}</p>
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <ArcoStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <SlaCountdownBadge deadline={row.slaDeadline} type={row.type} />
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap">
                <span className="text-xs font-mono tabular-nums text-fg-muted">
                  {new Date(row.submittedAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  hideArrow
                  aria-label={t('inmobiliaria.ai.arco.actions.view', { name: row.requesterName })}
                >
                  <Link href={`/panel/inmobiliaria/ai/cobranza/arco/${row.id}`}>
                    <ArrowSquareOut className="h-4 w-4" weight="regular" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ArcoInboxPage() {
  const { t } = useI18n()
  const { data, isLoading, error, refetch } = useArcoRequests()
  const [activeTab, setTab] = useState<TabValue>('all')

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

  // Phase 38-05a: page-level skeleton during first load
  if (isLoading && !data) return <PageSkeleton variant="list" />

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">
            {t('inmobiliaria.ai.arco.title')}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => void refetch()}
          aria-label={t('common.refresh')}
        >
          {t('common.refresh')}
        </Button>
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
          icon={<CheckCircle className="h-5 w-5 text-success" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.onTime')}
          value={kpis?.onTime}
          isLoading={isLoading && !data}
        />
        <KpiCard
          icon={<Warning className="h-5 w-5 text-danger" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.overdue')}
          value={kpis?.overdue}
          isLoading={isLoading && !data}
        />
        <KpiCard
          icon={<CheckCircle className="h-5 w-5 text-fg-muted" weight="duotone" />}
          label={t('inmobiliaria.ai.arco.kpi.resolved30d')}
          value={kpis?.resolvedLast30d}
          isLoading={isLoading && !data}
        />
      </div>

      {/* Type-group Tabs + Table */}
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList variant="underline" className="flex-wrap">
          {(['all', 'acceso', 'rectificacion', 'cancelacion', 'oposicion'] as TabValue[]).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="inline-flex items-center gap-1.5"
            >
              {t(`inmobiliaria.ai.arco.tab.${tab}`)}
              <Badge
                variant={hasOverdue[tab] ? 'destructive' : 'secondary'}
                className="px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                // a11y (XR-06): color encodes overdue state — surface it via
                // aria-label so screen-reader users get the same signal.
                aria-label={
                  hasOverdue[tab]
                    ? `${tabCounts[tab]} ${t('inmobiliaria.ai.arco.kpis.overdue')}`
                    : String(tabCounts[tab])
                }
              >
                {tabCounts[tab]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {(['all', 'acceso', 'rectificacion', 'cancelacion', 'oposicion'] as TabValue[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <RequestsTable requests={tab === activeTab ? filteredRequests : []} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
