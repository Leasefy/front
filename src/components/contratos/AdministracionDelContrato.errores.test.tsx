/**
 * 02-10-2026 · «Cómo se cobra este contrato» con el sistema de errores.
 *
 * Lo que el cliente ataja y lo que el back rechaza (`ActualizarAdministracionDto`)
 * se dicen debajo de SU campo —que recibe el foco—, en lugar de una línea
 * suelta al pie. Lo que no tiene campo (un 503 sin la migración, un 5xx con
 * su referencia) va al pie; sólo sin respuesta se habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return { ...actual, contractsApi: { ...actual.contractsApi, actualizarAdministracion: vi.fn() } }
})

import { contractsApi } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import type { Contract } from '@/lib/types/contract'
import { AdministracionDelContrato } from './AdministracionDelContrato'

const actualizar = contractsApi.actualizarAdministracion as unknown as ReturnType<typeof vi.fn>

const contrato = {
  id: 'c-1',
  propertyId: 'p-1',
  tenantId: null,
  landlordName: 'Constructora X',
  monthlyRent: 2_000_000,
  status: 'active',
} as unknown as Contract

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  actualizar.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const boton = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))

async function abrir() {
  await act(async () => {
    root.render(<AdministracionDelContrato contract={contrato} puedeEditar onActualizado={vi.fn()} />)
  })
  await act(async () => boton('Corregir')!.click())
}

async function escribir(selector: string, valor: string) {
  const input = document.querySelector<HTMLInputElement>(selector)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

async function guardar() {
  await act(async () => {
    boton('Guardar')!.click()
    await Promise.resolve()
  })
}

describe('<AdministracionDelContrato> — errores en su campo', () => {
  it('🔴 el plazo fuera de 0-60 se dice DEBAJO del plazo, con el foco, sin llamar al back', async () => {
    await abrir()
    const plazo = await escribir('[data-testid="dias-de-plazo"]', '90')
    await guardar()
    expect(actualizar).not.toHaveBeenCalled()
    expect(document.querySelector('#dias-de-plazo-error')?.textContent).toBe(
      'Los días de plazo van entre 0 y 60, sin decimales.',
    )
    expect(plazo.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(plazo)
    expect(document.querySelector('[data-testid="administracion-error"]')).toBeNull()
  })

  it('🔴 un 400 con `campos` del back va debajo de su campo (referenciaDeRecaudo → referencia)', async () => {
    const frase = 'La referencia de recaudo puede tener hasta 60 caracteres.'
    actualizar.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'referenciaDeRecaudo', regla: 'longitud_maxima', mensaje: frase }],
      }),
    )
    await abrir()
    await guardar()
    const referencia = document.querySelector<HTMLInputElement>('[data-testid="referencia-de-recaudo"]')!
    expect(document.querySelector('#referencia-de-recaudo-error')?.textContent).toBe(frase)
    expect(referencia.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(referencia)
  })

  it('un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    actualizar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await abrir()
    await guardar()
    const pie = document.querySelector('[data-testid="administracion-error"]')!.textContent!
    expect(pie).toContain('de nuestro lado')
    expect(pie).toContain('ab12cd34')
    expect(pie).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    actualizar.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await abrir()
    await guardar()
    expect(document.querySelector('[data-testid="administracion-error"]')!.textContent).toMatch(/conexión/i)
  })
})
