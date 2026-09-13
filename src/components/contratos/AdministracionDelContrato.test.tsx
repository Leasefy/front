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
 *     «vuelve a heredar», que NO es lo mismo que `false`.
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
  return Array.from(document.querySelectorAll('button')).find((b) =>
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
      document.querySelector('[data-testid="arrendador-responsable-iva"]'),
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
    expect(document.body.textContent).toContain('se hereda de la ficha del propietario')
    expect(document.body.textContent).toContain('SÍ es responsable de IVA')
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

    expect(document.body.textContent).toContain('lo decide este contrato')
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

    expect(document.body.textContent).toContain('el cobro NO lleva IVA')
  })

  it('guardar manda el campo: sin definir viaja como null («vuelve a heredar»)', async () => {
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
    expect(document.body.textContent).toContain('Los días de la inmobiliaria')
    expect(document.body.textContent).toContain('Mes completo')

    act(() => root.unmount())
    root = createRoot(container)
    render(contrato({ diasDePlazo: 3, prorratearPrimerMes: true }))
    expect(document.body.textContent).toContain('3 días')
    expect(document.body.textContent).toContain('Prorrateado por días')
  })

  it('guardar manda diasDePlazo (vacío = null) y prorratearPrimerMes', async () => {
    actualizar.mockResolvedValue(contrato())
    render(contrato({ diasDePlazo: null, prorratearPrimerMes: false }))
    editar()

    const plazo = document.querySelector<HTMLInputElement>('[data-testid="dias-de-plazo"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(plazo, '7')
      plazo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const prorratear = document.querySelector<HTMLButtonElement>('[data-testid="prorratear-primer-mes"]')!
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

    const plazo = document.querySelector<HTMLInputElement>('[data-testid="dias-de-plazo"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(plazo, '90')
      plazo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      boton('Guardar')!.click()
    })

    expect(actualizar).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('entre 0 y 60')
  })
})

/**
 * 🔴 Nico, 2026-09-12: «Naturaleza de impuestos: que señale la naturaleza que
 * tenga el inquilino Y la del propietario. Está apareciendo en rojo las que no
 * están y en azul las que sí están del inquilino, pero no aparece la del
 * propietario. Es importante que no deje las que no aplican, para no generar
 * ruido.»
 */
describe('la naturaleza tributaria de cada parte', () => {
  const dueno = (over: Partial<import('@/lib/types/contract').PropietarioDelContrato> = {}) => ({
    id: 'po-1',
    name: 'Ana Gómez',
    documentNumber: '900',
    documentType: 'CC',
    participacionBps: 10_000,
    participacion: '100 %',
    canonCop: 2_000_000,
    esPrincipal: true,
    responsableIva: null,
    agenteRetenedorRenta: null,
    agenteRetenedorIva: null,
    agenteRetenedorIca: null,
    ...over,
  })

  it('del inquilino muestra SÓLO lo que tiene: ni «no retiene» ni «sin definir»', () => {
    render(
      contrato({
        inquilinoTipoPersona: 'JURIDICA',
        inquilinoRetenedorRenta: true,
        inquilinoRetenedorIva: false,
        inquilinoRetenedorIca: null,
        inquilinoResponsableIva: null,
      }),
    )
    const fila = document.querySelector('[data-testid="naturaleza-inquilino"]')!
    expect(fila.textContent).toContain('Empresa')
    expect(fila.textContent).toContain('Retiene renta')
    expect(fila.textContent).not.toContain('No retiene')
    expect(fila.textContent).not.toContain('sin definir')
  })

  it('el propietario ahora TIENE su fila, con sus responsabilidades', () => {
    render(
      contrato({
        propietariosDelContrato: {
          sumaBps: 10_000,
          sumanCien: true,
          propietarios: [dueno({ documentType: 'NIT', responsableIva: true })],
        },
      }),
    )
    const filas = document.querySelectorAll('[data-testid="naturaleza-propietario"]')
    expect(filas).toHaveLength(1)
    expect(filas[0].textContent).toContain('Propietario')
    expect(filas[0].textContent).toContain('Empresa')
    expect(filas[0].textContent).toContain('Responsable de IVA')
  })

  it('con varios dueños va una fila por dueño, con su nombre', () => {
    render(
      contrato({
        propietariosDelContrato: {
          sumaBps: 10_000,
          sumanCien: true,
          propietarios: [
            dueno({ id: 'a', name: 'Ana', responsableIva: true }),
            dueno({ id: 'b', name: 'Beto', esPrincipal: false, responsableIva: false }),
          ],
        },
      }),
    )
    const filas = document.querySelectorAll('[data-testid="naturaleza-propietario"]')
    expect(filas).toHaveLength(2)
    expect(filas[0].textContent).toContain('Ana')
    expect(filas[0].textContent).toContain('Responsable de IVA')
    // Beto dijo que NO: no se pinta, pero tampoco se le atribuye el sí de Ana.
    expect(filas[1].textContent).toContain('Beto')
    expect(filas[1].textContent).not.toContain('Responsable de IVA')
  })

  it('una parte sin ningún dato lo DICE — una fila vacía se lee como «no tiene nada»', () => {
    render(
      contrato({
        inquilinoTipoPersona: null,
        inquilinoRetenedorRenta: null,
        inquilinoRetenedorIva: null,
        inquilinoRetenedorIca: null,
        inquilinoResponsableIva: null,
      }),
    )
    const fila = document.querySelector('[data-testid="naturaleza-inquilino"]')!
    expect(fila.textContent).toContain('Sin datos tributarios')
  })

  it('sin consignación dice de dónde sale el propietario, en vez de dejar el hueco', () => {
    render(contrato({ propietariosDelContrato: null }))
    expect(document.querySelector('[data-testid="naturaleza-propietario"]')).toBeNull()
    expect(document.querySelector('[data-testid="impuestos"]')!.textContent).toContain(
      'Sin consignación',
    )
  })
})
