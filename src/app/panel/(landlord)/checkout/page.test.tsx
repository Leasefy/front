/**
 * page.test.tsx — Checkout del plan del propietario.
 *
 * 🔴 Hasta el 23-09, «Pagar ahora» mandaba a `/pse-mock?planId=…&amount=…`:
 * una página PÚBLICA que simulaba el banco con nuestra marca y tomaba el plan
 * y el MONTO de la URL —una plantilla lista para suplantar un cobro de
 * Leasefy—. Y ni siquiera servía: en producción el back rechaza ese riel
 * simulado (503), así que el propietario nunca lograba pagar.
 *
 * Ahora el checkout pide los datos del pagador acá mismo y llama al PSE real
 * (`POST /subscriptions/pse/checkout`); el monto lo calcula el back, y el
 * navegador se va a la URL del banco que devuelve Wompi.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { routerPush, startPseCheckout, getPlans, getFinancialInstitutions, puedePagar, estadoDelPago, barra } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  startPseCheckout: vi.fn(),
  getPlans: vi.fn(),
  getFinancialInstitutions: vi.fn(),
  puedePagar: vi.fn(),
  estadoDelPago: vi.fn(),
  barra: { query: 'plan=pro&billing=monthly' },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(barra.query),
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, v?: Record<string, unknown>) => (v ? `${k} ${JSON.stringify(v)}` : k),
  }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { email: 'propietario@correo.co' } }),
}))

vi.mock('@/lib/api/subscriptions.service', () => ({
  subscriptionsApi: {
    getPlans,
    startPseCheckout,
    puedePagarElPlanDelPropietario: puedePagar,
    estadoDelPagoPse: estadoDelPago,
  },
}))

vi.mock('@/lib/api/pse-checkout.service', () => ({
  pseCheckoutApi: { getFinancialInstitutions },
}))

vi.mock('@/components/pricing', () => ({
  CouponInput: () => null,
  PriceSummary: () => null,
}))

vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }))

vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  RadioCardGroup: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  RadioCard: ({ label, badge }: { label?: React.ReactNode; badge?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'ciclo' }, label, badge),
}))

// Radix Select no se deja manejar en happy-dom: lo reemplazamos por un
// <select> nativo con la misma forma de uso (value + onValueChange).
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<{ value: string; onValueChange: (v: string) => void; id?: string }>({
    value: '',
    onValueChange: () => {},
  })
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) =>
      React.createElement(Ctx.Provider, { value: { value, onValueChange } }, children),
    SelectTrigger: ({ id }: { id?: string }) => {
      const ctx = React.useContext(Ctx)
      return React.createElement('span', { 'data-trigger': id, 'data-value': ctx.value })
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      const ctx = React.useContext(Ctx)
      return React.createElement(
        'select',
        { value: ctx.value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => ctx.onValueChange(e.target.value) },
        React.createElement('option', { value: '' }, ''),
        children,
      )
    },
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
      React.createElement('option', { value }, children),
  }
})

import CheckoutPage from './page'

let host: HTMLDivElement
let root: Root
const assign = vi.fn()
const locationOriginal = window.location

async function flush() {
  for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve() })
}

function escribir(input: HTMLInputElement | HTMLSelectElement, valor: string) {
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}

function botonDePagar(): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll('button')).find((x) =>
    x.textContent?.includes('landlord.checkout.payNow'),
  )
  if (!b) throw new Error('no está el botón de pagar')
  return b as HTMLButtonElement
}

beforeEach(async () => {
  routerPush.mockReset()
  startPseCheckout.mockReset()
  // Lo que cobra el back (seed-plans): NO las cifras que tenía el front.
  getPlans.mockResolvedValue([
    { id: 'plan-uuid-pro', tier: 'PRO', monthlyPrice: 149_000, annualPrice: 1_430_000 },
  ])
  puedePagar.mockReset()
  puedePagar.mockResolvedValue({ puede: true, code: null, motivo: null })
  estadoDelPago.mockReset()
  barra.query = 'plan=pro&billing=monthly'
  getFinancialInstitutions.mockResolvedValue([
    { financial_institution_code: '1007', financial_institution_name: 'BANCOLOMBIA' },
  ])
  assign.mockReset()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...locationOriginal, assign },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(CheckoutPage))
  })
  await flush()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal })
})

describe('checkout del plan del propietario', () => {
  it('no deja pagar sin los datos del pagador', () => {
    expect(botonDePagar().disabled).toBe(true)
  })

  it('paga por el PSE real, sin mandar el monto, y se va a la URL del banco — nunca a /pse-mock', async () => {
    startPseCheckout.mockResolvedValue({
      subscriptionId: 's1',
      subscriptionPaymentId: 'p1',
      wompiTransactionId: 'tx1',
      asyncPaymentUrl: 'https://banco.example/pse/tx1',
      status: 'PENDING_PAYMENT',
    })

    const selects = host.querySelectorAll('select')
    // [0] banco, [1] tipo de persona, [2] tipo de documento
    escribir(selects[0], '1007')
    escribir(host.querySelector<HTMLInputElement>('#pse-documento')!, '1234567890')
    escribir(host.querySelector<HTMLInputElement>('#pse-nombre')!, 'Ana Pérez')

    expect(host.querySelector<HTMLInputElement>('#pse-correo')!.value).toBe('propietario@correo.co')
    expect(botonDePagar().disabled).toBe(false)

    await act(async () => {
      botonDePagar().click()
    })
    await flush()

    expect(startPseCheckout).toHaveBeenCalledTimes(1)
    const dto = startPseCheckout.mock.calls[0][0]
    expect(dto).toEqual({
      planId: 'plan-uuid-pro',
      cycle: 'MONTHLY',
      userType: 'NATURAL',
      legalIdType: 'CC',
      legalId: '1234567890',
      financialInstitutionCode: '1007',
      email: 'propietario@correo.co',
      fullName: 'Ana Pérez',
    })
    expect(dto).not.toHaveProperty('amount')
    expect(assign).toHaveBeenCalledWith('https://banco.example/pse/tx1')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('si el banco no devolvió el enlace, lo dice y no navega', async () => {
    startPseCheckout.mockResolvedValue({
      subscriptionId: 's1',
      subscriptionPaymentId: 'p1',
      wompiTransactionId: 'tx1',
      asyncPaymentUrl: null,
      status: 'PENDING_PAYMENT',
    })
    const selects = host.querySelectorAll('select')
    escribir(selects[0], '1007')
    escribir(host.querySelector<HTMLInputElement>('#pse-documento')!, '1234567890')
    escribir(host.querySelector<HTMLInputElement>('#pse-nombre')!, 'Ana Pérez')

    await act(async () => {
      botonDePagar().click()
    })
    await flush()

    expect(assign).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('landlord.checkout.bankLinkMissing')
  })

  it('🔴 los precios son los que cobra el back, no los del front (QA 23-09)', () => {
    const texto = Array.from(host.querySelectorAll('[data-testid="ciclo"]')).map((c) => c.textContent).join(' | ')
    expect(texto).toContain('149.000')
    expect(texto).toContain('1.430.000')
    expect(texto).not.toContain('149.900')
    expect(texto).not.toContain('1.439.000')
    // El -20 % también sale de esas cifras, no de un texto fijo.
    expect(texto).toContain('landlord.checkout.yearlySaving {"percent":20}')
  })
})

describe('🔴 con el panel del propietario independiente en pausa (QA 23-09)', () => {
  async function montarEnPausa() {
    act(() => root.unmount())
    puedePagar.mockResolvedValue({
      puede: false,
      code: 'PANEL_PROPIETARIO_INDEPENDIENTE_CONGELADO',
      motivo: 'El panel del propietario independiente está en pausa.',
    })
    root = createRoot(host)
    await act(async () => {
      root.render(React.createElement(CheckoutPage))
    })
    await flush()
  }

  it('no ofrece pagar: el botón queda apagado con el porqué, aunque los datos estén completos', async () => {
    await montarEnPausa()
    const selects = host.querySelectorAll('select')
    escribir(selects[0], '1007')
    escribir(host.querySelector<HTMLInputElement>('#pse-documento')!, '1234567890')
    escribir(host.querySelector<HTMLInputElement>('#pse-nombre')!, 'Ana Pérez')

    expect(botonDePagar().disabled).toBe(true)
    expect(host.querySelector('[data-testid="checkout-en-pausa"]')?.textContent).toContain('está en pausa')
    await act(async () => {
      botonDePagar().click()
    })
    expect(startPseCheckout).not.toHaveBeenCalled()
  })
})

describe('🔴 el regreso del banco (QA 23-09)', () => {
  async function volverDelBanco() {
    act(() => root.unmount())
    barra.query = 'resultado=pse&pago=pago-1&plan=pro&id=wompi-tx'
    root = createRoot(host)
    await act(async () => {
      root.render(React.createElement(CheckoutPage))
    })
    await flush()
  }

  it('pregunta al back por ESE pago y dice que el plan quedó activo', async () => {
    estadoDelPago.mockResolvedValue({ estado: 'APROBADO', planNombre: 'Propietario', ciclo: 'MONTHLY' })
    await volverDelBanco()
    expect(estadoDelPago).toHaveBeenCalledWith('pago-1')
    expect(host.querySelector('[data-estado="APROBADO"]')?.textContent).toContain('landlord.checkout.resultadoAprobado')
    expect(startPseCheckout).not.toHaveBeenCalled()
  })

  it('rechazado: lo dice y ofrece intentar de nuevo con el mismo plan', async () => {
    estadoDelPago.mockResolvedValue({ estado: 'RECHAZADO', planNombre: 'Propietario', ciclo: 'MONTHLY' })
    await volverDelBanco()
    expect(host.querySelector('[data-estado="RECHAZADO"]')).not.toBeNull()
    const reintentar = Array.from(host.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('landlord.checkout.resultadoIntentarDeNuevo'),
    )
    expect(reintentar?.getAttribute('href')).toBe('/panel/checkout?plan=pro')
  })
})
