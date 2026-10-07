/**
 * Nico, 01-10-2026: «le dice que es irreversible, ¿cómo así? es ilógico». Una
 * inmobiliaria cuyos datos rechazó el micro ya no termina en «Tu registro
 * quedó bloqueado»: vuelve el formulario lleno, con el aviso de qué revisar
 * arriba, y «Continuar» vuelve a intentar.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { PanelAntesDeComenzar } from './PanelAntesDeComenzar'
import { REVISA_LOS_CAMPOS, REVISA_LOS_DATOS } from '@/lib/hooks/use-onboarding-provisioning'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function panel(fallo: Parameters<typeof PanelAntesDeComenzar>[0]['aprovisionamiento']['fallo']) {
  act(() => {
    root.render(
      <PanelAntesDeComenzar
        onCerrar={() => {}}
        aprovisionamiento={{
          status: 'needs-info',
          valoresGuardados: {
            razonSocial: 'La Carpita Real Estate',
            nit: '123456789-6',
            nombreCompleto: 'Donqui de la Mancha',
          },
          fallo,
          retry: () => {},
          provision: () => {},
        }}
      />,
    )
  })
}

describe('<PanelAntesDeComenzar> cuando la última vez los datos no pasaron', () => {
  it('muestra qué revisar arriba y el formulario LLENO, sin «bloqueado» ni «soporte»', () => {
    panel({ mensaje: REVISA_LOS_DATOS, reintentable: true, status: null, paraCorregir: true })

    const aviso = container.querySelector('[data-testid="registro-para-corregir"]')
    expect(aviso?.textContent).toContain('Revísalos')
    expect(container.querySelector('[data-testid="owner-name-step-form"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="onboarding-provisioning-error"]')).toBeNull()
    const valores = Array.from(container.querySelectorAll('input')).map((i) => i.value)
    expect(valores).toContain('La Carpita Real Estate')
    expect(valores).toContain('Donqui de la Mancha')
    expect(container.textContent).not.toMatch(/bloquead|soporte/i)
  })

  it('sin fallo no hay aviso', () => {
    panel(null)
    expect(container.querySelector('[data-testid="registro-para-corregir"]')).toBeNull()
  })
})

/**
 * 02-10-2026 · Un 400 del back con `campos` ya no se lee sólo arriba: cada
 * mensaje va bajo SU campo (con el cruce suave de Cadence), el primero recibe
 * el foco y se va apenas la persona lo corrige.
 */
describe('<PanelAntesDeComenzar> con lo que el back rechazó por campo', () => {
  async function esperarElCruce() {
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20))
      })
    }
  }

  const NIT_MALO = 'El NIT no es válido: revisa el número y el dígito de verificación.'

  it('🔴 el error del NIT va bajo el NIT, con foco; arriba sólo «corrige lo marcado»', async () => {
    panel({
      mensaje: REVISA_LOS_CAMPOS,
      reintentable: true,
      status: 400,
      paraCorregir: true,
      campos: { nit: NIT_MALO },
    })
    await esperarElCruce()

    const nit = container.querySelector('#agencyNit') as HTMLInputElement
    expect(container.querySelector('#agencyNit-error')?.textContent).toBe(NIT_MALO)
    expect(nit.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(nit)
    expect(container.querySelector('[data-testid="registro-para-corregir"]')?.textContent).toBe(REVISA_LOS_CAMPOS)
  })

  it('al corregir el campo, el error del back se va y vuelve la ayuda', async () => {
    panel({ mensaje: REVISA_LOS_CAMPOS, reintentable: true, status: 400, paraCorregir: true, campos: { nit: NIT_MALO } })
    await esperarElCruce()

    const nit = container.querySelector('#agencyNit') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(nit, '900123456-8')
      nit.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await esperarElCruce()

    expect(container.querySelector('#agencyNit-error')).toBeNull()
    expect(nit.getAttribute('aria-invalid')).toBeNull()
  })

  it('con el tilde de representante puesto, lo que el back diga del representante va al nombre', async () => {
    panel({
      mensaje: REVISA_LOS_CAMPOS,
      reintentable: true,
      status: 400,
      paraCorregir: true,
      campos: { representante: 'El representante legal puede tener hasta 200 caracteres.' },
    })
    await esperarElCruce()
    expect(container.querySelector('#ownerFullName-error')?.textContent).toBe(
      'El representante legal puede tener hasta 200 caracteres.',
    )
  })
})
