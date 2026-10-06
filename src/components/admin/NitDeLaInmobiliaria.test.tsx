/**
 * Corregir el NIT desde el detalle de la inmobiliaria (02-10-2026, Nico): la
 * tarjeta muestra el NIT de Leasefy y el del micro, valida con la regla del
 * registro ANTES de mandar, pide confirmación diciendo de qué a qué, y
 * muestra lo que dijo el back (409 de otra inmobiliaria, micro caído) y las
 * correcciones anteriores con quién y cuándo.
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
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { NitDeLaInmobiliaria } from './NitDeLaInmobiliaria'

const ID = '11111111-1111-4111-8111-111111111111'
const DATOS = {
  agencyId: ID,
  nombre: 'Inmobiliaria Andina',
  nit: '900123456-7',
  nitEnElMicro: '900123456-7',
  microLeido: true,
  cambios: [] as Array<{ cuando: string; quien: string | null; antes: string | null; despues: string | null }>,
  cambiosLeidos: true,
}

let host: HTMLDivElement
let root: Root

async function esperar() {
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

async function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<NitDeLaInmobiliaria tenantId={ID} />)
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

async function escribir(valor: string) {
  const campo = host.querySelector<HTMLInputElement>('#nit-nuevo')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function revisar() {
  await act(async () => {
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await esperar()
}

const texto = () => host.textContent ?? ''

beforeEach(() => {
  adminApi.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('<NitDeLaInmobiliaria>', () => {
  it('muestra el NIT de Leasefy y el del micro, y marca cuando son distintos', async () => {
    adminApi.mockResolvedValueOnce({ ...DATOS, nitEnElMicro: '111111111' })
    await montar()

    expect(adminApi).toHaveBeenCalledWith(`/tenants/${ID}/nit`, expect.objectContaining({ signal: expect.anything() }))
    expect(host.querySelector('[data-testid="nit-en-leasefy"]')!.textContent).toBe('900123456-7')
    expect(host.querySelector('[data-testid="nit-en-el-micro"]')!.textContent).toContain('111111111')
    expect(texto()).toContain('distinto')
  })

  it('el micro sin leer dice «no se pudo leer», no «no la tiene»', async () => {
    adminApi.mockResolvedValueOnce({ ...DATOS, nitEnElMicro: null, microLeido: false })
    await montar()
    expect(host.querySelector('[data-testid="nit-en-el-micro"]')!.textContent).toBe('no se pudo leer')
  })

  it('valida con la regla del registro antes de mandar: un NIT con puntos no llega al back', async () => {
    adminApi.mockResolvedValueOnce(DATOS)
    await montar()

    await clic('Corregir NIT')
    await escribir('900.123.456-8')
    await revisar()

    expect(texto()).toContain('entre 6 y 10 dígitos')
    expect(boton('Sí, cambiar el NIT')).toBeUndefined()
    expect(adminApi).toHaveBeenCalledTimes(1)
  })

  it('corrige con confirmación (de qué a qué) y muestra lo que quedó y el historial', async () => {
    adminApi.mockResolvedValueOnce(DATOS)
    await montar()

    await clic('Corregir NIT')
    await escribir(' 901555444-2 ')
    await revisar()

    expect(texto()).toContain('Vas a cambiar el NIT de Inmobiliaria Andina de 900123456-7 a 901555444-2')
    expect(texto()).toContain('Queda registrado con tu correo')

    adminApi.mockResolvedValueOnce({
      ...DATOS,
      nit: '901555444-2',
      nitEnElMicro: '901555444-2',
      cambios: [
        { cuando: '2026-10-02T15:04:05.000Z', quien: 'ops@leasefy.co', antes: '900123456-7', despues: '901555444-2' },
      ],
      cambio: true,
      micro: 'actualizado',
    })
    await clic('Sí, cambiar el NIT')

    expect(adminApi).toHaveBeenLastCalledWith(`/tenants/${ID}/nit`, {
      method: 'PATCH',
      body: { nit: '901555444-2' },
    })
    expect(host.querySelector('[role="status"]')!.textContent).toBe(
      'El NIT quedó en 901555444-2 y les llegó a los agentes.',
    )
    expect(host.querySelector('[data-testid="nit-en-leasefy"]')!.textContent).toBe('901555444-2')
    const historial = host.querySelector('[data-testid="cambios-del-nit"]')!.textContent ?? ''
    expect(historial).toContain('ops@leasefy.co')
    expect(historial).toContain('900123456-7 → 901555444-2')
  })

  it('un NIT de otra inmobiliaria: muestra el 409 del back y deja corregir', async () => {
    adminApi.mockResolvedValueOnce(DATOS)
    await montar()
    await clic('Corregir NIT')
    await escribir('800999999')
    await revisar()

    adminApi.mockRejectedValueOnce(
      new ApiErrorFalso(409, 'Ese NIT ya lo tiene otra inmobiliaria: Arriendos del Valle (NIT 800999999-1).'),
    )
    await clic('Sí, cambiar el NIT')

    expect(host.querySelector('[role="alert"]')!.textContent).toContain('Arriendos del Valle')
    // El formulario sigue abierto, con lo escrito, para corregir el número.
    expect(host.querySelector<HTMLInputElement>('#nit-nuevo')!.value).toBe('800999999')
    expect(host.querySelector('[data-testid="nit-en-leasefy"]')!.textContent).toBe('900123456-7')
  })

  it('micro caído: avisa que en Leasefy quedó pero los agentes siguen con el anterior', async () => {
    adminApi.mockResolvedValueOnce(DATOS)
    await montar()
    await clic('Corregir NIT')
    await escribir('901555444-2')
    await revisar()

    adminApi.mockResolvedValueOnce({
      ...DATOS,
      nit: '901555444-2',
      cambio: true,
      micro: 'no_respondio',
    })
    await clic('Sí, cambiar el NIT')

    const estado = host.querySelector('[role="status"]')!
    expect(estado.className).toContain('text-warn')
    expect(estado.textContent).toContain('sigue con 900123456-7')
  })

  it('si no se pudo leer la bitácora lo dice, en vez de «nadie lo ha corregido»', async () => {
    adminApi.mockResolvedValueOnce({ ...DATOS, cambiosLeidos: false })
    await montar()
    expect(texto()).toContain('No se pudo leer la bitácora')
    expect(texto()).not.toContain('Nadie ha corregido')
  })

  it('enlaza a Audit search con la acción y la inmobiliaria', async () => {
    adminApi.mockResolvedValueOnce(DATOS)
    await montar()
    const a = [...host.querySelectorAll('a')].find((x) => (x.textContent ?? '').includes('audit search'))
    expect(a!.getAttribute('href')).toBe(`/admin/audit-explorer?action=agency.nit.update&entityId=${ID}`)
  })
})
