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
          return Promise.reject(
            new ApiError(400, f.mensaje, 'VALIDACION', { campos: [{ campo: f.campo, regla: 'formato', mensaje: f.mensaje }] }),
          )
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

import { VentanaDeLosPasos } from './PasosDelAgente'

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

const perfil = { id: 'a1', name: 'Laura Gómez' } as AgencyProfile
const noHaceNada = async () => {}

describe('Los tres pasos del agente al pagar', () => {
  beforeEach(() => {
    guardadas = []
    fallarConCampos = null
    crear.mockReset()
  })
  afterEach(desmontar)

  it('paso 1: guarda nombre, cédula y celular (también como WhatsApp) y pasa a la cuenta', async () => {
    await montar(<VentanaDeLosPasos perfil={perfil} medios={[]} faltanAlAbrir={['datos', 'cuenta', 'factura']} alGuardar={noHaceNada} alCerrar={noHaceNada} />)
    expect(porId('paso-del-agente-numero')?.textContent).toContain('Paso 1 de 3')
    // El nombre sale de la cuenta: no se lo pedimos dos veces.
    expect(campo('agente-nombre').value).toBe('Laura Gómez')
    await escribir('agente-cedula', '1.020.304.050')
    await escribir('agente-celular', '3001234567')
    await enviar('paso-datos')
    expect(guardadas).toEqual([
      { legalRepresentative: 'Laura Gómez', legalDocumentNumber: '1020304050', phone: '3001234567', whatsapp: '3001234567' },
    ])
    expect(porId('paso-del-agente-numero')?.textContent).toContain('Paso 2 de 3')
  })

  it('paso 1: frena antes de mandar una cédula corta y un fijo como celular', async () => {
    await montar(<VentanaDeLosPasos perfil={perfil} medios={[]} faltanAlAbrir={['datos']} alGuardar={noHaceNada} alCerrar={noHaceNada} />)
    await escribir('agente-cedula', '123')
    await escribir('agente-celular', '6041234567')
    await enviar('paso-datos')
    expect(guardadas).toEqual([])
    expect(document.body.textContent).toContain('La cédula tiene entre 6 y 10 dígitos.')
    expect(document.body.textContent).toContain('El celular tiene 10 dígitos y empieza por 3.')
  })

  it('paso 2: sin banco no guarda la cuenta y lo dice', async () => {
    await montar(<VentanaDeLosPasos perfil={perfil} medios={[]} faltanAlAbrir={['cuenta']} alGuardar={noHaceNada} alCerrar={noHaceNada} />)
    await escribir('agente-numero', '00012345678')
    await enviar('paso-cuenta')
    expect(crear).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Elige tu banco.')
  })

  it('paso 3: el NIT sale de la cédula con su dígito; al guardar dice que la cuenta quedó lista', async () => {
    const conDatos = { ...perfil, legalRepresentative: 'Laura Gómez', legalDocumentNumber: '900123456', phone: '3001234567' } as AgencyProfile
    await montar(<VentanaDeLosPasos perfil={conDatos} medios={[]} faltanAlAbrir={['factura']} alGuardar={noHaceNada} alCerrar={noHaceNada} />)
    expect(campo('agente-nit').value).toBe('900123456-8')
    expect(campo('agente-correo').value).toBe('laura@correo.co')
    await escribir('agente-direccion', 'Cra 43A # 1-50')
    await escribir('agente-ciudad', 'Medellín')
    await act(async () => {
      porId('agente-iva-no')!.click()
    })
    await enviar('paso-factura')
    expect(guardadas).toEqual([
      { nit: '900123456-8', razonSocial: 'Laura Gómez', email: 'laura@correo.co', address: 'Cra 43A # 1-50', city: 'Medellín', responsableIva: false },
    ])
    expect(porId('pasos-del-agente-listos')).not.toBeNull()
  })

  it('paso 3: el 400 del back con el NIT queda bajo el campo NIT, no en un aviso suelto', async () => {
    fallarConCampos = { campo: 'nit', mensaje: 'Otra cuenta ya tiene ese NIT.' }
    const conDatos = { ...perfil, legalDocumentNumber: '900123456', address: 'x', city: 'y', responsableIva: false } as AgencyProfile
    await montar(<VentanaDeLosPasos perfil={conDatos} medios={[]} faltanAlAbrir={['factura']} alGuardar={noHaceNada} alCerrar={noHaceNada} />)
    await enviar('paso-factura')
    expect(document.getElementById('agente-nit-error')?.textContent).toContain('Otra cuenta ya tiene ese NIT.')
    expect(porId('pasos-del-agente-aviso')).toBeNull()
    expect(porId('pasos-del-agente-listos')).toBeNull()
  })
})
