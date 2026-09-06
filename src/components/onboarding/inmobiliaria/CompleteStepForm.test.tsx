import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { CompleteStepForm, RUTA_DEL_PANEL, resumenDelRegistro } from './CompleteStepForm'
import { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import type { OnboardingSessionStepConflict } from '@/lib/api/generated/agency'

/**
 * El paso ya no navega a la URL ABSOLUTA que devuelve el servidor
 * (`dashboardUrl`): navega a una ruta propia con el router. Ver el comentario
 * de `handleFinish` — con `FRONTEND_URL` desalineada, esa URL absoluta dejaba
 * al usuario recién registrado en `chrome-error://`.
 */
const routerReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn(), refresh: vi.fn() }),
}))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  routerReplace.mockClear()
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

function render(props: Partial<React.ComponentProps<typeof CompleteStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof CompleteStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    error: null,
    onNavigateToStep: vi.fn(),
    ...props,
  }
  act(() => {
    root.render(<CompleteStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byTestId(testId: string): HTMLElement {
  const el = container.querySelector(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element with data-testid="${testId}" not found`)
  return el as HTMLElement
}

async function clickFinish() {
  const btn = byTestId('complete-step-finish') as HTMLButtonElement
  await act(async () => {
    btn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<CompleteStepForm>', () => {
  it('(a) 🔴 al terminar navega a una ruta RELATIVA propia, nunca al `dashboardUrl` absoluto del servidor', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      tenantId: 'tenant-1',
      agencyId: 'agency-1',
      sessionId: 'sess-1',
      status: 'COMPLETED',
      // Lo que devolvía el servidor en la auditoría: otro puerto, y el front
      // caía en ERR_CONNECTION_REFUSED tres veces.
      dashboardUrl: 'http://localhost:3001/panel/inmobiliaria?agencyId=tenant-1',
    })
    render({ onSubmit })

    await clickFinish()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledTimes(1)
    const destino = routerReplace.mock.calls[0]?.[0] as string
    expect(destino).toBe(RUTA_DEL_PANEL)
    // Ni el origen del servidor ni el `?agencyId=` que no hace falta.
    expect(destino).not.toContain('localhost:3001')
    expect(destino).not.toContain('http')
    expect(destino).not.toContain('agencyId')
  })

  it('no navega si `/complete` no devolvió nada', async () => {
    render({ onSubmit: vi.fn().mockResolvedValue(null) })
    await clickFinish()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('🔴 muestra el resumen de lo cargado: «revisa que todo esté en orden» sin nada que revisar no significa nada', () => {
    render({
      draft: {
        legalName: 'Inmobiliaria Altavista S.A.S.',
        nit: '900123456-8',
        address: { calle: 'Cra 43A # 1-50', ciudad: 'Medellín', departamento: 'Antioquia' },
        primaryContactEmail: 'hola@altavista.co',
        primaryContactPhone: '3105551234',
        members: [{ email: 'a@x.co' }, { email: 'b@x.co' }],
      },
    })

    const resumen = byTestId('complete-step-resumen')
    expect(resumen.textContent).toContain('Inmobiliaria Altavista S.A.S.')
    expect(resumen.textContent).toContain('900123456-8')
    expect(resumen.textContent).toContain('Cra 43A # 1-50')
    expect(resumen.textContent).toContain('Medellín, Antioquia')
    expect(resumen.textContent).toContain('hola@altavista.co')
    expect(resumen.textContent).toContain('3105551234')
    expect(resumen.textContent).toContain('2 personas')
  })

  it('sin nada que revisar no promete una revisión: no pinta el resumen y cambia el texto', () => {
    render({ draft: null })

    expect(container.querySelector('[data-testid="complete-step-resumen"]')).toBeFalsy()
    expect(container.textContent).not.toContain('Revisa que todo esté en orden')
  })

  it('(b) 409 with missingSteps — shows the mapped labels and a button to go to the first missing step', () => {
    // Runtime shape for /complete's 409 is a union — this branch has `missingSteps`,
    // not `requiredStep`, even though the service types `.conflict` as `OnboardingSessionStepConflict`.
    const error = new OnboardingSessionError('conflict', 409, 'Faltan pasos.', {
      error: 'Faltan pasos.',
      missingSteps: ['policy', 'members'],
    } as unknown as OnboardingSessionStepConflict)
    const onNavigateToStep = vi.fn()
    render({ error, onNavigateToStep })

    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeFalsy()
    const missing = byTestId('complete-step-missing')
    expect(missing.textContent).toContain('Miembros')
    expect(missing.textContent).toContain('Política')

    const goBtn = byTestId('complete-step-go-to-missing') as HTMLButtonElement
    act(() => {
      goBtn.click()
    })
    // Order-independent of the raw missingSteps array — wizard order says members before policy.
    expect(onNavigateToStep).toHaveBeenCalledWith('members')
  })

  it('(c) 409 defensive — requiredStep without missingSteps still works, navigates to that step', () => {
    const error = new OnboardingSessionError('conflict', 409, 'Conflicto de sesión.', {
      error: 'Conflicto de sesión.',
      requiredStep: 'payment_provider',
    })
    const onNavigateToStep = vi.fn()
    render({ error, onNavigateToStep })

    const missing = byTestId('complete-step-missing')
    expect(missing.textContent).toContain('Medio de pago')

    const goBtn = byTestId('complete-step-go-to-missing') as HTMLButtonElement
    act(() => {
      goBtn.click()
    })
    expect(onNavigateToStep).toHaveBeenCalledWith('payment_provider')
  })

  it('(d) other error kinds render nothing special here — the parent already shows the generic banner', () => {
    const error = new OnboardingSessionError('unavailable', 503, 'El servicio no está disponible.')
    render({ error })

    expect(container.querySelector('[data-testid="complete-step-missing"]')).toBeFalsy()
    expect(container.querySelector('[data-testid="complete-step-form"]')).toBeTruthy()
  })
})

describe('resumenDelRegistro', () => {
  it('un draft vacío, nulo o con formas raras no inventa líneas', () => {
    expect(resumenDelRegistro(null)).toEqual([])
    expect(resumenDelRegistro(undefined)).toEqual([])
    expect(resumenDelRegistro({})).toEqual([])
    expect(resumenDelRegistro({ legalName: '   ', nit: 42, address: 'no es objeto' })).toEqual([])
  })

  it('cae a las claves del arranque del asistente cuando las del paso Agencia no están', () => {
    const lineas = resumenDelRegistro({
      proposedAgencyName: 'Altavista',
      contactEmail: 'hola@altavista.co',
      contactPhone: '3105551234',
    })
    expect(lineas).toEqual([
      { etiqueta: 'Razón social', valor: 'Altavista' },
      { etiqueta: 'Correo de contacto', valor: 'hola@altavista.co' },
      { etiqueta: 'Teléfono', valor: '3105551234' },
    ])
  })

  it('una sola persona invitada se dice en singular; ninguna no se menciona', () => {
    expect(resumenDelRegistro({ members: [{ email: 'a@x.co' }] })).toEqual([
      { etiqueta: 'Equipo invitado', valor: '1 persona' },
    ])
    expect(resumenDelRegistro({ members: [] })).toEqual([])
  })
})
