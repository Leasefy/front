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
import { REVISA_LOS_DATOS } from '@/lib/hooks/use-onboarding-provisioning'

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
