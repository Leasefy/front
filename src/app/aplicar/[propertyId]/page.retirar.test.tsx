/**
 * /aplicar/[propertyId] — «Retirar y volver a postular» avisa cuando falla
 * (02-10-2026).
 *
 * Antes el `catch` sólo apagaba el spinner: la persona tocaba el botón, no
 * pasaba nada y no sabía por qué. Ahora se dice el motivo, con la regla de
 * oro del traductor.
 */

import * as React from 'react'
import { act, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

const { getMineMock, withdrawMock } = vi.hoisted(() => ({ getMineMock: vi.fn(), withdrawMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/aplicar/prop-1',
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/hooks/useProperties', () => ({
  useProperty: () => ({
    property: { id: 'prop-1', title: 'Apto', monthlyRent: 2_000_000, status: 'available', listingType: 'rent' },
    isLoading: false,
    error: null,
    errorCrudo: null,
  }),
}))
vi.mock('@/lib/hooks/use-postulacion-directa', () => ({
  usePostulacionDirecta: () => ({ cargando: false, prefillDirecto: null, consentText: null }),
}))
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}))
vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    getMine: (...a: unknown[]) => getMineMock(...a),
    withdraw: (...a: unknown[]) => withdrawMock(...a),
  },
}))
// Lo que no se pinta en esta prueba (el asistente) no se carga de verdad.
vi.mock('@/components/wizard/WizardShell', () => ({ WizardShell: () => null }))
vi.mock('@/components/wizard/steps/StepPersonal', () => ({ StepPersonal: () => null }))
vi.mock('@/components/wizard/steps/StepEmployment', () => ({ StepEmployment: () => null }))
vi.mock('@/components/wizard/steps/StepIncome', () => ({ StepIncome: () => null }))
vi.mock('@/components/wizard/steps/StepDocuments', () => ({ StepDocuments: () => null }))
vi.mock('@/components/wizard/steps/StepReview', () => ({ StepReview: () => null }))
vi.mock('@/components/tenant/PostulacionDirecta', () => ({ PostulacionDirecta: () => null }))
vi.mock('@/components/tenant/PostulacionEnviadaModal', () => ({ PostulacionEnviadaModal: () => null }))

import { ApiError } from '@/lib/api/client'
import AplicarPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  getMineMock.mockReset()
  withdrawMock.mockReset()
  getMineMock.mockResolvedValue([{ id: 'app-1', propertyId: 'prop-1', status: 'submitted' }])
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function retirar() {
  const params = Promise.resolve({ propertyId: 'prop-1' })
  await act(async () => {
    root.render(
      <Suspense fallback={null}>
        <AplicarPage params={params} />
      </Suspense>,
    )
    await new Promise((r) => setTimeout(r, 0))
  })
  const boton = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Retirar y volver a postular'),
  ) as HTMLButtonElement
  expect(boton).toBeTruthy()
  await act(async () => {
    boton.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

const aviso = () => container.querySelector('[role="alert"]')?.textContent ?? ''

describe('/aplicar — retirar la postulación (02-10-2026)', () => {
  it('🔴 si el back no la deja retirar, lo dice (antes no pasaba nada)', async () => {
    withdrawMock.mockRejectedValue(
      new ApiError(409, 'Tu postulación ya fue aprobada: no se puede retirar desde aquí.', 'ESTADO_INVALIDO'),
    )
    await retirar()
    expect(aviso()).toBe('Tu postulación ya fue aprobada: no se puede retirar desde aquí.')
  })

  it('un 5xx dice que fue nuestro, con la referencia', async () => {
    withdrawMock.mockRejectedValue(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    await retirar()
    expect(aviso()).toMatch(/^No pudimos retirar tu postulación: algo falló de nuestro lado/)
    expect(aviso()).toContain('ab12cd34')
  })

  it('sin respuesta: habla de la conexión', async () => {
    withdrawMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await retirar()
    expect(aviso()).toMatch(/conexión/)
  })
})
