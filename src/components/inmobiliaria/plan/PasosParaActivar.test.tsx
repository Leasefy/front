/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/client'
import type { AgencyProfile } from '@/lib/types/inmobiliaria'

let guardadas: unknown[] = []
let fallarConCampos: null | { campo: string; mensaje: string } = null
const crear = vi.fn()
const activar = vi.fn()
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { firstName: 'Laura', lastName: 'Gómez', email: 'laura@correo.co' } }),
}))
vi.mock('@/lib/api/inmobiliaria.service', async (original) => {
  const real = await original<typeof import('@/lib/api/inmobiliaria.service')>()
  return {
    ...real,
    agencyApi: {
      ...real.agencyApi,
      updateAgency: (datos: unknown) => {
        if (fallarConCampos) {
          const f = fallarConCampos
          return Promise.reject(new ApiError(400, f.mensaje, 'VALIDACION', { campos: [{ campo: f.campo, regla: 'formato', mensaje: f.mensaje }] }))
        }
        guardadas.push(datos)
        return Promise.resolve({})
      },
    },
  }
})
vi.mock('@/lib/api/medios-de-pago.service', async (original) => {
  const real = await original<typeof import('@/lib/api/medios-de-pago.service')>()
  return { ...real, mediosDePagoApi: { ...real.mediosDePagoApi, crear: (v: unknown) => (crear(v), Promise.resolve({})) } }
})
vi.mock('@/lib/conversion/activar-la-cuenta', () => ({
  activarLaCuenta: (d: unknown) => {
    activar(d)
    return Promise.resolve()
  },
}))

import { VentanaDeLosPasos } from './PasosParaActivar'

