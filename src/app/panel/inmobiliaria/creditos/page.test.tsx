/**
 * page.test.tsx — Compra de créditos del agente.
 *
 * 🔴 Hasta el 23-09 el formulario pedía el banco a `/pse-mock/banks` (la lista
 * INVENTADA del banco simulado) y llamaba a `POST /agent-credits/purchase`,
 * que «cobraba» contra ese simulador; en producción el back rechaza el riel
 * simulado y nadie lograba comprar. Ahora es el PSE real de Wompi, igual que
 * el checkout del plan del propietario: catálogo real de bancos, datos del
 * pagador, el back pone el monto y el navegador se va al banco.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { getBalance, getPacks, startPseCheckout, getFinancialInstitutions, apiGet } = vi.hoisted(() => {
  // La compra está apagada por defecto (P-03); la pantalla de compra sólo se
  // pinta con la escotilla prendida, y se lee al importar la página.
  process.env.NEXT_PUBLIC_CREDITOS_DE_IA_ENABLED = 'true'
  return {
    getBalance: vi.fn(),
    getPacks: vi.fn(),
    startPseCheckout: vi.fn(),
    getFinancialInstitutions: vi.fn(),
    apiGet: vi.fn(),
  }
})

vi.mock('@/lib/api/agent-credits.service', () => ({
  agentCreditsApi: { getBalance, getPacks, startPseCheckout },
}))

vi.mock('@/lib/api/pse-checkout.service', () => ({
  pseCheckoutApi: { getFinancialInstitutions },
}))

// Si algo volviera a pedir la lista del simulador, pasaría por aquí.
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: apiGet, post: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { email: 'admin@inmobiliaria.co' } }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }))

// Radix Select no se deja manejar en happy-dom: lo reemplazamos por un
// <select> nativo con la misma forma de uso (value + onValueChange).
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<{ value: string; onValueChange: (v: string) => void }>({
    value: '',
    onValueChange: () => {},
  })
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) =>
      React.createElement(Ctx.Provider, { value: { value: value ?? '', onValueChange } }, children),
    SelectTrigger: () => null,
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

import CreditosPage from './page'

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

function boton(texto: string): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll('button')).find((x) => x.textContent?.includes(texto))
  if (!b) throw new Error(`no está el botón «${texto}»`)
  return b as HTMLButtonElement
}

async function abrirCompra() {
  await act(async () => {
    boton('Comprar pack').click()
  })
  await flush()
}

function llenarPagador() {
  const selects = host.querySelectorAll('[role="dialog"] select')
  // [0] banco, [1] tipo de persona, [2] tipo de documento
  escribir(selects[0] as HTMLSelectElement, '1007')
  escribir(host.querySelector<HTMLInputElement>('#creditos-documento')!, '1020304050')
  escribir(host.querySelector<HTMLInputElement>('#creditos-nombre')!, 'Ana Pérez')
}

beforeEach(async () => {
  getBalance.mockResolvedValue({ total: 2, planBalance: 0, purchasedBalance: 2, planExpiresAt: null })
  getPacks.mockResolvedValue([{ packSize: 5, price: 189000 }])
  startPseCheckout.mockReset()
  apiGet.mockReset()
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
    root.render(React.createElement(CreditosPage))
  })
  await flush()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  Object.defineProperty(window, 'location', { configurable: true, value: locationOriginal })
})

describe('compra de créditos por PSE real', () => {
  it('los bancos salen del catálogo de Wompi, nunca de /pse-mock', async () => {
    await abrirCompra()
    expect(getFinancialInstitutions).toHaveBeenCalledTimes(1)
    expect(apiGet.mock.calls.some(([ruta]) => String(ruta).includes('pse-mock'))).toBe(false)
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('BANCOLOMBIA')
  })

  it('no deja pagar sin los datos del pagador', async () => {
    await abrirCompra()
    expect(boton('Pagar').disabled).toBe(true)
  })

  it('inicia el checkout sin mandar el monto y se va a la URL del banco', async () => {
    startPseCheckout.mockResolvedValue({
      packSize: 5,
      amountCop: 189000,
      wompiTransactionId: 'tx1',
      asyncPaymentUrl: 'https://banco.example/pse/tx1',
      status: 'PENDING',
    })
    await abrirCompra()
    llenarPagador()
    expect(host.querySelector<HTMLInputElement>('#creditos-correo')!.value).toBe('admin@inmobiliaria.co')
    expect(boton('Pagar').disabled).toBe(false)

    await act(async () => {
      boton('Pagar').click()
    })
    await flush()

    expect(startPseCheckout).toHaveBeenCalledTimes(1)
    const dto = startPseCheckout.mock.calls[0][0]
    expect(dto).toEqual({
      packSize: 5,
      userType: 'NATURAL',
      legalIdType: 'CC',
      legalId: '1020304050',
      financialInstitutionCode: '1007',
      email: 'admin@inmobiliaria.co',
      fullName: 'Ana Pérez',
    })
    expect(dto).not.toHaveProperty('amount')
    expect(assign).toHaveBeenCalledWith('https://banco.example/pse/tx1')
  })

  it('si el banco no devolvió el enlace, lo dice y no navega', async () => {
    startPseCheckout.mockResolvedValue({
      packSize: 5,
      amountCop: 189000,
      wompiTransactionId: 'tx1',
      asyncPaymentUrl: null,
      status: 'PENDING',
    })
    await abrirCompra()
    llenarPagador()
    await act(async () => {
      boton('Pagar').click()
    })
    await flush()

    expect(assign).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('enlace de pago')
  })
})
