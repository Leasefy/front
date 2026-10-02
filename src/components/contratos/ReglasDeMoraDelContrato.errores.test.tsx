/**
 * 02-10-2026 · El valor propio de una regla de mora con el sistema de errores.
 *
 *  · `ContratoReglaDeMora.valor` es `Decimal(12,4)`: más de ocho cifras enteras
 *    no se manda, y se dice debajo del valor con la frase del back.
 *  · Un 400 con `campos` va debajo del campo de ESA regla.
 *  · Un 5xx dice «de nuestro lado» con la referencia; la conexión, sólo sin
 *    respuesta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/reglas-de-mora.service', () => ({
  reglasDeMoraApi: { delContrato: vi.fn(), ajustarEnContrato: vi.fn() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/panel/inmobiliaria/contratos/c-1' }))

import { reglasDeMoraApi } from '@/lib/api/reglas-de-mora.service'
import { ApiError } from '@/lib/api/client'
import type { ReglaDeMoraDelContrato } from '@/lib/api/reglas-de-mora.types'
import { ReglasDeMoraDelContrato } from './ReglasDeMoraDelContrato'

const delContrato = reglasDeMoraApi.delContrato as unknown as ReturnType<typeof vi.fn>
const ajustar = reglasDeMoraApi.ajustarEnContrato as unknown as ReturnType<typeof vi.fn>

const TOPE = 'El valor de la regla no puede pasar de 99.999.999. Revisa que no sobren ceros.'

const fila = {
  regla: {
    id: 'honorario',
    agencyId: 'ag-1',
    nombre: 'Honorario de cobranza',
    concepto: 'GASTO_ADMINISTRATIVO',
    disparador: 'DIA_DEL_MES',
    disparadorDia: 15,
    formula: 'MONTO_FIJO',
    valor: 50_000,
    base: 'CANON',
    topeCop: null,
    activa: true,
    orden: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  aplica: true,
  valor: 50_000,
  valorDeLaAgencia: 50_000,
  disparadorDia: 15,
  disparadorDiaDeLaAgencia: 15,
  esPropio: false,
} as unknown as ReglaDeMoraDelContrato

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  delContrato.mockReset().mockResolvedValue([fila])
  ajustar.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const $ = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)

async function cambiarYGuardar(testId: string, valor: string) {
  await act(async () => {
    root.render(<ReglasDeMoraDelContrato contract={{ id: 'c-1' }} puedeEditar />)
  })
  const input = $(testId) as HTMLInputElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    $(`${testId}-guardar`)!.click()
    await Promise.resolve()
  })
  return input
}

describe('<ReglasDeMoraDelContrato> — errores en su campo', () => {
  it('🔴 más de ocho cifras enteras NO se manda: el tope sale debajo del valor, con el foco', async () => {
    const valor = await cambiarYGuardar('valor-honorario', '150000000')
    expect(ajustar).not.toHaveBeenCalled()
    expect(container.querySelector('#valor-honorario-error')?.textContent).toBe(TOPE)
    expect(valor.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(valor)
  })

  it('🔴 un 400 con `campos` en el día va debajo del día de ESA regla, no al pie', async () => {
    const frase = 'El día no puede ser mayor que 31.'
    ajustar.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'disparadorDia', regla: 'maximo', mensaje: frase }],
      }),
    )
    await cambiarYGuardar('dia-honorario', '20')
    expect(container.querySelector('#dia-honorario-error')?.textContent).toBe(frase)
    expect($('reglas-de-mora-error')).toBeNull()
  })

  it('un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    ajustar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await cambiarYGuardar('dia-honorario', '20')
    const pie = $('reglas-de-mora-error')!.textContent!
    expect(pie).toContain('de nuestro lado')
    expect(pie).toContain('ab12cd34')
    expect(pie).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    ajustar.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await cambiarYGuardar('dia-honorario', '20')
    expect($('reglas-de-mora-error')!.textContent).toMatch(/conexión/i)
  })
})
