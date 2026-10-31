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
        cotizacion: {
          tier: 'PRO',
          nombre: 'Pro',
          monto: 99000,
          porInmueble: true,
          inmuebles: 3,
          usuarios: 2,
          desglose: { plan: 99000, usuariosDeMas: 0, usuariosAdicionales: 0, piloto: 0, conPilotoAutomatico: false },
        },
      }),
  },
}))
let tarifasFallan = false
vi.mock('@/lib/api/tarifas.service', () => ({
  tarifasApi: {
    ver: () =>
      tarifasFallan
        ? Promise.reject(new Error('caído'))
        : Promise.resolve({
            vigente: true,
            estudioDelInquilinoGratis: true,
            ejemplos: [],
            tarifas: {
              plan: { porInmueble: 2100, minimoMensual: 99000, usuariosIncluidos: 2, usuarioAdicional: 20000, preguntasIncluidas: 50 },
              cuentaGratis: { preguntas: 5 },
              recargas: [{ preguntas: 50, precio: 29000 }],
              recargaDuraMeses: 12,
              pilotoAutomatico: { porInmueble: 900, pruebaDias: 30 },
              laura: { exitoBps: 800 },
              estudioDelInquilino: { precio: 21000 },
              avaluo: { precioConIva: 50000 },
              recaudo: { porPago: 1250 },
              propietariosSinInmobiliaria: { gestionBps: 500 },
              implementacion: { conLeasefy: 1000000 },
              firmas: { porDocumento: 3900, firmantesPorDocumento: 5, gratisAlCrearLaCuenta: 3, paquetes: [{ firmas: 10, precio: 29000 }], duranMeses: 12 },
            },
          }),
    tasasDeCambio: () => Promise.resolve({ disponible: false }),
  },
}))
// El Piloto en «Tu plan» habla con el micro: se prueba aparte (piloto-y-renovacion.test.ts).
vi.mock('./PilotoEnTuPlan', () => ({ PilotoEnTuPlan: () => null }))
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

describe('PagarLeasefy: todo el modelo de negocio (Nico, 30-10-2026)', () => {
  it('muestra la cuenta del mes, lo gratis con el chat y las firmas, y lo que se cobra aparte', async () => {
    estadoSuscripcion = 'SUSPENDED'
    tarifasFallan = false
    await montar()
    const texto = (contenedor.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(contenedor.querySelector('[data-testid="cuenta-plan"]')?.textContent).toContain('El mínimo del plan')
    expect(contenedor.querySelector('[data-testid="cuenta-preguntas"]')?.textContent).toContain('50 preguntas al chat cada mes')
    expect(texto).toContain('El chat, con 5 preguntas gratis para probarlo')
    expect(texto).toContain('3 firmas electrónicas gratis para empezar')
    expect(contenedor.querySelector('[data-testid="precio-mori"]')?.textContent).toContain('8 % de lo recuperado')
    expect(contenedor.querySelector('[data-testid="precio-implementacion"]')).not.toBeNull()
  })

  it('si las tarifas no cargan, se puede pagar igual y la sección dice qué pasó', async () => {
    estadoSuscripcion = 'SUSPENDED'
    tarifasFallan = true
    await montar()
    expect(contenedor.querySelector('[data-testid="pagar-el-plan"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-testid="precios-de-leasefy"]')?.textContent).toContain('No pudimos cargar')
    expect(contenedor.querySelector('[data-testid="precios-de-leasefy"]')?.textContent).toContain('Intentar de nuevo')
    tarifasFallan = false
  })
})
