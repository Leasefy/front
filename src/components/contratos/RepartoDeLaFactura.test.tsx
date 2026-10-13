/**
 * T-0163 (Anexo B4): el reparto de la factura entre los inquilinos del
 * contrato. La suma, el resto del titular, la detección de un back anterior y
 * los errores del servidor. Datos inventados.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/contracts.service')>()
  return {
    ...actual,
    contractsApi: {
      ...actual.contractsApi,
      repartirFactura: vi.fn(),
      quitarReparto: vi.fn(),
    },
  }
})

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}))

import { ApiError } from '@/lib/api/client'
import { contractsApi } from '@/lib/api/contracts.service'
import type { InquilinoDelContrato } from '@/lib/types/contract'
import { RepartoDeLaFactura } from './RepartoDeLaFactura'

const repartir = contractsApi.repartirFactura as unknown as ReturnType<typeof vi.fn>
const quitar = contractsApi.quitarReparto as unknown as ReturnType<typeof vi.fn>

const p = (over: Partial<InquilinoDelContrato> = {}): InquilinoDelContrato => ({
  id: null,
  userId: null,
  nombre: 'Titular Uno',
  documento: '111',
  email: null,
  telefono: null,
  esPrincipal: true,
  participacionBps: null,
  ...over,
})
const dos = (a: number | null = null, b: number | null = null): InquilinoDelContrato[] => [
  p({ participacionBps: a }),
  p({ id: 'ci-1', nombre: 'Coarrendatario Dos', documento: '222', esPrincipal: false, participacionBps: b }),
]
const tres = (): InquilinoDelContrato[] => [
  ...dos(),
  p({ id: 'ci-2', nombre: 'Coarrendatario Tres', documento: '333', esPrincipal: false, participacionBps: null }),
]

let container: HTMLDivElement
let root: Root
const alActualizar = vi.fn()

function render(lista: InquilinoDelContrato[], puedeEditar = true) {
  act(() => {
    root.render(
      <RepartoDeLaFactura
        contractId="c-1"
        inquilinos={lista}
        puedeEditar={puedeEditar}
        onListaNueva={alActualizar}
      />,
    )
  })
}
const q = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const clic = async (id: string) => {
  await act(async () => {
    q(id)!.click()
  })
}
async function escribir(id: string, valor: string) {
  const el = q(id) as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.innerHTML = ''
})

describe('detección de un back anterior', () => {
  it('sin la clave participacionBps en la lista, la sección no existe', () => {
    render(dos().map(({ participacionBps: _x, ...resto }) => resto as InquilinoDelContrato))
    expect(q('reparto-de-la-factura')).toBeNull()
  })

  it('con un solo inquilino no hay nada que repartir', () => {
    render([p()])
    expect(q('reparto-de-la-factura')).toBeNull()
  })

  it('con la clave, aun en null, la sección se ve', () => {
    render(dos())
    expect(q('reparto-de-la-factura')).toBeTruthy()
  })
})

describe('lectura', () => {
  it('sin reparto: toda la factura va al titular', () => {
    render(dos())
    expect(q('reparto-sin-reparto')?.textContent).toBe('Sin reparto: toda la factura va al titular.')
  })

  it('con reparto: «nombre · pct %» por persona', () => {
    render(dos(6667, 3333))
    const filas = Array.from(container.querySelectorAll('[data-testid="reparto-linea"]')).map((e) =>
      (e.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
    expect(filas).toEqual(['Titular Uno · 66,67 %', 'Coarrendatario Dos · 33,33 %'])
  })

  it('sin permiso de edición no hay botón de editar', () => {
    render(dos(), false)
    expect(q('editar-reparto')).toBeNull()
  })

  it('avisa desde cuándo aplica', () => {
    render(dos())
    expect(q('reparto-nota')?.textContent).toContain('Aplica desde el próximo mes sin facturas generadas')
  })
})

describe('edición', () => {
  it('«Partes iguales» entre 3: el titular se lleva el resto (33,34 / 33,33 / 33,33)', async () => {
    render(tres())
    await clic('editar-reparto')
    await clic('reparto-partes-iguales')
    expect((q('reparto-pct-ci-1') as HTMLInputElement).value).toBe('33,33')
    expect((q('reparto-pct-ci-2') as HTMLInputElement).value).toBe('33,33')
    expect(q('reparto-titular')?.textContent).toContain('33,34')
  })

  it('el titular es el resto de lo que se escribe', async () => {
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '30')
    expect(q('reparto-titular')?.textContent).toContain('70')
  })

  it('guardar manda el titular con inquilinoId null y la suma exacta de 10 000', async () => {
    repartir.mockResolvedValue(dos(7000, 3000))
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '30')
    await clic('reparto-guardar')
    expect(repartir).toHaveBeenCalledWith('c-1', [
      { inquilinoId: null, participacionBps: 7000 },
      { inquilinoId: 'ci-1', participacionBps: 3000 },
    ])
    expect(alActualizar).toHaveBeenCalledWith(dos(7000, 3000))
    expect(toastSuccess).toHaveBeenCalled()
  })

  it('con coma decimal: 33,33 -> 3333 bps', async () => {
    repartir.mockResolvedValue(dos(6667, 3333))
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '33,33')
    await clic('reparto-guardar')
    expect(repartir.mock.calls[0][1]).toEqual([
      { inquilinoId: null, participacionBps: 6667 },
      { inquilinoId: 'ci-1', participacionBps: 3333 },
    ])
  })

  it('un 0 % bloquea el guardado y dice por qué', async () => {
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '0')
    expect(q('reparto-problema')?.textContent).toBe('Cada inquilino necesita un porcentaje mayor a 0.')
    expect((q('reparto-guardar') as HTMLButtonElement).disabled).toBe(true)
  })

  it('si los demás se llevan todo, el titular se queda sin nada: no se guarda', async () => {
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '100')
    expect(q('reparto-problema')?.textContent).toContain('al titular le tiene que quedar algo')
    expect((q('reparto-guardar') as HTMLButtonElement).disabled).toBe(true)
    expect(repartir).not.toHaveBeenCalled()
  })

  it('un 400 del servidor se dice con SU mensaje, dentro de la sección', async () => {
    repartir.mockRejectedValue(
      new ApiError(400, 'Las participaciones deben sumar 100 %.', 'PARTICIPACIONES_DE_INQUILINOS_INVALIDAS'),
    )
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '30')
    await clic('reparto-guardar')
    expect(q('reparto-error')?.textContent).toContain('Las participaciones deben sumar 100 %.')
    expect(alActualizar).not.toHaveBeenCalled()
  })

  it('un 503 (falta la migración) va a un aviso con el mensaje del back', async () => {
    repartir.mockRejectedValue(new ApiError(503, 'Falta la migración 20261010150000.', 'DIVISION_SIN_MIGRACION'))
    render(dos())
    await clic('editar-reparto')
    await escribir('reparto-pct-ci-1', '30')
    await clic('reparto-guardar')
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Falta la migración'))
  })
})

describe('quitar el reparto', () => {
  it('sin reparto no se ofrece quitarlo', async () => {
    render(dos())
    await clic('editar-reparto')
    expect(q('reparto-quitar')).toBeNull()
  })

  it('pide confirmación y recién entonces borra', async () => {
    quitar.mockResolvedValue(dos(null, null))
    render(dos(5000, 5000))
    await clic('editar-reparto')
    await clic('reparto-quitar')
    expect(quitar).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'toda la factura vuelve al titular',
    )
    await act(async () => {
      ;(document.querySelector('[data-testid="confirmar-quitar-reparto"]') as HTMLButtonElement).click()
    })
    expect(quitar).toHaveBeenCalledWith('c-1')
    expect(alActualizar).toHaveBeenCalledWith(dos(null, null))
  })
})
