/**
 * ConsignacionWizard.test.tsx — agent assignment is optional (T-0015).
 *
 * Before this fix, step 4 ("Asignar Agente") disabled "Siguiente" for an
 * admin who hadn't picked an agent, so a consignment could never be created
 * without one. The submit already tolerated "no agent" (it just skipped
 * `agenteUserId`), so the mandate silently landed on nobody instead of on
 * the admin who created it.
 *
 * These tests lock:
 *  1. Step 4 never blocks "Siguiente" — not for an admin without a
 *     selection, and not for an agency with zero agentes loaded.
 *  2. When no agent is chosen, the mandate's `agenteUserId` defaults to the
 *     creating user's own id — and `propertiesApi.assignAgent` is NOT
 *     called with the admin's own email (property-access.service.ts 400s
 *     on that; it isn't needed anyway, the creator already gets
 *     PropertyAccess from properties.service.ts `create()`).
 *  3. The existing agent-role auto-assign path (skips step 4 entirely,
 *     assigns to self) is unchanged.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'
import type { Propietario, Agente } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { authState, permissionsState, pushMock, propertiesApiMock, consignacionesApiMock, propietariosApiMock } =
  vi.hoisted(() => ({
    authState: {
      user: { id: 'user-1', email: 'user1@test.com', name: 'Test User' } as
        | { id: string; email: string; name: string }
        | null,
    },
    permissionsState: { isAdmin: true },
    pushMock: vi.fn(),
    propertiesApiMock: {
      create: vi.fn(),
      assignAgent: vi.fn(),
      update: vi.fn(),
    },
    consignacionesApiMock: {
      create: vi.fn(),
    },
    propietariosApiMock: {
      create: vi.fn(),
      update: vi.fn(),
    },
  }))

vi.mock('@/lib/i18n', () => ({
  // Params are appended (not truly interpolated) so a test can still assert
  // that a dynamic value — e.g. a raw backend error message — reached a
  // translated string, without this mock re-implementing the real
  // {{param}} substitution from i18n-context.tsx.
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}::${JSON.stringify(params)}` : k),
    locale: 'es',
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permissionsState,
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: propertiesApiMock,
}))

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: consignacionesApiMock,
  propietariosApi: propietariosApiMock,
}))

// Memoized per-tag, unlike the repo's usual inline Proxy mock (see
// CobroCard.test.tsx): that version's `get` trap returns a brand-new
// function component on every `motion.div` access, which is harmless for
// components that don't call anything effect-driven on mount, but is a real
// bug here. ConsignacionWizard re-renders `motion.div` on every
// `setFormData`, so a fresh component identity each time forces React to
// unmount+remount the whole step subtree every render. The mocked step
// components below call `updateFormData` from a mount `useEffect` — remount
// -> effect fires -> updateFormData -> re-render -> new `motion.div`
// identity -> remount again, forever. It's a synchronous loop, so it
// blocks the event loop entirely and even `--testTimeout` can't interrupt
// it (confirmed by reproducing the exact "Worker exited unexpectedly" /
// "tests 0ms" hang with the unmemoized version, and confirming this fixed
// version resolves it in <100ms). Memoizing gives `motion.div` a stable
// component identity across renders, matching real framer-motion's
// behavior closely enough for this test.
vi.mock('framer-motion', () => {
  const motionTagCache = new Map<string, (props: Record<string, unknown>) => React.ReactElement>()
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!motionTagCache.has(tag)) {
          motionTagCache.set(
            tag,
            ({
              children,
              whileHover,
              whileTap,
              initial,
              animate,
              exit,
              transition,
              ...rest
            }: Record<string, unknown> & { children?: React.ReactNode }) =>
              React.createElement(tag, rest, children),
          )
        }
        return motionTagCache.get(tag)
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
  }
})

// Steps 1 and 2 self-fill the minimum valid data on mount so the test can
// drive real "Siguiente" clicks through the real ConsignacionWizard
// validation/navigation logic. Step 4 is left untouched (no agenteId) —
// that's exactly the case under test.
vi.mock('./ConsignacionWizardSteps', () => ({
  StepSelectPropietario: ({ updateFormData }: { updateFormData: (d: Record<string, unknown>) => void }) => {
    React.useEffect(() => {
      updateFormData({ propietarioId: 'prop-1' })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return React.createElement('div', { 'data-testid': 'step-1' })
  },
  StepPropertyData: ({ updateFormData }: { updateFormData: (d: Record<string, unknown>) => void }) => {
    React.useEffect(() => {
      updateFormData({
        propertyTitle: 'Depto Centro',
        propertyAddress: 'Calle 1',
        propertyCity: 'Bogota',
        propertyZone: 'Chapinero',
        propertyType: 'apartment',
        monthlyRent: 1000000,
        bedrooms: 2,
        bathrooms: 1,
        area: 50,
        propertyDescription: 'Descripcion suficientemente larga para pasar la validacion del paso 2.',
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return React.createElement('div', { 'data-testid': 'step-2' })
  },
  StepCommissionTerms: () => React.createElement('div', { 'data-testid': 'step-3' }),
  StepAssignAgent: ({ formData }: { formData: { agenteId?: string } }) =>
    React.createElement('div', { 'data-testid': 'step-4' }, formData.agenteId ?? 'no-agent'),
  StepActaEntrega: () => React.createElement('div', { 'data-testid': 'step-5' }),
  StepConfirmation: () => React.createElement('div', { 'data-testid': 'step-6' }),
}))

import { ConsignacionWizard } from './ConsignacionWizard'
import { toast } from '@/components/ui/toast'

const PROPIETARIOS: Propietario[] = []
const AGENTE_LIST: Agente[] = [
  {
    id: 'member-1',
    userId: 'agent-user-1',
    name: 'Agente Uno',
    email: 'agente1@test.com',
    phone: '3000000000',
    role: 'agent',
    status: 'active',
    commissionSplit: 50,
    assignedPropertyIds: [],
    hireDate: '2026-01-01',
    metrics: {
      assignedProperties: 0,
      activeLeases: 0,
      closedThisMonth: 0,
      closedThisYear: 0,
      totalCommissions: 0,
      commissionsThisMonth: 0,
      avgDaysToClose: 0,
      conversionRate: 0,
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  authState.user = { id: 'user-1', email: 'user1@test.com', name: 'Test User' }
  permissionsState.isAdmin = true
  pushMock.mockClear()
  propertiesApiMock.create.mockReset().mockResolvedValue({ id: 'property-1' })
  propertiesApiMock.assignAgent.mockReset().mockResolvedValue(undefined)
  propertiesApiMock.update.mockReset().mockResolvedValue({ id: 'property-1', status: 'AVAILABLE' })
  consignacionesApiMock.create.mockReset().mockResolvedValue({ id: 'consignacion-1' })
  propietariosApiMock.create.mockReset()
  propietariosApiMock.update.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function renderWizard(agentes: Agente[]) {
  await act(async () => {
    root.render(React.createElement(ConsignacionWizard, { propietarios: PROPIETARIOS, agentes }))
  })
}

function findButtonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  const match = buttons.find((b) => b.textContent?.includes(text))
  if (!match) throw new Error(`No button found with text "${text}"`)
  return match
}

async function clickButton(button: HTMLButtonElement) {
  await act(async () => {
    button.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<ConsignacionWizard> — agent assignment is optional', () => {
  it('does not block "Siguiente" at step 4 for an admin who picked no agent, even with zero agentes loaded', async () => {
    await renderWizard([]) // agency with no agentes loaded — req. 4

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // step 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // step 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // step 3 -> 4

    expect(container.querySelector('[data-testid="step-4"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="step-4"]')?.textContent).toBe('no-agent')

    const nextBtn = findButtonByText('inmobiliaria.consignaciones.wizard.next')
    expect(nextBtn.disabled).toBe(false)

    await clickButton(nextBtn) // step 4 -> 5, proves it's not blocked
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()
  })

  it('defaults agenteUserId to the creating admin and skips assignAgent when no agent is picked', async () => {
    await renderWizard(AGENTE_LIST)

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5 (no agent picked)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6

    const submitBtn = findButtonByText('inmobiliaria.consignaciones.wizard.confirmConsignment')
    await clickButton(submitBtn)

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.assignAgent).not.toHaveBeenCalled()

    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    const payload = consignacionesApiMock.create.mock.calls[0][0]
    expect(payload.agenteUserId).toBe('user-1') // the admin's own User.id
  })

  it('keeps the agent-role auto-assign path unchanged (skips step 4, assigns to self)', async () => {
    permissionsState.isAdmin = false
    authState.user = { id: 'agent-user-1', email: 'agente1@test.com', name: 'Agente Uno' }

    await renderWizard(AGENTE_LIST)

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 5 (step 4 skipped)

    expect(container.querySelector('[data-testid="step-4"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6

    const submitBtn = findButtonByText('inmobiliaria.consignaciones.wizard.confirmConsignment')
    await clickButton(submitBtn)

    expect(propertiesApiMock.assignAgent).toHaveBeenCalledWith('property-1', 'agente1@test.com')
    const payload = consignacionesApiMock.create.mock.calls[0][0]
    expect(payload.agenteUserId).toBe('agent-user-1')
  })
})

/**
 * <ConsignacionWizard> — publish the property after the mandate (T-0018).
 *
 * Before this fix, `handleSubmit` created the property WITHOUT `status`, so
 * it was born DRAFT (back/prisma/schema.prisma:611) and never reached the
 * tenant marketplace (`status: { not: DRAFT }` at
 * back/src/properties/properties.service.ts:429-431) — a consigned
 * property was never visible, and no tenant could ever apply to it.
 *
 * contract.md §3.4 fixes this with a fourth, binding step run LAST, only
 * once the mandate exists: `PATCH /properties/:id { status: 'AVAILABLE' }`.
 * Publishing earlier would show tenants a property with no mandate behind
 * it. These tests lock:
 *  1. The happy path — the PATCH fires with `status: 'AVAILABLE'` strictly
 *     after `consignacionesApi.create` resolves, and the success toast
 *     still fires.
 *  2. The failure path — a rejected PATCH (contract.md §3.3, e.g. a 402
 *     plan-cap) must NOT show the success toast, must surface the backend
 *     message, and must still navigate away (the property and the mandate
 *     already exist — same reasoning as the pre-existing mandate-failure
 *     catch).
 */
