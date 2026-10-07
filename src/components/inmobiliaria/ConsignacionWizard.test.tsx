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

const {
  authState,
  permissionsState,
  pushMock,
  propertiesApiMock,
  consignacionesApiMock,
  propietariosApiMock,
  uploadPropertyPhotosMock,
  stepFivePhotosHolder,
  stepTwoOverridesHolder,
  stepOneOverridesHolder,
  ubicarDireccionMock,
} = vi.hoisted(() => ({
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
      actualizarInventario: vi.fn(),
    },
    propietariosApiMock: {
      create: vi.fn(),
      update: vi.fn(),
    },
    uploadPropertyPhotosMock: vi.fn(),
    // Mutable holder step 5's mock reads from on mount — lets individual
    // tests seed `formData.photos` before rendering without needing a
    // per-test vi.mock override (the module mock below is hoisted once for
    // the whole file, same constraint step1/step2's self-fill pattern
    // already works around).
    stepFivePhotosHolder: { photos: [] as File[], inventoryItems: [] as Array<Record<string, unknown>> },
    // Same pattern as stepFivePhotosHolder — lets a SALE-listing test
    // override step 2's self-filled defaults (listingType/salePrice)
    // without a per-test vi.mock (T-0038).
    stepTwoOverridesHolder: { overrides: {} as Record<string, unknown> },
    // Lo mismo para el paso 1: un dueño nuevo (sin guardar) en vez de uno de la lista.
    stepOneOverridesHolder: { overrides: {} as Record<string, unknown> },
    ubicarDireccionMock: vi.fn(),
  }))

/*
 * 🔴 Crear el inmueble resuelve su ubicación (Nico, 2026-09-12). Mockeado acá
 * porque es una llamada de red: sin esto cada caso del archivo saldría a
 * buscar «Calle 1, Bogota» de verdad.
 */
vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({
  ubicarDireccion: ubicarDireccionMock,
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
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: propertiesApiMock,
}))

