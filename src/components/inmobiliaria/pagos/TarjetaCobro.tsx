'use client'

/**
 * TarjetaCobro — la "tarjeta de cobro" de la bandeja de Cobros a inquilinos
 * (visión §2A/§4): el ciclo de vida de UN cobro a un inquilino. Muestra
 * Contrato/inquilino · conceptos · total · fecha límite · estado · canal ·
 * última actividad · siguiente acción, y la barra de acciones del punto 4
 * (Reenviar link / Copiar link / Cambiar fecha / Registrar pago manual /
 * Dividir pago / Enviar a cobranza / Ver historial).
 *
 * T-323: NO existe aún el endpoint dedicado de listado-de-cobros-del-agente ni
 * los endpoints de estas acciones a este nivel, así que TODAS las acciones de la
 * tarjeta son placeholders honestos deshabilitados rotulados "Próximamente"
 * (jamás un botón que finja funcionar ni un auto-rechazo). La tabla profunda real
 * de cobros vive en /panel/inmobiliaria/cobros y se cross-linkea desde la page.
 *
 * Estado vía <PagoEstadoBadge> + vocabulario de src/lib/pagos/estados.ts. Tonos
 * por TOKENS del DS (primary/fg-muted/border + *-soft) — CERO hex inline.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  PaperPlaneTilt,
  LinkSimple,
  CalendarBlank,
  HandCoins,
  ArrowsSplit,
  ArrowBendUpRight,
  ClockCounterClockwise,
} from '@phosphor-icons/react'

import { Button, Card } from '@/components/ui'
import { PagoEstadoBadge } from '@/components/inmobiliaria/pagos/PagoEstadoBadge'
import type { PagoEstado } from '@/lib/pagos/estados'

// ── Modelo de presentación de una tarjeta de cobro ───────────────────────────
// SOLO para presentación (ejemplo / preview). No es un contrato de datos del
// backend — el listado-de-cobros-del-agente aún no existe.

export interface ConceptoCobro {
  /** p.ej. "Canon", "Administración", "Servicios", "Estudio", "Penalidad". */
  label: string
  /** Monto formateado y listo para mostrar (p.ej. "$ 1.800.000"). */
  monto: string
}

export interface CobroEjemplo {
  /** Etiqueta del contrato (p.ej. "Contrato CTR-1042"). */
  contrato: string
  /** Nombre del inquilino. */
  inquilino: string
  /** Inmueble / dirección corta. */
  inmueble?: string
  /** Conceptos que componen el cobro. */
  conceptos: ConceptoCobro[]
  /** Total formateado (p.ej. "$ 2.150.000"). */
  total: string
  /** Fecha límite formateada (p.ej. "5 jul 2026"). */
  fechaLimite: string
  /** Estado del cobro (uno de los 13 de estados.ts). */
  estado: PagoEstado
  /** Canal por el que se envió/gestiona (p.ej. "WhatsApp", "Email", "Link de pago"). */
  canal: string
  /** Última actividad legible (p.ej. "Visto hace 2 h"). */
  ultimaActividad: string
  /** Siguiente acción sugerida (texto libre, p.ej. "Reenviar recordatorio"). */
  siguienteAccion: string
}

// ── Acciones del punto 4 (todas Próximamente — sin endpoint a este nivel) ─────

interface AccionCobro {
  id: string
  label: string
  icon: Icon
}

const ACCIONES_COBRO: AccionCobro[] = [
  { id: 'reenviar', label: 'Reenviar link', icon: PaperPlaneTilt },
  { id: 'copiar', label: 'Copiar link', icon: LinkSimple },
  { id: 'cambiar_fecha', label: 'Cambiar fecha', icon: CalendarBlank },
  { id: 'pago_manual', label: 'Registrar pago manual', icon: HandCoins },
  { id: 'dividir', label: 'Dividir pago', icon: ArrowsSplit },
  { id: 'cobranza', label: 'Enviar a cobranza', icon: ArrowBendUpRight },
  { id: 'historial', label: 'Ver historial', icon: ClockCounterClockwise },
]

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TarjetaCobroProps {
  cobro: CobroEjemplo
  /**
   * Marca explícita de que es un ejemplo/preview (sin datos reales detrás).
   * Cuando es true, muestra un rótulo "Ejemplo" para no confundir con un cobro real.
   */
  esEjemplo?: boolean
  className?: string
}

// ── Componente ─────────────────────────────────────────────────────────────────

export function TarjetaCobro({ cobro, esEjemplo = false, className }: TarjetaCobroProps) {
  return (
    <Card className={className}>
      <div className="p-5 space-y-4">
        {/* Cabecera: contrato/inquilino + estado */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-fg truncate">{cobro.inquilino}</h3>
              {esEjemplo && (
                <span className="inline-flex items-center rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                  Ejemplo
                </span>
              )}
            </div>
            <p className="text-xs text-fg-muted">
              {cobro.contrato}
              {cobro.inmueble ? ` · ${cobro.inmueble}` : ''}
            </p>
          </div>
          <PagoEstadoBadge estado={cobro.estado} className="shrink-0" />
        </div>

        {/* Conceptos + total */}
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <dl className="space-y-1.5">
            {cobro.conceptos.map((c, i) => (
              <div key={`${c.label}-${i}`} className="flex items-center justify-between gap-3">
                <dt className="text-sm text-fg-muted">{c.label}</dt>
                <dd className="text-sm text-fg tabular-nums">{c.monto}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-1.5">
              <dt className="text-sm font-semibold text-fg">Total</dt>
              <dd className="text-base font-semibold text-fg tabular-nums">{cobro.total}</dd>
            </div>
          </dl>
        </div>

        {/* Meta: fecha límite · canal · última actividad · siguiente acción */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">Fecha límite</dt>
            <dd className="text-sm text-fg tabular-nums">{cobro.fechaLimite}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">Canal</dt>
            <dd className="text-sm text-fg">{cobro.canal}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">Última actividad</dt>
            <dd className="text-sm text-fg">{cobro.ultimaActividad}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">Siguiente acción</dt>
            <dd className="text-sm text-fg">{cobro.siguienteAccion}</dd>
          </div>
        </dl>

        {/* Acciones del punto 4 — T-323: sin endpoint a este nivel → todas
            placeholders honestos deshabilitados ("Próximamente"). */}
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs text-fg-muted">
            Las acciones por cobro estarán disponibles cuando se conecte la bandeja del agente.
            Hoy podés gestionarlas en la tabla de cobros.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCIONES_COBRO.map((accion) => {
              const AccionIcon = accion.icon
              return (
                <Button
                  key={accion.id}
                  size="sm"
                  variant="outline"
                  hideArrow
                  disabled
                  title="Próximamente"
                  className="gap-1.5"
                >
                  <AccionIcon className="h-3.5 w-3.5" weight="duotone" aria-hidden="true" />
                  {accion.label}
                  <span className="text-[11px] text-fg-muted">· Próximamente</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
