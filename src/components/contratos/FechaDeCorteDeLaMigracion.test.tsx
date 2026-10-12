/**
 * La fecha de corte de la migración y el sistema de errores (02-10-2026):
 *
 *  · el cliente ataja con las MISMAS reglas y frases que
 *    `fecha-de-corte.service.ts` (un día real, desde el 2000 y hasta un año
 *    adelante) y lo dice DEBAJO del campo;
 *  · un 400 del back es de la fecha: va al campo, con el foco;
 *  · lo demás (un 409 porque ya hay cuotas, un 5xx, la red) es un aviso del
 *    bloque, por el traductor.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: { migracion: { fechaDeCorte: vi.fn(), fijarFechaDeCorte: vi.fn() } },
  }
})

import { ApiError } from '@/lib/api/client'
import { contractsApi } from '@/lib/api/contracts.service'
import { FechaDeCorteDeLaMigracion } from './FechaDeCorteDeLaMigracion'
import { MENSAJES_DE_LA_MIGRACION as M } from '@/components/migracion/limites-de-la-migracion'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.mocked(contractsApi.migracion.fechaDeCorte).mockReset()
  vi.mocked(contractsApi.migracion.fijarFechaDeCorte).mockReset()
  vi.mocked(contractsApi.migracion.fechaDeCorte).mockResolvedValue({
    fecha: null,
    editable: true,
    motivo: null,
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function pintar() {
  await act(async () => {
    root.render(<FechaDeCorteDeLaMigracion onCambio={() => {}} />)
  })
  await act(async () => {})
}

const campo = () => document.getElementById('fecha-de-corte-campo') as HTMLInputElement
const errorDelCampo = () => document.getElementById('fecha-de-corte-campo-error')
const avisoDelBloque = () => container.querySelector('[data-testid="fecha-de-corte-error"]')

async function escribirYGuardar(dia: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(campo(), dia)
    campo().dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    ;(container.querySelector('[data-testid="fecha-de-corte-guardar"]') as HTMLButtonElement).click()
  })
  await act(async () => {})
}

/** Hoy, como `AAAA-MM-DD`: siempre dentro del rango del back. */
const hoy = () => new Date().toISOString().slice(0, 10)

describe('<FechaDeCorteDeLaMigracion> — el error en su lugar', () => {
  it('🔴 antes del 2000 se ataja en el cliente: la frase del back debajo, foco y no viaja', async () => {
    await pintar()
    await escribirYGuardar('1999-12-31')

    expect(contractsApi.migracion.fijarFechaDeCorte).not.toHaveBeenCalled()
    expect(errorDelCampo()?.textContent).toBe(M.fechaDeCorteFueraDeRango)
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    expect(campo().getAttribute('aria-describedby')).toBe('fecha-de-corte-campo-error')
    expect(document.activeElement).toBe(campo())
  })

  it('🔴 un 400 del back es de la fecha: va debajo del campo, con el foco', async () => {
    vi.mocked(contractsApi.migracion.fijarFechaDeCorte).mockRejectedValue(
      new ApiError(400, M.fechaDeCorteInvalida, 'FECHA_DE_CORTE_INVALIDA', {
        statusCode: 400,
        code: 'FECHA_DE_CORTE_INVALIDA',
        message: M.fechaDeCorteInvalida,
      }),
    )
    await pintar()
    await escribirYGuardar(hoy())

    expect(errorDelCampo()?.textContent).toBe(M.fechaDeCorteInvalida)
    expect(document.activeElement).toBe(campo())
    expect(avisoDelBloque()).toBeNull()
  })

  it('un 409 (ya hay cuotas) no es de la fecha: aviso del bloque con el texto del back', async () => {
    const motivo =
      'Ya hay contratos migrados con su tabla de cuotas armada sobre esta fecha. Cambiarla movería deuda de contratos que ya existen: pídelo a soporte.'
    vi.mocked(contractsApi.migracion.fijarFechaDeCorte).mockRejectedValue(
      new ApiError(409, motivo, 'FECHA_DE_CORTE_EN_USO'),
    )
    await pintar()
    await escribirYGuardar(hoy())
    expect(avisoDelBloque()?.textContent).toBe(motivo)
    expect(errorDelCampo()).toBeNull()
  })

  it('🔴 un 5xx: de nuestro lado, con la referencia, sin «conexión»', async () => {
    vi.mocked(contractsApi.migracion.fijarFechaDeCorte).mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await pintar()
    await escribirYGuardar(hoy())
    const t = avisoDelBloque()?.textContent ?? ''
    expect(t).toMatch(/^No pudimos guardar la fecha de corte: algo falló de nuestro lado/)
    expect(t).toContain('ab12cd34')
    expect(t).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta: la conexión', async () => {
    vi.mocked(contractsApi.migracion.fijarFechaDeCorte).mockRejectedValue(
      new TypeError('Failed to fetch'),
    )
    await pintar()
    await escribirYGuardar(hoy())
    expect(avisoDelBloque()?.textContent).toMatch(/conexión/)
  })

  it('al leerla, un 5xx tampoco culpa a la conexión', async () => {
    vi.mocked(contractsApi.migracion.fechaDeCorte).mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'cd34ef56',
      }),
    )
    await pintar()
    const t = avisoDelBloque()?.textContent ?? ''
    expect(t).toMatch(/^No pudimos leer la fecha de corte: algo falló de nuestro lado/)
    expect(t).toContain('cd34ef56')
  })
})