vi.mock('@/lib/api/property-photos', () => ({
  uploadPropertyPhotos: uploadPropertyPhotosMock,
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
  StepSelectPropietario: ({
    updateFormData,
    ownerServerError,
  }: {
    updateFormData: (d: Record<string, unknown>) => void
    ownerServerError?: { field: string; message: string } | null
  }) => {
    React.useEffect(() => {
      updateFormData({ propietarioId: 'prop-1', ...stepOneOverridesHolder.overrides })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return React.createElement(
      'div',
      { 'data-testid': 'step-1' },
      ownerServerError
        ? React.createElement('p', { 'data-testid': 'error-del-dueno', 'data-campo': ownerServerError.field }, ownerServerError.message)
        : null,
    )
  },
  StepPropertyData: ({
    formData,
    updateFormData,
    erroresDelServidor,
  }: {
    formData: Record<string, unknown>
    updateFormData: (d: Record<string, unknown>) => void
    erroresDelServidor?: Record<string, string>
  }) => {
    React.useEffect(() => {
      // Sólo la primera vez: volver al paso (tras un error del back) no
      // reescribe lo que ya está, como el paso de verdad.
      if (formData.propertyTitle) return
      updateFormData({
        propertyTitle: 'Depto Centro',
        propertyAddress: 'Calle 1',
        propertyCity: 'Bogota',
        propertyZone: 'Chapinero',
        propertyType: 'apartment',
        // T-0038 §3.2.1/§3.2.2 — department is required in the wizard UI;
        // listingType defaults to 'rent' (already the wizard's initial state).
        department: 'Cundinamarca',
        monthlyRent: 1000000,
        bedrooms: 2,
        bathrooms: 1,
        area: 50,
        propertyDescription: 'Descripcion suficientemente larga para pasar la validacion del paso 2.',
        // T-0038: a SALE-listing test overrides listingType/monthlyRent/
        // salePrice here — see stepTwoOverridesHolder.
        ...stepTwoOverridesHolder.overrides,
      })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    // Los controles con el id del asistente (para el foco) y sus errores.
    return React.createElement(
      'div',
      { 'data-testid': 'step-2' },
      React.createElement('input', {
        id: 'asistente-monthlyRent',
        'data-testid': 'canon',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ monthlyRent: Number(e.target.value) }),
      }),
      React.createElement('input', { id: 'asistente-propertyTitle', 'data-testid': 'titulo' }),
      React.createElement('p', { 'data-testid': 'error-monthlyRent' }, erroresDelServidor?.monthlyRent ?? ''),
      React.createElement('p', { 'data-testid': 'error-propertyTitle' }, erroresDelServidor?.propertyTitle ?? ''),
    )
  },
  StepCommissionTerms: ({ erroresDelServidor }: { erroresDelServidor?: Record<string, string> }) =>
    React.createElement(
      'div',
      { 'data-testid': 'step-3' },
      React.createElement('input', { id: 'asistente-commissionPercent', 'data-testid': 'comision' }),
      React.createElement('p', { 'data-testid': 'error-commissionPercent' }, erroresDelServidor?.commissionPercent ?? ''),
    ),
  StepAssignAgent: ({ formData }: { formData: { agenteId?: string } }) =>
    React.createElement('div', { 'data-testid': 'step-4' }, formData.agenteId ?? 'no-agent'),
  StepActaEntrega: ({ updateFormData }: { updateFormData: (d: Record<string, unknown>) => void }) => {
    React.useEffect(() => {
      if (stepFivePhotosHolder.photos.length > 0) {
        updateFormData({ photos: stepFivePhotosHolder.photos })
      }
      if (stepFivePhotosHolder.inventoryItems.length > 0) {
        updateFormData({ inventoryItems: stepFivePhotosHolder.inventoryItems })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return React.createElement('div', { 'data-testid': 'step-5' })
  },
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
  uploadPropertyPhotosMock.mockReset().mockResolvedValue({ uploaded: 0, failed: [] })
  stepFivePhotosHolder.photos = []
  stepFivePhotosHolder.inventoryItems = []
  consignacionesApiMock.actualizarInventario.mockReset().mockResolvedValue({ id: 'consignacion-1' })
  stepTwoOverridesHolder.overrides = {}
  stepOneOverridesHolder.overrides = {}
  ubicarDireccionMock
    .mockReset()
    .mockResolvedValue({ lat: 4.6097, lng: -74.0817, precision: 'direccion' })
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

// `document.body`, no `container`: el diálogo de «¿publicar sin fotos?» vive
// en un portal de Radix, fuera del contenedor del test.
function findButtonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(document.body.querySelectorAll('button'))
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

const CONFIRMAR_CONSIGNACION = 'inmobiliaria.consignaciones.wizard.confirmConsignment'

function hayBoton(text: string): boolean {
  return Array.from(document.body.querySelectorAll('button')).some((b) => b.textContent?.includes(text))
}

/**
 * Confirma la consignación. Sin fotos, el wizard pregunta antes de publicar
 * (W2); los casos que no tratan de eso eligen «Publicar sin fotos», que es lo
 * que hacía antes sin preguntar.
 */
async function enviar() {
  await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))
  if (hayBoton('inmobiliaria.consignaciones.wizard.sinFotosDialog.publishAnyway')) {
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.sinFotosDialog.publishAnyway'))
  }
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

    await enviar()

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

    await enviar()

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
/**
 * 🔴 Nico, 2026-09-12: «que crear el inmueble resuelva su ubicación, en vez de
 * un recorrido aparte que se puede saltar».
 *
 * El buscador del paso 2 sólo deja coordenadas si alguien ELIGE una
 * sugerencia. Quien escribe la dirección de memoria y sigue de largo creaba el
 * inmueble sin punto en el mapa, y el único lugar donde eso se veía era la
 * ficha, después, detrás de un «Ubicar en el mapa» que nadie abre. Así
 * quedaron 1.442 de los 2.824 inmuebles de la migración real.
 */
describe('<ConsignacionWizard> — crear el inmueble resuelve su ubicación', () => {
  async function crear() {
    await renderWizard(AGENTE_LIST)
    for (let i = 0; i < 5; i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    await enviar()
  }

  it('🔴 sin coordenadas del buscador, las resuelve con la dirección, la ciudad y el departamento', async () => {
    await crear()

    expect(ubicarDireccionMock).toHaveBeenCalledWith({
      direccion: 'Calle 1',
      ciudad: 'Bogota',
      departamento: 'Cundinamarca',
    })
    const payload = propertiesApiMock.create.mock.calls[0][0]
    expect(payload.latitude).toBe(4.6097)
    expect(payload.longitude).toBe(-74.0817)
  })

  /* Lo que la persona eligió manda: no se vuelve a buscar lo ya resuelto. */
  it('con coordenadas elegidas en el paso 2 NO vuelve a buscar', async () => {
    stepTwoOverridesHolder.overrides = {
      propertyLatitude: 6.2442,
      propertyLongitude: -75.5812,
    }

    await crear()

    expect(ubicarDireccionMock).not.toHaveBeenCalled()
    const payload = propertiesApiMock.create.mock.calls[0][0]
    expect(payload.latitude).toBe(6.2442)
    expect(payload.longitude).toBe(-75.5812)
  })

  /*
   * 🔴 Una dirección que no se pudo ubicar NO puede frenar la creación: el
   * inmueble entra sin punto, que es como entraba antes de todo esto.
   */
  it('sin poder ubicarla, el inmueble se crea igual y sin coordenadas inventadas', async () => {
    ubicarDireccionMock.mockResolvedValue({ precision: 'ninguna' })

    await crear()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    const payload = propertiesApiMock.create.mock.calls[0][0]
    expect(payload.latitude).toBeUndefined()
    expect(payload.longitude).toBeUndefined()
  })

  it('el centro del municipio también sirve: mejor en su pueblo que en ningún lado', async () => {
    ubicarDireccionMock.mockResolvedValue({
      lat: 6.0918,
      lng: -75.6356,
      precision: 'municipio',
    })

    await crear()

    const payload = propertiesApiMock.create.mock.calls[0][0]
    expect(payload.latitude).toBe(6.0918)
  })
})

describe('<ConsignacionWizard> — publishes the property after the mandate (T-0018)', () => {
  async function driveToStep6ThenSubmit() {
    await renderWizard(AGENTE_LIST)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    await enviar()
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
    const backendMessage = 'Alcanzaste el límite de propiedades de tu plan. Sube de plan para agregar más.'
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

/**
 * <ConsignacionWizard> — contract-addendum-2.md §A: a SALE listing carries a
 * REDUCED Consignacion mandate (propietario + consignedAt + sale commission).
 *
 * This REVERSES the WU-3 behaviour (SALE skipped the mandate and published
 * directly) per the owner's ruling on W3-a. No canon, no minimumTerm, no
 * adminFee, no acta de entrega. Step 5 used to be skipped entirely for a
 * sale listing; T-0042 (ledger.md §2/§3) amends that — it now renders
 * photos-only (see `StepActaEntrega` in ConsignacionWizardSteps.tsx) and is
 * reached like any other step (see `getNextStep` in ConsignacionWizard.tsx).
 */
describe('<ConsignacionWizard> — SALE listing carries a reduced mandate (contract-addendum-2.md §A)', () => {
  async function driveToStep6ThenSubmitAsSale() {
    stepTwoOverridesHolder.overrides = {
      listingType: 'sale',
      salePrice: 400_000_000,
      monthlyRent: null,
    }
    await renderWizard(AGENTE_LIST)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5 (photos-only, T-0042)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    await enviar()
  }

  it('creates the property with listingType sale, salePrice, and monthlyRent: null — never 0 (C6)', async () => {
    await driveToStep6ThenSubmitAsSale()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    const payload = propertiesApiMock.create.mock.calls[0][0]
    expect(payload.listingType).toBe('sale')
    expect(payload.salePrice).toBe(400_000_000)
    expect(payload.monthlyRent).toBeNull()
  })

  it('creates a reduced sale mandate: saleCommissionPercent sent, monthlyRent/minimumTerm/adminFee omitted', async () => {
    await driveToStep6ThenSubmitAsSale()

    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    const payload = consignacionesApiMock.create.mock.calls[0][0]
    expect(payload.saleCommissionPercent).toBe(3) // wizard default
    expect(payload.commissionPercent).toBe(0)
    expect('monthlyRent' in payload).toBe(false)
    expect('minimumTerm' in payload).toBe(false)
    expect('adminFee' in payload).toBe(false)
  })

  it('sends the mandate contractDate as the SAME value sent as Property.consignedAt (§A.2)', async () => {
    await driveToStep6ThenSubmitAsSale()

    const propertyPayload = propertiesApiMock.create.mock.calls[0][0]
    const mandatePayload = consignacionesApiMock.create.mock.calls[0][0]
    expect(mandatePayload.contractDate).toBe(propertyPayload.consignedAt)
  })

  it('publishes only after the mandate succeeds (mandate first, publish second)', async () => {
    await driveToStep6ThenSubmitAsSale()

    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
    expect(toast.success).toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })

  it('never publishes when the mandate call fails', async () => {
    consignacionesApiMock.create.mockRejectedValueOnce(new ApiError(400, 'Propietario invalido'))

    await driveToStep6ThenSubmitAsSale()

    expect(propertiesApiMock.update).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('surfaces a publish failure honestly instead of claiming success', async () => {
    const backendMessage = 'No se pudo publicar la propiedad.'
    propertiesApiMock.update.mockRejectedValueOnce(new ApiError(500, backendMessage))

    await driveToStep6ThenSubmitAsSale()

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })
})

describe('<ConsignacionWizard> — property photos (T-0017)', () => {
  // Admin path: goes through all 6 steps (step 4 isn't skipped), picking no
  // agent — same setup as the "agent assignment is optional" tests above.
  async function submitAsAdmin() {
    await renderWizard(AGENTE_LIST)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    await enviar()
  }

  it('never calls uploadPropertyPhotos when the user added no photos', async () => {
    stepFivePhotosHolder.photos = []

    await submitAsAdmin()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(uploadPropertyPhotosMock).not.toHaveBeenCalled()
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
  })

  it('uploads photos to the just-created property, after propertiesApi.create resolves', async () => {
    const photos = [
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
    ]
    stepFivePhotosHolder.photos = photos
    uploadPropertyPhotosMock.mockResolvedValue({ uploaded: 2, failed: [] })

    await submitAsAdmin()

    expect(uploadPropertyPhotosMock).toHaveBeenCalledWith('property-1', photos)
    // The consignment still completes and reports plain success — no photo
    // failures to mention.
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('warns about partial photo failures without aborting the rest of the flow', async () => {
    const photos = [new File(['a'], 'a.jpg', { type: 'image/jpeg' })]
    stepFivePhotosHolder.photos = photos
    uploadPropertyPhotosMock.mockResolvedValue({
      uploaded: 0,
      failed: [{ name: 'a.jpg', reason: 'Upload failed: 500' }],
    })

    await submitAsAdmin()

    expect(toast.warning).toHaveBeenCalledWith(
      'inmobiliaria.consignaciones.wizard.toasts.photosPartialTitle',
      expect.objectContaining({
        // The shared `useI18n` mock above (hoisted vi.mock("@/lib/i18n", ...))
        // appends `::${JSON.stringify(params)}` to the returned key whenever
        // params are passed to `t()`, added by T-0018 so a raw backend error
        // message can be asserted reaching a toast description. This call
        // always passes `{ uploaded, total }`, so the rendered description
        // carries that suffix. Match on the key with `stringContaining`
        // instead of an exact string: it must keep proving THIS SPECIFIC
        // key was used, without re-breaking the next time the mock's
        // params behaviour changes. Do not loosen this to `expect.any(String)`.
        description: expect.stringContaining(
          'inmobiliaria.consignaciones.wizard.toasts.photosPartialDesc',
        ),
      }),
    )
    // The property and the mandate both went through — a failed photo must
    // never read as a failed consignment.
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })
})

/**
 * <ConsignacionWizard> — step 5 reachable on the sale path (T-0042).
 *
 * Root cause (ledger.md §2): photos are staged into `formData.photos` by
 * the UI that lives inside step 5 ("Inventario / acta de entrega"), but a
 * sale listing used to skip step 5 entirely (contract-addendum-2.md §A.8),
 * so `formData.photos` stayed `[]` and nothing ever reached
 * `uploadPropertyPhotos`. This section locks: step 5 is reached (correctly
 * labeled and counted) across all four role x listing-type combinations,
 * and a sale listing's staged photos actually reach the upload call — not
 * just that the section renders.
 */
describe('<ConsignacionWizard> — step 5 reachable on the sale path (T-0042)', () => {
  function visibleStepLabels(): string[] {
    return Array.from(container.querySelectorAll('span.text-xs.font-medium')).map(
      (el) => el.textContent ?? '',
    )
  }

  it('rent + agent role: 5 visible steps labeled "inventory", step 4 skipped, step 5 reachable', async () => {
    permissionsState.isAdmin = false
    authState.user = { id: 'agent-user-1', email: 'agente1@test.com', name: 'Agente Uno' }
    await renderWizard(AGENTE_LIST)

    expect(visibleStepLabels()).toEqual([
      'inmobiliaria.consignaciones.wizard.steps.owner',
      'inmobiliaria.consignaciones.wizard.steps.property',
      'inmobiliaria.consignaciones.wizard.steps.commission',
      'inmobiliaria.consignaciones.wizard.steps.inventory',
      'inmobiliaria.consignaciones.wizard.steps.confirm',
    ])

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 5 (step 4 skipped)

    expect(container.querySelector('[data-testid="step-4"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()
  })

  it('rent + no agent role (admin): 6 visible steps labeled "inventory", sequential 1..6', async () => {
    await renderWizard(AGENTE_LIST) // beforeEach sets permissionsState.isAdmin = true

    expect(visibleStepLabels()).toEqual([
      'inmobiliaria.consignaciones.wizard.steps.owner',
      'inmobiliaria.consignaciones.wizard.steps.property',
      'inmobiliaria.consignaciones.wizard.steps.commission',
      'inmobiliaria.consignaciones.wizard.steps.agent',
      'inmobiliaria.consignaciones.wizard.steps.inventory',
      'inmobiliaria.consignaciones.wizard.steps.confirm',
    ])

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    expect(container.querySelector('[data-testid="step-4"]')).toBeTruthy()
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()
  })

  it('sale + agent role: 5 visible steps labeled "photos", step 4 skipped, step 5 reachable', async () => {
    stepTwoOverridesHolder.overrides = { listingType: 'sale', salePrice: 400_000_000, monthlyRent: null }
    permissionsState.isAdmin = false
    authState.user = { id: 'agent-user-1', email: 'agente1@test.com', name: 'Agente Uno' }
    await renderWizard(AGENTE_LIST)

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2 (step 2 mounts, sets listingType: sale)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3

    expect(visibleStepLabels()).toEqual([
      'inmobiliaria.consignaciones.wizard.steps.owner',
      'inmobiliaria.consignaciones.wizard.steps.property',
      'inmobiliaria.consignaciones.wizard.steps.commission',
      'inmobiliaria.consignaciones.wizard.steps.photos',
      'inmobiliaria.consignaciones.wizard.steps.confirm',
    ])

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 5 (step 4 skipped)
    expect(container.querySelector('[data-testid="step-4"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    expect(container.querySelector('[data-testid="step-6"]')).toBeTruthy()
  })

  it('sale + no agent role (admin): 6 visible steps labeled "photos", sequential 1..6, step 5 reachable', async () => {
    stepTwoOverridesHolder.overrides = { listingType: 'sale', salePrice: 400_000_000, monthlyRent: null }
    await renderWizard(AGENTE_LIST)

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2 (step 2 mounts, sets listingType: sale)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3

    expect(visibleStepLabels()).toEqual([
      'inmobiliaria.consignaciones.wizard.steps.owner',
      'inmobiliaria.consignaciones.wizard.steps.property',
      'inmobiliaria.consignaciones.wizard.steps.commission',
      'inmobiliaria.consignaciones.wizard.steps.agent',
      'inmobiliaria.consignaciones.wizard.steps.photos',
      'inmobiliaria.consignaciones.wizard.steps.confirm',
    ])

    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    expect(container.querySelector('[data-testid="step-4"]')).toBeTruthy()
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5
    expect(container.querySelector('[data-testid="step-5"]')).toBeTruthy()
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    expect(container.querySelector('[data-testid="step-6"]')).toBeTruthy()
  })

  it('uploads a sale listing\'s staged photos: uploadPropertyPhotos called with the new property id and the staged files', async () => {
    stepTwoOverridesHolder.overrides = { listingType: 'sale', salePrice: 400_000_000, monthlyRent: null }
    const photos = [new File(['a'], 'a.jpg', { type: 'image/jpeg' })]
    stepFivePhotosHolder.photos = photos
    uploadPropertyPhotosMock.mockResolvedValue({ uploaded: 1, failed: [] })

    await renderWizard(AGENTE_LIST)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 1 -> 2
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 2 -> 3
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 3 -> 4
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 4 -> 5 (photos-only step, now reachable)
    await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next')) // 5 -> 6
    await enviar()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(uploadPropertyPhotosMock).toHaveBeenCalledWith('property-1', photos)
  })
})

describe('<ConsignacionWizard> — desde la ficha del propietario (propietarioInicial + volverA)', () => {
  const FICHA = '/panel/inmobiliaria/propietarios/prop-1'

  async function renderDesdeLaFicha() {
    await act(async () => {
      root.render(
        React.createElement(ConsignacionWizard, {
          propietarios: PROPIETARIOS,
          agentes: AGENTE_LIST,
          propietarioInicial: 'prop-1',
          volverA: FICHA,
        }),
      )
    })
  }

  it('al terminar vuelve a la ficha del propietario, no al portafolio', async () => {
    await renderDesdeLaFicha()
    for (let paso = 1; paso < 6; paso++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    await enviar()
    expect(pushMock).toHaveBeenCalledWith(FICHA)
    expect(pushMock).not.toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })

  it('si el mandato falla se queda para reintentarlo, y al lograrlo vuelve a donde se entró', async () => {
    // Sistema de errores (02-10-2026): antes salía de la pantalla con un
    // genérico; ahora se queda y reintentar sólo crea la consignación.
    consignacionesApiMock.create.mockRejectedValueOnce(new Error('boom'))
    await renderDesdeLaFicha()
    for (let paso = 1; paso < 6; paso++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    await enviar()
    expect(pushMock).not.toHaveBeenCalled()

    await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))
    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(2)
    expect(pushMock).toHaveBeenCalledWith(FICHA)
  })

  it('sin volverA sigue yendo al portafolio', async () => {
    await renderWizard(AGENTE_LIST)
    for (let paso = 1; paso < 6; paso++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    await enviar()
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })
})

describe('<ConsignacionWizard> — fallos a la mitad y publicar sin fotos (W1, W2, W3)', () => {
  const SIN_FOTOS = 'inmobiliaria.consignaciones.wizard.sinFotosDialog'

  async function llegarAlFinal() {
    await renderWizard(AGENTE_LIST)
    for (let i = 0; i < 8 && !hayBoton(CONFIRMAR_CONSIGNACION); i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
  }

  function titulos(fn: unknown): string[] {
    return (fn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
  }

  it('W1: si asignar el agente falla, el inmueble no se da por perdido y la consignación sigue', async () => {
    permissionsState.isAdmin = false
    authState.user = { id: 'agent-user-1', email: 'agente1@test.com', name: 'Agente Uno' }
    propertiesApiMock.assignAgent.mockRejectedValueOnce(new ApiError(400, 'No se pudo asignar'))

    await llegarAlFinal()
    await enviar()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(titulos(toast.warning)).toContain('inmobiliaria.consignaciones.wizard.toasts.agentErrorTitle')
    expect(titulos(toast.error)).not.toContain('inmobiliaria.consignaciones.wizard.toasts.errorTitle')
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
  })

  it('W2: sin fotos pregunta ANTES de crear nada', async () => {
    await llegarAlFinal()
    await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))

    expect(hayBoton(`${SIN_FOTOS}.saveDraft`)).toBe(true)
    expect(hayBoton(`${SIN_FOTOS}.publishAnyway`)).toBe(true)
    expect(propertiesApiMock.create).not.toHaveBeenCalled()
  })

  it('W2: «Dejar en borrador» crea inmueble y consignación, no publica, y lo dice', async () => {
    await llegarAlFinal()
    await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))
    await clickButton(findButtonByText(`${SIN_FOTOS}.saveDraft`))

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).not.toHaveBeenCalled()
    expect(titulos(toast.success)).toEqual(['inmobiliaria.consignaciones.wizard.toasts.draftSavedTitle'])
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })

  it('W2: con fotos no pregunta y publica', async () => {
    stepFivePhotosHolder.photos = [new File(['a'], 'a.jpg', { type: 'image/jpeg' })]
    uploadPropertyPhotosMock.mockResolvedValue({ uploaded: 1, failed: [] })

    await llegarAlFinal()
    await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))

    expect(hayBoton(`${SIN_FOTOS}.saveDraft`)).toBe(false)
    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
  })

  it('W3: un 409 de consignación duplicada muestra el motivo del back, no «complétala»', async () => {
    const motivo = 'Ya existe una consignación para este inmueble en esta agencia'
    consignacionesApiMock.create.mockRejectedValueOnce(new ApiError(409, motivo))

    await llegarAlFinal()
    await enviar()

    const llamadas = (toast.error as ReturnType<typeof vi.fn>).mock.calls
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0][0]).toBe('inmobiliaria.consignaciones.wizard.toasts.mandateDuplicateTitle')
    expect(String(llamadas[0][1].description)).toContain(motivo)
    expect(propertiesApiMock.update).not.toHaveBeenCalled()
  })

  it('W3: un fallo de consignación que no es 409 conserva el aviso de completar', async () => {
    consignacionesApiMock.create.mockRejectedValueOnce(new ApiError(500, 'boom'))

    await llegarAlFinal()
    await enviar()

    expect(titulos(toast.error)).toEqual(['inmobiliaria.consignaciones.wizard.toasts.mandateErrorTitle'])
  })
})

describe('<ConsignacionWizard> — crear es idempotente y no se repite (T-0141)', () => {
  const TOASTS = 'inmobiliaria.consignaciones.wizard.toasts'

  async function llegarAlFinal() {
    await renderWizard(AGENTE_LIST)
    for (let i = 0; i < 8 && !hayBoton(CONFIRMAR_CONSIGNACION); i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
  }

  function titulos(fn: unknown): string[] {
    return (fn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]))
  }

  function llaveDe(llamada: number): string | undefined {
    return propertiesApiMock.create.mock.calls[llamada]?.[1]?.idempotencyKey
  }

  beforeEach(() => {
    stepFivePhotosHolder.photos = [new File(['a'], 'a.jpg', { type: 'image/jpeg' })]
    uploadPropertyPhotosMock.mockResolvedValue({ uploaded: 1, failed: [] })
    ;(toast.success as ReturnType<typeof vi.fn>).mockReset()
    ;(toast.error as ReturnType<typeof vi.fn>).mockReset()
    ;(toast.warning as ReturnType<typeof vi.fn>).mockReset()
  })

  it('sends a UUID v4 Idempotency-Key with POST /properties', async () => {
    await llegarAlFinal()
    await enviar()

    expect(llaveDe(0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('reuses the SAME key when create itself failed and the user retries', async () => {
    propertiesApiMock.create
      .mockRejectedValueOnce(new ApiError(0, 'sin red'))
      .mockResolvedValueOnce({ id: 'property-1' })

    await llegarAlFinal()
    await enviar()
    await enviar()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(2)
    expect(llaveDe(0)).toBeTruthy()
    expect(llaveDe(0)).toBe(llaveDe(1))
  })

  it('a failure AFTER the property exists never re-POSTs it: the retry resumes at the failed step', async () => {
    // The photo step blows up outside its own guards (the first-attempt escape).
    uploadPropertyPhotosMock.mockRejectedValueOnce(new Error('boom'))

    await llegarAlFinal()
    await enviar()

    // First attempt: property exists, user is told what is pending (not "nothing was saved").
    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(titulos(toast.error)).toEqual([`${TOASTS}.createdPendingTitle`])
    expect(consignacionesApiMock.create).not.toHaveBeenCalled()

    await enviar()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(uploadPropertyPhotosMock).toHaveBeenCalledTimes(2)
    expect(uploadPropertyPhotosMock.mock.calls[1][0]).toBe('property-1')
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).toHaveBeenCalledTimes(1)
  })

  it('a retry after photos succeeded does not upload them twice, nor repeat the mandate or the publish', async () => {
    // Everything ran; only the closing toast threw (a UI-layer error after all the writes).
    ;(toast.success as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('toast exploded')
    })

    await llegarAlFinal()
    await enviar()
    await enviar()

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(uploadPropertyPhotosMock).toHaveBeenCalledTimes(1)
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(1)
    expect(propertiesApiMock.update).toHaveBeenCalledTimes(1)
  })

  it('a double click while submitting creates one property', async () => {
    let release: (v: { id: string }) => void = () => {}
    propertiesApiMock.create.mockReturnValueOnce(new Promise((r) => { release = r }))

    await llegarAlFinal()
    const boton = findButtonByText(CONFIRMAR_CONSIGNACION)
    await act(async () => {
      boton.click()
      boton.click()
      await new Promise((r) => setTimeout(r, 0))
    })
    await act(async () => {
      release({ id: 'property-1' })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
  })
})

/**
 * Sistema de errores, tanda 2 (02-10-2026). La receta: un 400 con `campos`
 * lleva al paso del campo, con el error ahí y el foco puesto, y al toast va
 * SÓLO lo que no tiene campo; un 5xx dice «de nuestro lado» con la referencia;
 * sin respuesta, ahí sí, la conexión.
 */
describe('<ConsignacionWizard> — los errores del back, en su lugar', () => {
  function errorDeCampos(campos: Array<{ campo: string; mensaje: string }>, extra: Record<string, unknown> = {}) {
    return new ApiError(400, campos.map((c) => c.mensaje), 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: campos.map((c) => c.mensaje),
      campos: campos.map((c) => ({ ...c, regla: 'maximo' })),
      ...extra,
    })
  }
  const CANON_MAXIMO = 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.'

  async function llegarAlFinal() {
    await renderWizard(AGENTE_LIST)
    for (let i = 0; i < 8 && !hayBoton(CONFIRMAR_CONSIGNACION); i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
  }

  const porTestId = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)

  it('🔴 un 400 en el canon al crear el inmueble: vuelve al paso 2, el error en el campo y el foco ahí, sin toast', async () => {
    propertiesApiMock.create.mockRejectedValueOnce(errorDeCampos([{ campo: 'monthlyRent', mensaje: CANON_MAXIMO }]))

    await llegarAlFinal()
    await enviar()

    expect(porTestId('step-2')).not.toBeNull()
    expect(porTestId('error-monthlyRent')?.textContent).toBe(CANON_MAXIMO)
    expect(document.activeElement).toBe(porTestId('canon'))
    expect(toast.error).not.toHaveBeenCalled()
    expect(consignacionesApiMock.create).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('lo que no tiene campo en el asistente (las coordenadas) va al toast; lo que sí, a su campo', async () => {
    propertiesApiMock.create.mockRejectedValueOnce(
      errorDeCampos([
        { campo: 'title', mensaje: 'El título no puede tener más de 100 caracteres.' },
        { campo: 'latitude', mensaje: 'La latitud no tiene el formato esperado.' },
      ]),
    )

    await llegarAlFinal()
    await enviar()

    expect(porTestId('error-propertyTitle')?.textContent).toBe('El título no puede tener más de 100 caracteres.')
    expect(document.activeElement).toBe(porTestId('titulo'))
    const [titulo, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(titulo).toBe('inmobiliaria.consignaciones.wizard.toasts.errorTitle')
    expect(opciones.description).toBe('La latitud no tiene el formato esperado.')
  })

  it('al editar el campo, su error del servidor se va', async () => {
    propertiesApiMock.create.mockRejectedValueOnce(errorDeCampos([{ campo: 'monthlyRent', mensaje: CANON_MAXIMO }]))
    await llegarAlFinal()
    await enviar()
    expect(porTestId('error-monthlyRent')?.textContent).toBe(CANON_MAXIMO)

    const canon = porTestId('canon') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(canon, '2000000')
      canon.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(porTestId('error-monthlyRent')?.textContent ?? '').toBe('')
  })

  it('🔴 un 5xx al crear el inmueble dice «de nuestro lado» con la referencia, y no culpa a la conexión', async () => {
    propertiesApiMock.create.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await llegarAlFinal()
    await enviar()

    const [, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opciones.description).toMatch(/^No pudimos crear el inmueble: algo falló de nuestro lado/)
    expect(opciones.description).toContain('ab12cd34')
    expect(opciones.description).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (la red) al crear el inmueble: ahí sí se habla de la conexión', async () => {
    propertiesApiMock.create.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await llegarAlFinal()
    await enviar()

    const [, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opciones.description).toMatch(/conexión/)
  })

  it('🔴 un 400 del mandato con el inmueble ya creado: se queda, el error en su campo, y reintentar NO crea otro inmueble', async () => {
    consignacionesApiMock.create
      .mockRejectedValueOnce(
        errorDeCampos([{ campo: 'commissionPercent', mensaje: 'La comisión no puede pasar de 100.' }]),
      )
      .mockResolvedValueOnce({ id: 'consignacion-1' })

    await llegarAlFinal()
    await enviar()

    expect(porTestId('step-3')).not.toBeNull()
    expect(porTestId('error-commissionPercent')?.textContent).toBe('La comisión no puede pasar de 100.')
    expect(document.activeElement).toBe(porTestId('comision'))
    const [titulo, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(titulo).toBe('inmobiliaria.consignaciones.wizard.toasts.mandateErrorTitle')
    expect(opciones.description).toContain('sólo se crea la consignación')
    expect(pushMock).not.toHaveBeenCalled()

    for (let i = 0; i < 8 && !hayBoton(CONFIRMAR_CONSIGNACION); i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    // Sin volver a preguntar por las fotos: el inmueble ya existe.
    await clickButton(findButtonByText(CONFIRMAR_CONSIGNACION))

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(consignacionesApiMock.create).toHaveBeenCalledTimes(2)
    expect(consignacionesApiMock.create.mock.calls[1][0].propertyId).toBe('property-1')
    expect(propertiesApiMock.update).toHaveBeenCalledWith('property-1', { status: 'AVAILABLE' })
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inmuebles')
  })

  it('un 5xx del mandato dice «de nuestro lado» con la referencia y que el inmueble ya está', async () => {
    consignacionesApiMock.create.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'cafe1234' }),
    )
    await llegarAlFinal()
    await enviar()

    const [, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(opciones.description).toMatch(/No pudimos crear la consignación: algo falló de nuestro lado/)
    expect(opciones.description).toContain('cafe1234')
    expect(opciones.description).toContain('El inmueble ya quedó creado')
  })

  it('publicar con un 5xx: el motivo trae la referencia, no el texto crudo', async () => {
    propertiesApiMock.update.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'feed0001' }),
    )
    await llegarAlFinal()
    await enviar()

    const [titulo, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(titulo).toBe('inmobiliaria.consignaciones.wizard.toasts.publishErrorTitle')
    expect(opciones.description).toContain('No pudimos publicarlo: algo falló de nuestro lado')
    expect(opciones.description).toContain('feed0001')
    expect(opciones.description).not.toContain('Error interno del servidor')
  })

  describe('el dueño nuevo, al pasar del paso 1', () => {
    beforeEach(() => {
      stepOneOverridesHolder.overrides = {
        propietarioId: 'new-123',
        duenoPendienteId: 'new-123',
        newPropietarioData: { name: 'Ana Pérez', documentNumber: '123' },
      }
    })

    it('un 400 con campos va al campo del dueño, no a un toast genérico', async () => {
      propietariosApiMock.create.mockRejectedValueOnce(
        errorDeCampos([{ campo: 'email', mensaje: 'Revisa el correo: debe tener la forma nombre@dominio.com.' }]),
      )
      await renderWizard(AGENTE_LIST)
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))

      expect(porTestId('step-1')).not.toBeNull()
      const error = porTestId('error-del-dueno')
      expect(error?.dataset.campo).toBe('email')
      expect(error?.textContent).toBe('Revisa el correo: debe tener la forma nombre@dominio.com.')
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('sin respuesta: habla de la conexión y no avanza', async () => {
      propietariosApiMock.create.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await renderWizard(AGENTE_LIST)
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))

      expect(porTestId('step-1')).not.toBeNull()
      const [, opciones] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(opciones.description).toMatch(/conexión/)
    })
  })
})

/*
 * 🔴 QA con avatares (04-10): el inventario del paso «Acta de entrega» se
 * escribía y se perdía al crear (nunca viajaba), y después el contrato no se
 * podía crear. Ahora va a la consignación recién creada.
 */
describe('<ConsignacionWizard> — el inventario del paso 5 se guarda', () => {
  async function hastaElFinal() {
    await renderWizard(AGENTE_LIST)
    for (let i = 0; i < 5; i++) {
      await clickButton(findButtonByText('inmobiliaria.consignaciones.wizard.next'))
    }
    await enviar()
  }

  it('con ítems, los guarda en la consignación creada (sin los renglones vacíos)', async () => {
    stepFivePhotosHolder.inventoryItems = [
      { id: 'item-1', name: 'Nevera', quantity: 1, condition: 'good' },
      { id: 'item-2', name: '   ', quantity: 1, condition: 'good' },
    ]
    await hastaElFinal()
    expect(consignacionesApiMock.actualizarInventario).toHaveBeenCalledWith('consignacion-1', [
      { id: 'item-1', name: 'Nevera', quantity: 1, condition: 'good' },
    ])
  })

  it('sin ítems no llama a nadie', async () => {
    await hastaElFinal()
    expect(consignacionesApiMock.actualizarInventario).not.toHaveBeenCalled()
  })

  it('si el inventario no se guarda, lo dice y la consignación sigue creada', async () => {
    stepFivePhotosHolder.inventoryItems = [{ id: 'item-1', name: 'Nevera', quantity: 1, condition: 'good' }]
    consignacionesApiMock.actualizarInventario.mockRejectedValue(new Error('500'))
    await hastaElFinal()
    expect(toast.warning).toHaveBeenCalledWith(
      'inmobiliaria.consignaciones.wizard.toasts.inventoryErrorTitle',
      expect.objectContaining({ description: 'inmobiliaria.consignaciones.wizard.toasts.inventoryErrorDesc' }),
    )
    expect(pushMock).toHaveBeenCalled()
  })
})
