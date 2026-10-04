'use client'

/**
 * /conciliacion/cola — «Por revisar»: la cola humana de la conciliación.
 *
 * Cableada a los endpoints reales de Build C (NO al adaptador de work-items —
 * el bulk-confirm opera sobre ids de ReconciliationMatch que la cola unificada
 * no expone):
 *
 *   GET  /api/agency/{id}/conciliacion/queue?caseType=…        (lista, filtrada)
 *   POST /api/agency/{id}/conciliacion/queue/bulk-confirm      (lote)
 *   POST /api/agency/{id}/conciliacion/queue/{matchId}/confirm (aprobar una)
 *   POST /api/agency/{id}/conciliacion/queue/{matchId}/reject  (rechazar una)
 *
 * ── Qué cambió y por qué (Nico, 2026-09-03) ─────────────────────────────────
 * Esto eran tarjetas apiladas con un KPI suelto «0 Pendientes» al lado del
 * título: ni se leía como las demás listas del panel ni tenía paginación. Ahora
 * es la tabla estándar —filtros dentro de la misma tarjeta, vacío dentro del
 * cuerpo para que los encabezados sigan a la vista, pie con paginación— y el
 * KPI suelto se fue: el pie de la tabla ya dice cuántos hay, y la Sala también.
 *
 * FAIL-SOFT (regla de oro): el backend puede no estar desplegado → el GET puede
 * fallar. Se muestra el fallo con reintento, nunca un «no hay nada» que sería
 * mentira sobre plata. Una acción que falla avisa por toast y deja la fila.
 */

import { useMemo, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { CheckCircle, ShieldCheck, XCircle } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useExtractoDelBack } from '@/lib/hooks/conciliacion/use-extracto-del-back'
import {
  LARGO_MAXIMO_DEL_MOTIVO_DE_RECHAZO,
  LARGO_MINIMO_DEL_MOTIVO_DE_RECHAZO,
} from '@/lib/hooks/conciliacion/limites-de-la-conciliacion'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { Chip, Presence } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  useConciliacionQueue,
  type ConciliacionQueueItem,
  type ConciliacionCaseType,
} from '@/lib/hooks/conciliacion/use-conciliacion-queue'
import {
  useConciliacionBulk,
  BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR,
} from '@/lib/hooks/conciliacion/use-conciliacion-bulk'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'

// ── Taxonomía de excepciones (los 7 caseTypes, set cerrado) ──────────────────
// Copy en español literal (contrato §9 — ES-first, sin keys t() nuevas).

type CaseTypeFilter = ConciliacionCaseType | 'todos'

const CASE_TYPE_FILTERS: ReadonlyArray<{ value: CaseTypeFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'parcial', label: 'Pago parcial' },
  { value: 'duplicado', label: 'Duplicado' },
  { value: 'diferencia_monto', label: 'Diferencia de monto' },
  { value: 'fuera_de_fecha', label: 'Fuera de fecha' },
  { value: 'sin_identificar', label: 'Sin identificar' },
  { value: 'multiple', label: 'Múltiple' },
  { value: 'comision', label: 'Comisión' },
]

const CASE_TYPE_LABEL: Record<string, string> = {
  parcial: 'Pago parcial',
  duplicado: 'Duplicado',
  diferencia_monto: 'Diferencia de monto',
  fuera_de_fecha: 'Fuera de fecha',
  sin_identificar: 'Sin identificar',
  multiple: 'Múltiple',
  comision: 'Comisión',
}

/** Tono del badge por tipo de caso (tokens del DS, cero hex). */
const CASE_TYPE_PILL: Record<string, string> = {
  parcial: 'bg-warning/10 text-warning',
  duplicado: 'bg-surface-muted text-fg-muted',
  diferencia_monto: 'bg-danger/10 text-danger',
  fuera_de_fecha: 'bg-surface-muted text-fg-muted',
  sin_identificar: 'bg-surface-muted text-fg-muted',
  multiple: 'bg-warning/10 text-warning',
  comision: 'bg-surface-muted text-fg-muted',
}

const COLUMNAS = [
  'Fecha',
  'Movimiento',
  'Monto',
  'Tipo',
  'Sugerencia del agente',
  'Acciones',
] as const

// ── Formato ──────────────────────────────────────────────────────────────────

