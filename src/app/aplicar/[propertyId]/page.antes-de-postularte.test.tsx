/**
 * /aplicar/[propertyId] — el estudio se OFRECE, no se exige.
 *
 * 🔴 Nico (04-10-2026): «el estudio es opcional, no es obligatorio». Reemplaza
 * F-08 y lo que se hizo la noche del 04-10 (QA-IA-A, PO-01/PO-02): hasta ese
 * día una persona sin estudio (con sesión o sin cuenta) veía «Antes de
 * postularte» y NO llegaba al asistente. Ahora llega siempre, por cualquier
 * puerta, y encima del primer paso se le ofrece el estudio como algo que la
 * ayuda («con tu estudio la inmobiliaria responde más rápido»).
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
vi.mock('@/components/wizard/WizardShell', () => ({
  WizardShell: ({ children }: { children: React.ReactNode }) => <div data-testid="asistente">{children}</div>,
}))
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

describe('/aplicar — el estudio es opcional (Nico, 04-10-2026)', () => {
  const oferta = () => container.querySelector('[data-testid="oferta-del-estudio"]')

  it('🔴 con sesión y SIN estudio abre el asistente y le OFRECE el estudio, sin frenarlo', async () => {
    elegibilidadMock.mockResolvedValue({ apto: false, motivo: 'SIN_ESTUDIO', topeAprobadoCop: null, elegibleHasta: null })
    await abrir()
    expect(elegibilidadMock).toHaveBeenCalledWith('/pre-scoring/elegibilidad')
    expect(hayAsistente()).toBe(true)
    expect(texto()).not.toContain('Antes de postularte')
    expect(oferta()?.getAttribute('data-oferta')).toBe('sin_estudio')
    expect(texto()).toContain('Con tu estudio la inmobiliaria responde más rápido')
    expect(texto()).toContain('No es obligatorio para postularte')
    expect(container.querySelector('a[href="/aprobacion"]')).toBeTruthy()
  })

  it('con el estudio vencido: asistente + «renovar» como ayuda', async () => {
    elegibilidadMock.mockResolvedValue({ apto: false, motivo: 'ESTUDIO_VENCIDO', topeAprobadoCop: 2_200_000, elegibleHasta: null })
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(oferta()?.getAttribute('data-oferta')).toBe('vencido')
    expect(texto()).toContain('Puedes postularte igual')
  })

  it('con el estudio en curso: asistente + «puedes postularte ya»', async () => {
    elegibilidadMock.mockResolvedValue({ apto: false, motivo: 'ESTUDIO_EN_CURSO', topeAprobadoCop: null, elegibleHasta: null })
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(oferta()?.getAttribute('data-oferta')).toBe('en_curso')
  })

  it('con el estudio vigente abre el asistente sin ofrecer nada', async () => {
    elegibilidadMock.mockResolvedValue({ apto: true, motivo: 'OK', topeAprobadoCop: 3_200_000, elegibleHasta: null })
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(oferta()).toBeNull()
  })

  it('si no se puede saber (falla la lectura), abre el asistente sin inventarle un estado', async () => {
    elegibilidadMock.mockRejectedValue(new Error('caído'))
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(oferta()).toBeNull()
  })

  it('🔴 sin sesión y sin aprobación: se postula como invitado, y se le ofrece entrar o conocer su respaldo', async () => {
    auth.isAuthenticated = false
    aprobacionLocal.aprobacion = { estado: 'sin_estudio', topeAprobadoCop: null, vigenteHasta: null }
    await abrir()
    expect(hayAsistente()).toBe(true)
    expect(oferta()?.getAttribute('data-oferta')).toBe('sin_sesion')
    expect(texto()).toContain('Puedes postularte sin cuenta y sin estudio')
    expect(container.querySelector('a[href^="/auth?returnUrl="]')).toBeTruthy()
    expect(elegibilidadMock).not.toHaveBeenCalled()
  })
})
