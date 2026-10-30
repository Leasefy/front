/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let estadoSuscripcion: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' = 'ACTIVE'
const refetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { firstName: 'Laura' }, agency: { name: 'Inmo' }, refreshAgency: vi.fn() }),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: true, canAccess: () => true }),
}))
vi.mock('@/lib/hooks/useAgencySubscription', () => ({
  useAgencySubscription: () => ({
    state: { subscription: { status: estadoSuscripcion, planTier: 'PRO' }, openCharge: null },
    subscriptionStatus: estadoSuscripcion,
    hasPanelAccess: estadoSuscripcion !== 'SUSPENDED' && estadoSuscripcion !== 'CANCELLED',
    refetch,
  }),
}))
vi.mock('@/lib/hooks/useAgencyCheckout', () => ({
  useAgencyCheckout: () => ({ state: 'idle', error: null, paymentUrl: null, pay: vi.fn(), resume: vi.fn(), reset: vi.fn(), verifyNow: vi.fn() }),
}))
vi.mock('@/lib/api/conversion.service', () => ({
  conversionApi: {
    accesoDeLaInmobiliaria: () =>
      Promise.resolve({
        estado: 'cliente',
        veTodo: true,
        faltaActivar: false,
        prueba: null,
        cotizacion: { tier: 'PRO', nombre: 'Pro', monto: 99000, porInmueble: true, inmuebles: 3, usuarios: 2 },
      }),
  },
}))
vi.mock('@/components/inmobiliaria/AgencyCheckoutOverlay', () => ({ AgencyCheckoutOverlay: () => null }))
vi.mock('@/components/inmobiliaria/plan/RecargasDePreguntas', () => ({ RecargasDePreguntas: () => null }))
vi.mock('./RecargasDePreguntas', () => ({ RecargasDePreguntas: () => null }))
vi.mock('@/components/refiere-y-gana/RefiereYGana', () => ({ TarjetaDeRefiereYGana: () => null }))
vi.mock('@/components/conversion/EscenaDeMarca', () => ({ BeneficiosEn3D: () => null, ChipDelAliado: () => null }))
vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }))

import { PagarLeasefy } from './PagarLeasefy'

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  await act(async () => {
    raiz.render(<PagarLeasefy />)
  })
  await act(async () => {})
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

describe('PagarLeasefy con la suscripción suspendida', () => {
  it.each(['SUSPENDED', 'CANCELLED'] as const)('%s + cliente: ofrece pagar y no dice que ya tiene todo', async (estado) => {
    estadoSuscripcion = estado
    await montar()
    expect(contenedor.querySelector('[data-testid="pagar-el-plan"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-testid="ya-tienes-todo"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('Tienes Leasefy completo')
    expect(contenedor.textContent).toContain('Hablar con Leasefy')
    expect(contenedor.querySelector('[data-testid="estado-del-plan"]')?.textContent).toMatch(/suspendid|pendiente/i)
  })

  it('ACTIVE + cliente: sigue igual (ya tiene todo, sin botón de pago)', async () => {
    estadoSuscripcion = 'ACTIVE'
    await montar()
    expect(contenedor.querySelector('[data-testid="ya-tienes-todo"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-testid="pagar-el-plan"]')).toBeNull()
    expect(contenedor.textContent).toContain('Tienes Leasefy completo')
  })
})
