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

import { useEstadoEnLaUrl } from '@/lib/cobranza/use-estado-en-la-url'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { falloDelTexto } from '@/lib/cobranza/fallo-del-texto'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Envelope, MagnifyingGlass } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'
import { EmptyState } from '@/components/data-display/EmptyState'
import {
  Button,
  Badge,
  Input,
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
import { CajonDelCaso } from '@/components/inmobiliaria/cobranza/CajonDelCaso'
import CartaApprovalClient from './[id]/CartaApprovalClient'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { antiguedadDeLaCola, diasEnPalabras } from '@/lib/cobranza/antiguedad-de-la-cola'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { DebtorPicker, type PickedDebtor } from '@/components/inmobiliaria/cobranza/DebtorPicker'
import { GenerarCarta } from '@/components/cobranza-manual/GenerarCarta'

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
  // Revisora r25 (Cartas, UI): un solo nombre por documento, el mismo de Pendientes.
  pre_judicial_letter: { es: 'Carta prejurídica', en: 'Pre-judicial letter' },
  pre_bureau_notification: { es: 'Aviso antes del reporte a centrales', en: 'Notice before the credit bureau report' },
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

/**
 * «Hacer una carta a mano» (revisora r25, Cartas #3): antes el botón sólo
 * llevaba a la lista de Casos —prometía una acción y entregaba una
 * navegación—. Ahora se elige el deudor aquí mismo, con el buscador de la casa,
 * y «Generar carta» abre la MISMA pieza que usa la ficha del deudor
 * (`GenerarCarta`): sale en PDF con los datos reales y no se le envía a nadie.
 */
function CartaAMano({
  abierto,
  onOpenChange,
  onGenerada,
  isEs,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  onGenerada: () => void
  isEs: boolean
}) {
  const [deudor, setDeudor] = useState<PickedDebtor | null>(null)
  const [paraGenerar, setParaGenerar] = useState<PickedDebtor | null>(null)
  const cerrar = (v: boolean) => {
    onOpenChange(v)
    if (!v) setDeudor(null)
  }
  return (
    <>
      <Cajon abierto={abierto} onOpenChange={cerrar} tamano="sm" data-testid="carta-a-mano-cajon">
        <CajonCabecera
          titulo={isEs ? 'Hacer una carta a mano' : 'Write a letter by hand'}
          descripcion={
            isEs
              ? 'Elige a quién va. Sale en PDF con los datos reales y no se le envía a nadie.'
              : 'Choose who it is for. It comes out as a PDF with the real data and is not sent to anyone.'
          }
        />
        <CajonCuerpo className="space-y-2">
          <label htmlFor="carta-a-mano-deudor" className="text-body-sm font-medium text-fg">
            {isEs ? 'Deudor' : 'Debtor'}
          </label>
          <DebtorPicker inputId="carta-a-mano-deudor" value={deudor} onChange={setDeudor} />
        </CajonCuerpo>
        <CajonPie>
          <Button variant="outline" hideArrow onClick={() => cerrar(false)}>
            {isEs ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            hideArrow
            disabled={!deudor}
            onClick={() => {
              setParaGenerar(deudor)
              cerrar(false)
            }}
            data-testid="carta-a-mano-generar"
          >
            {isEs ? 'Generar carta' : 'Generate letter'}
          </Button>
        </CajonPie>
      </Cajon>
      {paraGenerar ? (
        <GenerarCarta
          abierto
          onCerrar={() => setParaGenerar(null)}
          debtorId={paraGenerar.id}
          debtorName={paraGenerar.fullName}
          onGenerada={onGenerada}
        />
      ) : null}
    </>
  )
}

function CartasContent() {
  const { t, locale } = useI18n()
  const isEs = locale.startsWith('es')

  const [kindFilter, setKindFilter] = useState<LegalArtifactKind | undefined>()
  const [cartaAMano, setCartaAMano] = useState(false)
  // Revisora r25 (Cartas #4, 7a): se busca por el deudor o su documento.
  const [busqueda, setBusqueda] = useState('')
  const [statusFilter, setStatusFilter] = useState<LegalArtifactStatus | undefined>()
  // C8 (r25): abre en «Por revisar» si hay alguna, y el filtro vive en la URL.
  const estadoUrl = useEstadoEnLaUrl<LegalArtifactStatus>(Object.keys(STATUS_LABELS) as LegalArtifactStatus[])
  useEffect(() => {
    if (estadoUrl.deLaUrl) setStatusFilter(estadoUrl.deLaUrl)
  }, [estadoUrl.deLaUrl])

  const { data, isLoading, error, refetch } = useLegalArtifacts({
    kind: kindFilter,
    status: statusFilter,
  })

  useAutoRefresh(refetch)


  // Ronda 30 (K4, Nico: «K4 cajón»): la fila abre la carta en un cajón grande con
  // su vista previa, sobre esta lista (antes `router.push` a `cartas/[id]`, que
  // sigue viva para los enlaces profundos). Al cerrarse, la lista se vuelve a leer.
  const [abierta, setAbierta] = useState<string | null>(null)
  const navigateToCarta = useCallback((id: string) => setAbierta(id), [])
  const cerrarElCajon = useCallback(() => {
    setAbierta(null)
    void refetch()
  }, [refetch])

  const todas = data?.artifacts ?? []
  const artifacts = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    if (!q) return todas
    return todas.filter(
      (a) =>
        (a.debtorName ?? '').toLocaleLowerCase('es').includes(q) ||
        (a.debtorDocument ?? '').toLocaleLowerCase('es').includes(q),
    )
  }, [todas, busqueda])

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
  } = useTablePagination(artifacts, { resetKey: `${kindFilter ?? ''}|${statusFilter ?? ''}|${busqueda}` })
  const hasFilters = kindFilter !== undefined || statusFilter !== undefined || busqueda.trim() !== ''

  // El conteo por estado se sabe cuando la lista viene sin filtro de estado
  // (trae todas). Se guarda por tipo de carta; con un estado elegido, el back
  // sólo trae ése y los demás quedan como estaban en la última lectura entera.
  const [conteos, setConteos] = useState<{
    tipo: string
    porEstado: Record<string, number>
    total: number
    /** Desde cuándo espera cada carta por revisar (para la antigüedad de la cola). */
    fechasPorRevisar: string[]
  } | null>(null)
  useEffect(() => {
    if (!data || statusFilter !== undefined) return
    const porEstado: Record<string, number> = {}
    for (const a of data.artifacts ?? []) porEstado[a.status] = (porEstado[a.status] ?? 0) + 1
    const fechasPorRevisar = (data.artifacts ?? [])
      .filter((a) => a.status === 'pending_human_review')
      .map((a) => a.generatedAt)
    setConteos({ tipo: kindFilter ?? '', porEstado, total: (data.artifacts ?? []).length, fechasPorRevisar })
    if (!estadoUrl.yaEligio() && (porEstado.pending_human_review ?? 0) > 0) {
      estadoUrl.marcarElegido()
      setStatusFilter('pending_human_review')
    }
  }, [data, statusFilter, kindFilter, estadoUrl])
  const conteosDelTipo = conteos && conteos.tipo === (kindFilter ?? '') ? conteos : null
  // Revisora r27 (K1 y K2): la cifra ya no repite el conteo de la pestaña «Por
  // revisar»; dice cuánto lleva esperando la más vieja, con tramos por antigüedad.
  const colaPorRevisar = useMemo(
    () => antiguedadDeLaCola(conteosDelTipo?.fechasPorRevisar ?? [], { es: isEs, locale, testid: 'cartas-por-revisar' }),
    [conteosDelTipo, isEs, locale],
  )

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
        {/* COBRANZA-MANUAL (04-10-2026): la carta a mano; se elige el deudor aquí. */}
        <div className="flex justify-center">
          <Button variant="outline" size="sm" hideArrow onClick={() => setCartaAMano(true)} data-testid="cartas-ir-a-casos">
            {isEs ? 'Hacer una carta a mano' : 'Write a letter by hand'}
          </Button>
        </div>
        </div>
        <CartaAMano abierto={cartaAMano} onOpenChange={setCartaAMano} onGenerada={() => void refetch()} isEs={isEs} />
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
          <Button variant="outline" size="sm" hideArrow onClick={() => setCartaAMano(true)} data-testid="cartas-ir-a-casos">
            {isEs ? 'Hacer una carta a mano' : 'Write a letter by hand'}
          </Button>
        }
      />
      <CartaAMano abierto={cartaAMano} onOpenChange={setCartaAMano} onGenerada={() => void refetch()} isEs={isEs} />

      {/*
        Contenedor canónico del panel: UNA tarjeta con LA RESPUESTA arriba, las
        pestañas, la barra de filtros, la tabla y el pie de paginación.
      */}
      <Card className="overflow-hidden">
      {/* C3 (r25): LA RESPUESTA dentro de la tarjeta, encima de las pestañas.
          Revisora r27 (K1 y K2): no repite el conteo de la pestaña; dice cuánto
          espera la carta más vieja y la barra la reparte por antigüedad. */}
      {conteosDelTipo && conteosDelTipo.total > 0 ? (
        <CifraHeroe
          className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
          data-testid="cartas-por-revisar"
          tamano="mediana"
          rotulo={isEs ? 'La carta más vieja por revisar espera' : 'The oldest letter to review has waited'}
          cifra={colaPorRevisar.masVieja === null ? '—' : diasEnPalabras(colaPorRevisar.masVieja, isEs)}
          tramos={colaPorRevisar.tramos}
          esCero={(conteosDelTipo.porEstado.pending_human_review ?? 0) === 0}
          cuandoEsCero={isEs ? 'No hay cartas por revisar.' : 'No letters to review.'}
        />
      ) : null}
      <div className="border-b border-border px-4 pt-3 empty:hidden">
        <PestanasDeEstado<string>
          pestanas={pestanas}
          valor={statusFilter ?? 'todas'}
          onCambio={(v) => {
            const st = v === 'todas' ? undefined : (v as LegalArtifactStatus)
            setStatusFilter(st)
            estadoUrl.escribir(st ?? null)
          }}
          etiqueta={isEs ? 'Filtrar las cartas por estado' : 'Filter letters by status'}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={isEs ? 'Buscar deudor o documento' : 'Search debtor or ID'}
            aria-label={isEs ? 'Buscar cartas por deudor o documento' : 'Search letters by debtor or ID'}
            className="pl-9"
            data-testid="cartas-buscar"
          />
        </div>
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
              setBusqueda('')
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

      <CajonDelCaso
        abierto={abierta !== null}
        onCerrar={cerrarElCajon}
        tamano="lg"
        titulo={t('inmobiliaria.ai.cobranza.cartas.title')}
        descripcion={isEs ? 'Lee la carta, elige cómo se entrega y apruébala o recházala.' : 'Read the letter, choose how it is delivered, and approve or reject it.'}
        data-testid="carta-cajon"
      >
        {abierta ? <CartaApprovalClient artifactId={abierta} enCajon onResuelto={cerrarElCajon} /> : null}
      </CajonDelCaso>
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
