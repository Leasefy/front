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
 * Es el MISMO cajón que el resto del panel: `Sheet` de `@/components/ui/sheet`
 * —el adaptador local, el que usa `CandidateDrawer`, la referencia de
 * `docs/DESIGN.md` §Drawers—. El freno de Lenis vive ahora en el adaptador, no
 * acá: le pasaba a todos los cajones.
 */

import Link from 'next/link'
import { ArrowRight, PhoneCall } from '@phosphor-icons/react'

import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from '@/components/ui/sheet'
import { Badge, Button } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
import { channelLabel } from '@/lib/cobranza/call-vocab'
import {
  ACUERDO_ESTADO,
  ACUERDO_TIPO_LABEL,
  type AcuerdoRow,
} from '@/lib/cobranza/acuerdo-vocab'

const BASE = '/panel/inmobiliaria/pagos/cobranza'
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

/**
 * El envoltorio: sólo es dueño del `Sheet`.
 *
 * Antes esto era `if (!acuerdo) return null` con `<Sheet open>` fijo, o sea
 * que cerrar era desmontarlo de un tirón. Radix anima la salida sólo si el
 * contenido sigue montado con `data-state="closed"` mientras dura la
 * animación: sin nada montado no hay qué animar y el cajón se cortaba en seco
 * (Nico, 2026-09-04). `useUltimoPresente` conserva el acuerdo mientras se va
 * —en el render del cierre ya es null y el cajón saldría en blanco—.
 */
export function AcuerdoDetalleSheet({
  acuerdo,
  onClose,
}: AcuerdoDetalleSheetProps) {
  const ultimo = useUltimoPresente(acuerdo)

  return (
    <Sheet
      open={Boolean(acuerdo)}
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
    >
      <SheetContent
        side="right"
        size="md"
        // Cabecera, cuerpo y pie viven en `CuerpoDelAcuerdo`.
        layout="manual"
        aria-describedby={undefined}
      >
        {ultimo && <CuerpoDelAcuerdo acuerdo={ultimo} />}
      </SheetContent>
    </Sheet>
  )
}

function CuerpoDelAcuerdo({ acuerdo }: { acuerdo: AcuerdoRow }) {
  const { formatCurrency, formatDate, formatRelativeDate } = useI18n()

  const estado = ACUERDO_ESTADO[acuerdo.estado]
  const fecha = (iso: string | null) => {
    if (!iso) return VACIO
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <>
        <SheetHeader
          title={acuerdo.deudor}
          description={
            <>
              {ACUERDO_TIPO_LABEL[acuerdo.tipo]}
              {acuerdo.cedulaMasked ? ` · ${acuerdo.cedulaMasked}` : ''}
            </>
          }
          actions={
            <Badge variant={estado.variant} className="shrink-0">
              {estado.label}
            </Badge>
          }
        />

        {/* Cuerpo — lo único que scrollea (`SheetBody` trae data-lenis-prevent) */}
        <SheetBody className="space-y-6">
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
        </SheetBody>

        {/* Pie — sólo caminos que existen */}
        <SheetFooter
          start={
            <Button asChild variant="outline" hideArrow>
              <Link href={`${BASE}/deudores/${acuerdo.debtorId}`}>
                Ver deudor
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {acuerdo.callId && (
            <Button asChild variant="outline" hideArrow>
              <Link href={`${BASE}/llamadas/${acuerdo.callId}`}>
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                Escuchar la llamada
              </Link>
            </Button>
          )}
          {acuerdo.planId && (
            <Button asChild hideArrow>
              <Link href={`${BASE}/pagos/planes/${acuerdo.planId}`}>
                Revisar y aprobar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </SheetFooter>
    </>
  )
}
