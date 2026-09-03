'use client'

/**
 * /ai/pagos/propietarios — "Pagos a propietarios" (visión puntos 9 y 10).
 *
 * El mundo del dinero que SALE: la liquidación al dueño del inmueble. Esta
 * superficie es la BANDEJA de pagos a propietarios + una liquidación de ejemplo
 * (canon recibido, administración, comisión, descuentos, valor a pagar) + las
 * novedades comunes que retienen un pago.
 *
 * SOLO UX sobre la base ya funcional: importa el vocabulario de estados de
 * src/lib/pagos/estados.ts y el badge PagoEstadoBadge. NO inventa endpoints.
 * Toda acción sin backend = placeholder honesto "Próximamente" (T-323: jamás
 * retiene ni aprueba sola). La EJECUCIÓN real (lotes, payment-runs, comprobantes)
 * vive en /dispersiones y /tesoreria — acá se CROSS-LINKEA, nunca se duplica.
 *
 * Tokens del DS en todo (CERO hex). Un solo CTA primary por vista (deshabilitado
 * hasta que exista el endpoint de aprobación masiva).
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Buildings,
  CheckCircle,
  CalendarCheck,
  StackPlus,
  DownloadSimple,
  PaperPlaneTilt,
  WarningCircle,
  Sparkle,
  ArrowSquareOut,
  Receipt,
  Percent,
  MinusCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { Button, Card, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { PagoEstadoBadge } from '@/components/inmobiliaria/pagos/PagoEstadoBadge'
import type { PagoEstado } from '@/lib/pagos/estados'

// ── Formateador COP ───────────────────────────────────────────────────────────

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// ── Estado de un pago a propietario ────────────────────────────────────────────
// Reutiliza el vocabulario de PagoEstado de la base. Mapeamos los 4 estados de la
// bandeja (visión punto 10: Listo / Requiere revisión / Programado / Retenido) a
// estados reales del ciclo. "Requiere revisión" y "Retenido" comparten el tono
// de atención (pago_parcial / vencido), Listo = listo_para_enviar, Programado =
// programado.

type EstadoBandeja = 'listo' | 'requiere_revision' | 'programado' | 'retenido'

const ESTADO_BANDEJA_A_PAGO: Record<EstadoBandeja, PagoEstado> = {
  listo: 'listo_para_enviar',
  requiere_revision: 'pago_parcial',
  programado: 'programado',
  retenido: 'vencido',
}

const ESTADO_BANDEJA_LABEL: Record<EstadoBandeja, string> = {
  listo: 'Listo',
  requiere_revision: 'Requiere revisión',
  programado: 'Programado',
  retenido: 'Retenido',
}

// ── Bandeja de propietarios (datos de ejemplo: el endpoint de la bandeja de ─────
//    propietarios aún no existe; mostramos la estructura con casos ilustrativos
//    para que el contador entienda la superficie. NUNCA accionamos sobre ellos).

interface FilaPropietario {
  id: string
  propietario: string
  inmuebles: number
  valor: number
  estado: EstadoBandeja
  nota?: string
}

const BANDEJA_EJEMPLO: FilaPropietario[] = [
  { id: 'p1', propietario: 'María Restrepo', inmuebles: 3, valor: 6_420_000, estado: 'listo' },
  { id: 'p2', propietario: 'Inversiones del Norte S.A.S.', inmuebles: 8, valor: 18_900_000, estado: 'listo' },
  { id: 'p3', propietario: 'Carlos Mejía', inmuebles: 1, valor: 1_850_000, estado: 'requiere_revision', nota: 'Pago parcial del inquilino' },
  { id: 'p4', propietario: 'Lucía Fernández', inmuebles: 2, valor: 3_240_000, estado: 'programado' },
  { id: 'p5', propietario: 'Jorge Ramírez', inmuebles: 1, valor: 0, estado: 'retenido', nota: 'Reparación pendiente de descontar' },
]

// ── Banner del agente: N listos por $X, recomienda aprobar M, revisar K ─────────

function calcularResumen(filas: FilaPropietario[]) {
  const listos = filas.filter((f) => f.estado === 'listo')
  const novedades = filas.filter((f) => f.estado === 'requiere_revision' || f.estado === 'retenido')
  const valorListos = listos.reduce((acc, f) => acc + f.valor, 0)
  return {
    listos: listos.length,
    valorListos,
    novedades: novedades.length,
  }
}

// ── Liquidación de ejemplo (visión punto 9) ─────────────────────────────────────
// Estructura del cálculo: canon recibido − administración − comisión − descuentos
// = valor a pagar. Datos ilustrativos para enseñar el desglose.

const LIQUIDACION_EJEMPLO = {
  propietario: 'María Restrepo',
  inmueble: 'Apto 502 · Cra 43A #5-15, El Poblado',
  periodo: 'Junio 2026',
  estado: 'listo' as EstadoBandeja,
  canon: 4_500_000,
  administracion: -650_000,
  comision: -540_000, // 12% del canon
  descuentos: -120_000,
}

const VALOR_A_PAGAR_EJEMPLO =
  LIQUIDACION_EJEMPLO.canon +
  LIQUIDACION_EJEMPLO.administracion +
  LIQUIDACION_EJEMPLO.comision +
  LIQUIDACION_EJEMPLO.descuentos

interface LineaLiquidacion {
  label: string
  detalle?: string
  valor: number
  icon: Icon
  tono: 'positivo' | 'resta' | 'total'
}

const LINEAS_LIQUIDACION: LineaLiquidacion[] = [
  { label: 'Canon recibido', detalle: 'Arriendo del periodo', valor: LIQUIDACION_EJEMPLO.canon, icon: Receipt, tono: 'positivo' },
  { label: 'Administración', detalle: 'Cuota de copropiedad', valor: LIQUIDACION_EJEMPLO.administracion, icon: Buildings, tono: 'resta' },
  { label: 'Comisión inmobiliaria', detalle: '12% del canon', valor: LIQUIDACION_EJEMPLO.comision, icon: Percent, tono: 'resta' },
  { label: 'Descuentos', detalle: 'Reparaciones y otros', valor: LIQUIDACION_EJEMPLO.descuentos, icon: MinusCircle, tono: 'resta' },
]

// Acciones de la liquidación (visión punto 9). Sin endpoint real → "Próximamente".
const ACCIONES_LIQUIDACION: { label: string; icon: Icon }[] = [
  { label: 'Aprobar', icon: CheckCircle },
  { label: 'Programar transferencia', icon: CalendarCheck },
  { label: 'Agrupar', icon: StackPlus },
  { label: 'Descargar liquidación', icon: DownloadSimple },
  { label: 'Enviar reporte', icon: PaperPlaneTilt },
  { label: 'Retener por novedad', icon: WarningCircle },
]

// ── Novedades comunes (visión punto 10) ─────────────────────────────────────────

const NOVEDADES_COMUNES: { titulo: string; desc: string }[] = [
  { titulo: 'Pago parcial del inquilino', desc: 'El arriendo entró incompleto: la liquidación queda en revisión hasta completar el canon.' },
  { titulo: 'Reparación pendiente de descontar', desc: 'Hay una orden de mantenimiento por descontar antes de liquidar al propietario.' },
  { titulo: 'Saldo a favor o en contra', desc: 'Un ajuste de meses anteriores cambia el valor neto a transferir.' },
  { titulo: 'Datos bancarios incompletos', desc: 'Falta o cambió la cuenta del propietario: no se puede dispersar todavía.' },
  { titulo: 'Inquilino en mora', desc: 'El cobro está en cobranza; no hay canon recibido para liquidar este periodo.' },
  { titulo: 'Cambio de comisión o contrato', desc: 'Un ajuste contractual del mes requiere validar el porcentaje antes de pagar.' },
]

// ── Operaciones profundas — cross-links, no duplicación ──────────────────────────

const EJECUCION_REAL: { label: string; detalle: string; href: string; icon: Icon }[] = [
  {
    label: 'Dispersiones',
    detalle: 'Arma los lotes y ejecuta los payment-runs a propietarios.',
    href: '/panel/inmobiliaria/dispersiones',
    icon: PaperPlaneTilt,
  },
  {
    label: 'Tesorería',
    detalle: 'Saldos, movimientos y aprobaciones de las transferencias.',
    href: '/panel/inmobiliaria/tesoreria',
    icon: Wallet,
  },
]

// ── Botón "Próximamente" (placeholder honesto T-323) ────────────────────────────

function ProximamenteButton({
  children,
  icon: BtnIcon,
  variant = 'outline',
  className,
}: {
  children: ReactNode
  icon?: Icon
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
}) {
  return (
    <Button
      size="sm"
      variant={variant}
      hideArrow
      disabled
      title="Próximamente"
      className={className}
    >
      {BtnIcon && <BtnIcon className="w-4 h-4" weight="duotone" aria-hidden="true" />}
      {children}
    </Button>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────────

function PagosPropietarios() {
  const filas = BANDEJA_EJEMPLO
  const resumen = calcularResumen(filas)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Pagos a propietarios</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            La liquidación al dueño del inmueble: canon menos comisión, administración y descuentos.
            Revisa, aprueba y deja todo listo para dispersar.
          </p>
        </div>
        <div className="shrink-0">
          {/* CTA principal — sin endpoint de aprobación masiva todavía (T-323). */}
          <ProximamenteButton icon={CheckCircle} variant="default">
            Aprobar pagos listos
          </ProximamenteButton>
        </div>
      </header>

      {/* Banner del agente */}
      <section aria-label="Recomendación del agente">
        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary-soft p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkle className="w-5 h-5" weight="duotone" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-fg">
              Hay {resumen.listos} pagos listos por {cop.format(resumen.valorListos)}.
            </p>
            <p className="text-sm text-fg-muted leading-snug">
              Recomiendo aprobar los {resumen.listos} pagos listos y revisar {resumen.novedades} con
              novedades antes de dispersar.
            </p>
          </div>
        </div>
      </section>

      {/* Bandeja de propietarios */}
      <section className="space-y-3" aria-label="Bandeja de pagos a propietarios">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-fg">Bandeja de pagos a propietarios</h2>
          <span className="text-xs text-fg-muted">{filas.length} propietarios este periodo</span>
        </div>

        {filas.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No hay pagos a propietarios"
            description="Cuando se concilien los cobros del mes, las liquidaciones a los propietarios aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table className="w-full min-w-[720px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Propietario</TableHead>
                  <TableHead scope="col" className="text-right">Inmuebles</TableHead>
                  <TableHead scope="col" className="text-right">Valor a pagar</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead scope="col" className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila) => (
                  <TableRow key={fila.id} className="border-t border-border align-top">
                    {/* Propietario */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted">
                          <Buildings className="w-4 h-4" weight="duotone" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg leading-snug">{fila.propietario}</p>
                          {fila.nota && (
                            <p className="text-xs text-fg-muted mt-0.5 leading-snug">{fila.nota}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Inmuebles */}
                    <TableCell className="py-3 pr-4 text-right text-sm text-fg tabular-nums whitespace-nowrap">
                      {fila.inmuebles}
                    </TableCell>

                    {/* Valor a pagar */}
                    <TableCell className="py-3 pr-4 text-right text-sm font-medium text-fg tabular-nums whitespace-nowrap">
                      {fila.valor > 0 ? cop.format(fila.valor) : '—'}
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      <PagoEstadoBadge
                        estado={ESTADO_BANDEJA_A_PAGO[fila.estado]}
                        className="[&]:!normal-case"
                      />
                      <span className="sr-only">{ESTADO_BANDEJA_LABEL[fila.estado]}</span>
                    </TableCell>

                    {/* Acción — T-323: sin endpoint real → placeholder honesto. */}
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <ProximamenteButton>Revisar</ProximamenteButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Liquidación de ejemplo (punto 9) */}
      <section className="space-y-3" aria-label="Liquidación de ejemplo">
        <h2 className="text-base font-semibold text-fg">Liquidación de ejemplo</h2>
        <Card className="p-5">
          {/* Encabezado de la liquidación */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Wallet className="w-5 h-5" weight="duotone" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-base font-semibold text-fg">{LIQUIDACION_EJEMPLO.propietario}</p>
                <p className="text-sm text-fg-muted leading-snug">{LIQUIDACION_EJEMPLO.inmueble}</p>
                <p className="text-xs text-fg-muted">Periodo: {LIQUIDACION_EJEMPLO.periodo}</p>
              </div>
            </div>
            <PagoEstadoBadge
              estado={ESTADO_BANDEJA_A_PAGO[LIQUIDACION_EJEMPLO.estado]}
              className="shrink-0"
            />
          </div>

          {/* Desglose del cálculo */}
          <div className="mt-5 divide-y divide-border rounded-lg border border-border">
            {LINEAS_LIQUIDACION.map((linea) => {
              const LineaIcon = linea.icon
              return (
                <div key={linea.label} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted">
                      <LineaIcon className="w-4 h-4" weight="duotone" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-fg leading-snug">{linea.label}</p>
                      {linea.detalle && (
                        <p className="text-xs text-fg-muted leading-snug">{linea.detalle}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={
                      linea.tono === 'resta'
                        ? 'text-sm font-medium text-warning tabular-nums whitespace-nowrap'
                        : 'text-sm font-medium text-fg tabular-nums whitespace-nowrap'
                    }
                  >
                    {linea.valor < 0 ? '− ' : ''}
                    {cop.format(Math.abs(linea.valor))}
                  </span>
                </div>
              )
            })}

            {/* Total: valor a pagar */}
            <div className="flex items-center justify-between gap-3 bg-surface-muted/50 px-4 py-3.5">
              <p className="text-sm font-semibold text-fg">Valor a pagar al propietario</p>
              <span className="text-base font-semibold text-fg tabular-nums whitespace-nowrap">
                {cop.format(VALOR_A_PAGAR_EJEMPLO)}
              </span>
            </div>
          </div>

          {/* Acciones de la liquidación — todas "Próximamente" (T-323) */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ACCIONES_LIQUIDACION.map((accion) => (
              <ProximamenteButton key={accion.label} icon={accion.icon}>
                {accion.label}
              </ProximamenteButton>
            ))}
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Las aprobaciones y transferencias se ejecutan desde Dispersiones y Tesorería. El agente
            nunca aprueba ni retiene un pago por su cuenta: tú das la última palabra.
          </p>
        </Card>
      </section>

      {/* Novedades comunes (punto 10) */}
      <section className="space-y-3" aria-label="Novedades comunes">
        <h2 className="text-base font-semibold text-fg">Novedades que retienen un pago</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOVEDADES_COMUNES.map((nov) => (
            <div
              key={nov.titulo}
              className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <WarningCircle
                  className="w-4 h-4 text-warning shrink-0"
                  weight="duotone"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-fg leading-tight">{nov.titulo}</p>
              </div>
              <p className="text-xs text-fg-muted leading-snug">{nov.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ejecución real — cross-links a /dispersiones y /tesoreria */}
      <section className="space-y-3" aria-label="Dónde se ejecuta el pago">
        <h2 className="text-base font-semibold text-fg">Dónde se ejecuta el pago</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EJECUCION_REAL.map((op) => {
            const OpIcon = op.icon
            return (
              <Link
                key={op.href}
                href={op.href}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:bg-surface-muted/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted group-hover:text-fg transition">
                  <OpIcon className="w-5 h-5" weight="duotone" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-fg">{op.label}</span>
                  <span className="block text-xs text-fg-muted">{op.detalle}</span>
                </span>
                <ArrowSquareOut
                  className="w-3.5 h-3.5 text-fg-muted group-hover:text-fg transition shrink-0"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function PagosPropietariosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosPropietarios />
    </PageGuard>
  )
}
