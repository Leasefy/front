'use client'

/**
 * Bandeja de solicitudes ARCO — derechos de Habeas Data (Ley 1581 de 2012).
 *
 * Acá caen las solicitudes de las personas cuyos datos trata la inmobiliaria:
 * ver (Acceso), corregir (Rectificación), borrar (Cancelación) o dejar de usar
 * (Oposición). Cada una tiene un término legal en días hábiles, y responder
 * tarde es incumplimiento sancionable — por eso la pantalla ordena por plazo y
 * no por fecha de llegada, y por eso se actualiza sola.
 *
 * Datos: 100% del agente (`GET /api/agency/:id/arco/requests`). Sin mocks.
 * El polling vive en `useArcoRequests`; acá sólo se pinta.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowClockwise,
  CheckCircle,
  Clock,
  IdentificationCard,
  MagnifyingGlass,
  Scales,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { PageGuard } from '@/components/auth/PageGuard'
import { cn } from '@/lib/utils'
import {
  useArcoRequests,
  ARCO_TYPES,
  ARCO_URGENT_THRESHOLD_DAYS,
  type ArcoRequestRow,
  type ArcoRequestType,
  type ArcoSlaTerms,
} from '@/lib/hooks/cobranza/use-arco-requests'
import { ArcoStatusBadge } from '@/components/inmobiliaria/cobranza/ArcoStatusBadge'
import { SlaCountdownBadge } from '@/components/inmobiliaria/cobranza/SlaCountdownBadge'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type PasoExplicado } from '@/components/ui/pasos-explicados'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableHead,
  TableCell,
  TableRowAnimada,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { useEstadoEnLaUrl } from '@/lib/cobranza/use-estado-en-la-url'
import { fechaCorta, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import { useTr } from '@/lib/i18n/use-tr'
import { TablePagination } from '@/components/ui/pagination'
// Piezas que resuelve el design system: no rehacerlas a mano.
import { Callout, Card, Chip, CrossFade, Eyebrow, MonoLabel } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

const NS = 'inmobiliaria.ai.arco'


/**
 * Las filas son altas (dos líneas: tipo + qué significa, nombre + referencia),
 * así que 10 llena la pantalla sin obligar a hacer scroll para llegar al pie.
 */
const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 25, 50]

const TYPE_VARIANT: Record<ArcoRequestType, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  acceso: 'default',
  rectificacion: 'secondary',
  cancelacion: 'warning',
  oposicion: 'destructive',
}

// ─── Cabecera explicativa ─────────────────────────────────────────────────────

/**
 * «¿Cómo funciona?» — el viaje de una solicitud, detrás del botón del
 * encabezado (Nico, 05-10-2026: «eso no debe de estar ahí siempre […]
 * llévalas al botón que al dar clic abre drawer y explica mejor cada cosa»).
 * Era el párrafo «qué es esta bandeja» puesto en la cabecera; sus frases
 * siguen acá, repartidas en tres pasos.
 */
function ComoFuncionaArco({ terms }: { terms: ArcoSlaTerms }) {
  const { t } = useI18n()
  const pasos: PasoExplicado[] = [
    { id: 'paso1', icono: IdentificationCard, titulo: t(`${NS}.intro.paso1.title`), explicacion: t(`${NS}.intro.paso1.desc`) },
    { id: 'paso2', icono: Clock, titulo: t(`${NS}.intro.paso2.title`), explicacion: t(`${NS}.intro.paso2.desc`) },
    {
      id: 'paso3',
      icono: CheckCircle,
      titulo: t(`${NS}.intro.paso3.title`),
      explicacion: t(`${NS}.intro.paso3.desc`),
      quien: 'tu',
      tuParte: t(`${NS}.intro.paso3.tuParte`),
    },
  ]
  return (
    <ParaEntenderMas
      etiqueta={t('common.comoFunciona.boton')}
      titulo={t(`${NS}.intro.titulo`)}
      descripcion={t(`${NS}.intro.descripcion`)}
      variante="secundario"
    >
      <div className="space-y-6">
        <PasosExplicados data-testid="arco-como-funciona" pasos={pasos} />
        {/* Revisora r25 (ARCO #2): lo legal vive aquí, no abierto encima de la tabla. */}
        <IntroPanel terms={terms} />
      </div>
    </ParaEntenderMas>
  )
}

