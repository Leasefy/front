import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { MembersStepForm } from './MembersStepForm'
import { membersStepSchema, MEMBER_ROLE_OPTIONS, MEMBERS_STEP_NEW_ROW } from './members-step-schema'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof MembersStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof MembersStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    submitError: null,
    pendingInvites: null,
    onContinueAfterInvites: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<MembersStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`[id="${id}"]`)
  if (!el) throw new Error(`Element with id="${id}" not found`)
  return el as HTMLInputElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function clickButton(testId: string) {
  const btn = container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement
  if (!btn) throw new Error(`Button with data-testid="${testId}" not found`)
  act(() => {
    btn.click()
  })
}

async function clickSubmit() {
  const submitBtn = container.querySelector(
    '[data-testid="members-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<MembersStepForm>', () => {
  it('🔴 arranca SIN filas: el paso es opcional y «Continuar» continúa de verdad (Nico, 30-09)', () => {
    render()
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(0)
    // Sin el «Omitir por ahora» aparte: con cero filas, Continuar ES la salida.
    expect(container.querySelector('[data-testid="members-skip-step"]')).toBeFalsy()
  })

  it('shows a notice clarifying the step is optional — the agent contract now accepts an empty members list (minItems: 0)', () => {
    render()
    const notice = container.querySelector('[data-testid="members-step-optional-notice"]')
    expect(notice).toBeTruthy()
    expect(notice?.textContent).toContain('opcional')
    expect(container.querySelector('[data-testid="members-step-required-notice"]')).toBeFalsy()
  })

  it('🔴 «Continuar» sin filas manda la lista vacía, sin pedirle nada a nadie', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ members: [] })
  })

  it('adds and removes member rows', () => {
    render()

    clickButton('members-add-row')
    clickButton('members-add-row')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(2)

    clickButton('members-remove-row-0')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(1)
  })

  it('la última fila también se puede quitar: se vuelve al paso vacío', () => {
    render()

    clickButton('members-add-row')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(1)

    clickButton('members-remove-row-0')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(0)
  })

  it('shows a validation error for an invalid email and blocks submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'not-an-email')

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Ingresa un correo válido.')
  })

  it('shows a validation error for a duplicate email and blocks submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'dup@inmobiliaria.test')
    setInputValue(byId('members.1.email'), 'dup@inmobiliaria.test')

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Este correo ya está en la lista.')
  })

  it('accepts an empty member list at the schema level (agent contract now allows minItems: 0)', () => {
    const parsed = membersStepSchema.safeParse({ members: [] })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.members).toEqual([])
    }
  })

  it('exposes the panel agency roles (ADMIN/AGENTE/CONTADOR/VIEWER) — no OPERATOR', () => {
    expect(MEMBER_ROLE_OPTIONS.map((option) => option.value)).toEqual([
      'AGENTE',
      'CONTADOR',
      'ADMIN',
      'VIEWER',
    ])
    expect(MEMBER_ROLE_OPTIONS.map((option) => option.label)).toEqual([
      'Asesor comercial',
      'Contador',
      'Administrador',
      'Solo lectura',
    ])
  })

  it('defaults a new member row to the AGENTE role', () => {
    expect(MEMBERS_STEP_NEW_ROW.role).toBe('AGENTE')
  })

  it('rejects the deprecated OPERATOR role at the schema level', () => {
    const parsed = membersStepSchema.safeParse({
      members: [{ email: 'a@test.com', role: 'OPERATOR' }],
    })
    expect(parsed.success).toBe(false)
  })

  it('una fila agregada y dejada vacía SÍ bloquea el envío: se llena o se quita', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toMatch(/correo es obligatorio|correo válido/i)
  })

  it('submits the mapped payload for two valid members', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')
    setInputValue(byId('members.1.email'), 'viewer@inmobiliaria.test')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    // Los VALORES del formulario, no el request del micro: el padre necesita
    // el `nombre` de cada fila para crear la invitación real en el back.
    expect(onSubmit).toHaveBeenCalledWith({
      members: [
        { email: 'admin@inmobiliaria.test', nombre: '', role: 'AGENTE' },
        { email: 'viewer@inmobiliaria.test', nombre: '', role: 'AGENTE' },
      ],
    })
  })

  it('calls onSubmit and does not render the results screen on its own — that screen is fully controlled by the `pendingInvites` prop (owned by the parent, see OnboardingInmobiliariaClient)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ sessionId: 'sess-1' })
    render({ onSubmit })

    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeFalsy()
  })

  it('el nombre viaja cuando se escribe, y va vacío cuando no — nunca derivado del correo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'ana@inmobiliaria.test')
    setInputValue(byId('members.0.nombre'), '  Ana Restrepo  ')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledWith({
      members: [{ email: 'ana@inmobiliaria.test', nombre: 'Ana Restrepo', role: 'AGENTE' }],
    })
  })
})

