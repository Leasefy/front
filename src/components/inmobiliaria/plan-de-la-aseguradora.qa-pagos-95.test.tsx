/**
 * A-21 (QA-PAGOS-95 r2, 06-10-2026, visto en el navegador): con «Una aseguradora
 * (siniestro)», el plan del recibo mostraba «Noviembre · Adelanto $ 562.840» y
 * «sigue debiendo $ 6.577.160», pero el back imputa sólo lo vencido y deja el
 * resto pendiente de aplicar (salió «sigue debiendo $ 7.140.000»). El plan de una
 * aseguradora ahora sólo toca lo vencido.
 */
import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import type { CarteraDelCliente, PeriodoEnDeuda } from '@/lib/api/recibos-de-caja.types'
import { usePlanDeImputacion } from './ReciboPorCliente'
import type { Imputacion } from '@/lib/recibos/imputar-pago'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const periodo = (id: string, month: string, pendiente: number, vencida: boolean) =>
  ({
    id,
    cuotaId: `q-${id}`,
    cobroId: null,
    month,
    dueDate: `${month}-01T00:00:00.000Z`,
    createdAt: `${month}-01T00:00:00.000Z`,
    consignacionId: 'c1',
    contractId: 'k1',
    leaseId: null,
    propertyTitle: 'Local 3',
    tenantName: 'Moroso',
    totalWithFees: pendiente,
    paidAmount: 0,
    pendingAmount: pendiente,
    lateFee: 0,
    vencida,
  }) as unknown as PeriodoEnDeuda

const cartera = {
  cuotas: [periodo('oct', '2026-10', 2_437_160, true), periodo('nov', '2026-11', 3_570_000, false)],
} as unknown as CarteraDelCliente

function planCon(soloVencido: boolean): Imputacion {
  let plan: Imputacion | null = null
  function Prueba() {
    plan = usePlanDeImputacion(cartera, 3_000_000, false, soloVencido)
    return null
  }
  const div = document.createElement('div')
  const root = createRoot(div)
  act(() => root.render(<Prueba />))
  act(() => root.unmount())
  return plan!
}

describe('A-21 · el plan de una aseguradora', () => {
  it('🔴 sólo paga lo vencido: octubre, y el resto sobra (pendiente de aplicar), sin adelantar noviembre', () => {
    const p = planCon(true)
    expect(p.partes.map((x) => [x.month, x.valorCop])).toEqual([['2026-10', 2_437_160]])
    expect(p.sobrante).toBe(562_840)
  })

  it('el cliente sí adelanta noviembre', () => {
    const p = planCon(false)
    expect(p.partes.map((x) => x.month)).toEqual(['2026-10', '2026-11'])
    expect(p.sobrante).toBe(0)
  })
})
