/**
 * Cuentas de pago del propietario: agregar una cuenta (02-10-2026, sistema de
 * errores).
 *
 *  · El titular, el banco, el tipo y la billetera tenían su error calculado
 *    pero no se pintaban: «Agregar» no hacía nada y no decía por qué.
 *  · Un 400 del back con `campos` va debajo de SU campo, con el foco.
 *  · Un 5xx dice que fue nuestro, con la referencia; «conexión», sólo sin
 *    respuesta.
 *  · Si la cuenta se creó y falla asignarle un inmueble, no dice «no pudimos
 *    agregar la cuenta».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { apiMock, toastMock, propiedades } = vi.hoisted(() => ({
  apiMock: {
    getAll: vi.fn(),
    getAssignments: vi.fn(),
    create: vi.fn(),
    assignProperty: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  propiedades: { lista: [] as Array<{ id: string; title: string }> },
}))

vi.mock('@/lib/api/payment-methods.service', () => ({ paymentMethodsApi: apiMock }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/hooks/useProperties', () => ({
  useMyProperties: () => ({ properties: propiedades.lista }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
// El Select de Radix no se deja manejar en happy-dom: uno nativo, con el mismo contrato.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children?: React.ReactNode }) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => <option value={value}>{children}</option>,
}))

import { PaymentAccountsSection } from './PaymentAccountsSection'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.values(apiMock).forEach((m) => m.mockReset())
  toastMock.success.mockReset()
  toastMock.error.mockReset()
  apiMock.getAll.mockResolvedValue([])
  apiMock.getAssignments.mockResolvedValue([])
  propiedades.lista = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(' · ') : String(cuerpo.message ?? '')
  return Object.assign(new Error(mensaje), {
    name: 'ApiError',
    status,
    code: cuerpo.code,
    messages: Array.isArray(cuerpo.message) ? cuerpo.message : undefined,
    detalle: cuerpo,
  })
}

const enLaPagina = (sel: string) => document.body.querySelector<HTMLElement>(sel)

function boton(texto: string): HTMLButtonElement {
  const b = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((x) => x.textContent?.includes(texto))
  expect(b, `no encontré el botón «${texto}»`).toBeDefined()
  return b!
}

function escribir(sel: string, valor: string) {
  const input = enLaPagina(sel) as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function abrir() {
  await act(async () => root.render(<PaymentAccountsSection delay={0} />))
  const abrirModal = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.includes('landlordSettings.paymentAccounts'),
  )!
  await act(async () => abrirModal.click())
}

async function llenarBancoYAgregar({ titular = 'Pedro Ruiz' } = {}) {
  await abrir()
  const select = document.body.querySelector<HTMLSelectElement>('[data-testid="select"]')!
  act(() => {
    select.value = 'bancolombia'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  act(() => boton('landlordSettings.paymentAccounts.accountTypes.savings').click())
  escribir('#cuenta-de-pago-accountNumber', '12345678')
  escribir('#cuenta-de-pago-holderName', titular)
  escribir('#cuenta-de-pago-document', '1020304050')
  await act(async () => boton('landlordSettings.paymentAccounts.modals.addAccount.addButton').click())
}

describe('Cuentas de pago — agregar una cuenta', () => {
  it('🔴 sin titular, el error se ve debajo del campo (antes no se pintaba)', async () => {
    await llenarBancoYAgregar({ titular: '' })
    expect(apiMock.create).not.toHaveBeenCalled()
    expect(enLaPagina('#cuenta-de-pago-holderName-error')?.textContent).toBe(
      'landlordSettings.paymentAccounts.validation.holderNameRequired',
    )
    expect(document.activeElement).toBe(enLaPagina('#cuenta-de-pago-holderName'))
  })

  it('🔴 un 400 con `campos` en el documento va debajo de SU campo, con el foco, sin toast', async () => {
    const FRASE = 'El documento del titular debe tener entre 6 y 12 dígitos.'
    apiMock.create.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [FRASE],
        campos: [{ campo: 'holderDocumentNumber', regla: 'formato', mensaje: FRASE }],
      }),
    )
    await llenarBancoYAgregar()
    expect(enLaPagina('#cuenta-de-pago-document-error')?.textContent).toBe(FRASE)
    expect(document.activeElement).toBe(enLaPagina('#cuenta-de-pago-document'))
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    apiMock.create.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await llenarBancoYAgregar()
    const texto = String(toastMock.error.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos agregar la cuenta: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    apiMock.create.mockRejectedValue(new TypeError('Failed to fetch'))
    await llenarBancoYAgregar()
    expect(String(toastMock.error.mock.calls[0][0])).toMatch(/conexión/)
  })

  it('si la cuenta se creó y falla asignarle un inmueble, lo dice así (no «no pudimos agregar»)', async () => {
    propiedades.lista = [{ id: 'p-1', title: 'Apto 101' }]
    apiMock.create.mockResolvedValue({ id: 'c-1' })
    apiMock.assignProperty.mockRejectedValue(
      errorDelBack(409, { code: 'YA_ASIGNADO', message: 'Ese inmueble ya tiene una cuenta asignada.' }),
    )
    await abrir()
    act(() => boton('landlordSettings.paymentAccounts.modals.addAccount.assignPropertiesHint').click())
    act(() => boton('Apto 101').click())
    const select = document.body.querySelector<HTMLSelectElement>('[data-testid="select"]')!
    act(() => {
      select.value = 'bancolombia'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    act(() => boton('landlordSettings.paymentAccounts.accountTypes.savings').click())
    escribir('#cuenta-de-pago-accountNumber', '12345678')
    escribir('#cuenta-de-pago-holderName', 'Pedro Ruiz')
    escribir('#cuenta-de-pago-document', '1020304050')
    await act(async () => boton('landlordSettings.paymentAccounts.modals.addAccount.addButton').click())

    const texto = String(toastMock.error.mock.calls[0][0])
    expect(texto).toMatch(/^La cuenta quedó creada, pero no pudimos asignarle los inmuebles\./)
    expect(texto).toContain('Ese inmueble ya tiene una cuenta asignada.')
  })
})
