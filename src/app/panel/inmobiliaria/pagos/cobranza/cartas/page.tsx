'use client'

/**
 * Cartas list page — Task 1 (H21 QA fix).
 *
 * Displays the agency-level list of AI-proposed pre-judicial letters using
 * GET /api/agency/{agencyId}/cartera/legal-artifacts (listCarteraLegalArtifacts).
 *
 * Pattern matches: deudores/DeudoresListClient + escalaciones/page conventions.
 * Refs DESIGN.md §1 (sobrio + warm), §4 (cards rounded-lg + shadow),
 * §11 (loading skeleton), §16 (tabular-nums).
 */

import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Envelope } from '@phosphor-icons/react'

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
import { Card, Chip, CrossFade, Presence } from '@leasefy/cadence'
import { TablePagination } from '@/components/ui/pagination'
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
} from '@/lib/hooks/use-table-pagination'
import {
  useLegalArtifacts,
  type LegalArtifactKind,
  type LegalArtifactStatus,
} from '@/lib/hooks/cobranza/use-legal-artifacts'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'

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
  pre_bureau_notification: { es: 'Aviso antes del reporte', en: 'Pre-bureau notice' },
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
  pending_human_review: { es: 'Por revisar', en: 'To review' },
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
      router.push(`/panel/inmobiliaria/pagos/cobranza/cartas/${id}`)
    },
    [router],
  )

  const artifacts = data?.artifacts ?? []

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
  } = useTablePagination(artifacts, { resetKey: `${kindFilter ?? ''}|${statusFilter ?? ''}` })
  const hasFilters = kindFilter !== undefined || statusFilter !== undefined

  // El conteo por estado se sabe cuando la lista viene sin filtro de estado
  // (trae todas). Se guarda por tipo de carta; con un estado elegido, el back
  // sólo trae ése y los demás quedan como estaban en la última lectura entera.
  const [conteos, setConteos] = useState<{ tipo: string; porEstado: Record<string, number>; total: number } | null>(null)
  useEffect(() => {
    if (!data || statusFilter !== undefined) return
    const porEstado: Record<string, number> = {}
    for (const a of data.artifacts ?? []) porEstado[a.status] = (porEstado[a.status] ?? 0) + 1
    setConteos({ tipo: kindFilter ?? '', porEstado, total: (data.artifacts ?? []).length })
  }, [data, statusFilter, kindFilter])
  const conteosDelTipo = conteos && conteos.tipo === (kindFilter ?? '') ? conteos : null

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
        valor: 'todas',
        etiqueta: isEs ? 'Todas' : 'All',
        cuantos: conteosDelTipo?.total ?? (statusFilter === undefined ? total : null),
        fija: true,
        testid: 'cartas-pestana-todas',
      },
      ...STATUS_OPTIONS.map((st) => ({
        valor: st,
        etiqueta: STATUS_LABELS[st][isEs ? 'es' : 'en'],
        cuantos: statusFilter === st ? total : conteosDelTipo ? conteosDelTipo.porEstado[st] ?? 0 : null,
        tono: st === 'pending_human_review' ? ('aviso' as const) : undefined,
        testid: `cartas-pestana-${st}`,
      })),
    ],
    [conteosDelTipo, isEs, statusFilter, total],
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
  if (!isLoading && !hasFilters && artifacts.length === 0 && !error) {
    return (
      <CrossFade swapKey="vacio">
      <div className="p-6 lg:p-8 space-y-6">
        <EncabezadoDePantalla
          seccion="Cobranza"
          titulo={t('inmobiliaria.ai.cobranza.cartas.pageTitle')}
          descripcion={
            isEs
              ? 'Revisa y aprueba las cartas que preparó el agente antes de que salgan.'
              : 'Review and approve the letters the agent prepared before they go out.'
          }
        />
        <div className="space-y-3">
        <EmptyState
          icon={Envelope}
          title={t('inmobiliaria.ai.cobranza.cartas.empty.title')}
          description={t('inmobiliaria.ai.cobranza.cartas.empty.description')}
        />
        {/* COBRANZA-MANUAL (04-10-2026): la carta a mano sale desde el deudor. */}
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cobranza/deudores" data-testid="cartas-ir-a-casos">
              Ir a los casos para generar una carta
            </Link>
          </Button>
        </div>
        </div>
      </div>
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="lista">
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.cartas.pageTitle')}
        descripcion={
          isEs
            ? 'Revisa y aprueba las cartas que preparó el agente antes de que salgan.'
            : 'Review and approve the letters the agent prepared before they go out.'
        }
        acciones={
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cobranza/deudores" data-testid="cartas-ir-a-casos">
              {isEs ? 'Hacer una carta a mano' : 'Write a letter by hand'}
            </Link>
          </Button>
        }
      />

      {/* LA RESPUESTA: cuántas esperan tu revisión. */}
      {conteosDelTipo && conteosDelTipo.total > 0 ? (
        <CifraHeroe
          data-testid="cartas-por-revisar"
          rotulo={isEs ? 'Por revisar' : 'To review'}
          cifra={(conteosDelTipo.porEstado.pending_human_review ?? 0).toLocaleString(locale)}
          contexto={
            isEs
              ? `de ${conteosDelTipo.total.toLocaleString(locale)} ${conteosDelTipo.total === 1 ? 'carta' : 'cartas'}`
              : `of ${conteosDelTipo.total.toLocaleString(locale)} letters`
          }
          total={conteosDelTipo.total}
          tramos={STATUS_OPTIONS.map((st) => ({
            clave: st,
            etiqueta: STATUS_LABELS[st][isEs ? 'es' : 'en'],
            monto: conteosDelTipo.porEstado[st] ?? 0,
            tono:
              st === 'pending_human_review'
                ? ('aviso' as const)
                : st === 'sent'
                  ? ('exito' as const)
                  : ('neutro' as const),
            cifra: (conteosDelTipo.porEstado[st] ?? 0).toLocaleString(locale),
          }))}
        />
      ) : null}

      {/* Filters */}
      {/*
        Contenedor canónico del panel: UNA tarjeta con su barra de filtros, la
        tabla y el pie de paginación. Los filtros y el aviso de error vivían
        sueltos por encima y la pantalla se leía como bloques sin relación.
      */}
      <Card className="overflow-hidden">
      <div className="border-b border-border px-4 pt-3">
        <PestanasDeEstado<string>
          pestanas={pestanas}
          valor={statusFilter ?? 'todas'}
          onCambio={(v) => setStatusFilter(v === 'todas' ? undefined : (v as LegalArtifactStatus))}
          etiqueta={isEs ? 'Filtrar las cartas por estado' : 'Filter letters by status'}
        />
      </div>
      <div className="flex flex-wrap gap-3 border-b border-border px-4 py-3">
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

        <Presence show={hasFilters} direction="none" initial={false} className="self-center">
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
        </Presence>
      </div>

      {/* Error */}
      {/* C5 (r25): FalloDeCarga con «Intentar de nuevo», nunca el error crudo pegado a la frase. */}
      {error ? (
        <div className="border-b border-border">
          <FalloDeCarga error={falloDelTexto(error)} queEs="las cartas" onReintentar={() => refetch()} enmarcado={false} />
        </div>
      ) : null}

      {/* Table */}
        <div className="overflow-x-auto max-md:overflow-visible">
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
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
          {/* Filtrar o paginar: las filas entran escalonadas (techo 320 ms) y las que sobran salen. */}
          <TableBodyAnimado className="max-md:block">
            {artifacts.length === 0 && !isLoading && (
              <TableRowAnimada key="vacio" className="max-md:block">
                <TableCell colSpan={6} className="px-3 py-12 text-center max-md:block">
                  <p className="text-body-sm text-fg-muted">
                    {isEs
                      ? 'Sin cartas con los filtros seleccionados.'
                      : 'No letters match the selected filters.'}
                  </p>
                </TableCell>
              </TableRowAnimada>
            )}
            {pageItems.map((a) => (
              <TableRowAnimada
                key={a.id}
                onClick={() => navigateToCarta(a.id)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateToCarta(a.id)
                }}
                className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
              >
                <TableCell className="px-3 py-2 max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                  <span className="block text-fg">
                    {a.debtorName ?? (isEs ? 'Deudor no encontrado' : 'Debtor not found')}
                  </span>
                  {a.debtorDocument && (
                    <span className="block text-caption text-fg-muted font-mono tabular-nums">
                      {a.debtorDocument}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-fg whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                  {isEs
                    ? (KIND_LABELS[a.kind as LegalArtifactKind]?.es ?? a.kind)
                    : (KIND_LABELS[a.kind as LegalArtifactKind]?.en ?? a.kind)}
                  <span className="md:hidden"> · {fecha(a.generatedAt)}</span>
                </TableCell>
                <TableCell className="px-3 py-2 max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                  <Badge variant={statusBadgeVariant(a.status)}>
                    {isEs
                      ? (STATUS_LABELS[a.status as LegalArtifactStatus]?.es ?? a.status)
                      : (STATUS_LABELS[a.status as LegalArtifactStatus]?.en ?? a.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-caption text-fg-muted font-mono tabular-nums whitespace-nowrap max-md:hidden">
                  {fecha(a.generatedAt)}
                </TableCell>
                <TableCell className="px-3 py-2 text-caption text-fg-muted font-mono tabular-nums whitespace-nowrap max-md:hidden">
                  {a.sentAt ? fecha(a.sentAt) : '—'}
                </TableCell>
                <TableCell className="px-3 py-2 text-caption text-fg-muted max-md:hidden">
                  {a.physicalSendMethod
                    ? (isEs
                        ? SEND_METHOD_LABELS[a.physicalSendMethod]?.es
                        : SEND_METHOD_LABELS[a.physicalSendMethod]?.en) ??
                      a.physicalSendMethod
                    : '—'}
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

export default function CartasListPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <CartasContent />
    </PageGuard>
  )
}
