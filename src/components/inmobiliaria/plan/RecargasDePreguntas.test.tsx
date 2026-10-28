/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ver = vi.fn()
let esAdmin = true
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: esAdmin, canAccess: () => esAdmin }),
}))
vi.mock('@/lib/api/recargas-de-preguntas.service', async (original) => {
  const real = await original<typeof import('@/lib/api/recargas-de-preguntas.service')>()
  return { ...real, recargasDePreguntasApi: { ver: () => ver(), comprar: vi.fn() } }
})

import { RecargasDePreguntas } from './RecargasDePreguntas'

let raiz: Root | null = null
let caja: HTMLDivElement | null = null
async function montar(el: React.ReactElement) {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
  await act(async () => {
    raiz!.render(el)
  })
  for (let i = 0; i < 5; i++) await act(async () => {})
  return caja
}
function desmontar() {
  act(() => raiz?.unmount())
  caja?.remove()
  raiz = null
  caja = null
}
const porId = (id: string) => document.querySelector(`[data-testid="${id}"]`)

const vista = {
  disponible: true,
  migracion: null,
  incluidasAlMes: 50,
  aLaVenta: [
    { preguntas: 50, precio: 29_000, iva: 5_510, total: 34_510, porPregunta: 580 },
    { preguntas: 200, precio: 99_000, iva: 18_810, total: 117_810, porPregunta: 495 },
    { preguntas: 500, precio: 199_000, iva: 37_810, total: 236_810, porPregunta: 398 },
  ],
  vigentes: 200,
  venceLaPrimera: '2027-10-28T00:00:00.000Z',
  compras: [],
}

describe('RecargasDePreguntas', () => {
  beforeEach(() => {
    ver.mockReset()
    esAdmin = true
  })
  afterEach(desmontar)

  it('muestra las 50 del mes + lo recargado y las tres recargas con su precio', async () => {
    ver.mockResolvedValue(vista)
    const c = await montar(<RecargasDePreguntas />)
    expect(c.querySelector('h2')?.textContent).toBe('50 preguntas al mes incluidas + 200 de tus recargas')
    expect(porId('recarga-50')?.textContent).toContain('50 preguntas')
    expect(porId('recarga-200')?.textContent).toContain('La más elegida')
    expect((porId('comprar-recarga-500') as HTMLButtonElement).disabled).toBe(false)
  })

  it('sin permiso de pagar: no hay botón, dice quién la compra', async () => {
    esAdmin = false
    ver.mockResolvedValue(vista)
    const c = await montar(<RecargasDePreguntas />)
    expect(porId('recarga-50')).not.toBeNull()
    expect(porId('comprar-recarga-50')).toBeNull()
    expect(c.textContent?.split('La compra el administrador.').length).toBe(4)
  })

  it('sin la migración del back: lo dice y no deja comprar', async () => {
    ver.mockResolvedValue({ ...vista, disponible: false, vigentes: 0 })
    const c = await montar(<RecargasDePreguntas />)
    expect(c.textContent).toContain('se está terminando de activar')
    expect((porId('comprar-recarga-200') as HTMLButtonElement).disabled).toBe(true)
  })
})