describe('<ConsignacionWizard> — publishes the property after the mandate (T-0018)', () => {
  async function driveToStep6ThenSubmit() {
    await renderWizard(AGENTE_LIST)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    const submitBtn = findButtonByText('inmobiliaria.consignaciones.wizard.confirmConsignment')
    await clickButton(submitBtn)
  }

  it('PATCHes status AVAILABLE after the mandate is created, then shows success', async () => {
    const callOrder: string[] = []
    consignacionesApiMock.create.mockImplementation(async () => {
      callOrder.push('consignacion')
      return { id: 'consignacion-1' }
    })
    propertiesApiMock.update.mockImplementation(async () => {
      callOrder.push('publish')
      return { id: 'property-1', status: 'AVAILABLE' }
    })

    await driveToStep6ThenSubmit()

    expect(propertiesApiMock.update).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
    expect(callOrder).toEqual(['consignacion', 'publish'])
    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('does not show the success toast when the publish PATCH fails, and surfaces the backend message', async () => {
    const backendMessage = 'Alcanzaste el límite de propiedades de tu plan. Subí de plan para agregar más.'
    propertiesApiMock.update.mockRejectedValueOnce(new ApiError(402, backendMessage))

    await driveToStep6ThenSubmit()

    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(1)
    const [, options] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.description).toContain(backendMessage)
    // The property and the mandate already exist — same as the mandate-failure
    // catch, the wizard navigates away instead of stranding the user on a
    // now-stale form.
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })
})
