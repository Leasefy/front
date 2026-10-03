'use client'

/**
 * /ai/conciliacion/liquidaciones — "Liquidaciones a propietario".
 *
 * Bandeja de las liquidaciones que la inmobiliaria debe al propietario por
 * periodo. Cada liquidación es STATE (canon − comisión − otros = neto); aquí
 * NUNCA se mueve dinero. El desembolso/dispersión real es de pagos.
 *
 * Wired a los endpoints reales de Build C (verificados contra
 * conciliacion-settlements.ts):
 *   GET  /api/agency/{id}/conciliacion/settlements?status=…
 *   POST /api/agency/{id}/conciliacion/settlements/generate
 *   POST /api/agency/{id}/conciliacion/settlements/{id}/approve   (T-323)
 *
 * Operador:
 *   (1) Filtra por estado (Chip): todos · borrador · pendiente · aprobado · pagado.
 *   (2) "Generar liquidación" → diálogo con cifras reales (canon, comisión,
 *       otros) → POST generate (crea un borrador) + refetch.
 *   (3) "Aprobar" por fila → confirmación HUMANA explícita (T-323, AlertDialog)
 *       → POST approve (borrador/pendiente → aprobado) + refetch. El PAGO real
 *       NO se hace aquí.
 *
 * FAIL-SOFT (regla de oro): el backend Build C puede no estar desplegado → la
 * lista degrada a su EmptyState (lista vacía), nunca rompe. Las acciones que
 * fallan avisan con un toast honesto y dejan la fila intacta.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/toast'
import { Receipt, ShieldCheck } from '@phosphor-icons/react'

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui'
import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  LARGO_MAXIMO_DEL_PERIODO,
  LARGO_MAXIMO_DEL_PROPIETARIO,
  MONTO_MAXIMO_DE_LA_LIQUIDACION,
  erroresDeLaLiquidacion,
  type CampoDeLaLiquidacion,
} from '@/lib/hooks/conciliacion/limites-de-la-conciliacion'
import { Chip } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  useConciliacionSettlements,
  type ConciliacionSettlement,
  type SettlementStatus,
} from '@/lib/hooks/conciliacion/use-conciliacion-settlements'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'

// ── Estado de liquidación (set cerrado) ──────────────────────────────────────

type StatusFilter = SettlementStatus | 'todos'

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'todos', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente_aprobacion', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'pagado', label: 'Pagado' },
]

const STATUS_LABEL: Record<SettlementStatus, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  pagado: 'Pagado',
}

/** Clases del pill de estado (tokens del DS, cero hex). */
const STATUS_PILL: Record<SettlementStatus, string> = {
  borrador: 'bg-surface-muted text-fg-muted',
  pendiente_aprobacion: 'bg-warning/10 text-warning',
  aprobado: 'bg-success/10 text-success',
  pagado: 'bg-info/10 text-info',
}

// ── Formato ──────────────────────────────────────────────────────────────────

