/**
 * ExogenaAdminPage — los años de exógena de la plataforma.
 *
 * Los cuatro casos que este archivo protege:
 *
 * 🔴 1. Publicar es un acto aparte y con confirmación propia: un año publicado
 *       lo heredan TODAS las inmobiliarias. Guardar y sembrar no publican.
 *
 * 🔴 2. Un año sin conceptos no se puede publicar — el back lo rechaza con 400
 *       y la pantalla lo dice antes, con el porqué.
 *
 * 🔴 3. Un tope en `null` se lee «sin tope — no se agrupa nada», nunca «$0».
 *       Un tope de cero agruparía todo bajo el NIT 222222222 y escondería a
 *       cada tercero que había que declarar.
 *
 * 🔴 4. `sinSugerencia` se lista entero: son los conceptos que nadie puede
 *       proponer y que alguien tiene que leer en la resolución.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { AnioEnLaLista } from '@/lib/admin/exogena'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const listarAnios = vi.fn()
const guardarAnio = vi.fn()
const sembrarConceptos = vi.fn()
const publicarAnio = vi.fn()

vi.mock('@/lib/admin/exogena', () => ({
  listarAnios: (signal?: AbortSignal) => listarAnios(signal),
  guardarAnio: (datos: unknown) => guardarAnio(datos),
  sembrarConceptos: (anio: number) => sembrarConceptos(anio),
  publicarAnio: (anio: number, publicado: boolean) => publicarAnio(anio, publicado),
}))

import ExogenaAdminPage from './page'

const anio = (extra: Partial<AnioEnLaLista> = {}): AnioEnLaLista => ({
  anio: 2026,
  resolucion: 'Resolución 000162 de 2023',
  topeCuantiasMenoresCop: 1_000_000,
  nitCuantiasMenores: '222222222',
  publicado: false,
  publicadoAt: null,
  notas: null,
  actualizadoPor: 'nico@leasefy.co',
  conceptos: 42,
  ...extra,
})

let container: HTMLDivElement
let root: Root | null = null
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null

async function pintar() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(ExogenaAdminPage))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
    await Promise.resolve()
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  listarAnios.mockReset().mockResolvedValue({ disponible: true, anios: [anio()] })
  guardarAnio.mockReset().mockResolvedValue(anio())
  sembrarConceptos.mockReset().mockResolvedValue({
    sembrados: 40,
    sinSugerencia: [
      { formato: '1001', codigoPuc: '519595', nombre: 'Gastos diversos · otros' },
    ],
    aviso: 'El preset del código es una SUGERENCIA de uso corriente, no la resolución.',
  })
  publicarAnio.mockReset().mockResolvedValue(anio({ publicado: true }))
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
    root = null
  }
  container.remove()
  vi.clearAllMocks()
})

describe('ExogenaAdminPage', () => {
  it('🔴 publicar pide confirmación propia y dice que lo heredan todas', async () => {
    await pintar()

    await clic(q('publicar-2026')!)
    expect(publicarAnio).not.toHaveBeenCalled()

    const confirmacion = q('confirmar-publicar-2026')!
    expect(confirmacion.textContent).toContain('TODAS las inmobiliarias')
    expect(confirmacion.textContent).toContain('resolución')

    await clic(q('confirmar-publicar-si-2026')!)
    expect(publicarAnio).toHaveBeenCalledWith(2026, true)
  })

  it('sembrar NO publica', async () => {
    await pintar()
    await clic(q('sembrar-2026')!)

    expect(sembrarConceptos).toHaveBeenCalledWith(2026)
    expect(publicarAnio).not.toHaveBeenCalled()
  })

  it('🔴 lista entero lo que el preset no puede proponer', async () => {
    await pintar()
    await clic(q('sembrar-2026')!)

    const resultado = q('resultado-de-la-semilla')!
    expect(resultado.textContent).toContain('40 conceptos sembrados')
    expect(resultado.textContent).toContain('no la resolución')
    expect(q('sin-sugerencia')!.textContent).toContain('519595')
  })

  it('🔴 un año sin conceptos no se puede publicar, y se dice por qué', async () => {
    listarAnios.mockResolvedValue({ disponible: true, anios: [anio({ conceptos: 0 })] })
    await pintar()

    expect((q('publicar-2026') as HTMLButtonElement).disabled).toBe(true)
    expect(q('sin-conceptos-2026')!.textContent).toContain('heredarían nada')
  })

  it('🔴 un tope en null se lee «sin tope», nunca «$0»', async () => {
    listarAnios.mockResolvedValue({
      disponible: true,
      anios: [anio({ topeCuantiasMenoresCop: null, nitCuantiasMenores: null })],
    })
    await pintar()

    const fila = q('anio-2026')!
    expect(fila.textContent).toContain('sin tope — no se agrupa nada')
    expect(fila.textContent).not.toContain('$0')
  })

  it('un año publicado ofrece despublicar y dice desde cuándo lo heredan', async () => {
    listarAnios.mockResolvedValue({
      disponible: true,
      anios: [anio({ publicado: true, publicadoAt: '2026-09-19T14:00:00.000Z' })],
    })
    await pintar()

    expect(q('publicar-2026')).toBeNull()
    expect(q('despublicar-2026')).not.toBeNull()
  })

  it('sin las tablas lo dice y nombra la migración', async () => {
    listarAnios.mockResolvedValue({ disponible: false, anios: [] })
    await pintar()

    expect(q('sin-migracion')!.textContent).toContain('20260919001000_exogena_de_plataforma')
    expect(q('sin-migracion')!.textContent).toContain('La aplica')
  })

  it('el formulario guarda el año sin publicarlo', async () => {
    listarAnios.mockResolvedValue({ disponible: true, anios: [] })
    await pintar()

    const campo = q('campo-anio') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(campo, '2027')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await clic(q('guardar-anio')!)

    expect(guardarAnio).toHaveBeenCalledWith(
      expect.objectContaining({ anio: 2027 }),
    )
    expect(publicarAnio).not.toHaveBeenCalled()
  })

  it('🔴 un tope mal escrito frena el guardado acá, con el porqué', async () => {
    listarAnios.mockResolvedValue({ disponible: true, anios: [] })
    await pintar()

    const escribir = (testid: string, valor: string) =>
      act(async () => {
        const el = q(testid) as HTMLInputElement
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })

    await escribir('campo-anio', '2027')
    await escribir('campo-tope', '1.000.000')

    expect(q('problema-del-anio')!.textContent).toContain('sin tope NO se agrupa nada')
    expect((q('guardar-anio') as HTMLButtonElement).disabled).toBe(true)
  })
})
