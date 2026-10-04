'use client'

/**
 * Liquidaciones → Facturas de proveedores: las CUENTAS POR PAGAR.
 *
 * Desde CB-R21 (04-10-2026) lee las facturas de Contabilidad › Gastos (ver el
 * bloque de abajo). Antes alimentaba `<ColaHumana>` con los WorkItems del
 * agente de pagos (`?agente=pagos`), que guardaba las facturas aparte.
 *
 * ── Por qué está acá y no en la raíz del módulo (Nico, 2026-09-16) ──────────
 *
 * Vivía en `/pagos/cola`, como pestaña del TERCER renglón del encabezado de
 * Pagos —la Sala del agente—. Ese renglón no le obedecía a nadie: ofrecía
 * «Pagos a propietarios» con la cara «Inquilinos» elegida arriba, y por eso
 * «no se entendía». Se fue entero (NOTA al pie de `agentWorkspaceNav.ts`).
 *
 * Ésta bajó a Liquidaciones porque es plata que SALE —lo mismo que el neto del
 * mes— y la firma la misma persona: el contador. La URL vieja redirige acá
 * (`la-sala-de-pagos-se-fue.data.mjs`).
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { CuentasPorPagar } from '@/components/contabilidad/gastos/CuentasPorPagar'
import { Nota } from '@/components/contabilidad/piezas'
import { PestanasDeLiquidaciones } from '@/components/liquidaciones/PestanasDeLiquidaciones'
import { SectionLabel } from '@/components/ui/section-label'

/**
 * 🔴 CB-R21 (04-10-2026) · Nico, tal cual: «Proveedores: Una sola, en Gastos».
 * Esta pestaña ya no lee la cola del agente de pagos (un segundo registro de
 * facturas que no llegaba al libro): lee las facturas de Contabilidad › Gastos
 * (`CuentasPorPagar`) y «Pagar» crea su egreso, que se aprueba en el lote de
 * Egresos con la doble firma que ya existía.
 *
 * Lo que el agente tenga guardado aparte NO se esconde: si hay, se dice
 * cuántas y que se registran en Gastos para pagarlas desde acá.
 */
function PagosCola() {
  const { total, isLoading, error } = useAgentWorkItems('pagos')
  const delAgente = !isLoading && !error ? total : 0

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="space-y-1.5">
        {/* PG-16: lo que se ve acá son las facturas de PROVEEDOR, no las
            liquidaciones de los propietarios. */}
        <SectionLabel>Pagos · proveedores</SectionLabel>
        <h1 className="text-h2 text-fg">Cuentas por pagar</h1>
        <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
          Las facturas de proveedor causadas en Gastos: lo que se debe, lo vencido y lo pagado.
        </p>
      </header>

      <PestanasDeLiquidaciones />

      {delAgente > 0 ? (
        <Nota testId="cxp-del-agente">
          {delAgente === 1
            ? 'El agente de pagos tiene 1 factura guardada aparte, que no está en la contabilidad.'
            : `El agente de pagos tiene ${delAgente} facturas guardadas aparte, que no están en la contabilidad.`}{' '}
          Regístralas en Gastos para causarlas y pagarlas desde aquí.
        </Nota>
      ) : null}

      <CuentasPorPagar />
    </div>
  )
}

export default function PagosColaPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosCola />
    </PageGuard>
  )
}
