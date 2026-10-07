/**
 * 02-10-2026 (Nico) · Cuando el micro rechaza los datos del registro, el back
 * (`users.service.ts` → `rechazo-del-micro-en-el-registro.ts`) responde 400
 * `DATOS_INVALIDOS` con los `campos` del micro en la RUTA DEL CUERPO que mandó
 * la persona (`agency.nit`, `agency.name`, `agency.email`). Esta prueba
 * verifica que el front del registro los reparte: con ESE cuerpo exacto,
 * `interpretarFallo` los pone en su campo de «Antes de comenzar» y el
 * formulario los pinta bajo el campo culpable, con el foco en el primero. Lo
 * que no tiene campo en este paso (el correo) queda arriba.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/onboarding/inmobiliaria',
  useSearchParams: () => new URLSearchParams(),
}))

import { ApiError } from '@/lib/api/client'
import { interpretarFallo, REVISA_LOS_CAMPOS } from '@/lib/hooks/use-onboarding-provisioning'
import { OwnerNameStepForm } from './OwnerNameStepForm'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const NIT = 'El NIT no tiene el formato esperado.'
const RAZON = 'La razón social no puede tener más de 200 caracteres.'
const CORREO = 'Revisa el correo de contacto: debe tener la forma nombre@dominio.com.'

/** El cuerpo EXACTO que manda el back desde el 02-10 cuando el micro rechaza los datos. */
const CUERPO_DEL_BACK = {
  statusCode: 400,
  code: 'DATOS_INVALIDOS',
  message: [NIT, RAZON, CORREO],
  campos: [
    { campo: 'agency.nit', regla: 'formato', mensaje: NIT },
    { campo: 'agency.name', regla: 'longitud_maxima', mensaje: RAZON },
    { campo: 'agency.email', regla: 'correo', mensaje: CORREO },
  ],
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

describe('Registro de la inmobiliaria — el micro rechaza los datos', () => {
  it('🔴 `interpretarFallo` reparte los `campos` del back en los campos de «Antes de comenzar»', () => {
    const fallo = interpretarFallo(new ApiError(400, CUERPO_DEL_BACK.message, 'DATOS_INVALIDOS', CUERPO_DEL_BACK))
    expect(fallo.paraCorregir).toBe(true)
    expect(fallo.reintentable).toBe(true)
    expect(fallo.campos).toEqual({ nit: NIT, razonSocial: RAZON })
    // El correo no es un campo de este paso: queda arriba, no se pierde.
    expect(fallo.mensaje).toBe(CORREO)
  })

  it('🔴 el formulario pinta el error bajo el campo culpable y le da el foco al primero', async () => {
    const fallo = interpretarFallo(new ApiError(400, CUERPO_DEL_BACK.message, 'DATOS_INVALIDOS', CUERPO_DEL_BACK))
    await act(async () => {
      root.render(
        <OwnerNameStepForm
          onSubmit={vi.fn()}
          isSubmitting={false}
          valoresIniciales={{ nombreCompleto: 'Ana Pérez', razonSocial: 'Inmobiliaria Uno', nit: '900123456-8' }}
          erroresDelServidor={fallo.campos}
        />,
      )
    })

    const nit = container.querySelector<HTMLInputElement>('#agencyNit')!
    const razon = container.querySelector<HTMLInputElement>('#agencyName')!
    expect(nit.getAttribute('aria-invalid')).toBe('true')
    expect(razon.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById('agencyNit-error')?.textContent).toBe(NIT)
    expect(document.getElementById('agencyName-error')?.textContent).toBe(RAZON)
    expect(nit.getAttribute('aria-describedby')?.split(' ')).toContain('agencyNit-error')
    // El primero en el orden del formulario (razón social va antes que el NIT).
    expect(document.activeElement).toBe(razon)
  })

  it('si todo lo rechazado tiene campo, arriba sólo dice que se corrija lo marcado', () => {
    const cuerpo = { ...CUERPO_DEL_BACK, message: [NIT], campos: [CUERPO_DEL_BACK.campos[0]] }
    const fallo = interpretarFallo(new ApiError(400, cuerpo.message, 'DATOS_INVALIDOS', cuerpo))
    expect(fallo.campos).toEqual({ nit: NIT })
    expect(fallo.mensaje).toBe(REVISA_LOS_CAMPOS)
  })
})
