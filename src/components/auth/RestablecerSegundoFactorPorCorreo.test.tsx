/**
 * Caso B (Nico, 29-09): la persona NO tiene la app y ya tiene un factor
 * verificado. En vez de un «Desactivar» que no puede funcionar, se le ofrece
 * restablecerlo con un código que llega al correo de su cuenta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api } = vi.hoisted(() => ({
  api: {
    solicitarRestablecimiento: vi.fn(),
    confirmarRestablecimiento: vi.fn(),
  },
}))
vi.mock('@/lib/api/segundo-factor.service', () => ({ segundoFactorApi: api }))

import { ApiError } from '@/lib/api/client'
import { RestablecerSegundoFactorPorCorreo } from './RestablecerSegundoFactorPorCorreo'

let host: HTMLDivElement
let root: Root
const onRestablecido = vi.fn()
const onVolver = vi.fn()

async function montar() {
  await act(async () => {
    root.render(
      <RestablecerSegundoFactorPorCorreo
        correo="duenio@inmobiliaria.co"
        onRestablecido={onRestablecido}
        onVolver={onVolver}
      />,
    )
  })
}

function boton(texto: string | RegExp): HTMLButtonElement | undefined {
  return [...host.querySelectorAll('button')].find((b) =>
    typeof texto === 'string'
      ? (b.textContent ?? '').includes(texto)
      : texto.test(b.textContent ?? ''),
  ) as HTMLButtonElement | undefined
}

async function clic(el: HTMLElement | undefined) {
  expect(el).toBeDefined()
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function escribirCodigo(codigo: string) {
  const casilla = host.querySelector<HTMLInputElement>('[data-testid="casilla-0"]')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(casilla, codigo)
    casilla.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

async function pedirElCodigo() {
  await clic(boton('Restablecer con un código a tu correo'))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  api.solicitarRestablecimiento.mockReset().mockResolvedValue(undefined)
  api.confirmarRestablecimiento.mockReset().mockResolvedValue(undefined)
  onRestablecido.mockReset()
  onVolver.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('RestablecerSegundoFactorPorCorreo', () => {
  it('ofrece restablecer con un código al correo de la cuenta, y nada de «Desactivar»', async () => {
    await montar()
    expect(host.textContent).toContain('duenio@inmobiliaria.co')
    expect(boton('Restablecer con un código a tu correo')).toBeDefined()
    expect(host.textContent).not.toContain('Desactivar')
    expect(api.solicitarRestablecimiento).not.toHaveBeenCalled()
  })

  it('al pedirlo: «Te mandamos un código a tu correo», seis casillas y reenviar con espera', async () => {
    await montar()
    await pedirElCodigo()

    expect(api.solicitarRestablecimiento).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Te mandamos un código a tu correo')
    expect(host.querySelectorAll('[data-testid^="casilla-"]')).toHaveLength(6)
    const reenviar = boton(/Reenviar/)
    expect(reenviar?.disabled).toBe(true)
    expect(reenviar?.textContent).toMatch(/60 s/)
  })

  it('🔴 con el código correcto: confirma y avisa para inscribir el factor nuevo', async () => {
    await montar()
    await pedirElCodigo()
    await escribirCodigo('123456')

    expect(api.confirmarRestablecimiento).toHaveBeenCalledWith('123456')
    expect(onRestablecido).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['codigo_invalido', 'El código no es correcto. Te quedan 4 intentos.', /Te quedan 4 intentos/],
    ['codigo_vencido', 'x', /venció.*Pide uno nuevo/],
    ['demasiados_intentos', 'x', /demasiadas veces.*Pide uno nuevo/],
  ])('422 %s: mensaje legible, nunca «Error 422»', async (code, mensaje, esperado) => {
    api.confirmarRestablecimiento.mockRejectedValueOnce(new ApiError(422, mensaje, code))
    await montar()
    await pedirElCodigo()
    await escribirCodigo('000000')

    const alerta = host.querySelector('[role="alert"]')
    expect(alerta?.textContent).toMatch(esperado)
    expect(host.textContent).not.toMatch(/Error 422/)
    expect(onRestablecido).not.toHaveBeenCalled()
  })

  it('🔴 sin el secreto en el back (503): lo dice y manda a un administrador', async () => {
    api.solicitarRestablecimiento.mockRejectedValueOnce(
      new ApiError(503, 'x', 'restablecimiento_no_disponible'),
    )
    await montar()
    await pedirElCodigo()

    expect(host.querySelector('[role="alert"]')?.textContent).toMatch(
      /todavía no está disponible; pídele a un administrador/,
    )
    // No pasa a pedir un código que nunca va a llegar.
    expect(host.querySelectorAll('[data-testid^="casilla-"]')).toHaveLength(0)
  })

  it('reenviar: se habilita al minuto y vuelve a pedir el código', async () => {
    await montar()
    await pedirElCodigo()

    await act(async () => {
      vi.advanceTimersByTime(61_000)
    })
    const reenviar = boton(/Reenviar código/)
    expect(reenviar?.disabled).toBe(false)
    await clic(reenviar)
    expect(api.solicitarRestablecimiento).toHaveBeenCalledTimes(2)
  })

  it('3 envíos en la hora (429): muestra el mensaje del back y espera lo que dice', async () => {
    await montar()
    await pedirElCodigo()
    api.solicitarRestablecimiento.mockRejectedValueOnce(
      new ApiError(
        429,
        'Ya te mandamos 3 códigos en la última hora. Usa el último que te llegó o pide otro en 40 minutos.',
        'demasiados_envios',
        { reintentarEnSegundos: 2400 },
      ),
    )
    await act(async () => {
      vi.advanceTimersByTime(61_000)
    })
    await clic(boton(/Reenviar código/))

    expect(host.querySelector('[role="alert"]')?.textContent).toMatch(/3 códigos en la última hora/)
    expect(boton(/Reenviar/)?.disabled).toBe(true)
  })

  it('«Volver» regresa al código de la app', async () => {
    await montar()
    await clic(boton('Volver a escribir el código de la app'))
    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