/**
 * Lo que esta bandeja TIENE que decir, siempre a la vista: la ley que la rige,
 * la consecuencia de responder tarde (aviso legal) y los plazos que se están
 * aplicando (datos reales). El «qué es esta pantalla» se fue al botón
 * «¿Cómo funciona?» del encabezado (05-10-2026).
 */
function IntroPanel({ terms }: { terms: ArcoSlaTerms }) {
  const { t } = useI18n()

  /**
   * Los plazos NO son una constante del front: se despejan de las solicitudes
   * reales (ver `deriveSlaTerms`). Si no hay ninguna de ese grupo, no hay de
   * dónde sacarlos y la línea no se pinta — antes que inventar un número que
   * la pantalla presentaría como un hecho legal.
   */
  const deadlines: Array<{ key: string; days: number }> = []
  if (terms.acceso != null) deadlines.push({ key: 'deadlineAcceso', days: terms.acceso })
  if (terms.reclamo != null) deadlines.push({ key: 'deadlineReclamo', days: terms.reclamo })

  return (
    <Callout
      icon={<Scales className="h-5 w-5" weight="duotone" aria-hidden="true" />}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
        <div className="min-w-0 flex-1 space-y-2">
          <Eyebrow>{t(`${NS}.intro.eyebrow`)}</Eyebrow>
          <p className="max-w-[62ch] text-body-sm leading-relaxed text-fg-muted">
            {t(`${NS}.intro.consequence`)}
          </p>
        </div>

        {deadlines.length > 0 && (
          <div className="shrink-0 space-y-2 md:w-64 md:border-l md:border-border md:pl-8">
            <MonoLabel className="text-fg-subtle">
              {t(`${NS}.intro.deadlinesTitle`)}
            </MonoLabel>
            <ul className="space-y-1.5">
              {deadlines.map(({ key, days }) => (
                <li key={key} className="text-body-sm text-fg-muted">
                  {t(`${NS}.intro.${key}`).replace('{days}', String(days))}
                </li>
              ))}
            </ul>
            <p className="text-caption leading-snug text-fg-subtle">
              {t(`${NS}.intro.deadlinesSource`)}
            </p>
          </div>
        )}
      </div>
    </Callout>
  )
}

// ─── Indicador de frescura ────────────────────────────────────────────────────

function formatUpdatedAgo(t: (k: string) => string, at: Date | null): string | null {
  if (!at) return null
  const minutes = Math.floor((Date.now() - at.getTime()) / 60_000)
  if (minutes < 1) return t(`${NS}.live.updatedJustNow`)
  if (minutes < 60) return t(`${NS}.live.updatedMinutes`).replace('{count}', String(minutes))
  return t(`${NS}.live.updatedHours`).replace('{count}', String(Math.floor(minutes / 60)))
}

// ─── Pestañas por estado (revisora r25, ARCO #3) ─────────────────────────────

/**
 * Lo que importa de una solicitud es su ESTADO y su plazo, no su tipo: las
 * pestañas van por estado, dentro de la tarjeta, y el tipo pasa a filtro.
 * «Vencen pronto» = vencidas + las que vencen en menos de
 * `ARCO_URGENT_THRESHOLD_DAYS` días hábiles, sin contar las que esperan que el
 * titular confirme su correo (su plazo no corre).
 */
type EstadoArco = 'vencen' | 'abiertas' | 'sin_confirmar' | 'cerradas' | 'todas'
const ESTADOS_ARCO: EstadoArco[] = ['vencen', 'abiertas', 'sin_confirmar', 'cerradas', 'todas']

const sinConfirmar = (r: ArcoRequestRow) => r.status === 'pending_email_verification'
const vencePronto = (r: ArcoRequestRow) => !r.isClosed && !sinConfirmar(r) && (r.isOverdue || r.isUrgent)

function deLaPestana(r: ArcoRequestRow, e: EstadoArco): boolean {
  if (e === 'vencen') return vencePronto(r)
  if (e === 'abiertas') return !r.isClosed
  if (e === 'sin_confirmar') return !r.isClosed && sinConfirmar(r)
  if (e === 'cerradas') return r.isClosed
  return true
}

const CELDA_390 = 'max-md:block max-md:p-0'

// ─── Pantalla ─────────────────────────────────────────────────────────────────

// ROLES (14-10-2026): pide `resolve-arco`, lo mismo que el micro. Sin el
// permiso el micro responde 403 y la pantalla parecía caída («No pudimos
// cargar las solicitudes» con todo en cero); ahora dice que no tiene acceso.
export default function ArcoInboxPage() {
  return (
    <PageGuard module="cotizador" action="resolve-arco">
      <BandejaArco />
    </PageGuard>
  )
}