let raiz: Root | null = null
let caja: HTMLDivElement | null = null
async function montar(el: React.ReactElement) {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
  await act(async () => {
    raiz!.render(el)
  })
  for (let i = 0; i < 5; i++) await act(async () => {})
}
function desmontar() {
  act(() => raiz?.unmount())
  caja?.remove()
  raiz = null
  caja = null
  document.body.innerHTML = ''
}
const porId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const campo = (id: string) => document.getElementById(id) as HTMLInputElement
async function escribir(id: string, valor: string) {
  const el = campo(id)
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function enviar(formulario: string) {
  await act(async () => {
    porId(formulario)!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  for (let i = 0; i < 6; i++) await act(async () => {})
}

const base = { id: 'a1', name: 'Laura Gómez' } as AgencyProfile
const conDatos = {
  ...base,
  legalRepresentative: 'Laura Gómez',
  legalDocumentNumber: '900123456',
  phone: '3001234567',
  razonSocial: 'Laura Gómez',
  department: 'Antioquia',
  city: 'Medellín',
} as AgencyProfile
const noHaceNada = async () => {}
const ventana = (props: Partial<React.ComponentProps<typeof VentanaDeLosPasos>>) => (
  <VentanaDeLosPasos
    perfil="agente"
    datos={base}
    medios={[]}
    modoComercial
    faltanAlAbrir={['datos', 'cuenta', 'factura']}
    alGuardar={noHaceNada}
    alCerrar={noHaceNada}
    {...props}
  />
)

describe('Los tres pasos para activar la cuenta al pagar', () => {
  beforeEach(() => {
    guardadas = []
    fallarConCampos = null
    crear.mockReset()
    activar.mockReset()
  })
  afterEach(desmontar)

  it('agente, paso 1: guarda su nombre (también como razón social), cédula y celular, y pasa a la cuenta', async () => {
    await montar(ventana({}))
    expect(porId('paso-para-activar-numero')?.textContent).toContain('Paso 1 de 3')
    // El nombre sale de la cuenta: no se lo pedimos dos veces.
    expect(campo('activar-nombre').value).toBe('Laura Gómez')
    expect(campo('activar-razon-social')).toBeNull()
    await escribir('activar-cedula', '1.020.304.050')
    await escribir('activar-celular', '3001234567')
    await enviar('paso-datos')
    expect(guardadas).toEqual([
      { razonSocial: 'Laura Gómez', legalRepresentative: 'Laura Gómez', legalDocumentNumber: '1020304050', phone: '3001234567', whatsapp: '3001234567' },
    ])
    expect(porId('paso-para-activar-numero')?.textContent).toContain('Paso 2 de 3')
  })

  it('inmobiliaria, paso 1: pide la razón social y el representante legal', async () => {
    await montar(ventana({ perfil: 'inmobiliaria', datos: { ...base, name: 'Arriendos del Valle' } as AgencyProfile }))
    expect(campo('activar-razon-social').value).toBe('Arriendos del Valle')
    expect(document.body.textContent).toContain('Representante legal')
    await escribir('activar-razon-social', '')
    await enviar('paso-datos')
    expect(guardadas).toEqual([])
    expect(document.body.textContent).toContain('Escribe la razón social, como está en el RUT.')
  })

  it('paso 1: frena antes de mandar una cédula corta y un fijo como celular', async () => {
    await montar(ventana({ faltanAlAbrir: ['datos'] }))
    await escribir('activar-cedula', '123')
    await escribir('activar-celular', '6041234567')
    await enviar('paso-datos')
    expect(guardadas).toEqual([])
    expect(document.body.textContent).toContain('La cédula tiene entre 6 y 10 dígitos.')
    expect(document.body.textContent).toContain('El celular tiene 10 dígitos y empieza por 3.')
  })

  it('paso 2: sin banco no guarda la cuenta y lo dice', async () => {
    await montar(ventana({ faltanAlAbrir: ['cuenta'] }))
    await escribir('activar-numero', '00012345678')
    await enviar('paso-cuenta')
    expect(crear).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Elige tu banco.')
  })

  it('paso 3 en modo comercial: sin aceptar los Términos no activa', async () => {
    await montar(ventana({ datos: conDatos, faltanAlAbrir: ['factura'] }))
    await escribir('activar-direccion', 'Carrera 43A # 1-50')
    await act(async () => {
      porId('activar-iva-no')!.click()
    })
    await enviar('paso-factura')
    expect(activar).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('acepta los Términos')
  })

  it('🔴 paso 3 en modo comercial: el NIT sale de la cédula, NO se guarda suelto y viaja en la ACTIVACIÓN', async () => {
    await montar(ventana({ datos: conDatos, faltanAlAbrir: ['factura'] }))
    expect(campo('activar-nit').value).toBe('900123456-8')
    expect(campo('activar-correo').value).toBe('laura@correo.co')
    await escribir('activar-direccion', 'Carrera 43A # 1-50')
    await act(async () => {
      porId('activar-iva-no')!.click()
      porId('activar-acepta')!.click()
    })
    await enviar('paso-factura')
    expect(guardadas).toEqual([
      { email: 'laura@correo.co', address: 'Carrera 43A # 1-50', city: 'Medellín', department: 'Antioquia', responsableIva: false },
    ])
    expect(activar).toHaveBeenCalledWith(
      expect.objectContaining({ nit: '900123456-8', razonSocial: 'Laura Gómez', celular: '3001234567', departamento: 'Antioquia', ciudad: 'Medellín' }),
    )
    expect(porId('pasos-para-activar-listos')).not.toBeNull()
  })

  it('paso 3 con la cuenta ya activa: guarda el NIT con lo demás y no activa otra vez', async () => {
    await montar(ventana({ datos: conDatos, modoComercial: false, faltanAlAbrir: ['factura'] }))
    await escribir('activar-direccion', 'Carrera 43A # 1-50')
    await act(async () => {
      porId('activar-iva-si')!.click()
    })
    await enviar('paso-factura')
    expect(guardadas).toEqual([expect.objectContaining({ nit: '900123456-8', responsableIva: true })])
    expect(activar).not.toHaveBeenCalled()
  })

  it('paso 3: el 400 del back con el NIT queda bajo el campo NIT, no en un aviso suelto', async () => {
    fallarConCampos = { campo: 'nit', mensaje: 'Otra cuenta ya tiene ese NIT.' }
    await montar(ventana({ datos: { ...conDatos, address: 'x', responsableIva: false } as AgencyProfile, modoComercial: false, faltanAlAbrir: ['factura'] }))
    await enviar('paso-factura')
    expect(document.getElementById('activar-nit-error')?.textContent).toContain('Otra cuenta ya tiene ese NIT.')
    expect(porId('pasos-para-activar-aviso')).toBeNull()
    expect(porId('pasos-para-activar-listos')).toBeNull()
  })
})
