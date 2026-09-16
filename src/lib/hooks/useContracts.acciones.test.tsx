/**
 * Las acciones sobre contratos NO se tragan el error del back.
 *
 * 🔴 `useContractActions.run()` hacía `catch { setLastError(err); return null }`
 * y las pantallas leían `actions.lastError?.message` justo después del
 * `await`: leían el render VIEJO (closure), o sea `null`. Resultado: ningún
 * 400/409 llegaba al usuario. «Ese inmueble ya tiene un contrato en curso
 * (#1234)» se leía «No se pudo crear el contrato. Verifica los datos», y las
 * ramas de recuperación («ya existe un contrato», «Tenant must sign first»,
 * el 403) eran código muerto.
 *
 * Ahora la acción RELANZA el mismo error, y quien llama lo lee con los helpers
 * de abajo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api } = vi.hoisted(() => ({
  api: { createManual: vi.fn(), cancel: vi.fn(), remind: vi.fn() },
}))

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: api,
  esContratoSinDocumento: () => false,
}))

import {
  useContractActions,
  mensajeDelFallo,
  estadoDelFallo,
  inmuebleOcupado,
  contratoDuplicado,
  isPermissionError,
} from './useContracts'
import { ApiError } from '@/lib/api/client'

// ─── Arnés ───────────────────────────────────────────────────────────────────

let acciones: ReturnType<typeof useContractActions>
function Sonda() {
  acciones = useContractActions()
  return null
}

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  api.createManual.mockReset()
  api.cancel.mockReset()
  api.remind.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  act(() => raiz.render(<Sonda />))
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function capturar(op: () => Promise<unknown>): Promise<unknown> {
  let capturado: unknown = undefined
  await act(async () => {
    try {
      await op()
    } catch (e) {
      capturado = e
    }
  })
  return capturado
}

// ─── run() ───────────────────────────────────────────────────────────────────

describe('useContractActions — el fallo del back llega a quien llama', () => {
  it('un 409 al crear se RELANZA tal cual (no vuelve `null`)', async () => {
    const fallo = new ApiError(409, 'Ese inmueble ya tiene un contrato en curso (#1234).')
    api.createManual.mockRejectedValue(fallo)

    const capturado = await capturar(() => acciones.createManual({} as never))

    expect(capturado).toBe(fallo)
    // `lastError` sigue quedando para quien lo renderice, y el envío se apaga.
    expect(acciones.lastError).toBe(fallo)
    expect(acciones.isSubmitting).toBe(false)
  })

  it('un fallo que no es Error se envuelve en uno, con su texto', async () => {
    api.cancel.mockRejectedValue('se cayó la red')
    const capturado = await capturar(() => acciones.cancel('c-1'))
    expect(capturado).toBeInstanceOf(Error)
    expect((capturado as Error).message).toBe('se cayó la red')
  })

  it('cuando sale bien devuelve el resultado y limpia el error anterior', async () => {
    api.remind.mockRejectedValueOnce(new ApiError(429, 'Too Many Requests'))
    await capturar(() => acciones.remind('c-1'))
    expect(acciones.lastError).not.toBeNull()

    api.remind.mockResolvedValueOnce({ remindedAt: 'x', nextAllowedAt: 'y' })
    let resultado: unknown
    await act(async () => {
      resultado = await acciones.remind('c-1')
    })
    expect(resultado).toEqual({ remindedAt: 'x', nextAllowedAt: 'y' })
    expect(acciones.lastError).toBeNull()
  })
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

describe('mensajeDelFallo — el motivo en palabras', () => {
  it('un 400 del ValidationPipe lista TODOS los motivos, no sólo el primero', () => {
    const e = new ApiError(400, ['El canon debe ser positivo', 'La fecha de fin es inválida'])
    expect(mensajeDelFallo(e, 'genérico')).toBe('El canon debe ser positivo · La fecha de fin es inválida')
  })
  it('usa el mensaje del back cuando lo hay', () => {
    expect(mensajeDelFallo(new ApiError(409, 'Ya está firmado.'), 'genérico')).toBe('Ya está firmado.')
  })
  it('cae al texto por defecto sólo cuando no hay nada legible', () => {
    expect(mensajeDelFallo(new ApiError(500, ''), 'genérico')).toBe('genérico')
    expect(mensajeDelFallo(undefined, 'genérico')).toBe('genérico')
    expect(mensajeDelFallo('texto suelto', 'genérico')).toBe('genérico')
  })
})

describe('estadoDelFallo / isPermissionError', () => {
  it('lee el status del ApiError', () => {
    expect(estadoDelFallo(new ApiError(429, 'x'))).toBe(429)
    expect(estadoDelFallo(new Error('x'))).toBeNull()
  })
  it('un 403 es de permisos aunque el texto no lo diga', () => {
    expect(isPermissionError(new ApiError(403, 'Forbidden resource'))).toBe(true)
    expect(isPermissionError(new ApiError(400, 'No tienes permiso'))).toBe(false)
  })
  it('sin status, sigue reconociendo el texto de permiso de siempre', () => {
    expect(isPermissionError(new Error('No tienes permiso para edit en contratos'))).toBe(true)
    expect(isPermissionError(null)).toBe(false)
  })
})

describe('inmuebleOcupado — el 409 de crear sobre un inmueble con contrato en curso', () => {
  it('sólo reconoce un 409', () => {
    expect(inmuebleOcupado(new ApiError(400, 'Ese inmueble ya tiene un contrato en curso'))).toBeNull()
    expect(inmuebleOcupado(new Error('409'))).toBeNull()
  })
  it('sin id en el cuerpo: el mensaje, y ningún enlace inventado', () => {
    const r = inmuebleOcupado(new ApiError(409, 'Ese inmueble ya tiene un contrato en curso (#3).'))
    expect(r).toEqual({ mensaje: 'Ese inmueble ya tiene un contrato en curso (#3).', contratoId: undefined, contratoCode: undefined })
  })
  it('con el contrato que estorba en el cuerpo, lo devuelve para enlazarlo', () => {
    const r = inmuebleOcupado(new ApiError(409, 'Ocupado', undefined, { contratoId: 'c-9', contratoCode: 1234 }))
    expect(r?.contratoId).toBe('c-9')
    expect(r?.contratoCode).toBe(1234)
  })
})

describe('contratoDuplicado — la postulación que ya tiene contrato', () => {
  it('reconoce el texto del back en español y en inglés', () => {
    expect(contratoDuplicado(new ApiError(409, 'Ya existe un contrato para esta aplicación'))).toBe(true)
    expect(contratoDuplicado(new ApiError(409, 'Contract already exists'))).toBe(true)
    expect(contratoDuplicado(new ApiError(409, 'Ese inmueble ya tiene un contrato en curso'))).toBe(false)
  })
})
