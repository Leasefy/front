'use client'

/**
 * Las dos lecturas de Liquidaciones, como pantallas hermanas.
 *
 *   · Liquidaciones — el neto por propietario del mes: canon recaudado,
 *     comisión, conceptos a favor y a cargo. Lo que se le VA a girar.
 *   · Por aprobar   — las facturas de proveedor esperando la firma del
 *     contador (triple-gate de AP). Lo que sale por fuera del giro.
 *
 * 🔴 «Por aprobar» llegó acá el 2026-09-16 (Nico). Era `/pagos/cola`, una
 * pestaña del tercer renglón del módulo —la Sala del agente de Pagos—, que
 * decía cosas de propietarios estando elegida la cara «Inquilinos». Esa Sala
 * se fue entera; el detalle de sus nueve pestañas está en la NOTA al pie de
 * `agentWorkspaceNav.ts`. Ésta bajó a Liquidaciones porque es plata que SALE y
 * la aprueba la misma persona que mira el neto del mes.
 *
 * Mismo riel, mismo dibujo y mismo criterio que Cartera (`RielDePestanas`):
 * enlaces, no estado, y marca exacta.
 */

import { CheckSquareOffset, Wallet } from '@phosphor-icons/react'

import { RielDePestanas, type PestanaDelRiel } from '@/components/inmobiliaria/RielDePestanas'

const RAIZ = '/panel/inmobiliaria/pagos/liquidaciones'

export const PESTANAS_DE_LIQUIDACIONES: readonly PestanaDelRiel[] = [
  { href: RAIZ, labelKey: 'inmobiliaria.nav.liquidaciones', icon: Wallet },
  { href: `${RAIZ}/por-aprobar`, labelKey: 'inmobiliaria.ai.nav.pagosCola', icon: CheckSquareOffset },
]

export function PestanasDeLiquidaciones() {
  return <RielDePestanas items={PESTANAS_DE_LIQUIDACIONES} ariaLabel="Lecturas de Liquidaciones" />
}
