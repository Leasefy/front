/**
 * FormasDeOfrecerElAcuerdo — el interruptor con que la inmobiliaria sale (o
 * vuelve) del A/B de cómo Laura ofrece el acuerdo (07-10-2026, Nico: «la que
 * no quiera lo apaga»). createRoot + act, como el resto del repo.
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

import { FormasDeOfrecerElAcuerdo } from './FormasDeOfrecerElAcuerdo'

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
  estado.guardar.mockReset().mockResolvedValue(ajustes({ experimentosPrendidos: false, porDefecto: false }))
  estado.refetch.mockReset()
  avisos.exito.mockReset()
  avisos.error.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(puedeCambiar = true) {
  act(() => root.render(<FormasDeOfrecerElAcuerdo puedeCambiar={puedeCambiar} />))
}

const $ = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const interruptor = () => $('field-experimentosPrendidos') as HTMLButtonElement

async function clic(el: HTMLElement | null) {
  await act(async () => {
    el?.click()
    await Promise.resolve()
  })
}

describe('<FormasDeOfrecerElAcuerdo>', () => {
  it('viene prendido, dice que la ganadora aplica igual y no ofrece guardar lo mismo', () => {
    pintar()
    expect(interruptor().getAttribute('aria-checked')).toBe('true')
    expect($('guardar-experimentos')).toBeNull()
    expect($('formas-apagado')).toBeNull()
    expect($('formas-la-ganadora')?.textContent).toContain('también si apagas las pruebas')
  })

  it('la administradora lo apaga y se guarda sólo eso', async () => {
    pintar()
    await clic(interruptor())
    expect($('formas-apagado')?.textContent).toContain('como hoy')
    await clic($('guardar-experimentos'))
    expect(estado.guardar).toHaveBeenCalledWith({ experimentosPrendidos: false })
    expect(avisos.exito).toHaveBeenCalledWith('Listo: Laura le ofrece el acuerdo a todos tus deudores como hoy.')
  })

  it('apagado se vuelve a prender', async () => {
    estado.data = ajustes({ experimentosPrendidos: false, porDefecto: false })
    estado.guardar.mockResolvedValueOnce(ajustes({ experimentosPrendidos: true, porDefecto: false }))
    pintar()
    expect(interruptor().getAttribute('aria-checked')).toBe('false')
    await clic(interruptor())
    await clic($('guardar-experimentos'))
    expect(estado.guardar).toHaveBeenCalledWith({ experimentosPrendidos: true })
    expect(avisos.exito).toHaveBeenCalledWith('Listo: Laura entra a las pruebas de cómo ofrecer el acuerdo.')
  })

  it('un error del micro se dice junto al interruptor', async () => {
    estado.guardar.mockRejectedValueOnce(
      new ApiError(403, 'Sólo la dueña o un administrador cambia los ajustes de la cobranza.', 'FORBIDDEN', {}),
    )
    pintar()
    await clic(interruptor())
    await clic($('guardar-experimentos'))
    expect($('formas-error')?.textContent).toContain('Sólo la dueña o un administrador')
    expect(avisos.exito).not.toHaveBeenCalled()
  })

  it('quien sólo ve la cobranza lo ve apagado para tocar y sin «Guardar»', () => {
    pintar(false)
    expect(interruptor().disabled).toBe(true)
    expect($('guardar-experimentos')).toBeNull()
    expect($('formas-solo-administrador')).not.toBeNull()
  })

  it('sin la migración del micro dice por qué y no deja cambiar', () => {
    estado.data = ajustes({ disponible: false })
    pintar()
    expect($('formas-sin-migracion')?.textContent).toContain('falta una actualización de la base')
    expect(interruptor().disabled).toBe(true)
  })

  it('si no se pudo leer, lo dice y deja reintentar', async () => {
    estado.data = null
    estado.fallo = new TypeError('Failed to fetch')
    pintar()
    expect($('formas-ajustes-fallo')).not.toBeNull()
    expect($('field-experimentosPrendidos')).toBeNull()
    await clic([...container.querySelectorAll('button')].find((b) => b.textContent === 'Reintentar') ?? null)
    expect(estado.refetch).toHaveBeenCalled()
  })
})