function fmtCop(val: number): string {
  return plataEnPantalla('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val)
}

/** Solo borrador o pendiente se pueden aprobar (T-323; pagado es de pagos). */
function isApprovable(s: SettlementStatus): boolean {
  return s === 'borrador' || s === 'pendiente_aprobacion'
}

// ── Fila de liquidación ──────────────────────────────────────────────────────

const COLUMNAS = [
  'Propietario',
  'Periodo',
  'Canon',
  'Comisión',
  'Otros',
  'Neto',
  'Estado',
  'Acciones',
] as const

function SettlementRow({
  item,
  onApprove,
  busy,
}: {
  item: ConciliacionSettlement
  onApprove: (item: ConciliacionSettlement) => void
  busy: boolean
}) {
  const approvable = isApprovable(item.status)

  return (
    <TableRow data-testid={`liquidacion-row-${item.id}`}>
      <TableCell className="max-w-[240px]">
        <p className="truncate font-medium text-fg">
          {item.ownerName?.trim() || 'Propietario sin nombre'}
        </p>
      </TableCell>

      <TableCell className="whitespace-nowrap text-fg-muted">{item.period}</TableCell>

      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
        {fmtCop(item.grossCop)}
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
        −{fmtCop(item.commissionCop)}
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
        {item.otherDeductionsCop > 0 ? `−${fmtCop(item.otherDeductionsCop)}` : '—'}
      </TableCell>

      {/* El neto es la cifra de la fila: canon − comisión − otros. */}
      <TableCell className="whitespace-nowrap font-semibold tabular-nums text-fg">
        {fmtCop(item.netCop)}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
            STATUS_PILL[item.status],
          )}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </TableCell>

      {/* Aprobar autoriza el monto (T-323). El PAGO real no se hace acá. */}
      <TableCell className="whitespace-nowrap">
        {approvable ? (
          <Button
            size="sm"
            variant="secondary"
            hideArrow
            disabled={busy}
            onClick={() => onApprove(item)}
            data-testid={`liquidacion-aprobar-${item.id}`}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Aprobar
          </Button>
        ) : (
          <span className="text-caption text-fg-muted">
            {item.status === 'aprobado' ? 'Aprobada' : 'Pagada'}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

// ── Diálogo: generar liquidación ─────────────────────────────────────────────

interface GenerateFormState {
  ownerName: string
  period: string
  grossCop: string
  commissionCop: string
  otherDeductionsCop: string
}

const EMPTY_FORM: GenerateFormState = {
  ownerName: '',
  period: '',
  grossCop: '',
  commissionCop: '',
  otherDeductionsCop: '',
}

/** Los campos del diálogo, en el orden en que se ven (el primero con error recibe el foco). */
const CAMPOS_DE_LA_LIQUIDACION: readonly CampoDeLaLiquidacion[] = [
  'ownerName',
  'period',
  'grossCop',
  'commissionCop',
  'otherDeductionsCop',
]

/** El `id` de cada campo (el de su `<Label htmlFor>`). */
const ID_DEL_CAMPO: Record<CampoDeLaLiquidacion, string> = {
  ownerName: 'liq-owner',
  period: 'liq-period',
  grossCop: 'liq-gross',
  commissionCop: 'liq-commission',
  otherDeductionsCop: 'liq-other',
}

function toIntCop(raw: string): number {
  const n = Math.trunc(Number(raw))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

// ── Página ───────────────────────────────────────────────────────────────────

function ConciliacionLiquidaciones() {
  const { t } = useI18n()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [busy, setBusy] = useState(false)

  // Generar (diálogo de formulario)
  const [genOpen, setGenOpen] = useState(false)
  const [form, setForm] = useState<GenerateFormState>(EMPTY_FORM)

  // Aprobar (confirmación humana, T-323)
  const [toApprove, setToApprove] = useState<ConciliacionSettlement | null>(null)

  const filters = useMemo(
    () => ({
      ...(statusFilter !== 'todos' ? { status: statusFilter } : {}),
      pageSize: 100,
    }),
    [statusFilter],
  )

  const { items, isLoading, error, refetch, generateSettlement, approveSettlement } =
    useConciliacionSettlements(filters)

  // El recorte es de presentación: el filtro por estado ya viajó al backend,
  // así que el `resetKey` es el propio filtro — cambiarlo vuelve a la página 1.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(items, { resetKey: statusFilter })

  const previewNet = useMemo(
    () => toIntCop(form.grossCop) - toIntCop(form.commissionCop) - toIntCop(form.otherDeductionsCop),
    [form.grossCop, form.commissionCop, form.otherDeductionsCop],
  )

  const canGenerate =
    form.period.trim().length > 0 && form.grossCop.trim().length > 0 && !busy

  /**
   * El error de cada campo: el tope atajado antes de enviar o lo que dijo el
   * micro (un 400 con `campos`). Se borra en cuanto la persona toca el campo.
   */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaLiquidacion, string>>>({})

  function escribir(campo: CampoDeLaLiquidacion, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => (e[campo] ? { ...e, [campo]: undefined } : e))
  }

  /**
   * El campo que recibe el foco. Se enfoca DESPUÉS del render: mientras la
   * orden viaja los campos están apagados (`busy`) y un campo apagado no se
   * puede enfocar.
   */
  const [aEnfocar, setAEnfocar] = useState<CampoDeLaLiquidacion | null>(null)
  useEffect(() => {
    if (!aEnfocar || busy) return
    document.getElementById(ID_DEL_CAMPO[aEnfocar])?.focus()
    setAEnfocar(null)
  }, [aEnfocar, busy])

  function mostrarErrores(porCampo: Partial<Record<CampoDeLaLiquidacion, string>>) {
    setErrores(porCampo)
    setAEnfocar(CAMPOS_DE_LA_LIQUIDACION.find((c) => porCampo[c]) ?? null)
  }

  /** Lo que cada input le dice al lector de pantalla. */
  function aria(campo: CampoDeLaLiquidacion) {
    return errores[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${ID_DEL_CAMPO[campo]}-error` }
      : {}
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setErrores({})
  }

  async function handleGenerate() {
    if (!canGenerate) return
    // Lo que el micro (o la columna) rechazaría se ataja acá, en su campo.
    const delCliente = erroresDeLaLiquidacion(form)
    if (Object.keys(delCliente).length > 0) {
      mostrarErrores(delCliente)
      return
    }
    setBusy(true)
    const result = await generateSettlement({
      period: form.period.trim(),
      grossCop: toIntCop(form.grossCop),
      commissionCop: toIntCop(form.commissionCop),
      otherDeductionsCop: toIntCop(form.otherDeductionsCop),
      ...(form.ownerName.trim() ? { ownerName: form.ownerName.trim() } : {}),
    })
    setBusy(false)

    if (!result.ok) {
      if (result.error === 'not_configured') {
        toast.error('No se pudo generar: servicio no configurado.')
        return
      }
      // Con la regla de oro: lo que el micro dijo de un campo va a SU campo;
      // al toast sólo lo que no tiene dónde ir. Antes: «No se pudo generar la
      // liquidación (403).»
      const reparto = repartirErroresDelServidor<CampoDeLaLiquidacion>(result.fallo, {
        campos: CAMPOS_DE_LA_LIQUIDACION,
        porDefecto: 'No se pudo generar la liquidación.',
        accion: 'generar la liquidación',
      })
      mostrarErrores(reparto.porCampo)
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '))
      return
    }
    toast.success('Liquidación generada como borrador.')
    setGenOpen(false)
    resetForm()
    await refetch()
  }

  async function handleApprove() {
    const item = toApprove
    if (!item) return
    setBusy(true)
    // T-323: borrador/pendiente → aprobado (avance directo a aprobado tras el
    // click humano explícito de confirmación). El pago real es de pagos.
    const result = await approveSettlement(item.id, 'aprobado')
    setBusy(false)
    setToApprove(null)

    if (!result.ok) {
      toast.error(
        result.error === 'not_configured'
          ? 'No se pudo aprobar: servicio no configurado.'
          : // Con la regla de oro; antes: «No se pudo aprobar la liquidación (409).»
            mensajeParaLaPersona(result.fallo, {
              porDefecto: 'No se pudo aprobar la liquidación.',
              accion: 'aprobar la liquidación',
            }),
      )
      return
    }
    toast.success('Liquidación aprobada.')
    await refetch()
  }

  const isEmpty = !isLoading && items.length === 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h2 text-fg">
            Liquidaciones a propietario
          </h1>
          <p className="text-body text-fg-muted max-w-2xl">
            Lo que la inmobiliaria debe a cada propietario por periodo: canon recaudado menos
            comisión y otros descuentos. Aquí solo se registra y aprueba — el pago real lo hace
            pagos.
          </p>
          {/*
            🔴 21-09-2026: hay DOS pantallas llamadas «Liquidaciones». Ésta es
            la del AGENTE, con su propio registro; las del mes —las que salen
            de las cuotas del contrato y se giran— viven en Pagos. Sin decirlo,
            esta pantalla vacía afirma «no hay liquidaciones a propietario»
            mientras al lado están las del mes, y eso es falso.
          */}
          <p className="text-caption text-fg-muted max-w-2xl">
            Éste es el registro del agente. Las liquidaciones del mes —las que
            salen de los contratos y se giran— están en{' '}
            <Link
              href="/panel/inmobiliaria/pagos/liquidaciones"
              className="text-primary underline-offset-4 hover:underline"
            >
              Pagos · Liquidaciones
            </Link>
            .
          </p>
        </div>

        {/* Acción principal. El «en bandeja» que vivía acá se fue: lo dice el
            pie de la tabla, y el mismo número dos veces no informa dos veces. */}
        <Button
          hideArrow
          className="shrink-0"
          onClick={() => {
            resetForm()
            setGenOpen(true)
          }}
          data-testid="liquidacion-generar-cta"
        >
          <Receipt className="size-4" aria-hidden="true" />
          Generar liquidación
        </Button>
      </header>

      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Filtros — dentro de la tarjeta, encima de la tabla. */}
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border p-4"
          role="group"
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.value}
              selected={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Chip>
          ))}
        </div>

        {/* Carga y fallo por fuera del cuerpo; el vacío va DENTRO, para que los
            encabezados de la tabla se sigan viendo. */}
        <EstadoDeDatos
          cargando={isLoading}
          error={error}
          queEs="las liquidaciones"
          onReintentar={refetch}
          esqueleto={
            <div className="flex items-center justify-center py-16" data-testid="liquidaciones-loading">
              <Spinner />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNAS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody data-testid="liquidaciones-list">
              {isEmpty ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length} className="p-0">
                    <SinDatos
                      hayFiltros={statusFilter !== 'todos'}
                      // `queSon` sólo se usa en el vacío CON filtros, donde
                      // `SinDatos` arma «Ningún <singular>…»: con «liquidaciones»
                      // saldría «Ningún liquidacion». El vacío sin filtros trae
                      // su propio título y descripción.
                      queSon="registros"
                      icono={Receipt}
                      titulo="Sin liquidaciones"
                      descripcion="El agente todavía no tiene ninguna registrada acá. Las del mes están en Pagos · Liquidaciones."
                      crear={{
                        label: 'Generar liquidación',
                        onClick: () => {
                          resetForm()
                          setGenOpen(true)
                        },
                      }}
                      onLimpiarFiltros={() => setStatusFilter('todos')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((item) => (
                  <SettlementRow key={item.id} item={item} onApprove={setToApprove} busy={busy} />
                ))
              )}
            </TableBody>
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
        </EstadoDeDatos>
      </section>

      {/* Diálogo: generar liquidación (borrador) */}
      <Dialog open={genOpen} onOpenChange={(o) => { if (!busy) setGenOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar liquidación</DialogTitle>
            <DialogDescription>
              Crea un borrador con las cifras reales del periodo. El neto se calcula como canon
              menos comisión y otros descuentos. No mueve dinero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="liq-owner">Propietario (opcional)</Label>
              <Input
                id="liq-owner"
                value={form.ownerName}
                onChange={(e) => escribir('ownerName', e.target.value)}
                placeholder="Nombre del propietario"
                maxLength={LARGO_MAXIMO_DEL_PROPIETARIO}
                disabled={busy}
                {...aria('ownerName')}
              />
              <ErrorDelCampo id="liq-owner-error" mensaje={errores.ownerName} className="mt-0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="liq-period">Periodo</Label>
              <Input
                id="liq-period"
                value={form.period}
                onChange={(e) => escribir('period', e.target.value)}
                placeholder="Ej: 2026-06 o Junio 2026"
                maxLength={LARGO_MAXIMO_DEL_PERIODO}
                disabled={busy}
                {...aria('period')}
              />
              <ErrorDelCampo id="liq-period-error" mensaje={errores.period} className="mt-0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="liq-gross">Canon recaudado (COP)</Label>
                <Input
                  id="liq-gross"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MONTO_MAXIMO_DE_LA_LIQUIDACION}
                  value={form.grossCop}
                  onChange={(e) => escribir('grossCop', e.target.value)}
                  placeholder="0"
                  disabled={busy}
                  {...aria('grossCop')}
                />
                <ErrorDelCampo id="liq-gross-error" mensaje={errores.grossCop} className="mt-0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liq-commission">Comisión (COP)</Label>
                <Input
                  id="liq-commission"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MONTO_MAXIMO_DE_LA_LIQUIDACION}
                  value={form.commissionCop}
                  onChange={(e) => escribir('commissionCop', e.target.value)}
                  placeholder="0"
                  disabled={busy}
                  {...aria('commissionCop')}
                />
                <ErrorDelCampo id="liq-commission-error" mensaje={errores.commissionCop} className="mt-0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="liq-other">Otros descuentos (COP)</Label>
                <Input
                  id="liq-other"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MONTO_MAXIMO_DE_LA_LIQUIDACION}
                  value={form.otherDeductionsCop}
                  onChange={(e) => escribir('otherDeductionsCop', e.target.value)}
                  placeholder="0"
                  disabled={busy}
                  {...aria('otherDeductionsCop')}
                />
                <ErrorDelCampo id="liq-other-error" mensaje={errores.otherDeductionsCop} className="mt-0" />
              </div>
            </div>

            {/* Vista previa del neto (canon − comisión − otros) */}
            <div className="rounded-[14px] border border-border px-4 py-2.5 text-sm">
              <span className="text-fg-muted">Neto al propietario: </span>
              <span className="font-mono font-semibold tabular-nums text-fg">{fmtCop(previewNet)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              hideArrow
              onClick={() => setGenOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button hideArrow isLoading={busy} disabled={!canGenerate} onClick={() => void handleGenerate()}>
              Generar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación humana de "Aprobar" (T-323) */}
      <AlertDialog open={toApprove !== null} onOpenChange={(o) => { if (!o && !busy) setToApprove(null) }}>
        <AlertDialogContent variant="confirm" icon={<ShieldCheck weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar liquidación?</AlertDialogTitle>
            <AlertDialogDescription>
              {toApprove ? (
                <>
                  Vas a aprobar la liquidación de{' '}
                  <strong>{toApprove.ownerName?.trim() || 'el propietario'}</strong> por el periodo{' '}
                  <strong>{toApprove.period}</strong>, con un neto de{' '}
                  <strong className="font-mono tabular-nums">{fmtCop(toApprove.netCop)}</strong>. Esto
                  autoriza el monto — no mueve ni desembolsa dinero (el pago real lo hace pagos).
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Abierto mientras aprueba: `handleApprove` lo cierra al terminar.
                e.preventDefault()
                void handleApprove()
              }}
              loading={busy}
            >
              Sí, aprobar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ConciliacionLiquidacionesPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionLiquidaciones />
    </PageGuard>
  )
}
