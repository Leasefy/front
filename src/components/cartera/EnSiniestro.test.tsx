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
    cobroId: 'c-1',
    consignacionId: 'cons-1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Cra 13 # 55-20',
    tenantName: 'Ana Pérez',
    tenantPhone: null,
    propietarioId: 'po-1',
    propietarioName: 'Jorge Restrepo',
    agenteId: null,
    agenteName: null,
    month: '2026-10',
    dueDate: '2026-10-06',
    totalAmount: 2_090_000,
    paidAmount: 0,
    pendingAmount: 2_090_000,
    daysLate: 45,
    status: 'DEFAULTED',
    remindersSent: 3,
    lastReminderDate: null,
    siniestroAt: '2026-11-05T06:00:00.000Z',
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
          cobroId: 'c-2',
          tenantName: 'Luis Gómez',
          propietarioName: null,
          pendingAmount: 1_500_000,
          siniestroAt: '2026-11-19T06:00:00.000Z',
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
    // Cada fila lleva al cobro.
    expect(filas[0].querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/cobros?cobro=c-1',
    )
  })
})
