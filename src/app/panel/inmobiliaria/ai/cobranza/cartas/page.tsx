'use client'

/**
 * Cartas list page — Task 1 (H21 QA fix).
 *
 * Displays the agency-level list of AI-proposed pre-judicial letters using
 * GET /api/agency/{agencyId}/cartera/legal-artifacts (listCarteraLegalArtifacts).
 *
 * Pattern matches: deudores/DeudoresListClient + escalaciones/page conventions.
 * Refs DESIGN.md §1 (sobrio + warm), §4 (cards rounded-xl + shadow),
 * §11 (loading skeleton), §16 (tabular-nums).
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Envelope, Warning } from '@phosphor-icons/react'

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
import { Chip } from '@leasefy/cadence'
import {
  useLegalArtifacts,
  type LegalArtifactKind,
  type LegalArtifactStatus,
} from '@/lib/hooks/cobranza/use-legal-artifacts'

// ── Status badge colours — tokens semánticos del DS (contrato §8) ─────────────
function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'success' | 'warning' {
  switch (status) {
    case 'pending_human_review':
      return 'warning'
    case 'approved':
      return 'success'
    case 'sent':
      return 'default'
    case 'void':
    default:
      return 'secondary'
  }
}

const KIND_OPTIONS: LegalArtifactKind[] = [
  'pre_judicial_letter',
  'pre_bureau_notification',
]

const STATUS_OPTIONS: LegalArtifactStatus[] = [
  'pending_human_review',
  'approved',
  'sent',
  'void',
]

const KIND_LABELS: Record<LegalArtifactKind, { es: string; en: string }> = {
  pre_judicial_letter: { es: 'Prejurídica', en: 'Pre-judicial' },
  pre_bureau_notification: { es: 'Bureau', en: 'Bureau notification' },
}

/**
 * `physical_send_method` es un enum de la base y se estaba pintando crudo en la
 * tabla: el usuario leía «servicio_472» y «email_only». 4-72 es el operador
 * postal nacional, y en una carta prejurídica el método de envío no es un
 * detalle técnico — es la prueba de notificación.
 *
 * El CHECK de la tabla admite exactamente estos tres; cualquier valor nuevo cae
 * al propio slug, que es feo pero honesto (mejor que inventarle un nombre).
 */
const SEND_METHOD_LABELS: Record<string, { es: string; en: string }> = {
  servicio_472: { es: 'Correo certificado (4-72)', en: 'Certified mail (4-72)' },
  email_only: { es: 'Solo correo electrónico', en: 'Email only' },
  operator_manual: { es: 'Entrega manual del operador', en: 'Manual operator delivery' },
}

const STATUS_LABELS: Record<LegalArtifactStatus, { es: string; en: string }> = {
  pending_human_review: { es: 'Pendiente revisión', en: 'Pending review' },
  approved: { es: 'Aprobada', en: 'Approved' },
  sent: { es: 'Enviada', en: 'Sent' },
  void: { es: 'Anulada', en: 'Void' },
}

function CartasContent() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const isEs = locale.startsWith('es')

  const [kindFilter, setKindFilter] = useState<LegalArtifactKind | undefined>()
  const [statusFilter, setStatusFilter] = useState<LegalArtifactStatus | undefined>()

  const { data, isLoading, error, refetch } = useLegalArtifacts({
    kind: kindFilter,
    status: statusFilter,
  })

  useAutoRefresh(refetch)

  const navigateToCarta = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/ai/cobranza/cartas/${id}`)
    },
    [router],
  )

  const artifacts = data?.artifacts ?? []
  const hasFilters = kindFilter !== undefined || statusFilter !== undefined

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <main className="p-4 lg:p-8 max-w-7xl mx-auto" aria-busy="true">
        <header className="mb-5">
          <div className="h-7 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mt-2" />
        </header>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
            <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800 animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 5 }, (_, j) => (
                    <TableCell key={j} className="px-3 py-3">
                      <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    )
  }

  // ── Global empty state (no filters, no data) ──────────────────────────────
  if (!isLoading && !hasFilters && artifacts.length === 0 && !error) {
    return (
      <main className="p-6 lg:p-8">
        <EmptyState
          icon={Envelope}
          title={t('inmobiliaria.ai.cobranza.cartas.empty.title')}
          description={t('inmobiliaria.ai.cobranza.cartas.empty.description')}
        />
      </main>
    )
  }

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {t('inmobiliaria.ai.cobranza.cartas.pageTitle')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.ai.cobranza.cartas.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Kind filter */}
        <fieldset>
          <legend className="sr-only">{isEs ? 'Tipo de carta' : 'Letter type'}</legend>
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map((k) => (
              <Chip
                key={k}
                size="sm"
                selected={kindFilter === k}
                onClick={() => setKindFilter((prev) => (prev === k ? undefined : k))}
              >
                {KIND_LABELS[k][isEs ? 'es' : 'en']}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* Status filter */}
        <fieldset>
          <legend className="sr-only">{isEs ? 'Estado' : 'Status'}</legend>
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
            onClick={() => {
              setKindFilter(undefined)
              setStatusFilter(undefined)
            }}
            className="self-center px-0 h-auto"
          >
            {isEs ? 'Limpiar filtros' : 'Clear filters'}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-danger-soft border border-danger/30 p-3 text-sm text-danger flex items-center gap-2 mb-4"
        >
          <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
          <TableHeader className="bg-neutral-50 dark:bg-neutral-950/50">
            <TableRow>
              {/* Destinatario primero: la tabla mostraba tipo, estado y fechas,
                  o sea que había que adivinar de quién era cada carta. Una
                  prejurídica sin destinatario visible no se puede revisar, y
                  revisarla es justo lo que esta pantalla pide hacer. */}
              <TableHead>{isEs ? 'Deudor' : 'Debtor'}</TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.cartas.columns.kind')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.cartas.columns.status')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.cartas.columns.generatedAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.cartas.columns.sentAt')}
              </TableHead>
              <TableHead>
                {t('inmobiliaria.ai.cobranza.cartas.columns.sendMethod')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {artifacts.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-12 text-center">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {isEs
                      ? 'Sin cartas con los filtros seleccionados.'
                      : 'No letters match the selected filters.'}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {artifacts.map((a) => (
              <TableRow
                key={a.id}
                onClick={() => navigateToCarta(a.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToCarta(a.id)
                }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <TableCell className="px-3 py-2">
                  <span className="block text-neutral-900 dark:text-white">
                    {a.debtorName ?? (isEs ? 'Deudor no encontrado' : 'Debtor not found')}
                  </span>
                  {a.debtorDocument && (
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                      {a.debtorDocument}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-neutral-900 dark:text-white capitalize whitespace-nowrap">
                  {isEs
                    ? (KIND_LABELS[a.kind as LegalArtifactKind]?.es ?? a.kind)
                    : (KIND_LABELS[a.kind as LegalArtifactKind]?.en ?? a.kind)}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Badge variant={statusBadgeVariant(a.status)}>
                    {isEs
                      ? (STATUS_LABELS[a.status as LegalArtifactStatus]?.es ?? a.status)
                      : (STATUS_LABELS[a.status as LegalArtifactStatus]?.en ?? a.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
                  {new Date(a.generatedAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums whitespace-nowrap">
                  {a.sentAt
                    ? new Date(a.sentAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {a.physicalSendMethod
                    ? (isEs
                        ? SEND_METHOD_LABELS[a.physicalSendMethod]?.es
                        : SEND_METHOD_LABELS[a.physicalSendMethod]?.en) ??
                      a.physicalSendMethod
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}

export default function CartasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <CartasContent />
    </PageGuard>
  )
}
