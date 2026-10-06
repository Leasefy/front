/**
 * acuerdo-vocab — los planes de pago REALES en «Acuerdos de pago» (QA-IA-B,
 * 04-10-2026).
 *
 * 🔴 En el laboratorio había cinco planes de Iván (uno ofrecido sin aprobar,
 * cuatro activos) y la pantalla decía «Todavía no hay acuerdos de pago»: los
 * planes salían del embudo de pagos, que no trae un plan sin pagos. Ahora
 * salen de `GET …/cartera/payment-plans`, y estas pruebas cuidan cómo se lee
 * cada estado.
 */

import { describe, it, expect } from 'vitest'

import { componerAcuerdos, filaDePlan } from './acuerdo-vocab'
import type { PlanDePagoItem } from '@/lib/hooks/cobranza/use-payment-plans'

const BASE: PlanDePagoItem = {
  planId: 'plan-1',
  debtorId: 'deudor-1',
  debtorName: 'Iván Inquilino Pérez Gómez',
  cedulaMasked: '10•••222',
  phoneMasked: '+57•••2233',
  status: 'offered',
  aprobado: false,
  totalDueCop: 6_050_000,
  initialAmountCop: 1_815_000,
  discountAppliedPct: 0,
  cuotas: 3,
  cuotasPagadas: 0,
  proximaCuota: { numero: 1, vence: '2026-11-03', valorCop: 1_411_667 },
  offeredAt: '2026-10-03T10:00:00.000Z',
  acceptedAt: null,
  defaultedAt: null,
  operatorApprovedAt: null,
}

describe('filaDePlan — un plan de pago real', () => {
  it('un plan ofrecido sin aprobar está «Por aprobar», con su próxima cuota y sus condiciones', () => {
    const fila = filaDePlan(BASE)
    expect(fila).toMatchObject({
      key: 'plan-plan-1',
      deudor: 'Iván Inquilino Pérez Gómez',
      tipo: 'plan',
      estado: 'por_aprobar',
      montoCop: 6_050_000,
      // El día anclado al mediodía de Bogotá: sin eso se pintaba «2 de nov».
      venceEl: '2026-11-03T12:00:00-05:00',
      planId: 'plan-1',
    })
    expect(fila?.condiciones).toBe('3 cuotas, 0 pagadas · inicial de $1.815.000.')
  })

  it('aprobado pero sin aceptar por el inquilino: vigente, y lo dice', () => {
    const fila = filaDePlan({ ...BASE, aprobado: true, operatorApprovedAt: '2026-10-03T11:00:00.000Z' })
    expect(fila?.estado).toBe('vigente')
    expect(fila?.condiciones).toContain('falta que el inquilino lo acepte')
  })

  it('activo es vigente; activo sin aprobación registrada no se esconde', () => {
    expect(filaDePlan({ ...BASE, status: 'active', aprobado: true })?.estado).toBe('vigente')
    const sinAprobar = filaDePlan({ ...BASE, status: 'active', aprobado: false })
    expect(sinAprobar?.estado).toBe('vigente')
    expect(sinAprobar?.condiciones).toContain('activo sin aprobación de la inmobiliaria registrada')
  })

  it('cumplido, incumplido (con su fecha) y cancelado (no se muestra)', () => {
    expect(filaDePlan({ ...BASE, status: 'completed', cuotasPagadas: 3, proximaCuota: null })?.estado).toBe('cumplido')
    const incumplido = filaDePlan({ ...BASE, status: 'defaulted', defaultedAt: '2026-11-10T15:00:00.000Z' })
    expect(incumplido?.estado).toBe('incumplido')
    expect(incumplido?.resueltoEn).toBe('2026-11-10T15:00:00.000Z')
    expect(filaDePlan({ ...BASE, status: 'cancelled' })).toBeNull()
  })
})

describe('componerAcuerdos', () => {
  it('junta planes y promesas, deja fuera los cancelados y ordena por lo más reciente', () => {
    const filas = componerAcuerdos(
      [],
      [
        BASE,
        { ...BASE, planId: 'plan-2', status: 'active', aprobado: true, offeredAt: '2026-10-04T10:00:00.000Z' },
        { ...BASE, planId: 'plan-3', status: 'cancelled' },
      ],
    )
    expect(filas.map((f) => f.planId)).toEqual(['plan-2', 'plan-1'])
  })
})