function BandejaArco() {
  const { t } = useI18n()
  const tr = useTr()
  const { requests, slaTerms, isLoading, isRefreshing, error, lastUpdatedAt, refetch } = useArcoRequests()

  // C8 (r25): abre en «Vencen pronto» si hay alguna; el filtro vive en la URL.
  const estadoUrl = useEstadoEnLaUrl<EstadoArco>(ESTADOS_ARCO)
  const [elegido, setElegido] = useState<EstadoArco | null>(null)
  const [tipo, setTipo] = useState<ArcoRequestType | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // LA RESPUESTA y su barra: las abiertas, partidas sin solaparse.
  const cuentas = useMemo(() => {
    const abiertas = requests.filter((r) => !r.isClosed)
    const esperan = abiertas.filter(sinConfirmar)
    const corren = abiertas.filter((r) => !sinConfirmar(r))
    const vencidas = corren.filter((r) => r.isOverdue).length
    const porVencer = corren.filter((r) => r.isUrgent).length
    return {
      abiertas: abiertas.length,
      sinConfirmar: esperan.length,
      vencidas,
      porVencer,
      enPlazo: corren.length - vencidas - porVencer,
      cerradas: requests.length - abiertas.length,
    }
  }, [requests])
  const vencen = cuentas.vencidas + cuentas.porVencer

  const estado: EstadoArco = elegido ?? estadoUrl.deLaUrl ?? (vencen > 0 ? 'vencen' : 'abiertas')
  const cambiarEstado = (e: EstadoArco) => {
    setElegido(e)
    estadoUrl.escribir(e)
    setPage(1)
  }

  const filteredRows = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es')
    return requests.filter(
      (r) =>
        deLaPestana(r, estado) &&
        (tipo === null || r.type === tipo) &&
        (q === '' || r.requesterName.toLocaleLowerCase('es').includes(q)),
    )
  }, [requests, estado, tipo, busqueda])

  /**
   * Página efectiva, acotada al total actual: cambiar de pestaña o el polling
   * cada minuto pueden achicar la lista sin que el usuario toque el paginador.
   */
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage, pageSize],
  )

  const updatedAgo = formatUpdatedAgo(t, lastUpdatedAt)
  const lineaDelPlazo =
    cuentas.vencidas > 0
      ? t(`${NS}.attention.${cuentas.vencidas === 1 ? 'overdueTitle' : 'overdueTitlePlural'}`).replace('{count}', String(cuentas.vencidas))
      : cuentas.porVencer > 0
        ? t(`${NS}.attention.${cuentas.porVencer === 1 ? 'urgentTitle' : 'urgentTitlePlural'}`)
            .replace('{count}', String(cuentas.porVencer))
            .replace('{days}', String(ARCO_URGENT_THRESHOLD_DAYS))
        : null

  // Primera carga: esqueleto. Los refetch posteriores no desmontan la vista.
  if (isLoading && requests.length === 0 && !error) {
    return (
      <CrossFade swapKey="esqueleto">
        <PageSkeleton variant="list" />
      </CrossFade>
    )
  }

  const fecha = (iso: string) => fechaCorta(diaEnColombia(iso))

  return (
    <CrossFade swapKey="bandeja">
    <div className="space-y-6 p-6 lg:p-8">
      {/* El título es el del riel («Habeas Data», C2); la descripción dice qué son. */}
      <EncabezadoDePantalla
        seccion="Cobranza · Cumplimiento"
        titulo={t('inmobiliaria.ai.nav.arco')}
        descripcion={tr('Las solicitudes de los titulares para ver, corregir, borrar u oponerse al uso de sus datos personales, con el plazo que pone la ley.')}
        junto={
          <span className="flex items-center gap-1.5 text-caption text-fg-subtle" aria-live="polite">
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                isRefreshing ? 'animate-pulse bg-primary' : 'bg-success',
              )}
              aria-hidden="true"
            />
            {isRefreshing ? t(`${NS}.live.refreshing`) : updatedAgo ?? t(`${NS}.live.auto`)}
          </span>
        }
        ayuda={<ComoFuncionaArco terms={slaTerms} />}
        acciones={
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={() => void refetch()}
            disabled={isRefreshing}
            aria-label={t('common.refresh')}
          >
            <ArrowClockwise
              className={cn('mr-1.5 h-4 w-4', isRefreshing && 'animate-spin')}
              weight="regular"
              aria-hidden="true"
            />
            {t('common.refresh')}
          </Button>
        }
        data-testid="arco-encabezado"
      />

      {/* Error: no reemplaza la tabla — los datos viejos siguen sirviendo. Sin
          nada cargado, el cartel de la casa con su reintento. */}
      {error && requests.length === 0 ? (
        <FalloDeCarga error={new Error(t(`${NS}.error.load`))} queEs="las solicitudes de datos personales" onReintentar={() => refetch()} />
      ) : (
        <Card className="overflow-hidden">
          {error ? (
            <div className="border-b border-border">
              <FalloDeCarga error={new Error(t(`${NS}.error.load`))} queEs="las solicitudes más nuevas" onReintentar={() => refetch()} enmarcado={false} />
            </div>
          ) : null}

          {/* 1 · LA RESPUESTA (revisora r25, ARCO #1): antes cuatro KpiCard del
              mismo peso, una de ellas «Cerradas», que no cambia ninguna
              decisión; y el cartel de atención aparte. Ahora UNA cifra con su
              barra, y el cartel es su pie. */}
          {cuentas.abiertas > 0 ? (
            <CifraHeroe
              className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
              data-testid="arco-vencen-pronto"
              tamano="mediana"
              rotulo={tr('Vencen pronto')}
              cifra={vencen.toLocaleString('es-CO')}
              contexto={cuentas.abiertas === 1 ? tr('de 1 abierta') : tr('de {n} abiertas', { n: cuentas.abiertas.toLocaleString('es-CO') })}
              total={cuentas.abiertas}
              tramos={[
                { clave: 'vencidas', etiqueta: tr('Vencidas'), monto: cuentas.vencidas, tono: 'critico', cifra: cuentas.vencidas.toLocaleString('es-CO') },
                { clave: 'por-vencer', etiqueta: tr('Por vencer'), monto: cuentas.porVencer, tono: 'aviso', cifra: cuentas.porVencer.toLocaleString('es-CO') },
                { clave: 'en-plazo', etiqueta: tr('En plazo'), monto: cuentas.enPlazo, tono: 'exito', cifra: cuentas.enPlazo.toLocaleString('es-CO') },
                { clave: 'sin-confirmar', etiqueta: tr('Sin confirmar el correo'), monto: cuentas.sinConfirmar, tono: 'neutro', cifra: cuentas.sinConfirmar.toLocaleString('es-CO') },
              ]}
              esCero={vencen === 0}
              cuandoEsCero={tr('Ninguna vence pronto: las {n} abiertas están en plazo.', { n: cuentas.abiertas.toLocaleString('es-CO') })}
              pie={lineaDelPlazo ? <span className="text-fg">{lineaDelPlazo}</span> : undefined}
            />
          ) : null}

          {/* 2 · Las pestañas por estado, con su conteo */}
          <div className="border-b border-border px-4 py-3">
            <PestanasDeEstado<EstadoArco>
              data-testid="arco-pestanas"
              etiqueta={tr('Filtrar las solicitudes por estado')}
              valor={estado}
              onCambio={cambiarEstado}
              pestanas={[
                { valor: 'vencen', etiqueta: tr('Vencen pronto'), cuantos: vencen, tono: 'aviso', testid: 'arco-pestana-vencen' },
                { valor: 'abiertas', etiqueta: tr('Abiertas'), cuantos: cuentas.abiertas, fija: true, testid: 'arco-pestana-abiertas' },
                { valor: 'sin_confirmar', etiqueta: tr('Sin confirmar el correo'), cuantos: cuentas.sinConfirmar, testid: 'arco-pestana-sin-confirmar' },
                { valor: 'cerradas', etiqueta: tr('Cerradas'), cuantos: cuentas.cerradas, testid: 'arco-pestana-cerradas' },
                { valor: 'todas', etiqueta: tr('Todas'), cuantos: requests.length, fija: true, testid: 'arco-pestana-todas' },
              ]}
            />
          </div>

          {/* 3 · Buscar y el tipo, como filtro */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center">
            <div className="relative w-full md:w-64">
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <Input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPage(1)
                }}
                placeholder={tr('Buscar titular')}
                aria-label={tr('Buscar solicitudes por titular')}
                className="pl-9"
                data-testid="arco-buscar"
              />
            </div>
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">{tr('Tipo de solicitud')}</legend>
              {ARCO_TYPES.map((tp) => (
                <Chip
                  key={tp}
                  size="sm"
                  selected={tipo === tp}
                  onClick={() => {
                    setTipo((prev) => (prev === tp ? null : tp))
                    setPage(1)
                  }}
                  data-testid={`arco-tipo-${tp}`}
                >
                  {t(`${NS}.type.${tp}`)}
                </Chip>
              ))}
            </fieldset>
          </div>

          {/* 4 · La tabla; a 390, tarjetas (revisora r25, ARCO #4) */}
          <CrossFade swapKey={filteredRows.length === 0 ? `vacio-${estado}` : 'tabla'}>
          {filteredRows.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={requests.length === 0 ? t(`${NS}.empty.title`) : tr('Ninguna solicitud con este filtro')}
              description={requests.length === 0 ? t(`${NS}.empty.body`) : tr('Cambia la pestaña, el tipo o la búsqueda para ver las demás.')}
            />
          ) : (
            <div className="overflow-x-auto max-md:overflow-visible">
              <Table className="min-w-full max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead className="px-4 py-2.5">{t(`${NS}.table.requester`)}</TableHead>
                    <TableHead className="px-4 py-2.5">{t(`${NS}.table.type`)}</TableHead>
                    <TableHead className="px-4 py-2.5">{t(`${NS}.table.status`)}</TableHead>
                    <TableHead className="px-4 py-2.5">{t(`${NS}.table.sla`)}</TableHead>
                    <TableHead className="px-4 py-2.5">{t(`${NS}.table.submitted`)}</TableHead>
                  </TableRow>
                </TableHeader>
                {/* Cambiar de pestaña, filtrar o paginar: las filas entran escalonadas (techo 320 ms). */}
                <TableBodyAnimado className="max-md:block">
                  {visibleRows.map((row) => (
                    <TableRowAnimada
                      key={row.id}
                      data-testid={`arco-fila-${row.id}`}
                      className={cn(
                        'transition-colors hover:bg-surface-muted',
                        'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0',
                        // Franja izquierda: el estado del plazo se lee sin recorrer la fila.
                        row.isOverdue && !row.isClosed && 'border-l-2 border-l-danger',
                        row.isUrgent && 'border-l-2 border-l-warning',
                      )}
                    >
                      <TableCell className={cn('min-w-[180px] px-4 py-3 max-md:col-start-1 max-md:row-start-1', CELDA_390)}>
                        {/* QA-AGENTES 16-10: el nombre abre la solicitud. Sin
                            «Ref.» del hash de la cédula (bloqueante r25). */}
                        <Link
                          href={`/panel/inmobiliaria/pagos/cobranza/arco/${row.id}`}
                          className="text-body-sm font-medium text-fg hover:underline"
                          aria-label={t(`${NS}.actions.view`).replace('{name}', row.requesterName)}
                        >
                          {row.requesterName}
                        </Link>
                      </TableCell>
                      <TableCell className={cn('px-4 py-3 max-md:col-start-1 max-md:row-start-2', CELDA_390)}>
                        <Badge variant={TYPE_VARIANT[row.type]}>{t(`${NS}.type.${row.type}`)}</Badge>
                        <p className="mt-1 text-caption leading-snug text-fg-subtle max-md:hidden">
                          {t(`${NS}.typeMeaning.${row.type}`)}
                        </p>
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap px-4 py-3 max-md:col-start-2 max-md:row-start-1 max-md:text-right', CELDA_390)}>
                        <ArcoStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap px-4 py-3 max-md:col-start-2 max-md:row-start-2 max-md:text-right', CELDA_390)}>
                        <SlaCountdownBadge
                          remainingDays={row.slaRemainingDays}
                          isClosed={row.isClosed}
                          isPaused={sinConfirmar(row)}
                        />
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap px-4 py-3 max-md:col-span-2 max-md:row-start-3', CELDA_390)}>
                        <span className="font-mono text-caption tabular-nums text-fg-muted">
                          <span className="md:hidden">{tr('Llegó el')} </span>
                          {fecha(row.submittedAt)}
                        </span>
                      </TableCell>
                    </TableRowAnimada>
                  ))}
                </TableBodyAnimado>
              </Table>
            </div>
          )}
          </CrossFade>

          {/* El pie dice «Mostrando 1–3 de 3» y deja elegir cuántas ver (Nico, 2026-09-02). */}
          {filteredRows.length > 0 ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={filteredRows.length}
                page={safePage}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            </div>
          ) : null}
        </Card>
      )}
    </div>
    </CrossFade>
  )
}
