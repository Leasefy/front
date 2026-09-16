/**
 * La sección «En siniestro» de la cartera.
 *
 * Lo que se fija: la regla se dice SIEMPRE (con el umbral de la agencia, no
 * un 30 escrito a mano), la tabla sólo aparece con casos, y cada fila trae
 * cuándo pasó y cuántos días lleva.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { CarteraSiniestro, CarteraSiniestros } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

import { EnSiniestro } from './EnSiniestro'

function caso(over: Partial<CarteraSiniestro> = {}): CarteraSiniestro {
  return {
    cuotaId: 'q-1',
    cobroId: 'c-1',
    contractId: 'ct-1',
    contrato: '1686',
    contratoDeLeasefy: 'Leasefy #12',
    propertyId: 'inm-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Cra 13 # 55-20',
    tenantName: 'Ana Pérez',
    tenantPhone: null,
    tenantDocument: '1020',
    propietarioId: 'po-1',
    propietarioName: 'Jorge Restrepo',
    agenteId: null,
    agenteName: null,
    month: '2026-10',
    vence: '2026-10-06',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 45,
    diasDePlazo: 3,
    esVencida: true,
    totalAmount: 2_090_000,
    paidAmount: 0,
    pendingAmount: 2_090_000,
    remindersSent: 3,
    lastReminderDate: null,
    siniestroDesde: '2026-11-05',
    diasEnSiniestro: 15,
    ...over,
  }
}

describe('EnSiniestro', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  function pintar(siniestros: CarteraSiniestros) {
    act(() => {
      root.render(<EnSiniestro siniestros={siniestros} />)
    })
  }

  it('vacía: dice la regla con el umbral de la agencia y no pinta tabla', () => {
    pintar({ cantidad: 0, totalCop: 0, diasParaSiniestro: 45, items: [] })

    expect(host.querySelector('[data-testid="siniestro-regla"]')?.textContent).toContain(
      'a los 45 días de mora',
    )
    expect(host.querySelector('[data-testid="siniestro-cantidad"]')?.textContent).toBe(
      'Ningún caso',
    )
    expect(host.querySelectorAll('[data-testid="siniestro-fila"]')).toHaveLength(0)
    expect(host.querySelector('table')).toBeNull()
  })

  it('con casos: total, conteo y una fila por caso con desde cuándo', () => {
    pintar({
      cantidad: 2,
      totalCop: 3_590_000,
      diasParaSiniestro: 30,
      items: [
        caso(),
        caso({
          cuotaId: 'q-2',
          cobroId: null,
          tenantName: 'Luis Gómez',
          propietarioName: null,
          pendingAmount: 1_500_000,
          siniestroDesde: '2026-11-19',
          diasEnSiniestro: 1,
        }),
      ],
    })

    expect(host.querySelector('[data-testid="siniestro-total"]')?.textContent).toContain(
      '3.590.000',
    )
    expect(host.querySelector('[data-testid="siniestro-cantidad"]')?.textContent).toBe(
      '2 casos',
    )
    const filas = host.querySelectorAll('[data-testid="siniestro-fila"]')
    expect(filas).toHaveLength(2)
    expect(filas[0].textContent).toContain('Ana Pérez')
    expect(filas[0].textContent).toContain('15 días')
    expect(filas[1].textContent).toContain('1 día')
    expect(filas[1].textContent).toContain('Sin consignar')
    // Cada fila lleva al cobro, y si no hay cobro emitido, al contrato.
    expect(filas[0].querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/pagos/cartera/cobros?cobro=c-1',
    )
    expect(filas[1].querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/ct-1',
    )
  })

  it('🔴 la fecha no se corre un día: `siniestroDesde` es un día del calendario', () => {
    // `'2026-11-05'` lo parsea JavaScript a medianoche UTC; formateado en la
    // zona local de Bogotá (UTC−5) se renderiza como el 4. El mismo defecto
    // que ya cazamos en `consignedAt`.
    pintar({ cantidad: 1, totalCop: 2_090_000, diasParaSiniestro: 30, items: [caso()] })
    const fila = host.querySelector('[data-testid="siniestro-fila"]')
    expect(fila?.textContent).toContain('5 de nov de 2026')
    expect(fila?.textContent).not.toContain('4 de nov de 2026')
  })

  it('la regla dice que el umbral se cuenta DESPUÉS del plazo del contrato', () => {
    pintar({ cantidad: 0, totalCop: 0, diasParaSiniestro: 30, items: [] })
    expect(host.querySelector('[data-testid="siniestro-regla"]')?.textContent).toContain(
      'DESPUÉS de los días de plazo del contrato',
    )
  })
})
