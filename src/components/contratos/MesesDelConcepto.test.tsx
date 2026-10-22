/**
 * Portofino 22-10-2026: elegir en qué meses entra un concepto. Lo que fijan:
 *   - «Diferir en N meses» toma N meses seguidos desde la próxima cuota sin
 *     pagar y reparte en partes iguales (lo que sobra a la última);
 *   - los meses sueltos se eligen y se quitan, y se reparte otra vez;
 *   - un mes ya pagado se puede elegir y dice a dónde va;
 *   - si la suma no da el total, lo dice.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({ meses: vi.fn() }))
vi.mock('@/lib/api/contracts.service', () => ({ contractsApi: { mesesParaUnConcepto: h.meses } }))

import { MesesDelConcepto, type MesElegido } from './MesesDelConcepto'

const MESES = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'].map((mes) => ({ mes, sePuede: mes >= '2026-11' }))

let container: HTMLDivElement
let root: Root
let valor: MesElegido[] = []
const pintar = (total: number) =>
  root.render(
    <MesesDelConcepto
      contractId="c-1"
      paga="INQUILINO"
      total={total}
      conCentavos={false}
      valor={valor}
      onCambiar={(m) => {
        valor = m
        pintar(total)
      }}
    />,
  )

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  valor = []
  h.meses.mockResolvedValue({ disponible: true, meses: MESES })
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(total: number) {
  await act(async () => pintar(total))
  await act(async () => {
    await Promise.resolve()
  })
}
const q = (sel: string) => container.querySelector<HTMLElement>(sel)
const clic = async (sel: string) => act(async () => q(sel)!.dispatchEvent(new MouseEvent('click', { bubbles: true })))

describe('MesesDelConcepto', () => {
  it('diferir $2.000.000 en 5 meses desde la próxima sin pagar: $400.000 cada uno', async () => {
    await montar(2_000_000)
    const n = q('[data-testid="diferir-en"]') as HTMLInputElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(n, '5')
      n.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await clic('[data-testid="diferir"]')
    expect(valor).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03'].map((mes) => ({ mes, valorCop: 400_000 })))
    expect(q('[data-testid="suma-de-los-meses"]')?.textContent).toContain('Suman')
  })

  it('meses sueltos: dic, feb y mar, y lo que sobra va a la última', async () => {
    await montar(1_000_000)
    await clic('[data-testid="mes-2026-12"]')
    await clic('[data-testid="mes-2027-02"]')
    await clic('[data-testid="mes-2027-03"]')
    expect(valor.map((v) => v.valorCop)).toEqual([333_333, 333_333, 333_334])
    await clic('[data-testid="mes-2027-02"]')
    expect(valor).toEqual([
      { mes: '2026-12', valorCop: 500_000 },
      { mes: '2027-03', valorCop: 500_000 },
    ])
  })

  it('un mes ya pagado se puede elegir y dice que pasa a la próxima cuota', async () => {
    await montar(300_000)
    expect(q('[data-testid="mes-2026-10"]')?.textContent).toContain('pagado')
    await clic('[data-testid="mes-2026-10"]')
    expect(container.textContent).toContain('Ya está pagado: va en la próxima cuota sin pagar.')
  })

  it('sin la actualización de Leasefy lo dice y no deja elegir', async () => {
    h.meses.mockResolvedValue({ disponible: false, meses: [] })
    await montar(300_000)
    expect(container.textContent).toContain('Todavía no se pueden elegir los meses')
    expect(q('[data-testid="mes-2026-12"]')).toBeNull()
  })
})
