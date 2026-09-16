/**
 * Los conceptos del contrato en su ficha.
 *
 * Lo que se protege acá (C12, auditoría de errores 2026-09-13): quitar un
 * concepto recurrente cambia lo que se le cobra a alguien TODOS los meses, y
 * se hacía a un clic sobre una basura. Ahora se confirma, y la confirmación
 * dice qué deja de cobrarse: el nombre, el monto, cada cuánto y entre quiénes.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { conceptos: vi.fn(), agregarConcepto: vi.fn(), quitarConcepto: vi.fn() },
}))

import { contractsApi, type ConceptoDelContrato } from '@/lib/api/contracts.service'
import type { Contract } from '@/lib/types/contract'
import { ConceptosDelContrato, queDejaDeCobrarse } from './ConceptosDelContrato'

const conceptosMock = contractsApi.conceptos as unknown as ReturnType<typeof vi.fn>
const quitarMock = contractsApi.quitarConcepto as unknown as ReturnType<typeof vi.fn>

function concepto(overrides: Partial<ConceptoDelContrato> = {}): ConceptoDelContrato {
  return {
    id: 'cc-1',
    conceptoId: 'parqueadero',
    nombre: 'Parqueadero',
    base: 'NO_GRAVADO',
    paga: 'INQUILINO',
    recibe: 'PROPIETARIO',
    valorCop: 180_000,
    recurrente: true,
    ...overrides,
  }
}

// Sin uso del inmueble la tarjeta no liquida impuestos: acá sólo importa quitar.
const contrato = { id: 'c-1', usoInmueble: null, perfilesTributarios: null } as unknown as Contract

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  conceptosMock.mockReset()
  quitarMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(puedeEditar = true) {
  await act(async () => {
    root.render(<ConceptosDelContrato contract={contrato} puedeEditar={puedeEditar} />)
  })
}

const basura = () => container.querySelector<HTMLButtonElement>('button[aria-label="Quitar Parqueadero"]')
const dialogo = () => document.querySelector('[role="alertdialog"]')

describe('queDejaDeCobrarse', () => {
  it('un recurrente dice el monto, cada mes, quién paga y quién recibe', () => {
    const frase = queDejaDeCobrarse(concepto())
    expect(frase).toContain('180.000')
    expect(frase).toContain('cada mes')
    expect(frase).toContain('Lo paga el inquilino y lo recibe el propietario')
    // Lo que más importa: sale del cobro del inquilino.
    expect(frase).toContain('cobro mensual del inquilino')
  })

  it('uno de una sola vez no promete que se repetía', () => {
    const frase = queDejaDeCobrarse(concepto({ recurrente: false }))
    expect(frase).toContain('una sola vez')
    expect(frase).not.toContain('cada mes')
  })

  it('uno que no paga el inquilino no dice que sale de su cobro', () => {
    const frase = queDejaDeCobrarse(concepto({ paga: 'PROPIETARIO', recibe: 'INMOBILIARIA' }))
    expect(frase).toContain('Lo paga el propietario y lo recibe la inmobiliaria')
    expect(frase).not.toContain('cobro mensual del inquilino')
  })
})

describe('<ConceptosDelContrato> — quitar un concepto', () => {
  it('🔴 la basura NO quita: abre la confirmación con qué deja de cobrarse', async () => {
    conceptosMock.mockResolvedValue([concepto()])
    await render()

    await act(async () => {
      basura()!.click()
    })

    expect(quitarMock).not.toHaveBeenCalled()
    expect(dialogo()?.textContent).toContain('Parqueadero')
    expect(dialogo()?.textContent).toContain('180.000')
    expect(dialogo()?.textContent).toContain('cada mes')
  })

  it('confirmar lo quita del contrato y de la lista', async () => {
    conceptosMock.mockResolvedValue([concepto()])
    quitarMock.mockResolvedValue({ id: 'cc-1' })
    await render()

    await act(async () => {
      basura()!.click()
    })
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="confirmar-quitar-concepto"]')!.click()
    })

    expect(quitarMock).toHaveBeenCalledWith('c-1', 'cc-1')
    expect(basura()).toBeNull()
  })

  it('cancelar no llama al back y el concepto sigue ahí', async () => {
    conceptosMock.mockResolvedValue([concepto()])
    await render()

    await act(async () => {
      basura()!.click()
    })
    const cancelar = Array.from(document.querySelectorAll('[role="alertdialog"] button')).find(
      (b) => b.textContent === 'Cancelar',
    ) as HTMLButtonElement
    await act(async () => {
      cancelar.click()
    })

    expect(quitarMock).not.toHaveBeenCalled()
    expect(basura()).not.toBeNull()
  })

  it('sin permiso de edición no hay basura', async () => {
    conceptosMock.mockResolvedValue([concepto()])
    await render(false)

    expect(basura()).toBeNull()
  })
})
