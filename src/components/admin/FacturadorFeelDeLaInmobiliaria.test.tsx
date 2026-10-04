/**
 * DIAN-FEEL (04-10-2026): el equipo de Leasefy registra a la inmobiliaria como
 * facturador de la cuenta de FEEL de Leasefy. La tarjeta guarda el token sin
 * volver a mostrarlo (sólo sus últimos 4), manda el NIT, prueba la conexión
 * (sólo lectura en FEEL) y dice si la resolución coincide.
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
      public body?: unknown,
    ) {
      super(message)
    }
  }
  return { adminApi: vi.fn(), ApiErrorFalso }
})
vi.mock('@/lib/admin/api', () => ({ adminApi, ApiError: ApiErrorFalso }))

import { FacturadorFeelDeLaInmobiliaria } from './FacturadorFeelDeLaInmobiliaria'

const ID = '54d558b4-0ab9-445b-aa87-bfd7f53e1f34'
const SIN_FACTURADOR = {
  disponible: true,
  migracion: null,
  feelPrendido: true,
  urlSandbox: true,
  urlProduccion: false,
  inmobiliaria: { id: ID, nombre: 'Inmobiliaria Laboratorio', nit: '900123456-7', razonSocial: 'Inmobiliaria Laboratorio S.A.S.' },
  facturador: null,
  resoluciones: [{ numero: '18764000000001', prefijo: 'LABQA', coincideConFeel: null }],
}
const CONECTADA = {
  ...SIN_FACTURADOR,
  facturador: {
    ambiente: 'SANDBOX',
    estado: 'CONECTADA',
    finalDelToken: 'aria',
    nitDelFacturador: '900123456-7',
    prefijoFa: 'LABQA',
    ultimaPruebaAt: '2026-10-04T15:00:00.000Z',
    ultimoError: null,
    actualizadoAt: '2026-10-04T15:00:00.000Z',
  },
  resoluciones: [{ numero: '18764000000001', prefijo: 'LABQA', coincideConFeel: true }],
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

async function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<FacturadorFeelDeLaInmobiliaria tenantId={ID} />)
  })
  await esperar()
}

function boton(texto: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto))
}

async function clic(texto: string) {
  const b = boton(texto)
  expect(b, `no encontré «${texto}»`).toBeDefined()
  await act(async () => {
    b!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await esperar()
}

async function escribir(selector: string, valor: string) {
  const campo = host.querySelector<HTMLInputElement>(selector)!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => adminApi.mockReset())
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('<FacturadorFeelDeLaInmobiliaria>', () => {
  it('🔴 registrar: el token va en un campo de contraseña, se manda con el NIT y nunca se vuelve a mostrar', async () => {
    adminApi.mockResolvedValueOnce(SIN_FACTURADOR)
    await montar()
    expect(host.querySelector('[data-testid="facturador-estado"]')!.textContent).toContain('sin registrar')

    await clic('Registrar el facturador')
    expect(host.querySelector<HTMLInputElement>('#facturador-token')!.type).toBe('password')
    expect(host.querySelector<HTMLInputElement>('#facturador-nit')!.value).toBe('900123456-7')
    await escribir('#facturador-token', 'TokenLabDeLaInmobiliaria')

    adminApi.mockResolvedValueOnce({ ...CONECTADA, facturador: { ...CONECTADA.facturador, estado: 'SIN_PROBAR', prefijoFa: null } })
    await act(async () => {
      host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await esperar()

    expect(adminApi).toHaveBeenLastCalledWith(`/tenants/${ID}/facturacion-electronica`, {
      method: 'PUT',
      body: { ambiente: 'SANDBOX', tokenIdentificador: 'TokenLabDeLaInmobiliaria', nitDelFacturador: '900123456-7' },
    })
    expect(host.textContent).not.toContain('TokenLabDeLaInmobiliaria')
    expect(host.textContent).toContain('token …aria')
    expect(host.textContent).toContain('sin probar')
  })

  it('probar la conexión: queda «conectada» y la resolución «coincide con FEEL»', async () => {
    adminApi.mockResolvedValueOnce({ ...CONECTADA, facturador: { ...CONECTADA.facturador, estado: 'SIN_PROBAR', prefijoFa: null } })
    await montar()
    adminApi.mockResolvedValueOnce(CONECTADA)
    await clic('Probar la conexión')
    expect(adminApi).toHaveBeenLastCalledWith(`/tenants/${ID}/facturacion-electronica/probar`, { method: 'POST', body: {} })
    expect(host.querySelector('[data-testid="facturador-estado"]')!.textContent).toContain('conectada')
    expect(host.querySelector('[data-testid="facturador-prefijo"]')!.textContent).toContain('LABQA')
    expect(host.querySelector('[data-testid="facturador-resoluciones"]')!.textContent).toContain('coincide con FEEL')
  })

  it('un NIT de otra empresa: dice lo que respondió el back y no cierra el formulario', async () => {
    adminApi.mockResolvedValueOnce(SIN_FACTURADOR)
    await montar()
    await clic('Registrar el facturador')
    await escribir('#facturador-token', 'TokenLabDeLaInmobiliaria')
    await escribir('#facturador-nit', '800999888-1')
    adminApi.mockRejectedValueOnce(
      new ApiErrorFalso(409, 'El NIT del facturador (800999888-1) no es el de esta inmobiliaria (900123456-7).', {
        statusCode: 409,
        code: 'NIT_DE_OTRA_EMPRESA',
        message: 'El NIT del facturador (800999888-1) no es el de esta inmobiliaria (900123456-7).',
      }),
    )
    await act(async () => {
      host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await esperar()
    expect(host.querySelector('[role="alert"]')!.textContent).toContain('no es el de esta inmobiliaria')
    expect(host.querySelector('[data-testid="facturador-formulario"]')).not.toBeNull()
  })

  it('sin token no manda nada', async () => {
    adminApi.mockResolvedValueOnce(SIN_FACTURADOR)
    await montar()
    await clic('Registrar el facturador')
    await act(async () => {
      host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await esperar()
    expect(adminApi).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Pega el token')
  })
})