/**
 * 🔴 La pantalla de resultados dejó de mostrar `rawToken`s del micro (que no
 * los aceptaba ninguna ruta y daban 404) y muestra el resultado de las
 * invitaciones REALES del back: correo enviado, enlace `/invitacion/<token>`
 * cuando el correo no salió, y el motivo cuando el back rechazó a alguien.
 */
describe('<MembersStepForm> — resultado de las invitaciones (`pendingInvites`)', () => {
  const pendingInvites: React.ComponentProps<typeof MembersStepForm>['pendingInvites'] = {
    invitaciones: [
      {
        email: 'admin@inmobiliaria.test',
        role: 'ADMIN',
        nombre: 'Ana Restrepo',
        enlace: 'https://app.leasefy.co/invitacion/tok-admin',
        correoEnviado: false,
        estadoDelCorreo: 'not_configured',
        error: null,
      },
      {
        email: 'viewer@inmobiliaria.test',
        role: 'VIEWER',
        nombre: '',
        enlace: 'https://app.leasefy.co/invitacion/tok-viewer',
        correoEnviado: true,
        estadoDelCorreo: 'sent',
        error: null,
      },
    ],
  }

  it('muestra el resultado en vez del formulario', () => {
    render({ pendingInvites })

    expect(container.querySelector('[data-testid="members-step-form"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeTruthy()
    expect(container.textContent).toContain('Ana Restrepo')
    expect(container.textContent).toContain('viewer@inmobiliaria.test')
    expect(container.textContent).toContain('Administrador')
    expect(container.textContent).toContain('Solo lectura')
  })

  it('🔴 el enlace apunta a /invitacion/<token> del back, NUNCA a /onboarding/invitacion', () => {
    render({ pendingInvites })

    const fila = container.querySelector(
      '[data-testid="invite-copy-admin@inmobiliaria.test"]',
    ) as HTMLButtonElement
    expect(fila.textContent).toContain('/invitacion/tok-admin')
    expect(container.innerHTML).not.toContain('/onboarding/invitacion')
  })

  it('ya NO dice que los enlaces no se vuelven a mostrar: era mentira y las invitaciones se reenvían desde el panel', () => {
    render({ pendingInvites })

    expect(container.textContent).not.toContain('no se vuelven a mostrar')
    const warning = container.querySelector('[data-testid="members-invite-warning"]')
    // Sólo avisa por la que NO recibió correo, y ofrece la salida real.
    expect(warning?.textContent).toContain('el correo no salió')
    expect(warning?.textContent).toContain('Configuración')
  })

  it('a quien SÍ recibió el correo no se le ofrece copiar un enlace: se le dice que ya llegó', () => {
    render({ pendingInvites })

    expect(
      container.querySelector('[data-testid="invite-sent-viewer@inmobiliaria.test"]'),
    ).toBeTruthy()
    expect(
      container.querySelector('[data-testid="invite-copy-viewer@inmobiliaria.test"]'),
    ).toBeFalsy()
  })

  it('un rechazo del back se muestra por persona y no tumba a las demás', () => {
    render({
      pendingInvites: {
        invitaciones: [
          {
            email: 'repetido@inmobiliaria.test',
            role: 'AGENTE',
            nombre: '',
            enlace: null,
            correoEnviado: false,
            error: 'El usuario ya es miembro activo de esta inmobiliaria.',
          },
          pendingInvites.invitaciones[1],
        ],
      },
    })

    expect(
      container.querySelector('[data-testid="invite-error-repetido@inmobiliaria.test"]')
        ?.textContent,
    ).toContain('ya es miembro activo')
    expect(container.querySelector('[data-testid="members-invite-errors"]')).toBeTruthy()
    // La que sí salió sigue ahí.
    expect(
      container.querySelector('[data-testid="invite-sent-viewer@inmobiliaria.test"]'),
    ).toBeTruthy()
  })

  it('copia el enlace del back al tocar la fila', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render({ pendingInvites })

    const copyBtn = container.querySelector(
      '[data-testid="invite-copy-admin@inmobiliaria.test"]',
    ) as HTMLButtonElement
    await act(async () => {
      copyBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0]?.[0]).toContain('/invitacion/tok-admin')
  })

  it('calls onContinueAfterInvites when "Continuar" is clicked — advance is manual, not automatic', () => {
    const onContinueAfterInvites = vi.fn()
    render({ pendingInvites, onContinueAfterInvites })

    clickButton('members-invite-continue')

    expect(onContinueAfterInvites).toHaveBeenCalledTimes(1)
  })
})

/**
 * 01-10-2026 (Alexis): una invitación rechazada sólo se podía reintentar desde
 * el panel, después del registro; y en su máquina, donde el entorno de pruebas
 * retiene los correos, la pantalla decía que el correo no salió como si fuera
 * una falla.
 */
describe('<MembersStepForm> — reintentar y entorno de pruebas', () => {
  const conUnaFallida: React.ComponentProps<typeof MembersStepForm>['pendingInvites'] = {
    invitaciones: [
      {
        email: 'alex.dev+8@leasefy.co',
        role: 'AGENTE',
        nombre: '',
        enlace: 'https://app.leasefy.co/invitacion/tok-8',
        correoEnviado: false,
        estadoDelCorreo: 'suppressed',
        error: null,
      },
      {
        email: 'alex.dev+9@leasefy.co',
        role: 'ADMIN',
        nombre: '',
        enlace: null,
        correoEnviado: false,
        error: 'Alcanzaste el límite de agentes de tu plan. Sube de plan para agregar más.',
      },
    ],
  }

  it('«Reintentar» vuelve a pedir las fallidas', async () => {
    const onReintentarInvitaciones = vi.fn().mockResolvedValue(undefined)
    render({ pendingInvites: conUnaFallida, onReintentarInvitaciones })

    clickButton('members-invite-retry')
    await act(async () => {
      await Promise.resolve()
    })

    expect(onReintentarInvitaciones).toHaveBeenCalledTimes(1)
  })

  it('sin quién reintente, no hay botón (y se dice dónde hacerlo después)', () => {
    render({ pendingInvites: conUnaFallida })

    expect(container.querySelector('[data-testid="members-invite-retry"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="members-invite-errors"]')?.textContent).toContain(
      'Configuración',
    )
  })

  it('un correo retenido por el entorno de pruebas se dice como tal, con el enlace a la mano', () => {
    render({ pendingInvites: conUnaFallida })

    const aviso = container.querySelector('[data-testid="members-invite-warning"]')
    expect(aviso?.textContent).toContain('entorno es de pruebas')
    expect(container.querySelector('[data-testid="invite-copy-alex.dev+8@leasefy.co"]')).toBeTruthy()
  })
})
