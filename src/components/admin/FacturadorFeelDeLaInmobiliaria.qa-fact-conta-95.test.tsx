/**
 * QA-FACT-CONTA-95 (05-10-2026), decisión de Nico n.º 6: «varios prefijos, uno
 * por resolución». En FEEL un token = un facturador = UNA numeración: la tarjeta
 * registra, además del facturador de cualquier tipo, uno por tipo de documento.
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


const CON_LOS_DOS = {
  ...CONECTADA,
  porTipoDisponible: true,
  migracionPorTipo: null,
  facturadoresPorTipo: [
    {
      tipoDeDocumento: 'COMISION_PROPIETARIO',
      nombreDelTipo: 'comisión al propietario',
      ambiente: 'SANDBOX',
      estado: 'CONECTADA',
      finalDelToken: 'on95',
      nitDelFacturador: '900123456-7',
      prefijoFa: 'LABC',
      ultimaPruebaAt: '2026-10-05T15:00:00.000Z',
      ultimoError: null,
      actualizadoAt: '2026-10-05T15:00:00.000Z',
    },
  ],
  resoluciones: [
    { numero: '18764000000001', prefijo: 'LABQA', coincideConFeel: true },
    { numero: '18764000000095', prefijo: 'LABC', coincideConFeel: true },
  ],
}

describe('<FacturadorFeelDeLaInmobiliaria> · un facturador por tipo de documento (QA-FACT-CONTA-95)', () => {
  it('🔴 muestra el facturador de la comisión con SU prefijo y las dos resoluciones «coincide con FEEL»', async () => {
    adminApi.mockResolvedValueOnce(CON_LOS_DOS)
    await montar()
    expect(host.querySelector('[data-testid="facturador-estado-COMISION_PROPIETARIO"]')!.textContent).toContain('conectada')
    expect(host.querySelector('[data-testid="facturador-prefijo-COMISION_PROPIETARIO"]')!.textContent).toContain('LABC')
    expect(host.querySelector('[data-testid="facturador-prefijo"]')!.textContent).toContain('LABQA')
    expect(host.querySelector('[data-testid="facturador-resoluciones"]')!.textContent!.split('coincide con FEEL').length - 1).toBe(2)
  })

  it('🔴 agregar el de un tipo: elige el tipo, el token va en contraseña y se manda a /por-tipo/<tipo>', async () => {
    adminApi.mockResolvedValueOnce({ ...CONECTADA, porTipoDisponible: true, migracionPorTipo: null, facturadoresPorTipo: [] })
    await montar()
    await clic('Agregar el facturador de un tipo de documento')
    await clic('comisión al propietario')
    const token = host.querySelector<HTMLInputElement>('#facturador-token-COMISION_PROPIETARIO')!
    expect(token.type).toBe('password')
    await escribir('#facturador-token-COMISION_PROPIETARIO', 'TokenLabComision95')
    adminApi.mockResolvedValueOnce(CON_LOS_DOS)
    await act(async () => {
      host
        .querySelector('[data-testid="facturador-formulario-COMISION_PROPIETARIO"]')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await esperar()
    const [ruta, opciones] = adminApi.mock.calls.at(-1)!
    expect(ruta).toBe(`/tenants/${ID}/facturacion-electronica/por-tipo/COMISION_PROPIETARIO`)
    expect(opciones).toMatchObject({ method: 'PUT', body: { tokenIdentificador: 'TokenLabComision95', nitDelFacturador: '900123456-7' } })
    expect(host.textContent).not.toContain('TokenLabComision95')
    expect(host.querySelector('[data-testid="facturador-prefijo-COMISION_PROPIETARIO"]')!.textContent).toContain('LABC')
  })

  it('sin la migración del back: lo dice y no ofrece agregar', async () => {
    adminApi.mockResolvedValueOnce({ ...CONECTADA, porTipoDisponible: false, migracionPorTipo: '20261005130000_facturadores_feel_por_tipo', facturadoresPorTipo: [] })
    await montar()
    expect(host.textContent).toContain('20261005130000_facturadores_feel_por_tipo')
    expect(boton('Agregar el facturador de un tipo de documento')).toBeUndefined()
  })
})
