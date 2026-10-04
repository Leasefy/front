/**
 * /aplicar/[propertyId] — antes de los cinco pasos, ¿puede postularse?
 * (QA-IA-A, 04-10-2026, medido en el laboratorio).
 *
 * Una persona con sesión y SIN estudio llenaba los cinco pasos y al enviar
 * recibía un 409 que decía «An error occurred». Sin cuenta, la postulación de
 * invitado entraba sin estudio ni documentos (F-08: «NUNCA se postula sin el
 * estudio»). Ahora el asistente dice lo mismo que el botón de la ficha.
 */

import * as React from 'react'
import { act, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

const { elegibilidadMock, auth, aprobacionLocal } = vi.hoisted(() => ({
  elegibilidadMock: vi.fn(),
  auth: { isAuthenticated: true, isLoading: false },
  aprobacionLocal: { aprobacion: null as unknown, cargando: false, vigente: false },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/aplicar/prop-1',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/hooks/useProperties', () => ({
  useProperty: () => ({
    property: { id: 'prop-1', title: 'Apto', monthlyRent: 1_400_000, status: 'available', listingType: 'rent' },
    isLoading: false,
    error: null,
    errorCrudo: null,
  }),
}))
vi.mock('@/lib/hooks/use-postulacion-directa', () => ({
  usePostulacionDirecta: () => ({ cargando: false, prefillDirecto: null, consentText: null }),
}))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => auth }))
vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => ({ ...aprobacionLocal, error: null, recargar: () => {} }),
}))
vi.mock('@/lib/api/client', async (importar) => {
  const real = await importar<typeof import('@/lib/api/client')>()
  return { ...real, apiClient: { get: (...a: unknown[]) => elegibilidadMock(...a) }, getAccessToken: () => 'x' }
})
vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: { getMine: () => Promise.resolve([]), withdraw: vi.fn() },
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children, ...p }: { children: React.ReactNode; 'data-testid'?: string }) => <div data-testid={p['data-testid']}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/wizard/WizardShell', () => ({ WizardShell: () => <div data-testid="asistente" /> }))
vi.mock('@/components/wizard/steps/StepPersonal', () => ({ StepPersonal: () => null }))
vi.mock('@/components/wizard/steps/StepEmployment', () => ({ StepEmployment: () => null }))
vi.mock('@/components/wizard/steps/StepIncome', () => ({ StepIncome: () => null }))
vi.mock('@/components/wizard/steps/StepDocuments', () => ({ StepDocuments: () => null }))
vi.mock('@/components/wizard/steps/StepReview', () => ({ StepReview: () => null }))
vi.mock('@/components/tenant/PostulacionDirecta', () => ({ PostulacionDirecta: () => null }))
vi.mock('@/components/tenant/PostulacionEnviadaModal', () => ({ PostulacionEnviadaModal: () => null }))
vi.mock('@/lib/context/ApplicationContext', () => ({
  ApplicationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApplication: () => ({ application: { status: 'draft', personal: {} }, currentStep: 1, isGuestSubmission: false }),
}))

import AplicarPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  elegibilidadMock.mockReset()
  auth.isAuthenticated = true
  auth.isLoading = false
  aprobacionLocal.aprobacion = null
  aprobacionLocal.cargando = false
  aprobacionLocal.vigente = false
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function abrir() {
  const params = Promise.resolve({ propertyId: 'prop-1' })
  await act(async () => {
    root.render(
      <Suspense fallback={null}>
        <AplicarPage params={params} />
      </Suspense>,
    )
    await new Promise((r) => setTimeout(r, 0))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

const texto = () => container.textContent ?? ''
const hayAsistente = () => !!container.querySelector('[data-testid="asistente"]')

describe('/aplicar — antes de los cinco pasos (QA-IA-A)', () => {
  it('🔴 con sesión y SIN estudio explica qué falta y NO abre el asistente', async () => {
    elegibilidadMock.mockResolvedValue({ apto: false, motivo: 'SIN_ESTUDIO', topeAprobadoCop: null, elegibleHasta: null })
    await abrir()
    expect(elegibilidadMock).toHaveBeenCalledWith('/pre-scoring/elegibilidad')
    expect(texto()).toContain('Antes de postularte')
    expect(container.querySelector('a[href="/aprobacion"]')).toBeTruthy()
    expect(hayAsistente()).toBe(false)
  })

  it('con el estudio vencido dice que hay que renovarlo', async () => {
    elegibilidadMock.mockResolvedValue({ apto: false, motivo: 'ESTUDIO_VENCIDO', topeAprobadoCop: 2_200_000, elegibleHasta: null })
    await abrir()
    expect(texto()).toContain('Tu aprobación venció')
    expect(hayAsistente()).toBe(false)
  })

  it('con el estudio vigente abre el asistente', async () => {
    elegibilidadMock.mockResolvedValue({ apto: true, motivo: 'OK', topeAprobadoCop: 3_200_000, elegibleHasta: null })
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(texto()).not.toContain('Antes de postularte')
  })

  it('si no se puede saber (falla la lectura), no bloquea: el back cuida la puerta al enviar', async () => {
    elegibilidadMock.mockRejectedValue(new Error('caído'))
    await abrir()
    expect(hayAsistente()).toBe(true)
  })

  it('🔴 sin sesión y sin aprobación ofrece entrar o conocer el tope, en vez de postular como invitado', async () => {
    auth.isAuthenticated = false
    aprobacionLocal.aprobacion = { estado: 'sin_estudio', topeAprobadoCop: null, vigenteHasta: null }
    await abrir()
    expect(texto()).toContain('¿Ya tienes cuenta en Leasefy?')
    expect(hayAsistente()).toBe(false)
    expect(elegibilidadMock).not.toHaveBeenCalled()
  })
})
