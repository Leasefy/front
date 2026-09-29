/**
 * La salida de SOPORTE (29-09-2026): Nico activó el segundo factor del dueño
 * de una inmobiliaria en SU celular y lo borró. El dueño tiene la contraseña,
 * nadie tiene el código. Desde /admin/users se busca la cuenta, se confirma A
 * QUIÉN se le quita y se restablece.
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

import { RestablecerSegundoFactor } from './RestablecerSegundoFactor'

const CUENTA = {
  id: '5b0f1c9e-7a44-4c8e-9a9e-0c1d2e3f4a5b',
  email: 'duenio@inmobiliaria.co',
  nombre: 'Carlos Dueño',
  rol: 'LANDLORD',
  inmobiliarias: [{ nombre: 'Inmobiliaria del Dueño', rol: 'ADMIN' }],
  segundoFactor: { total: 2, verificados: 1 },
}

let host: HTMLDivElement
let root: Root

function boton(texto: string | RegExp): HTMLButtonElement | undefined {
  return [...host.querySelectorAll('button')].find((b) =>
    typeof texto === 'string' ? (b.textContent ?? '').includes(texto) : texto.test(b.textContent ?? ''),
  ) as HTMLButtonElement | undefined
}

async function clic(texto: string | RegExp) {
  const b = boton(texto)
  expect(b, `no encontré ${String(texto)}`).toBeDefined()
  await act(async () => {
    b!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

async function buscar(correo: string) {
  const campo = host.querySelector<HTMLInputElement>('input[type="email"]')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(campo, correo)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(async () => {
  adminApi.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<RestablecerSegundoFactor />)
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('RestablecerSegundoFactor (backoffice)', () => {
  it('busca la cuenta por correo y muestra a quién, con sus inmobiliarias y factores', async () => {
    adminApi.mockResolvedValueOnce(CUENTA)
    await buscar('duenio@inmobiliaria.co')

    expect(adminApi).toHaveBeenCalledWith('/cuentas/buscar', {
      query: { email: 'duenio@inmobiliaria.co' },
    })
    expect(host.textContent).toContain('Carlos Dueño')
    expect(host.textContent).toContain('Inmobiliaria del Dueño')
    expect(host.textContent).toMatch(/2 factores · 1 verificado/)
  })

  it('🔴 pide confirmación diciendo a quién se le quita, y sólo entonces restablece', async () => {
    adminApi.mockResolvedValueOnce(CUENTA)
    await buscar('duenio@inmobiliaria.co')

    await clic('Restablecer segundo factor')
    expect(adminApi).toHaveBeenCalledTimes(1)
    expect(host.textContent).toMatch(
      /Vas a quitarle el segundo factor a Carlos Dueño \(duenio@inmobiliaria\.co\)/,
    )

    adminApi.mockResolvedValueOnce(undefined)
    await clic('Sí, restablecer')

    expect(adminApi).toHaveBeenLastCalledWith(
      `/cuentas/${CUENTA.id}/segundo-factor/restablecer`,
      { method: 'POST' },
    )
    expect(host.querySelector('[role="status"]')?.textContent).toMatch(/Listo/)
  })

  it('«Cancelar» no restablece nada', async () => {
    adminApi.mockResolvedValueOnce(CUENTA)
    await buscar('duenio@inmobiliaria.co')
    await clic('Restablecer segundo factor')
    await clic('Cancelar')

    expect(adminApi).toHaveBeenCalledTimes(1)
    expect(host.textContent).not.toMatch(/Vas a quitarle/)
  })

  it('sin cuenta con ese correo lo dice claro', async () => {
    adminApi.mockRejectedValueOnce(new ApiErrorFalso(404, 'No hay ninguna cuenta con ese correo.'))
    await buscar('nadie@x.co')

    expect(host.querySelector('[role="alert"]')?.textContent).toMatch(/No hay ninguna cuenta/)
  })

  it('sin factores no ofrece restablecer: no hay nada que quitar', async () => {
    adminApi.mockResolvedValueOnce({ ...CUENTA, segundoFactor: { total: 0, verificados: 0 } })
    await buscar('duenio@inmobiliaria.co')

    expect(boton('Restablecer segundo factor')?.disabled).toBe(true)
    expect(host.textContent).toMatch(/no tiene segundo factor/i)
  })
})
