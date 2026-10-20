/**
 * ContextSwitcher — the personal ↔ agency switcher shown in the avatar menu.
 * Renders ONLY for dual-context users; switching invokes onSwitch(context).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { ContextSwitcher } from './ContextSwitcher'
import {
  etiquetaDeLaPlataforma,
  estaEnLaInmobiliaria,
  nombreEnLaPlataforma,
  type ActiveContext,
} from '@/lib/auth/active-context'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

function render(props: Partial<React.ComponentProps<typeof ContextSwitcher>> = {}) {
  const onSwitch = props.onSwitch ?? vi.fn()
  act(() => {
    root.render(
      <ContextSwitcher
        user={{ role: 'tenant' }}
        agencyName="ABC"
        activeContext={'personal' as ActiveContext}
        hasActiveAgencyMembership
        locale="es"
        onSwitch={onSwitch}
        {...props}
      />,
    )
  })
  return onSwitch
}

describe('ContextSwitcher visibility', () => {
  it('renders for a dual-context user (personal role + ACTIVE membership)', () => {
    render()
    expect(container.querySelector('[data-testid="context-switcher"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="switch-personal"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="switch-agency"]')).not.toBeNull()
    expect(container.textContent).toContain('Inmobiliaria')
    expect(container.querySelector('[data-testid="plataforma-donde"]')?.textContent).toBe(
      'Estás en tu cuenta de inquilino. También trabajas en ABC.',
    )
  })

  it('renders nothing without an active membership', () => {
    render({ hasActiveAgencyMembership: false })
    expect(container.querySelector('[data-testid="context-switcher"]')).toBeNull()
  })

  it('renders nothing for a pure-agency user (single-context)', () => {
    render({ user: { role: 'agency' } })
    expect(container.querySelector('[data-testid="context-switcher"]')).toBeNull()
  })
})

describe('ContextSwitcher switching', () => {
  it('invokes onSwitch("agency") when the agency option is clicked', () => {
    const onSwitch = render()
    act(() => {
      ;(container.querySelector('[data-testid="switch-agency"]') as HTMLButtonElement).click()
    })
    expect(onSwitch).toHaveBeenCalledWith('agency')
  })

  it('invokes onSwitch("personal") when the personal option is clicked', () => {
    const onSwitch = render({ activeContext: 'agency' as ActiveContext })
    act(() => {
      ;(container.querySelector('[data-testid="switch-personal"]') as HTMLButtonElement).click()
    })
    expect(onSwitch).toHaveBeenCalledWith('personal')
  })
})

describe('🔴 el tipo de cuenta es el de la plataforma ACTIVA (Nico, 20-10-2026)', () => {
  it('un interruptor de dos lados: el activo marcado y tocarlo otra vez no hace nada', () => {
    const onSwitch = render({ activeContext: 'agency' as ActiveContext, agencyRole: 'ADMIN' })
    const agencia = container.querySelector('[data-testid="switch-agency"]') as HTMLButtonElement
    const personal = container.querySelector('[data-testid="switch-personal"]') as HTMLButtonElement
    expect(agencia.getAttribute('role')).toBe('radio')
    expect(agencia.getAttribute('aria-checked')).toBe('true')
    expect(personal.getAttribute('aria-checked')).toBe('false')
    act(() => agencia.click())
    expect(onSwitch).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="plataforma-donde"]')?.textContent).toBe(
      'Estás en la inmobiliaria ABC como administrador.',
    )
  })

  it('la etiqueta bajo el correo: «Inmobiliaria · Rol» dentro de la inmobiliaria, si no la cuenta personal', () => {
    const base = { role: 'tenant', hasActiveAgencyMembership: true }
    expect(etiquetaDeLaPlataforma({ ...base, activeContext: 'agency', agencyRole: 'AUXILIAR_CARTERA' })).toBe(
      'Inmobiliaria · Auxiliar de cartera',
    )
    expect(etiquetaDeLaPlataforma({ ...base, activeContext: 'personal', agencyRole: 'ADMIN' })).toBe('Inquilino')
    expect(etiquetaDeLaPlataforma({ ...base, role: 'landlord', activeContext: 'personal' })).toBe('Propietario')
    // Sin la membresía activa (invitado sin aceptar) no hay inmobiliaria que mostrar.
    expect(
      etiquetaDeLaPlataforma({ role: 'tenant', activeContext: 'agency', hasActiveAgencyMembership: false }),
    ).toBe('Inquilino')
    expect(etiquetaDeLaPlataforma({ role: 'agency', activeContext: 'agency', hasActiveAgencyMembership: true, agencyRole: 'CONTADOR' })).toBe(
      'Inmobiliaria · Contador',
    )
  })

  it('Perfil y Configuración del menú abren los de la plataforma activa', () => {
    expect(estaEnLaInmobiliaria({ role: 'tenant', activeContext: 'agency', hasActiveAgencyMembership: true })).toBe(true)
    expect(estaEnLaInmobiliaria({ role: 'tenant', activeContext: 'personal', hasActiveAgencyMembership: true })).toBe(false)
    expect(estaEnLaInmobiliaria({ role: 'agency', activeContext: 'agency', hasActiveAgencyMembership: false })).toBe(true)
  })
})

describe('🔴 el nombre de arriba no es el del inquilino dueño de la cuenta (Nico, 20-10-2026)', () => {
  const jose = 'José Andrés Quintero Gómez'
  it('dentro de la inmobiliaria: el nombre con que la invitaron', () => {
    expect(nombreEnLaPlataforma({ nombreDeLaCuenta: jose, nombreEnLaInmobiliaria: 'Laura Sanabria', enLaInmobiliaria: true })).toBe(
      'Laura Sanabria',
    )
  })
  it('en la cuenta personal: el de la cuenta', () => {
    expect(nombreEnLaPlataforma({ nombreDeLaCuenta: jose, nombreEnLaInmobiliaria: 'Laura Sanabria', enLaInmobiliaria: false })).toBe(jose)
  })
  it('sin nombre de la membresía (back viejo): el de la cuenta; sin ninguno, «Usuario»', () => {
    expect(nombreEnLaPlataforma({ nombreDeLaCuenta: jose, nombreEnLaInmobiliaria: null, enLaInmobiliaria: true })).toBe(jose)
    expect(nombreEnLaPlataforma({ enLaInmobiliaria: true })).toBe('Usuario')
  })
})
