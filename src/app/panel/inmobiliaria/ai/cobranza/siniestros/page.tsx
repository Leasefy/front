'use client'

/**
 * Siniestros list page — Task 1 (H21 QA fix).
 *
 * Displays the agency-level list of insurance claims using
 * GET /api/agency/{agencyId}/cartera/insurance-claims (listCarteraInsuranceClaims).
 *
 * Pattern matches: deudores/DeudoresListClient + cartas/page conventions.
 * Refs DESIGN.md §1 (sobrio + warm), §4 (cards rounded-lg + shadow),
 * §11 (loading skeleton), §16 (tabular-nums).
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Siren, Warning } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import { Card, Chip } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
} from '@/lib/hooks/use-table-pagination'
import {
  useInsuranceClaims,
  type InsuranceClaimStatus,
} from '@/lib/hooks/cobranza/use-insurance-claims'

// ── Status → Cadence Badge variant — tokens semánticos del DS (contrato §8) ────
function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'pending_human_review':
      return 'warning'
    case 'draft':
      return 'secondary'
    case 'filed':
      return 'default'
    case 'accepted':
      return 'success'
    case 'rejected':
    default:
      return 'destructive'
  }
}

const STATUS_OPTIONS: InsuranceClaimStatus[] = [
  'pending_human_review',
  'draft',
  'filed',
  'accepted',
  'rejected',
]

const STATUS_LABELS: Record<InsuranceClaimStatus, { es: string; en: string }> = {
  pending_human_review: { es: 'Pendiente revisión', en: 'Pending review' },
  draft: { es: 'Borrador', en: 'Draft' },
  filed: { es: 'Radicado', en: 'Filed' },
  accepted: { es: 'Aceptado', en: 'Accepted' },
  rejected: { es: 'Rechazado', en: 'Rejected' },
}

function SiniestrosContent() {
  const { t, locale, formatCurrency } = useI18n()
  const router = useRouter()
  const isEs = locale.startsWith('es')

  const [statusFilter, setStatusFilter] = useState<InsuranceClaimStatus | undefined>()

  const { data, isLoading, error, refetch } = useInsuranceClaims({
    status: statusFilter,
  })

  useAutoRefresh(refetch)


  const navigateToSiniestro = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/siniestros/${id}`)
    },
    [router],
  )

  const claims = data?.claims ?? []

  /**
   * Paginado de presentación. `resetKey` con los filtros: sin eso, filtrar
   * estando en la página 3 deja la tabla vacía y se lee como «no hay nada».
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(claims, { resetKey: `${statusFilter ?? ''}` })
  const hasFilters = statusFilter !== undefined

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <header className="mb-5">
          <div className="h-7 w-40 bg-surface-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-muted rounded animate-pulse mt-2" />
        </header>
        <Card className="overflow-hidden">
          <Table>
            <TableBody className="animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-surface-muted rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </main>
    )
  }

  // ── Global empty state (no filters, no data) ──────────────────────────────
  if (!isLoading && !hasFilters && claims.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Siren}
          title={t('inmobiliaria.ai.cobranza.siniestros.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.siniestros.list.empty.description')}
        />
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            {t('inmobiliaria.ai.cobranza.siniestros.list.pageTitle')}
          </h1>
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.cobranza.siniestros.list.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      {/*
        Contenedor canónico del panel: UNA tarjeta con su barra de filtros, la
        tabla y el pie de paginación. Los filtros y el aviso de error vivían
        sueltos por encima y la pantalla se leía como bloques sin relación.
      */}
      <Card className="overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        <fieldset>
          <legend className="sr-only">{isEs ? 'Estado del siniestro' : 'Claim status'}</legend>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s}
                size="sm"
                selected={statusFilter === s}
                onClick={() => setStatusFilter((prev) => (prev === s ? undefined : s))}
              >
                {STATUS_LABELS[s][isEs ? 'es' : 'en']}
              </Chip>
            ))}
          </div>
        </fieldset>

        {hasFilters && (
          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={() => setStatusFilter(undefined)}
            className="self-center px-0 h-auto"
          >
            {isEs ? 'Limpiar filtro' : 'Clear filter'}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger flex items-center gap-2"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Destinatario y monto primero: la tabla mostraba aseguradora,
                  estado y fechas, o sea que aprobar un siniestro era autorizar
                  un reclamo sin saber de quién ni por cuánto. */}
              <TableHead>{isEs ? 'Deudor' : 'Debtor'}</TableHead>
              <TableHead className="text-right">
                {isEs ? 'Saldo en mora' : 'Outstanding'}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.aseguradora')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.status')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.createdAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.filedAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.siniestros.list.columns.approvedBy')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/*
              Con error NO se puede decir «sin siniestros»: eso es una
              afirmación sobre los datos, y con la carga fallida no sabemos
              cuántos hay. La pantalla mostraba el 401 en rojo Y debajo «Sin
              siniestros con el filtro seleccionado» — o sea, tranquilizando
              justo cuando no debía.
            */}
            {claims.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-sm text-fg-muted">
                    {error
                      ? isEs
                        ? 'No pudimos cargar los siniestros.'
                        : 'We could not load the claims.'
                      : isEs
                        ? 'Sin siniestros con el filtro seleccionado.'
                        : 'No claims match the selected filter.'}
                  </p>
                  {error && (
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      className="mt-3"
                      onClick={() => void refetch()}
                    >
                      {isEs ? 'Reintentar' : 'Retry'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => navigateToSiniestro(c.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToSiniestro(c.id)
                }}
                className=" cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <TableCell className="px-3 py-2">
                  <span className="block text-fg">
                    {c.debtorName ?? (isEs ? 'Deudor no encontrado' : 'Debtor not found')}
                  </span>
                  {c.debtorDocument && (
                    <span className="block text-xs text-fg-muted font-mono tabular-nums">
                      {c.debtorDocument}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-right whitespace-nowrap">
                  <span className="block text-fg font-mono tabular-nums">
                    {c.outstandingCop != null ? formatCurrency(c.outstandingCop) : '—'}
                  </span>
                  {/* Sólo con mora real: «0 días de mora» al lado de un saldo
                      se lee como un error de cálculo, no como información. */}
                  {c.delinquencyDays != null && c.delinquencyDays > 0 && (
                    <span className="block text-xs text-fg-muted font-mono tabular-nums">
                      {c.delinquencyDays}{' '}
                      {isEs
                        ? c.delinquencyDays === 1
                          ? 'día de mora'
                          : 'días de mora'
                        : c.delinquencyDays === 1
                          ? 'day overdue'
                          : 'days overdue'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-fg capitalize whitespace-nowrap">
                  {c.aseguradora}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Badge variant={statusBadgeVariant(c.status)}>
                    {isEs
                      ? (STATUS_LABELS[c.status as InsuranceClaimStatus]?.es ?? c.status)
                      : (STATUS_LABELS[c.status as InsuranceClaimStatus]?.en ?? c.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-fg-muted tabular-nums whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-fg-muted tabular-nums whitespace-nowrap">
                  {c.filedAt
                    ? new Date(c.filedAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </TableCell>
                {/* El correo, no el UUID: «4a0efc55…» no le dice nada a nadie.
                    Si el aprobador ya no está en el equipo cae al id recortado,
                    que al menos es rastreable en la auditoría. */}
                <TableCell className="px-3 py-2 text-xs text-fg-muted">
                  {c.approvedByEmail ??
                    (c.approvedByHumanUserId
                      ? c.approvedByHumanUserId.slice(0, 8) + '…'
                      : '—')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>
    </main>
  )
}

export default function SiniestrosListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <SiniestrosContent />
    </PageGuard>
  )
}
