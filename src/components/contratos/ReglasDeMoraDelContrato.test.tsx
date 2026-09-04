/**
 * Las reglas de mora de la inmobiliaria en la ficha del contrato.
 *
 * Todas las reglas activas de la agencia, cada una con un interruptor
 * «aplica» y, si aplica, el valor y el día editables. Cuando difiere de la
 * agencia se ve «propio» y se puede volver a la general.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/reglas-de-mora.service', () => ({
  reglasDeMoraApi: { delContrato: vi.fn(), ajustarEnContrato: vi.fn() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))

import { reglasDeMoraApi } from '@/lib/api/reglas-de-mora.service'
import type { ReglaDeMoraDelContrato } from '@/lib/api/reglas-de-mora.types'
import { ReglasDeMoraDelContrato } from './ReglasDeMoraDelContrato'

const delContrato = reglasDeMoraApi.delContrato as unknown as ReturnType<typeof vi.fn>
const ajustar = reglasDeMoraApi.ajustarEnContrato as unknown as ReturnType<typeof vi.fn>

function fila(overrides: Partial<ReglaDeMoraDelContrato> = {}): ReglaDeMoraDelContrato {
  return {
    regla: {
      id: 'honorario',
      agencyId: 'ag-1',
      nombre: 'Honorario de cobranza',
      concepto: 'GASTO_ADMINISTRATIVO',
      disparador: 'DIA_DEL_MES',
      disparadorDia: 15,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 10,
      base: 'CANON',
      topeCop: null,
      activa: true,
      orden: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    aplica: true,
    valor: 10,
    valorDeLaAgencia: 10,
    disparadorDia: 15,
    disparadorDiaDeLaAgencia: 15,
    esPropio: false,
    ...overrides,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  delContrato.mockReset()
  ajustar.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(puedeEditar = true) {
  await act(async () => {
    root.render(<ReglasDeMoraDelContrato contract={{ id: 'c-1' }} puedeEditar={puedeEditar} />)
  })
}

function setValor(input: HTMLInputElement, v: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<ReglasDeMoraDelContrato>', () => {
  it('lista cada regla de la agencia con su frase legible y el interruptor prendido', async () => {
    delContrato.mockResolvedValue([fila()])
    await render()

    expect(delContrato).toHaveBeenCalledWith('c-1')
    expect(container.textContent).toContain('Honorario de cobranza')
    expect(container.textContent).toContain('Se dispara el día 15 de cada mes y cobra 10 % del canon, sin tope.')
    const sw = container.querySelector('[data-testid="aplica-honorario"]')!
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('[data-testid="propio-honorario"]')).toBeNull()
  })

  it('apagar el interruptor manda aplica: false y la fila lo dice', async () => {
    delContrato.mockResolvedValue([fila()])
    ajustar.mockResolvedValue(fila({ aplica: false, esPropio: true }))
    await render()

    const sw = container.querySelector<HTMLButtonElement>('[data-testid="aplica-honorario"]')!
    await act(async () => {
      sw.click()
    })

    expect(ajustar).toHaveBeenCalledWith('c-1', 'honorario', { aplica: false })
    expect(container.textContent).toContain('No se le aplica a este contrato.')
    expect(container.querySelector('[data-testid="propio-honorario"]')).not.toBeNull()
    // Sin aplicar no hay qué ajustar: los campos se esconden.
    expect(container.querySelector('[data-testid="valor-honorario"]')).toBeNull()
  })

  it('cambiar el día muestra «Guardar» y manda SÓLO el día', async () => {
    delContrato.mockResolvedValue([fila()])
    ajustar.mockResolvedValue(fila({ disparadorDia: 20, esPropio: true }))
    await render()

    expect(container.querySelector('[data-testid="dia-honorario-guardar"]')).toBeNull()
    setValor(container.querySelector<HTMLInputElement>('[data-testid="dia-honorario"]')!, '20')
    const guardar = container.querySelector<HTMLButtonElement>('[data-testid="dia-honorario-guardar"]')!
    await act(async () => {
      guardar.click()
    })

    expect(ajustar).toHaveBeenCalledWith('c-1', 'honorario', { disparadorDia: 20 })
    // Con el ajuste guardado: chip «propio», lo de la agencia al lado y «Volver a la general».
    expect(container.querySelector('[data-testid="propio-honorario"]')).not.toBeNull()
    expect(container.textContent).toContain('La inmobiliaria cobra día 15.')
    expect(container.querySelector('[data-testid="dia-honorario-volver"]')).not.toBeNull()
  })

  it('«Volver a la general» manda null (borra el ajuste)', async () => {
    delContrato.mockResolvedValue([fila({ valor: 8, esPropio: true })])
    ajustar.mockResolvedValue(fila())
    await render()

    expect(container.textContent).toContain('La inmobiliaria cobra 10 %.')
    const volver = container.querySelector<HTMLButtonElement>('[data-testid="valor-honorario-volver"]')!
    await act(async () => {
      volver.click()
    })

    expect(ajustar).toHaveBeenCalledWith('c-1', 'honorario', { valor: null })
    expect(container.querySelector('[data-testid="propio-honorario"]')).toBeNull()
  })

  it('un 400 del back (tasa sobre el techo) se muestra tal cual y no cambia la fila', async () => {
    delContrato.mockResolvedValue([fila()])
    ajustar.mockRejectedValue(new Error('Una tasa diaria de 1% equivale a 3678% efectivo anual'))
    await render()

    setValor(container.querySelector<HTMLInputElement>('[data-testid="valor-honorario"]')!, '50')
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="valor-honorario-guardar"]')!.click()
    })

    expect(container.textContent).toContain('efectivo anual')
    expect(container.querySelector('[data-testid="propio-honorario"]')).toBeNull()
  })

  it('sin reglas en la agencia lo dice y enlaza a crear la primera', async () => {
    delContrato.mockResolvedValue([])
    await render()

    const vacio = container.querySelector('[data-testid="reglas-vacio"]')!
    expect(vacio.textContent).toContain('todavía no tiene reglas de mora')
    expect(vacio.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/cobros/reglas-de-mora')
  })

  it('un fallo de carga NO se pinta como «sin reglas»: se dice y se reintenta', async () => {
    delContrato.mockRejectedValueOnce(new Error('Se cayó el back'))
    await render()

    expect(container.textContent).toContain('Se cayó el back')
    expect(container.querySelector('[data-testid="reglas-vacio"]')).toBeNull()

    delContrato.mockResolvedValueOnce([fila()])
    const reintentar = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )!
    await act(async () => {
      reintentar.click()
    })
    expect(container.textContent).toContain('Honorario de cobranza')
  })

  it('sin permiso de edición: se ve, pero no hay interruptor habilitado ni campos', async () => {
    delContrato.mockResolvedValue([fila()])
    await render(false)

    expect(container.querySelector<HTMLButtonElement>('[data-testid="aplica-honorario"]')!.disabled).toBe(true)
    expect(container.querySelector('[data-testid="valor-honorario"]')).toBeNull()
  })
})
