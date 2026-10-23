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

import { useEstadoEnLaUrl } from '@/lib/cobranza/use-estado-en-la-url'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass, Siren } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { nombreDeLaAseguradora } from '@/lib/cotizador/nombre-de-la-aseguradora'

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
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui'
import { Card, CrossFade } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
} from '@/lib/hooks/use-table-pagination'
import {
  useInsuranceClaims,
  type InsuranceClaimStatus,
} from '@/lib/hooks/cobranza/use-insurance-claims'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'

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
  pending_human_review: { es: 'Por revisar', en: 'To review' },
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
  // C8 (r25): abre en «Por revisar» si hay alguno, y el filtro vive en la URL.
  const estadoUrl = useEstadoEnLaUrl<InsuranceClaimStatus>(Object.keys(STATUS_LABELS) as InsuranceClaimStatus[])
  useEffect(() => {
    if (estadoUrl.deLaUrl) setStatusFilter(estadoUrl.deLaUrl)
  }, [estadoUrl.deLaUrl])

  const { data, isLoading, error, refetch } = useInsuranceClaims({
    status: statusFilter,
  })

  useAutoRefresh(refetch)


  const navigateToSiniestro = useCallback(
    (id: string) => {
      router.push(`/panel/inmobiliaria/pagos/cobranza/siniestros/${id}`)
    },
    [router],
  )

  const claims = data?.claims ?? []
  // Revisora r25 (#3): buscar por deudor (nombre o documento) entre los cargados.
  const [buscar, setBuscar] = useState('')
  const q = buscar.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const visibles = useMemo(
    () =>
      q
        ? claims.filter((c) =>
            `${c.debtorName ?? ''} ${c.debtorDocument ?? ''}`
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .includes(q),
          )
        : claims,
    [claims, q],
  )

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
  } = useTablePagination(visibles, { resetKey: `${statusFilter ?? ''}|${q}` })
  const hasFilters = statusFilter !== undefined

  // Conteo y saldo por estado: se saben cuando la lista viene sin filtro (trae
  // todos). Con un estado elegido el back sólo trae ése; los demás quedan como
  // en la última lectura entera.
  const [resumen, setResumen] = useState<{
    porEstado: Record<string, { n: number; saldo: number }>
    total: number
  } | null>(null)
  useEffect(() => {
    if (!data || statusFilter !== undefined) return
    const porEstado: Record<string, { n: number; saldo: number }> = {}
    for (const c of data.claims ?? []) {
      const e = (porEstado[c.status] ??= { n: 0, saldo: 0 })
      e.n += 1
      e.saldo += Math.max(0, c.outstandingCop ?? 0)
    }
    setResumen({ porEstado, total: (data.claims ?? []).length })
    if (!estadoUrl.yaEligio() && (porEstado.pending_human_review?.n ?? 0) > 0) {
      estadoUrl.marcarElegido()
      setStatusFilter('pending_human_review')
    }
  }, [data, statusFilter, estadoUrl])

  const fecha = useCallback(
    (iso: string) =>
      isEs
        ? fechaCorta(diaEnColombia(iso))
        : new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
    [isEs, locale],
  )

  const pestanas = useMemo(
    () => [
      {
        valor: 'todos',
        etiqueta: isEs ? 'Todos' : 'All',
        cuantos: resumen?.total ?? (statusFilter === undefined ? total : null),
        fija: true,
        testid: 'siniestros-pestana-todos',
      },
      ...STATUS_OPTIONS.map((st) => ({
        valor: st,
        etiqueta: STATUS_LABELS[st][isEs ? 'es' : 'en'],
        cuantos: statusFilter === st ? total : resumen ? resumen.porEstado[st]?.n ?? 0 : null,
        tono: st === 'pending_human_review' ? ('aviso' as const) : undefined,
        testid: `siniestros-pestana-${st}`,
      })),
    ],
    [isEs, resumen, statusFilter, total],
  )

  // ── Skeleton ──────────────────────────────────────────────────────────────
  // Movimiento: cada salida en un `CrossFade` con su clave (esqueleto →
  // lista, → vacío); lo que ya estaba al montarse no se anima.
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="esqueleto">
      <div className="p-6 lg:p-8" aria-busy="true">
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
      </div>
      </CrossFade>
    )
  }

  // ── Global empty state (no filters, no data) ──────────────────────────────
  if (!isLoading && !hasFilters && claims.length === 0 && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.siniestros.list.pageTitle')}
          descripcion={t('inmobiliaria.ai.cobranza.siniestros.list.pageSubtitle')}
        />
        <EmptyState
          icon={Siren}
          title={t('inmobiliaria.ai.cobranza.siniestros.list.empty.title')}
          description={t('inmobiliaria.ai.cobranza.siniestros.list.empty.description')}
        />
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="lista">
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.siniestros.list.pageTitle')}
        descripcion={t('inmobiliaria.ai.cobranza.siniestros.list.pageSubtitle')}
      />

      {/* Status filter chips */}
      {/*
        Contenedor canónico del panel: UNA tarjeta con su barra de filtros, la
        tabla y el pie de paginación. Los filtros y el aviso de error vivían
        sueltos por encima y la pantalla se leía como bloques sin relación.
      */}
      <Card className="overflow-hidden">
      {/* LA RESPUESTA, DENTRO de la tarjeta (C3): lo que espera tu aprobación para reclamarle a la aseguradora. */}
      {resumen && resumen.total > 0 ? (
        // Revisora r27 (Siniestros, UI): la cifra recibe su borde como sus hermanas (antes un div con su padding).
        <CifraHeroe
          className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
          data-testid="siniestros-por-revisar"
          rotulo={isEs ? 'Por revisar' : 'To review'}
          cifra={formatCurrency(resumen.porEstado.pending_human_review?.saldo ?? 0)}
          contexto={
            isEs
              ? `en ${resumen.porEstado.pending_human_review?.n ?? 0} de ${resumen.total} siniestros`
              : `in ${resumen.porEstado.pending_human_review?.n ?? 0} of ${resumen.total} claims`
          }
          tramos={STATUS_OPTIONS.map((st) => ({
            clave: st,
            etiqueta: STATUS_LABELS[st][isEs ? 'es' : 'en'],
            monto: resumen.porEstado[st]?.saldo ?? 0,
            tono:
              st === 'pending_human_review'
                ? ('aviso' as const)
                : st === 'accepted'
                  ? ('exito' as const)
                  : st === 'rejected'
                    ? ('critico' as const)
                    : ('neutro' as const),
            cifra: formatCurrency(resumen.porEstado[st]?.saldo ?? 0),
          }))}
        />
      ) : null}

      <div className="border-b border-border px-4 py-3">
        <PestanasDeEstado<string>
          pestanas={pestanas}
          valor={statusFilter ?? 'todos'}
          onCambio={(v) => {
            const st = v === 'todos' ? undefined : (v as InsuranceClaimStatus)
            setStatusFilter(st)
            estadoUrl.escribir(st ?? null)
          }}
          etiqueta={isEs ? 'Filtrar los siniestros por estado' : 'Filter claims by status'}
        />
      </div>
      <div className="border-b border-border px-4 py-3">
        <div className="relative min-w-0 sm:max-w-sm">
          <label htmlFor="siniestros-buscar" className="sr-only">
            {isEs ? 'Buscar por deudor' : 'Search by debtor'}
          </label>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            id="siniestros-buscar"
            type="search"
            className="pl-9"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder={isEs ? 'Buscar por deudor o documento' : 'Search by debtor or ID'}
            data-testid="siniestros-buscar"
          />
        </div>
      </div>

      {/* Error */}
      {/* C5 (r25): FalloDeCarga con «Intentar de nuevo», nunca el error crudo pegado a la frase. */}
      {error ? (
        <div className="border-b border-border">
          <FalloDeCarga error={falloDelTexto(error)} queEs="los siniestros" onReintentar={() => refetch()} enmarcado={false} />
        </div>
      ) : null}

      {/* Table */}
        <div className="overflow-x-auto max-md:overflow-visible">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
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
          {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms) y las que sobran salen. */}
          <TableBodyAnimado className="max-md:block">
            {/*
              Con error NO se puede decir «sin siniestros»: eso es una
              afirmación sobre los datos, y con la carga fallida no sabemos
              cuántos hay. La pantalla mostraba el 401 en rojo Y debajo «Sin
              siniestros con el filtro seleccionado» — o sea, tranquilizando
              justo cuando no debía.
            */}
            {claims.length > 0 && visibles.length === 0 && (
              <TableRowAnimada key="sin-coincidencias" className="max-md:block">
                <TableCell colSpan={7} className="px-3 py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted" data-testid="siniestros-sin-coincidencias">
                    {isEs ? `Ningún siniestro es de «${buscar.trim()}».` : `No claim is from «${buscar.trim()}».`}
                  </p>
                </TableCell>
              </TableRowAnimada>
            )}
            {claims.length === 0 && !isLoading && (
              <TableRowAnimada key="vacio" className="max-md:block">
                <TableCell colSpan={7} className="px-3 py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted">
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
              </TableRowAnimada>
            )}
            {pageItems.map((c) => (
              <TableRowAnimada
                key={c.id}
                onClick={() => navigateToSiniestro(c.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToSiniestro(c.id)
                }}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
              >
                <TableCell className="px-3 py-2 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                  <span className="block text-fg">
                    {c.debtorName ?? (isEs ? 'Deudor no encontrado' : 'Debtor not found')}
                  </span>
                  {c.debtorDocument && (
                    <span className="block text-caption text-fg-muted font-mono tabular-nums">
                      {c.debtorDocument}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-right whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                  <span className="block text-fg font-mono tabular-nums">
                    {c.outstandingCop != null ? formatCurrency(c.outstandingCop) : '—'}
                  </span>
                  {/* Sólo con mora real: «0 días de mora» al lado de un saldo
                      se lee como un error de cálculo, no como información. */}
                  {c.delinquencyDays != null && c.delinquencyDays > 0 && (
                    <span className="block text-caption text-fg-muted font-mono tabular-nums">
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
                {/* Revisora r25: el nombre de la casa, nunca el código crudo con `capitalize`. */}
                <TableCell className="px-3 py-2 text-fg whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                  {nombreDeLaAseguradora(c.aseguradora)}
                </TableCell>
                <TableCell className="px-3 py-2 max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                  <Badge variant={statusBadgeVariant(c.status)}>
                    {isEs
                      ? (STATUS_LABELS[c.status as InsuranceClaimStatus]?.es ?? c.status)
                      : (STATUS_LABELS[c.status as InsuranceClaimStatus]?.en ?? c.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-caption text-fg-muted tabular-nums whitespace-nowrap max-md:hidden">
                  {fecha(c.createdAt)}
                </TableCell>
                <TableCell className="px-3 py-2 font-mono text-caption text-fg-muted tabular-nums whitespace-nowrap max-md:hidden">
                  {c.filedAt ? fecha(c.filedAt) : '—'}
                </TableCell>
                {/* El correo, no el UUID: «4a0efc55…» no le dice nada a nadie.
                    Si el aprobador ya no está en el equipo cae al id recortado,
                    que al menos es rastreable en la auditoría. */}
                <TableCell
                  className="px-3 py-2 text-caption text-fg-muted max-md:hidden"
                  title={!c.approvedByEmail && c.approvedByHumanUserId ? c.approvedByHumanUserId : undefined}
                >
                  {/* Si ya no está en el equipo se dice así; el id queda en el
                      título (rastreable en la auditoría), no a la vista. */}
                  {c.approvedByEmail ??
                    (c.approvedByHumanUserId
                      ? isEs
                        ? 'Alguien que ya no está en el equipo'
                        : 'Someone no longer on the team'
                      : '—')}
                </TableCell>
              </TableRowAnimada>
            ))}
          </TableBodyAnimado>
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
    </div>
    </CrossFade>
  )
}

export default function SiniestrosListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <SiniestrosContent />
    </PageGuard>
  )
}
