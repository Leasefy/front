/**
 * El régimen tributario del contrato: la perilla del ARRENDADOR.
 *
 * Quién GENERA el IVA es el propietario; quién lo RETIENE es el inquilino.
 * Hasta acá la pantalla sólo dejaba tocar el lado del inquilino, y el del
 * arrendador salía de la ficha del propietario — que no puede decir dos cosas
 * a la vez cuando el mismo dueño tiene un local gravado y una casa de familia.
 *
 * Lo que se congela:
 *  1. Vacío significa HEREDAR, y la pantalla dice qué está heredando. Sin esa
 *     línea, «vacío» obliga a ir a buscar la ficha del propietario.
 *  2. Guardar manda el campo con la semántica de tres estados: `null` es
 *     «volvé a heredar», que NO es lo mismo que `false`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return {
    ...actual,
    contractsApi: { ...actual.contractsApi, actualizarAdministracion: vi.fn() },
  }
})

import { contractsApi } from '@/lib/api/contracts.service'
import { AdministracionDelContrato } from './AdministracionDelContrato'
import type { Contract } from '@/lib/types/contract'

const actualizar =
  contractsApi.actualizarAdministracion as unknown as ReturnType<typeof vi.fn>

function contrato(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1',
    propertyId: 'p-1',
    tenantId: null,
    landlordId: 'land-1',
    status: 'active',
    propertyAddress: '',
    propertyCity: '',
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    tenantDocument: '',
    landlordName: 'Constructora X',
    landlordEmail: 'land@x.co',
    landlordDocument: '',
    monthlyRent: 2_000_000,
    adminFee: 0,
    startDate: '2025-01-01',
    endDate: '2030-01-01',
    paymentDueDay: 5,
    landlordSignature: null,
    tenantSignature: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as Contract
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  // El mock del módulo vive entre tests: sin esto, `mock.calls[0]` sigue
  // siendo la llamada del test anterior y el assert mide otra cosa.
  actualizar.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

function render(c: Contract) {
  act(() => {
    root.render(
      <AdministracionDelContrato
        contract={c}
        puedeEditar
        onActualizado={vi.fn()}
      />,
    )
  })
}

function boton(texto: string) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  )
}

/** Abre el formulario: en modo lectura los controles no existen. */
function editar() {
  const b = boton('Corregir')
  if (!b) throw new Error('no hay botón de corregir')
  act(() => b.click())
}

describe('la perilla del arrendador', () => {
  it('existe y va aparte de las del inquilino', () => {
    render(contrato())
    editar()

    expect(
      container.querySelector('[data-testid="arrendador-responsable-iva"]'),
    ).not.toBeNull()
  })

  it('sin definir, dice qué está heredando de la ficha del propietario', () => {
    render(
      contrato({
        regimenTributario: {
          usoComercial: { valor: true, origen: 'TIPO_DE_INMUEBLE' },
          arrendadorResponsableIva: { valor: true, origen: 'PROPIETARIO' },
          inquilinoRetenedorRenta: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIva: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIca: { valor: null, origen: 'SIN_DEFINIR' },
        },
      }),
    )
    editar()

    // El valor efectivo, no sólo «vacío»: sin esto hay que ir a la ficha.
    expect(container.textContent).toContain('se hereda de la ficha del propietario')
    expect(container.textContent).toContain('SÍ es responsable de IVA')
  })

  it('cuando lo decide el contrato, lo dice — no finge que hereda', () => {
    render(
      contrato({
        arrendadorResponsableIva: false,
        regimenTributario: {
          usoComercial: { valor: true, origen: 'CONTRATO' },
          arrendadorResponsableIva: { valor: false, origen: 'CONTRATO' },
          inquilinoRetenedorRenta: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIva: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIca: { valor: null, origen: 'SIN_DEFINIR' },
        },
      }),
    )
    editar()

    expect(container.textContent).toContain('lo decide este contrato')
  })

  it('sin dato en ninguna parte, avisa que el cobro NO llevará IVA', () => {
    render(
      contrato({
        regimenTributario: {
          usoComercial: { valor: null, origen: 'SIN_DEFINIR' },
          arrendadorResponsableIva: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorRenta: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIva: { valor: null, origen: 'SIN_DEFINIR' },
          inquilinoRetenedorIca: { valor: null, origen: 'SIN_DEFINIR' },
        },
      }),
    )
    editar()

    expect(container.textContent).toContain('el cobro NO lleva IVA')
  })

  it('guardar manda el campo: sin definir viaja como null («volvé a heredar»)', async () => {
    actualizar.mockResolvedValue(contrato())
    render(contrato())
    editar()

    const guardar = boton('Guardar')!
    await act(async () => {
      guardar.click()
      await Promise.resolve()
    })

    expect(actualizar).toHaveBeenCalledTimes(1)
    const [, dto] = actualizar.mock.calls[0]
    // `null`, no `false`: `false` AFIRMA que no lleva IVA y bloquearía la
    // herencia de la ficha para siempre.
    expect(dto.arrendadorResponsableIva).toBeNull()
  })

  it('guardar un valor explícito lo manda como booleano', async () => {
    actualizar.mockResolvedValue(contrato())
    render(contrato({ arrendadorResponsableIva: true }))
    editar()

    const guardar = boton('Guardar')!
    await act(async () => {
      guardar.click()
      await Promise.resolve()
    })

    expect(actualizar.mock.calls[0][1].arrendadorResponsableIva).toBe(true)
  })
})

/*
 * Los términos de cobro por contrato (lo que Juan describió): el plazo antes
 * de la mora y el prorrateo del primer mes. Estaban en el DTO de creación y
 * no se veían ni se podían corregir en un contrato activo.
 */
describe('los términos de cobro del contrato', () => {
  it('en lectura, dice el plazo propio o que hereda los días de la inmobiliaria', () => {
    render(contrato({ diasDePlazo: null, prorratearPrimerMes: false }))
    expect(container.textContent).toContain('Los días de la inmobiliaria')
    expect(container.textContent).toContain('Mes completo')

    act(() => root.unmount())
    root = createRoot(container)
    render(contrato({ diasDePlazo: 3, prorratearPrimerMes: true }))
    expect(container.textContent).toContain('3 días')
    expect(container.textContent).toContain('Se prorratea por los días ocupados')
  })

  it('guardar manda diasDePlazo (vacío = null) y prorratearPrimerMes', async () => {
    actualizar.mockResolvedValue(contrato())
    render(contrato({ diasDePlazo: null, prorratearPrimerMes: false }))
    editar()

    const plazo = container.querySelector<HTMLInputElement>('[data-testid="dias-de-plazo"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(plazo, '7')
      plazo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const prorratear = container.querySelector<HTMLButtonElement>('[data-testid="prorratear-primer-mes"]')!
    act(() => prorratear.click())

    await act(async () => {
      boton('Guardar')!.click()
    })

    const [, dto] = actualizar.mock.calls[0]
    expect(dto.diasDePlazo).toBe(7)
    expect(dto.prorratearPrimerMes).toBe(true)
  })

  it('rechaza un plazo fuera de 0-60 sin llamar al back', async () => {
    render(contrato())
    editar()

    const plazo = container.querySelector<HTMLInputElement>('[data-testid="dias-de-plazo"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(plazo, '90')
      plazo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      boton('Guardar')!.click()
    })

    expect(actualizar).not.toHaveBeenCalled()
    expect(container.textContent).toContain('entre 0 y 60')
  })
})
