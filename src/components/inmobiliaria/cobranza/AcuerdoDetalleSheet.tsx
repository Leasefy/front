'use client'

/**
 * AcuerdoDetalleSheet — el detalle de UN acuerdo de pago.
 *
 * La tabla contestaba «qué hay» pero no «qué hago con esto»: 45 filas y ningún
 * lugar a dónde ir. Acá está lo que el origen guardó de verdad y los caminos
 * que EXISTEN — ninguno inventado:
 *
 *   · «Escuchar la llamada» sólo si el compromiso tiene `call_id`. En el demo
 *     casi ninguno lo tiene (los sembrados no salieron de una llamada), así que
 *     el enlace aparece sólo cuando hay algo del otro lado.
 *   · «Revisar y aprobar» sólo para planes, y lleva al detalle real del plan,
 *     que es donde vive la aprobación. No se duplica esa pantalla acá.
 *   · «Ver deudor» siempre: es donde están las acciones (llamar, memo, pausar).
 *
 * Sigue el patrón canónico de cajón de `docs/DESIGN.md` §Drawers, en su forma
 * actual: el `Sheet` del DS (portal, scroll-lock y Escape los maneja Radix) +
 * `lenis.stop()` mientras está abierto + `data-lenis-prevent` en el cuerpo.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, PhoneCall } from '@phosphor-icons/react'
import { Badge } from '@leasefy/cadence'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { useLenis } from '@/components/providers/SmoothScroll'
import { channelLabel } from '@/lib/cobranza/call-vocab'
import {
  ACUERDO_ESTADO,
  ACUERDO_TIPO_LABEL,
  type AcuerdoRow,
} from '@/lib/cobranza/acuerdo-vocab'

const BASE = '/panel/inmobiliaria/ai/cobranza'
const VACIO = '—'

export interface AcuerdoDetalleSheetProps {
  acuerdo: AcuerdoRow | null
  onClose: () => void
}

/** Etiqueta de sección, en el registro del DS. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-fg-muted">
      {children}
    </h3>
  )
}

function Dato({
  rotulo,
  children,
}: {
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Rotulo>{rotulo}</Rotulo>
      <div className="text-sm text-fg">{children}</div>
    </div>
  )
}

export function AcuerdoDetalleSheet({
  acuerdo,
  onClose,
}: AcuerdoDetalleSheetProps) {
  const { formatCurrency, formatDate, formatRelativeDate } = useI18n()
  const lenis = useLenis()

  // Lenis escucha la rueda en `window`: sin pausarlo, el cuerpo del cajón no
  // scrollea. `docs/DESIGN.md` §Lenis.
  useEffect(() => {
    if (acuerdo) lenis.stop()
    else lenis.start()
    return () => lenis.start()
  }, [acuerdo, lenis])

  if (!acuerdo) return null

  const estado = ACUERDO_ESTADO[acuerdo.estado]
  const fecha = (iso: string | null) => {
    if (!iso) return VACIO
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <Sheet
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">
          Acuerdo de pago de {acuerdo.deudor}
        </SheetTitle>

        {/* Cabecera fija.
            `pr-12`: el botón de cerrar del Sheet va absoluto arriba a la
            derecha, y sin este margen la insignia de estado queda debajo. */}
        <div className="flex-none border-b border-border p-5 pr-12 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">{acuerdo.deudor}</h2>
            <Badge variant={estado.variant} size="sm" className="shrink-0 mt-0.5">
              {estado.label}
            </Badge>
          </div>
          <p className="text-xs text-fg-muted">
            {ACUERDO_TIPO_LABEL[acuerdo.tipo]}
            {acuerdo.cedulaMasked ? ` · ${acuerdo.cedulaMasked}` : ''}
          </p>
        </div>

        {/* Cuerpo — `data-lenis-prevent` o el scroll queda muerto */}
        <div
          className="flex-1 overflow-y-auto p-5 space-y-6"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain' }}
        >
          <Dato rotulo="Monto">
            <span className="font-mono tabular-nums text-base">
              {formatCurrency(acuerdo.montoCop)}
            </span>
          </Dato>

          <Dato rotulo="Vence">
            {acuerdo.venceEl ? (
              <span className="font-mono tabular-nums">
                {fecha(acuerdo.venceEl)}{' '}
                <span className="text-fg-muted">
                  · {formatRelativeDate(acuerdo.venceEl)}
                </span>
              </span>
            ) : (
              /* El payload de planes no trae la fecha; decirlo, no inventarla. */
              <span className="text-fg-muted">
                Este plan no expone una fecha de vencimiento.
              </span>
            )}
          </Dato>

          {acuerdo.canal && (
            <Dato rotulo="Canal">{channelLabel(acuerdo.canal)}</Dato>
          )}

          {acuerdo.condiciones && (
            <Dato rotulo="Condiciones">
              <p className="leading-relaxed whitespace-pre-line">
                {acuerdo.condiciones}
              </p>
            </Dato>
          )}

          <Dato rotulo="Registrado">
            <span className="font-mono tabular-nums text-fg-muted">
              {fecha(acuerdo.registradoEn)}
            </span>
          </Dato>

          {acuerdo.resueltoEn && (
            <Dato rotulo="Cerrado">
              <span className="font-mono tabular-nums text-fg-muted">
                {fecha(acuerdo.resueltoEn)}
              </span>
            </Dato>
          )}
        </div>

        {/* Pie — sólo caminos que existen */}
        <div className="flex-none border-t border-border p-4 space-y-2">
          {acuerdo.planId && (
            <Button asChild hideArrow className="w-full">
              <Link href={`${BASE}/pagos/planes/${acuerdo.planId}`}>
                Revisar y aprobar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
          {acuerdo.callId && (
            <Button asChild variant="outline" hideArrow className="w-full">
              <Link href={`${BASE}/llamadas/${acuerdo.callId}`}>
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                Escuchar la llamada
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" hideArrow className="w-full">
            <Link href={`${BASE}/deudores/${acuerdo.debtorId}`}>
              Ver deudor
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
