/**
 * 02-10-2026 · Agregar un concepto con el sistema de errores.
 *
 *  · El tope de la columna (`ContratoConcepto.valorCop`, `int4`) se ataja ANTES
 *    de mandar, con la frase del back, debajo del valor.
 *  · Un 400 con `campos` pinta el error debajo del valor y le da el foco.
 *  · Un 5xx dice «de nuestro lado» con la referencia; sólo sin respuesta se
 *    habla de la conexión.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { conceptos: vi.fn(), agregarConcepto: vi.fn(), quitarConcepto: vi.fn() },
}))

/* El `Select` de Radix no se abre en happy-dom: un `<select>` nativo basta para elegir. */
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => (
    <select data-testid="concepto" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

import { contractsApi } from '@/lib/api/contracts.service'
import { ApiError } from '@/lib/api/client'
import { CONCEPTOS } from '@/lib/contratos/conceptos'
import type { Contract } from '@/lib/types/contract'
import { ConceptosDelContrato } from './ConceptosDelContrato'

const TOPE = 'El valor del concepto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.'

const conceptosMock = contractsApi.conceptos as unknown as ReturnType<typeof vi.fn>
const agregarMock = contractsApi.agregarConcepto as unknown as ReturnType<typeof vi.fn>

const contrato = { id: 'c-1', usoInmueble: null, perfilesTributarios: null } as unknown as Contract

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  conceptosMock.mockReset().mockResolvedValue([])
  agregarMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const $ = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const valor = () => container.querySelector<HTMLInputElement>('#valor-del-concepto')!
const errorDelValor = () => container.querySelector('#valor-del-concepto-error')

async function abrirYLlenar(texto: string) {
  await act(async () => {
    root.render(<ConceptosDelContrato contract={contrato} puedeEditar />)
  })
  const agregar = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Agregar'))!
  await act(async () => agregar.click())
  const select = $('concepto') as HTMLSelectElement
  await act(async () => {
    select.value = CONCEPTOS[0].id
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(valor(), texto)
    valor().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function guardar() {
  const boton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Agregar al contrato')!
  await act(async () => {
    boton.click()
    await Promise.resolve()
  })
}

describe('<ConceptosDelContrato> — agregar con errores en su campo', () => {
  it('🔴 una cifra con ceros de más NO se manda: el tope sale debajo del valor', async () => {
    await abrirYLlenar('30000000000')
    await guardar()
    expect(agregarMock).not.toHaveBeenCalled()
    expect(errorDelValor()?.textContent).toBe(TOPE)
    expect(valor().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(valor())
  })

  it('🔴 un 400 con `campos` va debajo del valor, con el foco, y no al pie', async () => {
    agregarMock.mockRejectedValue(
      new ApiError(400, [TOPE], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE],
        campos: [{ campo: 'valorCop', regla: 'maximo', mensaje: TOPE }],
      }),
    )
    await abrirYLlenar('180000')
    await guardar()
    expect(agregarMock).toHaveBeenCalledTimes(1)
    expect(errorDelValor()?.textContent).toBe(TOPE)
    expect(document.activeElement).toBe(valor())
    expect($('error-de-los-conceptos')).toBeNull()
  })

  it('un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    agregarMock.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await abrirYLlenar('180000')
    await guardar()
    const pie = $('error-de-los-conceptos')!.textContent!
    expect(pie).toContain('de nuestro lado')
    expect(pie).toContain('ab12cd34')
    expect(pie).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    agregarMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await abrirYLlenar('180000')
    await guardar()
    expect($('error-de-los-conceptos')!.textContent).toMatch(/conexión/i)
  })

  it('al corregir el valor, el error se va', async () => {
    await abrirYLlenar('30000000000')
    await guardar()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(valor(), '180000')
      valor().dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(valor().getAttribute('aria-invalid')).toBeNull()
  })
})
