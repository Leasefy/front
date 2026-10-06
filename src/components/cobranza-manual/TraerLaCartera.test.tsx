/**
 * COBRANZA-MANUAL (04-10-2026): «Cobranza se llena con la cartera de los
 * contratos» (Nico). El botón la trae ya, dice cuánto llegó y, si la cobranza
 * está en Automático, por qué sólo entran los cobros emitidos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const h = vi.hoisted(() => ({
  traer: vi.fn(),
  deDonde: vi.fn(),
  perms: { isAdmin: false, canAccess: (m: string, a: string) => m === 'cobros' && a === 'create' },
}))
vi.mock('@/lib/api/cobranza-manual.service', () => ({
  cobranzaManualApi: { traerLaCartera: h.traer, deDondeSale: h.deDonde },
}))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => h.perms }))

import { TraerLaCartera, fraseDeLaCarteraTraida } from './TraerLaCartera'

const resumen = { filas: 5, deudores: 3, obligaciones: 5, altas: 3, omitidos: 0, agenciasConError: 0 }

describe('fraseDeLaCarteraTraida', () => {
  it('cuenta lo que llegó, con su número gramatical', () => {
    expect(fraseDeLaCarteraTraida({ estado: 'hecha', camino: 'cuotas', contactaSola: false, plazoSinFijar: false, resumen })).toBe(
      'Listo: 3 deudores y 5 cuotas en Cobranza.',
    )
    expect(
      fraseDeLaCarteraTraida({
        estado: 'hecha',
        camino: 'cuotas',
        contactaSola: false,
        plazoSinFijar: false,
        resumen: { ...resumen, deudores: 1, obligaciones: 1 },
      }),
    ).toBe('Listo: 1 deudor y 1 cuota en Cobranza.')
  })
  it('CR-31: sin plazo fijado no hay nada en mora que traer', () => {
    expect(fraseDeLaCarteraTraida({ estado: 'hecha', camino: 'cuotas', contactaSola: false, plazoSinFijar: true, resumen })).toContain(
      'no ha fijado sus días de plazo',
    )
  })
  it('doble clic', () => {
    expect(fraseDeLaCarteraTraida({ estado: 'en-curso' })).toContain('Ya estamos trayendo')
  })
})

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  h.traer.mockReset()
  h.deDonde.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('<TraerLaCartera>', () => {
  it('trae la cartera, dice cuánto llegó y avisa para releer la lista', async () => {
    h.deDonde.mockResolvedValue({ camino: 'cuotas', contactaSola: false, porLaVariable: false, plazoSinFijar: false })
    h.traer.mockResolvedValue({ estado: 'hecha', camino: 'cuotas', contactaSola: false, plazoSinFijar: false, resumen })
    const onTraida = vi.fn()
    await act(async () => {
      root.render(<TraerLaCartera onTraida={onTraida} />)
    })
    expect(container.textContent).toContain('salen solos de la cartera de los contratos')
    expect(container.querySelector('[data-testid="cobranza-en-automatico"]')).toBeNull()
    await act(async () => {
      ;(container.querySelector('[data-testid="traer-la-cartera"]') as HTMLButtonElement).click()
    })
    expect(h.traer).toHaveBeenCalledTimes(1)
    expect(onTraida).toHaveBeenCalled()
    expect(container.textContent).toContain('Listo: 3 deudores y 5 cuotas en Cobranza.')
  })

  it('en Automático lo dice: entran sólo los cobros emitidos', async () => {
    h.deDonde.mockResolvedValue({ camino: 'cobros', contactaSola: true, porLaVariable: false, plazoSinFijar: false })
    await act(async () => {
      root.render(<TraerLaCartera />)
    })
    expect(container.querySelector('[data-testid="cobranza-en-automatico"]')?.textContent).toContain(
      'entran sólo los cobros que ya emitiste',
    )
  })
})
