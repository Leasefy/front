/**
 * 02-10-2026 · Agregar un coarrendatario con el sistema de errores.
 *
 * El back (`AgregarInquilinoDto`) manda `campos` con la frase de cada uno: el
 * error va debajo de SU campo y ese campo recibe el foco. Lo que no tiene
 * campo (un 409, un 5xx con la referencia) va al pie del diálogo, y sólo sin
 * respuesta se habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return {
    ...actual,
    contractsApi: { ...actual.contractsApi, agregarInquilino: vi.fn(), quitarInquilino: vi.fn(), getById: vi.fn() },
  }
})
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { getAll: vi.fn() } }))
vi.mock('@/components/inmobiliaria/EditarPropietariosDialog', () => ({ EditarPropietariosDialog: () => null }))

import { contractsApi } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import type { Contract } from '@/lib/types/contract'
import { PartesDelContrato } from './PartesDelContrato'

const agregarInquilino = contractsApi.agregarInquilino as unknown as ReturnType<typeof vi.fn>
const quitarInquilino = contractsApi.quitarInquilino as unknown as ReturnType<typeof vi.fn>

const contrato = {
  id: 'c-1',
  propertyId: null,
  tenantId: 'inq-1',
  tenantName: 'Wilson Sarrazola',
  tenantEmail: 'wilson@example.com',
  tenantDocument: '1026150802',
  landlordName: '',
  inquilinosDelContrato: [
    { id: null, nombre: 'Wilson Sarrazola', documento: '1026150802', esPrincipal: true },
    { id: 'co-1', nombre: 'Marta Ruiz', documento: '43123456', esPrincipal: false },
  ],
} as unknown as Contract

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function abrirYGuardar() {
  await act(async () => {
    root.render(
      <PartesDelContrato contract={contrato} puedeInvitar puedeEditar onActualizado={() => {}} onConflicto={() => {}} />,
    )
  })
  await act(async () => $('agregar-inquilino')!.click())
  await escribir($('inquilino-nombre') as HTMLInputElement, 'Ana Gómez')
  await escribir($('inquilino-documento') as HTMLInputElement, '71211270')
  await act(async () => {
    $('guardar-inquilino')!.click()
    await Promise.resolve()
  })
}

const fallo500 = () =>
  new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia: 'ab12cd34',
  })

describe('<PartesDelContrato> — agregar un coarrendatario', () => {
  it('🔴 un 400 con `campos` va debajo de su campo, y ese campo recibe el foco', async () => {
    const frase = 'El documento no puede pasar de 40 caracteres.'
    agregarInquilino.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'documento', regla: 'longitud_maxima', mensaje: frase }],
      }),
    )
    await abrirYGuardar()
    const documento = $('inquilino-documento') as HTMLInputElement
    expect(document.querySelector('#inquilino-documento-error')?.textContent).toBe(frase)
    expect(documento.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(documento)
    // El nombre está bien: no se pinta en rojo.
    expect(($('inquilino-nombre') as HTMLInputElement).getAttribute('aria-invalid')).toBeNull()
    expect($('agregar-inquilino-error')).toBeNull()
  })

  it('un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    agregarInquilino.mockRejectedValue(fallo500())
    await abrirYGuardar()
    const pie = $('agregar-inquilino-error')!.textContent!
    expect(pie).toContain('de nuestro lado')
    expect(pie).toContain('ab12cd34')
    expect(pie).not.toMatch(/conexión/i)
    // Lo escrito sigue ahí.
    expect(($('inquilino-nombre') as HTMLInputElement).value).toBe('Ana Gómez')
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    agregarInquilino.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await abrirYGuardar()
    expect($('agregar-inquilino-error')!.textContent).toMatch(/conexión/i)
  })

  it('los campos no dejan escribir más de lo que cabe en el back', async () => {
    await act(async () => {
      root.render(
        <PartesDelContrato contract={contrato} puedeInvitar puedeEditar onActualizado={() => {}} onConflicto={() => {}} />,
      )
    })
    await act(async () => $('agregar-inquilino')!.click())
    expect(($('inquilino-nombre') as HTMLInputElement).maxLength).toBe(200)
    expect(($('inquilino-documento') as HTMLInputElement).maxLength).toBe(40)
  })

  it('quitar con un 5xx avisa con la referencia, no con el texto crudo', async () => {
    quitarInquilino.mockRejectedValue(fallo500())
    await act(async () => {
      root.render(
        <PartesDelContrato contract={contrato} puedeInvitar puedeEditar onActualizado={() => {}} onConflicto={() => {}} />,
      )
    })
    const basura = container.querySelector<HTMLButtonElement>('button[aria-label="Quitar a Marta Ruiz"]')!
    await act(async () => basura.click())
    await act(async () => {
      $('confirmar-quitar-inquilino')!.click()
      await Promise.resolve()
    })
    const dicho = (toast.error as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(dicho).toContain('ab12cd34')
    expect(dicho).not.toContain('Error interno del servidor')
  })
})
