/**
 * DiasDeGraciaDeLaPromesa — los días de gracia con que el agente cierra cada
 * promesa contra los pagos del back (07-10-2026). createRoot + act, como el
 * resto del repo.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/client'

void React

const estado = vi.hoisted(() => ({
  data: null as null | {
    disponible: boolean
    diasDeGraciaDeLaPromesa: number
    experimentosPrendidos: boolean
    porDefecto: boolean
    actualizadoPor: string | null
    actualizadoAt: string | null
  },
  fallo: null as unknown,
  guardar: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@/lib/hooks/cobranza/use-ajustes-de-la-cobranza', () => ({
  useAjustesDeLaCobranza: () => ({
    data: estado.data,
    isLoading: false,
    fallo: estado.fallo,
    refetch: estado.refetch,
    guardar: estado.guardar,
  }),
}))

const avisos = vi.hoisted(() => ({ exito: vi.fn(), error: vi.fn() }))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: avisos.exito, error: avisos.error },
}))

import { DiasDeGraciaDeLaPromesa } from './DiasDeGraciaDeLaPromesa'

let container: HTMLDivElement
let root: Root

function ajustes(over: Partial<NonNullable<typeof estado.data>> = {}) {
  return {
    disponible: true,
    diasDeGraciaDeLaPromesa: 7,
    experimentosPrendidos: true,
    porDefecto: true,
    actualizadoPor: null,
    actualizadoAt: null,
    ...over,
  }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  estado.data = ajustes()
  estado.fallo = null
  estado.guardar.mockReset().mockResolvedValue(ajustes({ diasDeGraciaDeLaPromesa: 3, porDefecto: false }))
  estado.refetch.mockReset()
  avisos.exito.mockReset()
  avisos.error.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(puedeCambiar = true) {
  act(() => root.render(<DiasDeGraciaDeLaPromesa puedeCambiar={puedeCambiar} />))
}

const $ = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

async function escribir(valor: string) {
  const input = $('dias-de-gracia-de-la-promesa') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: HTMLElement | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('<DiasDeGraciaDeLaPromesa>', () => {
  it('muestra los 7 días por defecto y no ofrece guardar lo mismo', () => {
    pintar()
    expect(($('dias-de-gracia-de-la-promesa') as HTMLInputElement).value).toBe('7')
    expect(($('guardar-dias-de-gracia') as HTMLButtonElement).disabled).toBe(true)
  })

  it('la administradora cambia los días y se guarda sólo eso', async () => {
    pintar()
    await escribir('3')
    const boton = $('guardar-dias-de-gracia') as HTMLButtonElement
    expect(boton.disabled).toBe(false)
    await clic(boton)
    expect(estado.guardar).toHaveBeenCalledWith({ diasDeGraciaDeLaPromesa: 3 })
    expect(avisos.exito).toHaveBeenCalledWith(expect.stringContaining('3 días después de la fecha prometida'))
  })

  it('fuera de 0 a 60 lo dice bajo el campo y no deja guardar', async () => {
    pintar()
    await escribir('61')
    expect(($('guardar-dias-de-gracia') as HTMLButtonElement).disabled).toBe(true)
    expect(container.textContent).toContain('Escribe un número de días entre 0 y 60.')
  })

  it('un 400 del micro va bajo el campo, no a un aviso suelto', async () => {
    estado.guardar.mockRejectedValueOnce(
      new ApiError(400, 'Los días de gracia van de 0 a 60, sin decimales.', 'DATOS_INVALIDOS', {
        campos: [{ campo: 'diasDeGraciaDeLaPromesa', regla: 'max', mensaje: 'Los días de gracia van de 0 a 60, sin decimales.' }],
      }),
    )
    pintar()
    await escribir('5')
    await clic($('guardar-dias-de-gracia'))
    expect(container.textContent).toContain('Los días de gracia van de 0 a 60, sin decimales.')
    expect(avisos.error).not.toHaveBeenCalled()
  })

  it('quien sólo ve la cobranza lo ve apagado y sin «Guardar»', () => {
    pintar(false)
    expect(($('dias-de-gracia-de-la-promesa') as HTMLInputElement).disabled).toBe(true)
    expect($('guardar-dias-de-gracia')).toBeNull()
    expect($('promesas-solo-administrador')).not.toBeNull()
  })

  it('sin la migración del micro dice por qué y no deja cambiar', () => {
    estado.data = ajustes({ disponible: false })
    pintar()
    expect($('promesas-sin-migracion')?.textContent).toContain('falta una actualización de la base')
    expect(($('dias-de-gracia-de-la-promesa') as HTMLInputElement).disabled).toBe(true)
    expect($('guardar-dias-de-gracia')).toBeNull()
  })
})
