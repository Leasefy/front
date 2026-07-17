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
  it('starts with one empty row', () => {
    render()
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(1)
  })

  it('shows a notice clarifying the step is optional — the agent contract now accepts an empty members list (minItems: 0)', () => {
    render()
    const notice = container.querySelector('[data-testid="members-step-optional-notice"]')
    expect(notice).toBeTruthy()
    expect(notice?.textContent).toContain('opcional')
    expect(container.querySelector('[data-testid="members-step-required-notice"]')).toBeFalsy()
  })

  it('renders a secondary "Omitir por ahora" action', () => {
    render()
    const skipBtn = container.querySelector('[data-testid="members-skip-step"]')
    expect(skipBtn).toBeTruthy()
    expect(skipBtn?.textContent).toContain('Omitir por ahora')
  })

  it('clicking "Omitir por ahora" submits an empty members list, bypassing row validation', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    // Leave the default row empty (would normally block the regular submit).
    await act(async () => {
      clickButton('members-skip-step')
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ members: [] })
  })

  it('disables "Omitir por ahora" while submitting', () => {
    render({ isSubmitting: true })
    const skipBtn = container.querySelector('[data-testid="members-skip-step"]') as HTMLButtonElement
    expect(skipBtn.disabled).toBe(true)
  })

  it('adds and removes member rows', () => {
    render()

    clickButton('members-add-row')
    clickButton('members-add-row')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(3)

    clickButton('members-remove-row-0')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(2)
  })

  it('does not allow removing the last remaining row', () => {
    render()

    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(1)
    const removeBtn = container.querySelector(
      '[data-testid="members-remove-row-0"]',
    ) as HTMLButtonElement
    expect(removeBtn.disabled).toBe(true)

    clickButton('members-remove-row-0')
    expect(container.querySelectorAll('[data-testid^="member-row-"]').length).toBe(1)
  })

  it('shows a validation error for an invalid email and blocks submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    setInputValue(byId('members.0.email'), 'not-an-email')

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Ingresa un correo válido.')
  })

  it('shows a validation error for a duplicate email and blocks submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

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
      'Agente',
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

  it('blocks submit when the single default row is left with an empty email', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    await clickSubmit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toMatch(/correo es obligatorio|correo válido/i)
  })

  it('submits the mapped payload for two valid members', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({ onSubmit })

    clickButton('members-add-row')
    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')
    setInputValue(byId('members.1.email'), 'viewer@inmobiliaria.test')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      members: [
        { email: 'admin@inmobiliaria.test', role: 'AGENTE' },
        { email: 'viewer@inmobiliaria.test', role: 'AGENTE' },
      ],
    })
  })

  it('calls onSubmit with the mapped payload and does not render invite links on its own — that screen is fully controlled by the `pendingInvites` prop (owned by the parent, see OnboardingInmobiliariaClient)', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      sessionId: 'sess-1',
      currentStep: 'payment_provider',
      nextStep: 'policy',
      draft: {},
      inviteTokens: [{ email: 'admin@inmobiliaria.test', rawToken: 'raw-token-1' }],
    })
    render({ onSubmit })

    setInputValue(byId('members.0.email'), 'admin@inmobiliaria.test')

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    // No local state renders the invite screen — the component just relays
    // the response to the parent via the resolved `onSubmit` promise.
    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeFalsy()
  })
})

describe('<MembersStepForm> — invite-links screen (`pendingInvites` prop)', () => {
  const pendingInvites: React.ComponentProps<typeof MembersStepForm>['pendingInvites'] = {
    response: {
      sessionId: 'sess-1',
      currentStep: 'payment_provider',
      nextStep: 'policy',
      draft: {},
      inviteTokens: [
        { email: 'admin@inmobiliaria.test', rawToken: 'raw-token-1' },
        { email: 'viewer@inmobiliaria.test', rawToken: 'raw-token-2' },
      ],
    },
    body: {
      members: [
        { email: 'admin@inmobiliaria.test', role: 'ADMIN' },
        { email: 'viewer@inmobiliaria.test', role: 'VIEWER' },
      ],
    },
  }

  it('renders the invite links instead of the form when pendingInvites is set, and the wizard form is gone', () => {
    render({ pendingInvites })

    expect(container.querySelector('[data-testid="members-step-form"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="members-invite-links"]')).toBeTruthy()
    expect(container.textContent).toContain('admin@inmobiliaria.test')
    expect(container.textContent).toContain('viewer@inmobiliaria.test')
    expect(container.textContent).toContain('Administrador')
    expect(container.textContent).toContain('Solo lectura')
  })

  it('shows a prominent warning that the links will not be shown again', () => {
    render({ pendingInvites })

    const warning = container.querySelector('[data-testid="members-invite-warning"]')
    expect(warning).toBeTruthy()
    expect(warning?.textContent).toContain('Guardá estos links ahora')
    expect(warning?.textContent).toContain('no se vuelven a mostrar')
  })

  it('copies the invite link containing the rawToken when "Copiar" is clicked', async () => {
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
    expect(writeText.mock.calls[0]?.[0]).toContain('raw-token-1')
  })

  it('calls onContinueAfterInvites when "Continuar" is clicked — advance is manual, not automatic', () => {
    const onContinueAfterInvites = vi.fn()
    render({ pendingInvites, onContinueAfterInvites })

    clickButton('members-invite-continue')

    expect(onContinueAfterInvites).toHaveBeenCalledTimes(1)
  })
})
