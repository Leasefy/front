/**
 * La bitácora de plata, en la pantalla.
 *
 * Lo que fija: que una bitácora VACÍA nunca se lea como «no pasó nada» cuando
 * lo que pasa es que falta la migración, y que el actor salga del nombre
 * COPIADO en la fila — no de un join que puede quedarse sin usuario.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const listar = vi.fn()
vi.mock('@/lib/api/bitacora.service', () => ({
  bitacoraApi: { listar: (...a: unknown[]) => listar(...a), acciones: vi.fn() },
}))

import { SeccionBitacora } from './SeccionBitacora'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const q = (t: string) => document.body.querySelector(`[data-testid="${t}"]`)
const montar = async () => {
  await act(async () => {
    raiz.render(<SeccionBitacora />)
  })
}

const HUELLA = {
  id: 'h-1',
  accion: 'APROBAR_LOTE',
  objetoTipo: 'lote',
  objetoId: 'lote-1',
  resumen: 'Aprobó un lote de giros por $12.000.000 a 8 propietarios.',
  motivo: null,
  valorCop: 12_000_000,
  actor: { userId: 'u-1', nombre: 'Ana Gómez', email: 'ana@x.co' },
  detalle: null,
  fecha: '2026-09-18T15:00:00.000Z',
}

describe('<SeccionBitacora>', () => {
  it('muestra la acción EN PALABRAS, no el código', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, total: 1, filas: [HUELLA] })
    await montar()
    const texto = q('huella-h-1')?.textContent ?? ''
    expect(texto).toContain('Aprobó un lote de giros')
    expect(texto).not.toContain('APROBAR_LOTE')
  })

  it('dice quién fue, con el nombre copiado en la fila', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, total: 1, filas: [HUELLA] })
    await montar()
    expect(q('huella-h-1')?.textContent).toContain('Ana Gómez')
  })

  it('una acción de un cron (sin actor) se atribuye al sistema, no a nadie', async () => {
    listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      filas: [{ ...HUELLA, actor: { userId: null, nombre: null, email: null } }],
    })
    await montar()
    expect(q('huella-h-1')?.textContent).toContain('El sistema')
  })

  it('🔴 vacía POR FALTA DE MIGRACIÓN lo dice: si no, se lee como «no pasó nada»', async () => {
    listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 20260918182000: la bitácora todavía no guarda nada.',
      total: 0,
      filas: [],
    })
    await montar()
    expect(q('bitacora-sin-migrar')?.textContent).toContain('20260918182000')
    expect(q('bitacora-vacia')).toBeNull()
  })

  it('vacía DE VERDAD dice que no hubo acciones', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, total: 0, filas: [] })
    await montar()
    expect(q('bitacora-vacia')).toBeTruthy()
    expect(q('bitacora-sin-migrar')).toBeNull()
  })
})
