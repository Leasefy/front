/**
 * QA-CONT-95 r3 · E-13: el interruptor «Comisionar …» aparece aunque el contrato
 * no tenga el uso del inmueble (los migrados). Antes vivía dentro de la
 * liquidación de impuestos, que sin uso no se arma: no había cómo marcarlo.
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
vi.mock('@/lib/api/mandato.service', () => ({ mandatoApi: { marcarComisionable: vi.fn() } }))

import { contractsApi, type ConceptoDelContrato } from '@/lib/api/contracts.service'
import type { Contract } from '@/lib/types/contract'
import { ConceptosDelContrato } from './ConceptosDelContrato'

const conceptosMock = contractsApi.conceptos as unknown as ReturnType<typeof vi.fn>

const concepto = (o: Partial<ConceptoDelContrato>): ConceptoDelContrato => ({
  id: 'cc-1', conceptoId: 'incremento-canon', nombre: 'Incremento del canon', base: 'ARRENDAMIENTO',
  paga: 'INQUILINO', recibe: 'PROPIETARIO', valorCop: 100_000, recurrente: true, ...o,
})
const sinUso = { id: 'c-56', usoInmueble: null, perfilesTributarios: null } as unknown as Contract

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  conceptosMock.mockReset()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function abrir(nombre: string) {
  await act(async () => {
    root.render(<ConceptosDelContrato contract={sinUso} puedeEditar />)
  })
  const boton = [...container.querySelectorAll('button')].find((b) => b.textContent?.startsWith(nombre))!
  await act(async () => {
    boton.click()
  })
}

describe('<ConceptosDelContrato> · E-13 sin el uso del inmueble', () => {
  it('🔴 el concepto que el inquilino le paga al propietario ofrece «Comisionar …»', async () => {
    conceptosMock.mockResolvedValue([concepto({})])
    await abrir('Incremento del canon')
    expect(container.textContent).toContain('falta el uso del inmueble')
    expect(container.querySelector('[aria-label="Comisionar Incremento del canon"]')).not.toBeNull()
  })

  it('la administración de la copropiedad dice por qué no se comisiona', async () => {
    conceptosMock.mockResolvedValue([
      concepto({ id: 'cc-2', conceptoId: 'administracion-propiedad-horizontal', nombre: 'Administración Propiedad Horizontal', base: 'NO_GRAVADO', recibe: 'INMOBILIARIA' }),
    ])
    await abrir('Administración Propiedad Horizontal')
    expect(container.querySelector('[data-testid="no-es-comisionable"]')?.textContent).toContain(
      'Sólo se comisiona lo que el inquilino le paga al propietario.',
    )
  })
})