function fmtCop(val: number): string {
  return plataEnPantalla('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

/** Un cruce sugerido en o por encima del piso de alta confianza → va al lote. */
function isBulkEligible(item: ConciliacionQueueItem): boolean {
  return item.status === 'suggested' && item.confidenceScore >= BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR
}

/**
 * 🔴 Sólo alta, media o baja (Nico, C1-MEDIR Q1, 03-10-2026: «si hay número,
 * el medido»). El puntaje del agente es una fórmula que nadie midió contra lo
 * que acierta, así que no se muestra. «Alta» es lo que entra al lote (el mismo
 * piso de `isBulkEligible`); «media» desde 0,50.
 */
function nivelDelCruce(score: number | null | undefined): 'alta' | 'media' | 'baja' {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 0
  if (s >= BULK_CONFIRM_HIGH_CONFIDENCE_FLOOR) return 'alta'
  if (s >= 0.5) return 'media'
  return 'baja'
}

// ── Página ───────────────────────────────────────────────────────────────────

function ConciliacionCola() {
  // Quién sabe si hay extracto es el BACK, no el agente. Ver el hook.
  const { hayExtracto } = useExtractoDelBack()
  const { t } = useI18n()

  const [caseFilter, setCaseFilter] = useState<CaseTypeFilter>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // T-323: confirmar-antes-de-aplicar. El lote pide un SEGUNDO clic humano: el
  // primero arma la confirmación, el segundo ejecuta.
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  /** Fila con una acción en vuelo (aprobar / rechazar). */
  const [busyRow, setBusyRow] = useState<string | null>(null)
  /** Fila cuyo rechazo está pidiendo motivo. */
  const [rechazando, setRechazando] = useState<ConciliacionQueueItem | null>(null)
  const [motivo, setMotivo] = useState('')
  /** Lo que el micro dijo del motivo (un 400 con `campos`): va debajo del campo. */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null)

  const queueFilters = useMemo(
    () => ({
      status: 'suggested' as const,
      ...(caseFilter !== 'todos' ? { caseType: caseFilter } : {}),
      pageSize: 100,
    }),
    [caseFilter],
  )

  const { items, isLoading, error, errorCrudo, refetch, confirmMatch, rejectMatch } =
    useConciliacionQueue(queueFilters)
  const { bulkConfirmByIds } = useConciliacionBulk()

  // El recorte es de presentación: el filtro ya viajó al backend, así que el
  // `resetKey` es el propio filtro — cambiarlo vuelve a la página 1.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(items, { resetKey: caseFilter })

  const eligibleItems = useMemo(() => items.filter(isBulkEligible), [items])
  const eligibleIds = useMemo(() => eligibleItems.map((i) => i.id), [eligibleItems])

  // Sólo cuentan las selecciones que siguen existiendo y siendo elegibles
  // (seguridad post-refetch).
  const selectedEligible = useMemo(
    () => eligibleIds.filter((id) => selected.has(id)),
    [eligibleIds, selected],
  )
  const allEligibleSelected = eligibleIds.length > 0 && selectedEligible.length === eligibleIds.length

  function toggleOne(id: string) {
    setArmed(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setArmed(false)
    setSelected((prev) => {
      if (eligibleIds.every((id) => prev.has(id))) return new Set()
      return new Set(eligibleIds)
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setArmed(false)
  }

  async function runBulkConfirm() {
    const ids = selectedEligible
    if (ids.length === 0) return
    setBusy(true)
    const result = await bulkConfirmByIds(ids)
    setBusy(false)
    setArmed(false)

    if (!result.ok) {
      toast.error(
        result.error === 'not_configured'
          ? 'No se pudo confirmar: servicio no configurado.'
          : // Con la regla de oro; antes: «No se pudo confirmar la selección (500).»
            mensajeParaLaPersona(result.fallo, {
              porDefecto: 'No se pudo confirmar la selección.',
              accion: 'confirmar la selección',
            }),
      )
      return
    }

    if (result.fallidos.length === 0) {
      toast.success(
        result.confirmados === 1 ? '1 cruce confirmado.' : `${result.confirmados} cruces confirmados.`,
      )
    } else {
      toast.warning(`${result.confirmados} confirmados · ${result.fallidos.length} con error.`)
    }
    clearSelection()
    await refetch()
  }

  /** Aprobar una fila — el hook recarga la cola al terminar. */
  async function aprobar(item: ConciliacionQueueItem) {
    setBusyRow(item.id)
    const res = await confirmMatch(item.id)
    setBusyRow(null)
    if (res.ok) toast.success('Cruce aprobado.')
    // Con la regla de oro; antes: «No se pudo aprobar el cruce (403).»
    else toast.error(mensajeParaLaPersona(res.fallo, { porDefecto: 'No se pudo aprobar el cruce.', accion: 'aprobar el cruce' }))
  }

  /** Rechazar pide motivo: el backend lo exige y queda en la auditoría. */
  async function rechazar() {
    const item = rechazando
    const razon = motivo.trim()
    if (!item || razon.length < LARGO_MINIMO_DEL_MOTIVO_DE_RECHAZO) return
    setBusyRow(item.id)
    const res = await rejectMatch(item.id, razon)
    setBusyRow(null)
    if (res.ok) {
      setRechazando(null)
      setMotivo('')
      setErrorDelMotivo(null)
      toast.success('Cruce rechazado.')
      return
    }
    // Si no salió, el diálogo queda abierto con lo escrito (antes se cerraba
    // y el motivo se perdía). Lo que el micro dijo del motivo va debajo del
    // campo, con el foco; lo demás, con la regla de oro, al toast. Antes:
    // «No se pudo rechazar el cruce (reject_failed).»
    const reparto = repartirErroresDelServidor<'motivo'>(res.fallo, {
      mapa: { reason: 'motivo' },
      campos: ['motivo'],
      porDefecto: 'No se pudo rechazar el cruce.',
      accion: 'rechazar el cruce',
    })
    setErrorDelMotivo(reparto.porCampo.motivo ?? null)
    if (reparto.porCampo.motivo) document.getElementById('motivo-rechazo')?.focus()
    if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado — el conteo lo dice el pie de la tabla, no un KPI suelto. */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.ai.workspace.pages.conciliacion.colaTitle')}
        </h1>
        <p className="text-body text-fg-muted max-w-2xl">
          {t('inmobiliaria.ai.workspace.pages.conciliacion.colaDesc')}
        </p>
      </header>

      <section
        /* 🔴 `overflow-x-clip`, NO `overflow-hidden`: con `hidden` esta
           tarjeta se vuelve el contenedor de desplazamiento más cercano y el
           pie pegajoso de adentro deja de medirse contra la ventana. */
        className="rounded-lg border border-border bg-surface overflow-x-clip"
      >
        {/* Filtros — dentro de la tarjeta, encima de la tabla. */}
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border p-4"
          role="group"
          aria-label="Filtrar por tipo de caso"
        >
          {CASE_TYPE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              selected={caseFilter === f.value}
              onClick={() => {
                setCaseFilter(f.value)
                clearSelection()
              }}
            >
              {f.label}
            </Chip>
          ))}
        </div>

        {/* Carga y fallo por fuera del cuerpo; el vacío va DENTRO, para que los
            encabezados de la tabla se sigan viendo. */}
        <EstadoDeDatos
          cargando={isLoading}
          /* ARREGLOS-8 (ARREGLOS-4 Q1 A): el error ENTERO (con el micro caído
             dice «El asistente de Leasefy no está disponible», no «Fue un
             problema nuestro»). */
          error={errorCrudo ?? error}
          queEs="la cola de conciliación"
          onReintentar={refetch}
          esqueleto={
            <div className="flex items-center justify-center py-16" data-testid="conciliacion-cola-loading">
              <Spinner />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-label="Seleccionar" />
                {COLUMNAS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBodyAnimado>
              {items.length === 0 ? (
                <TableRow key="vacio">
                  <TableCell colSpan={COLUMNAS.length + 1} className="p-0">
                    <SinDatos
                      hayFiltros={caseFilter !== 'todos'}
                      queSon="casos"
                      icono={CheckCircle}
                      titulo="Nada por revisar"
                      /*
                       * 🔴 21-09-2026, abriendo esta pestaña: decía «Nada por
                       * revisar. Sube un extracto del banco…» con un extracto
                       * cargado y tres movimientos esperando. Es la MISMA
                       * frase falsa que el Resumen decía el 20-09, en otra
                       * pantalla: quien sabe si hay extracto es el back, no el
                       * agente. Con extracto cargado, la cola vacía es una
                       * buena noticia y se dice como tal.
                       */
                      descripcion={
                        hayExtracto
                          ? 'El agente cruzó lo que llegó del banco y no dejó nada dudoso. Los movimientos sin cruzar están en Movimientos.'
                          : t('inmobiliaria.ai.workspace.pages.conciliacion.colaEmptyHint')
                      }
                      crear={{
                        label: hayExtracto
                          ? 'Ver los movimientos'
                          : t('inmobiliaria.ai.workspace.pages.conciliacion.accionTitle'),
                        href: '/panel/inmobiliaria/conciliacion/movimientos',
                      }}
                      onLimpiarFiltros={() => {
                        setCaseFilter('todos')
                        clearSelection()
                      }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((item) => {
                  const elegible = isBulkEligible(item)
                  const nivel = nivelDelCruce(item.confidenceScore)
                  const caso = item.caseType ?? null
                  const filaOcupada = busyRow === item.id
                  return (
                    <TableRowAnimada
                      key={item.id}
                      className={cn(filaOcupada && 'opacity-60')}
                      data-testid={`conciliacion-row-${item.id}`}
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          checked={elegible && selected.has(item.id)}
                          disabled={!elegible}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={
                            elegible
                              ? 'Seleccionar para confirmar'
                              : 'No elegible para confirmación masiva'
                          }
                        />
                      </TableCell>

                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {fmtDate(item.movement.valueDate)}
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <p className="truncate font-medium text-fg">
                          {item.movement.description?.trim() || 'Movimiento sin descripción'}
                        </p>
                        {item.movement.reference && (
                          <p className="truncate text-caption text-fg-muted">
                            Ref. {item.movement.reference}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap tabular-nums text-fg">
                        {fmtCop(item.movement.amountCop)}
                        {item.matchedAmountCop !== item.movement.amountCop && (
                          <span className="block text-caption text-fg-muted">
                            Cruzado: {fmtCop(item.matchedAmountCop)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {caso ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                              CASE_TYPE_PILL[caso] ?? 'bg-surface-muted text-fg-muted',
                            )}
                          >
                            {CASE_TYPE_LABEL[caso] ?? caso}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </TableCell>

                      {/* Lo que propone el agente: contra qué contrato cruzó y
                          con cuánta confianza. El backend no devuelve el cobro
                          ni el inmueble, así que no se enlaza lo que no hay. */}
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-fg" title={item.domain}>
                          {item.domain || 'Sin cruce sugerido'}
                        </p>
                        <p
                          className={cn(
                            'text-caption tabular-nums',
                            elegible ? 'text-success' : 'text-fg-muted',
                          )}
                        >
                          Confianza {nivel}
                        </p>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            disabled={filaOcupada || busy}
                            onClick={() => void aprobar(item)}
                            aria-label={`Aprobar el cruce de ${item.movement.description ?? item.domain}`}
                          >
                            <CheckCircle className="size-4" aria-hidden="true" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            hideArrow
                            disabled={filaOcupada || busy}
                            onClick={() => {
                              setRechazando(item)
                              setMotivo('')
                            }}
                            aria-label={`Rechazar el cruce de ${item.movement.description ?? item.domain}`}
                          >
                            <XCircle className="size-4" aria-hidden="true" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRowAnimada>
                  )
                })
              )}
            </TableBodyAnimado>
          </Table>

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
        {/* 🔴 19-09 · La acción masiva, en la MISMA pieza que el resto del panel
            (`BarraDeAccionesMasivas`) y DENTRO de la tabla, como su último
            renglón. Antes era una franja gris ENCIMA de la tabla que además
            desaparecía cuando no había nada marcado: marcando en la fila 30,
            el botón que confirma quedaba fuera de la pantalla.
            Nico: «este tipo de tablas que tienen acciones masivas deben de verse
            muy bien y que sí estén juntas […] revisa también el resto de tablas
            para que tengan consistencia».

            El tilde de «seleccionar todos» se volvió un BOTÓN: el estado —cuántos
            hay marcados— ya lo dice la barra, así que el control sólo tenía que
            saber hacer una cosa, y «marcar los 12 de alta confianza» se lee sin
            tener que interpretar un tilde a medias. */}
        {/* La barra SALE animada cuando ya no queda nada elegible (D-MOV 4 a).
            La caja de `Presence` es la que se pega al borde de abajo. */}
        <Presence
          show={!isLoading && !error && eligibleIds.length > 0}
          initial={false}
          className="sticky bottom-0 z-30"
        >
          <BarraDeAccionesMasivas
            variant="pie"
            testid="conciliacion-acciones"
            marcadas={selectedEligible.length}
            queSon={['cruce', 'cruces']}
            onQuitar={clearSelection}
            ocupado={busy}
            cuandoNoHayNada={`Ningún cruce marcado. Hay ${eligibleIds.length} de alta confianza que se pueden confirmar en lote.`}
            nota={
              armed ? (
                <p className="text-caption text-warning" data-testid="conciliacion-confirmar-de-verdad">
                  Se van a dar por buenos {selectedEligible.length}{' '}
                  {selectedEligible.length === 1 ? 'cruce' : 'cruces'} de una vez. No se
                  deshace en lote: cada uno se rechaza después de a uno.
                </p>
              ) : null
            }
          >
            {!armed && !allEligibleSelected && (
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={toggleAll}
                disabled={busy}
                data-testid="conciliacion-marcar-elegibles"
              >
                Marcar {eligibleIds.length === 1 ? 'el de' : `los ${eligibleIds.length} de`} confianza
                alta
              </Button>
            )}
            {armed ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => setArmed(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button size="sm" hideArrow isLoading={busy} onClick={() => void runBulkConfirm()}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Sí, confirmar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                hideArrow
                disabled={selectedEligible.length === 0 || busy}
                onClick={() => setArmed(true)}
                data-testid="conciliacion-confirmar-lote"
              >
                <CheckCircle className="size-4" aria-hidden="true" />
                Confirmar {selectedEligible.length > 0 ? selectedEligible.length : 'lo marcado'}
              </Button>
            )}
          </BarraDeAccionesMasivas>
        </Presence>
        </EstadoDeDatos>
      </section>


      {/* Rechazar pide motivo (obligatorio en el backend, queda en auditoría). */}
      <Dialog
        open={rechazando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setRechazando(null)
            setMotivo('')
            setErrorDelMotivo(null)
          }
        }}
      >
        <DialogContent variant="destructive" icon={<XCircle weight="bold" />}>
          <DialogHeader>
            <DialogTitle>Rechazar el cruce</DialogTitle>
            <DialogDescription>
              {rechazando
                ? `«${rechazando.movement.description?.trim() || 'Movimiento sin descripción'}». `
                : ''}
              El movimiento vuelve a quedar sin identificar y el motivo queda registrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              id="motivo-rechazo"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                setErrorDelMotivo(null)
              }}
              placeholder="No es el pago de ese contrato."
              rows={3}
              maxLength={LARGO_MAXIMO_DEL_MOTIVO_DE_RECHAZO}
              aria-label="Motivo del rechazo"
              {...(errorDelMotivo
                ? { 'aria-invalid': true as const, 'aria-describedby': 'motivo-rechazo-error' }
                : {})}
            />
            {/* La ayuda y el error del micro se cruzan (ver ErrorDelCampo). */}
            <ErrorDelCampo
              id="motivo-rechazo-error"
              mensaje={errorDelMotivo}
              pista={`Entre ${LARGO_MINIMO_DEL_MOTIVO_DE_RECHAZO} y ${LARGO_MAXIMO_DEL_MOTIVO_DE_RECHAZO} caracteres.`}
              className="mt-0 text-caption"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              disabled={busyRow !== null}
              onClick={() => {
                setRechazando(null)
                setMotivo('')
                setErrorDelMotivo(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              hideArrow
              variant="destructive"
              isLoading={rechazando !== null && busyRow === rechazando.id}
              disabled={motivo.trim().length < LARGO_MINIMO_DEL_MOTIVO_DE_RECHAZO || busyRow !== null}
              onClick={() => void rechazar()}
              data-testid="conciliacion-confirmar-rechazo"
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ConciliacionColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionCola />
    </PageGuard>
  )
}
