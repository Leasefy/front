/**
 * 🔴 02-10-2026 · El porcentaje del incremento (local comercial) se ataja
 * ANTES de mandar, con los topes y las frases del back, y la frase sale
 * debajo de su campo (Nico, hueco 4 de S2-B2). Antes el back tenía
 * `@Max(100)` sin frase y la pantalla no revisaba nada: «abc» en la tasa
 * mandaba `null`, que QUITA la tasa.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    incrementos: vi.fn(),
    fijarTasaAnual: vi.fn(),
    digitarIncremento: vi.fn(),
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service'
import { IncrementosDelContrato } from './IncrementosDelContrato'

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
let root: Root | null = null
let container: HTMLDivElement | null = null

const comercial = {
  uso: 'COMERCIAL',
  tasaAnualPactadaPct: null,
  aniversarios: [
    {
      desde: '2026-08-21',
      origen: null,
      porcentaje: null,
      canonAnteriorCop: 1_000_000,
      canonNuevoCop: 1_000_000,
      motivo: 'Sin incremento digitado.',
      carta: null,
    },
  ],
  disponible: true,
  envioHabilitado: true,
}

async function montar() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(<IncrementosDelContrato contractId="c1" puedeEditar />)
  })
  await act(async () => {})
}

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
    await Promise.resolve()
  })
  await act(async () => {})
}

const boton = (texto: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texto)!

beforeEach(() => {
  vi.clearAllMocks()
  api.incrementos.mockResolvedValue(comercial)
  api.fijarTasaAnual.mockResolvedValue(comercial)
  api.digitarIncremento.mockResolvedValue(comercial)
})
afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
})

describe('<IncrementosDelContrato> — el porcentaje con los topes del back', () => {
  it('🔴 un incremento de «550» se dice debajo del porcentaje, con el foco, y no se manda', async () => {
    await montar()
    await escribir(document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!, '550')
    await clic(boton('Digitar incremento'))
    expect(document.querySelector('#incremento-2026-08-21-error')?.textContent).toBe(
      'El incremento no puede pasar de 100 %. Revisa que no sobre una cifra.',
    )
    const campo = document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo)
    expect(api.digitarIncremento).not.toHaveBeenCalled()
  })

  it('un incremento con cuatro decimales dice que va con hasta tres', async () => {
    await montar()
    await escribir(document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!, '5,1234')
    await clic(boton('Digitar incremento'))
    expect(document.querySelector('#incremento-2026-08-21-error')?.textContent).toBe(
      'El incremento debe ser un número con hasta tres decimales, por ejemplo 5,5.',
    )
    expect(api.digitarIncremento).not.toHaveBeenCalled()
  })

  it('un incremento dentro de los topes se manda', async () => {
    await montar()
    await escribir(document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!, '5,5')
    await clic(boton('Digitar incremento'))
    expect(api.digitarIncremento).toHaveBeenCalledWith('c1', '2026-08-21', { porcentaje: 5.5 })
  })

  it('🔴 una tasa pactada de «550» se dice debajo de la tasa, con el foco, y no se manda', async () => {
    await montar()
    await escribir(document.querySelector<HTMLInputElement>('#tasa-pactada')!, '550')
    await clic(boton('Guardar tasa'))
    expect(document.querySelector('#tasa-pactada-error')?.textContent).toBe(
      'La tasa pactada no puede pasar de 100 %. Revisa que no sobre una cifra.',
    )
    expect(document.activeElement).toBe(document.querySelector('#tasa-pactada'))
    expect(api.fijarTasaAnual).not.toHaveBeenCalled()
  })

  it('🔴 «abc» en la tasa ya no la QUITA: dice que va un número y no se manda', async () => {
    await montar()
    await escribir(document.querySelector<HTMLInputElement>('#tasa-pactada')!, 'abc')
    await clic(boton('Guardar tasa'))
    expect(document.querySelector('#tasa-pactada-error')?.textContent).toBe(
      'La tasa pactada debe ser un número con hasta tres decimales, por ejemplo 5,5.',
    )
    expect(api.fijarTasaAnual).not.toHaveBeenCalled()
  })

  it('la tasa vacía se manda como siempre (quitarla)', async () => {
    await montar()
    await clic(boton('Guardar tasa'))
    expect(api.fijarTasaAnual).toHaveBeenCalledWith('c1', null)
  })
})
