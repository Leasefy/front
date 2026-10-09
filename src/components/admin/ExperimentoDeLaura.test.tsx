/**
 * El experimento de cómo Laura ofrece el acuerdo en /admin (07-10-2026, Nico:
 * «una persona aprueba, y es Leasefy para todas»): se ve cómo va cada forma,
 * se empieza con confirmación y las cuotas de B, se pausa y se aprueba la
 * ganadora; sin la migración lo dice y no ofrece nada.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { adminApi, ApiErrorFalso } = vi.hoisted(() => {
  class ApiErrorFalso extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  }
  return { adminApi: vi.fn(), ApiErrorFalso }
})
vi.mock('@/lib/admin/api', () => ({ adminApi, ApiError: ApiErrorFalso }))

import { ExperimentoDeLaura } from './ExperimentoDeLaura'
import type { EstadoDelExperimento } from '@/lib/admin/experimento-de-laura'

function forma(variantKey: string, over: Partial<EstadoDelExperimento['formas'][number]> = {}) {
  return { variantKey, asignados: 0, medidos: 0, sinDatos: 0, enCurso: 0, plataTotal: 0, plataPorDeudor: 0, conAlgunPago: 0, ...over }
}

function estado(over: Partial<EstadoDelExperimento> = {}): EstadoDelExperimento {
  return {
    disponible: true,
    experimentKey: 'laura-ofrece-el-acuerdo',
    estado: 'sin_empezar',
    maxCuotas: null,
    startedAt: null,
    endedAt: null,
    diasDeLaMedicion: 30,
    muestraMinimaPorForma: 200,
    formas: [forma('a-como-hoy'), forma('b-menos-cuotas')],
    comparacion: null,
    recomendacion: { tipo: 'falta_muestra', faltan: 400 },
    adoptada: null,
    inmobiliariasQueLoApagaron: 0,
    ...over,
  }
}

let host: HTMLDivElement
let root: Root

async function esperar() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function pintar() {
  await act(async () => {
    root.render(<ExperimentoDeLaura />)
  })
  await esperar()
}

const $ = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const boton = (texto: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement | undefined

async function clic(el: HTMLElement | undefined | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await esperar()
}

async function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  adminApi.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('<ExperimentoDeLaura>', () => {
  it('sin empezar: se empieza con confirmación y las cuotas de B (2 por defecto)', async () => {
    adminApi.mockResolvedValueOnce(estado())
    await pintar()
    expect($('experimento-de-laura')?.textContent).toContain('sin empezar')
    await clic(boton('Empezar el experimento'))
    expect($('confirmar-empezar')?.textContent).toContain('como mucho 2 cuotas')

    adminApi.mockResolvedValueOnce(estado({ estado: 'running', maxCuotas: 3, startedAt: '2026-10-08T12:00:00.000Z' }))
    await escribir(host.querySelector('#cuotas-de-b') as HTMLInputElement, '3')
    await clic(boton('Sí, empezar'))
    expect(adminApi).toHaveBeenLastCalledWith(
      '/experiments/laura-ofrece-el-acuerdo/empezar',
      expect.objectContaining({ method: 'POST', body: { maxCuotas: 3 } }),
    )
    expect($('experimento-de-laura')?.textContent).toContain('corriendo')
    expect($('forma-b-menos-cuotas')?.textContent).toContain('B · como mucho 3 cuotas')
  })

  it('cuotas fuera de 1 a 12: lo dice y no deja empezar', async () => {
    adminApi.mockResolvedValueOnce(estado())
    await pintar()
    await clic(boton('Empezar el experimento'))
    await escribir(host.querySelector('#cuotas-de-b') as HTMLInputElement, '13')
    expect(host.textContent).toContain('Escribe un número de cuotas entre 1 y 12.')
    expect(boton('Sí, empezar')?.disabled).toBe(true)
  })

  it('corriendo: muestra cómo va cada forma y la recomendación; aprueba la ganadora recomendada', async () => {
    adminApi.mockResolvedValueOnce(
      estado({
        estado: 'running',
        maxCuotas: 2,
        formas: [
          forma('a-como-hoy', { asignados: 300, medidos: 250, plataTotal: 75_000_000, plataPorDeudor: 300_000, conAlgunPago: 125 }),
          forma('b-menos-cuotas', { asignados: 300, medidos: 240, enCurso: 50, sinDatos: 10, plataTotal: 86_400_000, plataPorDeudor: 360_000, conAlgunPago: 144 }),
        ],
        comparacion: { diferencia: 60_000, bajo: 20_000, alto: 100_000, significativa: true },
        recomendacion: { tipo: 'gana', variantKey: 'b-menos-cuotas' },
      }),
    )
    await pintar()
    expect($('forma-b-menos-cuotas')?.textContent).toContain('50 en curso · 10 sin contrato')
    expect($('forma-a-como-hoy')?.textContent).toContain('50 %')
    expect($('experimento-recomendacion')?.textContent).toContain('B · como mucho 2 cuotas recupera más plata en 30 días')

    await clic(boton('Aprobar la ganadora'))
    expect((host.querySelector('[data-testid="ganadora-b-menos-cuotas"]') as HTMLInputElement).checked).toBe(true)
    expect($('confirmar-adoptar')?.textContent).toContain('como mucho 2 cuotas a todos los deudores de todas las inmobiliarias')

    adminApi.mockResolvedValueOnce(
      estado({
        estado: 'completed',
        maxCuotas: 2,
        adoptada: { variantKey: 'b-menos-cuotas', adoptadaPor: 'nico@leasefy.co', adoptadaAt: '2026-11-20T15:00:00.000Z' },
      }),
    )
    await clic(boton('Sí, aprobar'))
    expect(adminApi).toHaveBeenLastCalledWith(
      '/experiments/laura-ofrece-el-acuerdo/adoptar',
      expect.objectContaining({ method: 'POST', body: { variantKey: 'b-menos-cuotas' } }),
    )
    expect($('experimento-adoptada')?.textContent).toContain('la aprobó nico@leasefy.co')
    // Terminado: no queda nada que apretar.
    expect(boton('Pausar')).toBeUndefined()
    expect(boton('Aprobar la ganadora')).toBeUndefined()
  })

  it('pausar pide confirmación; un error del back se dice', async () => {
    adminApi.mockResolvedValueOnce(estado({ estado: 'running', maxCuotas: 2 }))
    await pintar()
    await clic(boton('Pausar'))
    expect($('confirmar-pausar')?.textContent).toContain('Laura le ofrece el acuerdo a todos como hoy')
    adminApi.mockRejectedValueOnce(new ApiErrorFalso(409, 'El experimento no está corriendo.'))
    await clic(boton('Sí, pausar'))
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('El experimento no está corriendo.')
  })

  it('sin la migración lo dice y no ofrece empezar', async () => {
    adminApi.mockResolvedValueOnce(estado({ disponible: false, inmobiliariasQueLoApagaron: 2 }))
    await pintar()
    expect($('experimento-sin-migracion')?.textContent).toContain('20261008000000')
    expect(boton('Empezar el experimento')).toBeUndefined()
    expect($('experimento-de-laura')?.textContent).toContain('menos 2 que lo apagaron')
  })
})
