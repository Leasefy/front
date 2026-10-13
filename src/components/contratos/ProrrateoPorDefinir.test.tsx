/**
 * T-0153 §3.4: la agencia define si se prorratea el primer mes de los
 * contratos cuyo archivo no lo dice: fila por fila (SI/NO) o en bloque
 * (seleccionar todas o un subconjunto y aplicar el mismo valor).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { ProrrateoPorDefinir } from './ProrrateoPorDefinir'
import type { FilaPorDecidir } from '@/lib/contratos/preparar-filas-para-migrar'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const filas = (n: number): FilaPorDecidir[] =>
  Array.from({ length: n }, (_, i) => ({
    indice: i,
    filaDelArchivo: i + 2,
    inmueble: `Calle ${i}`,
    inquilino: `Inquilino ${i}`,
  }))

function pintar(
  porDefinir: FilaPorDecidir[],
  onCambiar = vi.fn(),
  extra: Partial<React.ComponentProps<typeof ProrrateoPorDefinir>> = {},
) {
  act(() => {
    root.render(
      <ProrrateoPorDefinir
        porDefinir={porDefinir}
        sinColumna={false}
        onCambiar={onCambiar}
        {...extra}
      />,
    )
  })
  return onCambiar
}
const q = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const clic = (el: Element | null) => act(() => (el as HTMLElement).click())

describe('ProrrateoPorDefinir', () => {
  it('no pinta nada si no hay nada por definir', () => {
    pintar([])
    expect(q('prorrateo-por-definir')).toBeNull()
  })

  it('dice cuántas faltan y que no se mandan hasta definirlas', () => {
    pintar(filas(3))
    const t = q('prorrateo-por-definir')!.textContent!
    expect(t).toContain('Falta definir: ¿se prorratea el primer mes?')
    expect(t).toContain('3 contratos')
    expect(t).toContain('no se mandan')
  })

  it('sin la columna ofrece primero la acción en bloque', () => {
    pintar(filas(2), vi.fn(), { sinColumna: true })
    expect(q('prorrateo-por-definir')!.textContent).toContain(
      'El archivo no trae la columna Prorrateado: defínela para todas o una por una',
    )
  })

  it('muestra el texto ilegible de la celda', () => {
    pintar([{ ...filas(1)[0], texto: 'a veces' }])
    expect(q('prorrateo-fila-0')!.textContent).toContain('«a veces»')
  })

  it('SI/NO por fila avisa con ESA fila y su valor', () => {
    const onCambiar = pintar(filas(2))
    clic(q('prorrateo-si-1'))
    expect(onCambiar).toHaveBeenCalledWith([1], true)
    clic(q('prorrateo-no-0'))
    expect(onCambiar).toHaveBeenLastCalledWith([0], false)
  })

  it('marca como pulsado lo que ya se eligió', () => {
    pintar(filas(2).map((f, i) => (i === 0 ? { ...f, decision: true } : f)))
    expect(q('prorrateo-si-0')!.getAttribute('aria-pressed')).toBe('true')
    expect(q('prorrateo-no-0')!.getAttribute('aria-pressed')).toBe('false')
    expect(q('prorrateo-si-1')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('«seleccionar todas» + un valor lo aplica a TODAS en un solo paso', () => {
    const onCambiar = pintar(filas(60))
    // No hay selección: los botones del bloque están apagados.
    expect((q('prorrateo-masivo-si') as HTMLButtonElement).disabled).toBe(true)
    clic(q('prorrateo-seleccionar-todas'))
    expect(q('prorrateo-seleccionadas')!.textContent).toContain('60 seleccionadas')
    clic(q('prorrateo-masivo-no'))
    expect(onCambiar).toHaveBeenCalledTimes(1)
    const [indices, valor] = onCambiar.mock.calls[0]
    expect(valor).toBe(false)
    expect(indices).toHaveLength(60)
    expect(indices).toEqual(Array.from({ length: 60 }, (_, i) => i))
  })

  it('un subconjunto: sólo las marcadas', () => {
    const onCambiar = pintar(filas(5))
    clic(q('prorrateo-elegir-1'))
    clic(q('prorrateo-elegir-3'))
    expect(q('prorrateo-seleccionadas')!.textContent).toContain('2 seleccionadas')
    clic(q('prorrateo-masivo-si'))
    expect(onCambiar).toHaveBeenCalledWith([1, 3], true)
  })

  it('después de aplicar, la selección se vacía', () => {
    pintar(filas(3))
    clic(q('prorrateo-seleccionar-todas'))
    clic(q('prorrateo-masivo-si'))
    expect(q('prorrateo-seleccionadas')!.textContent).toContain('0 seleccionadas')
  })

  it('con 60 pendientes muestra 25 y deja ver más', () => {
    pintar(filas(60))
    expect(container.querySelectorAll('[data-testid^="prorrateo-fila-"]')).toHaveLength(25)
    clic(q('prorrateo-ver-mas'))
    expect(container.querySelectorAll('[data-testid^="prorrateo-fila-"]')).toHaveLength(50)
  })

  it('cuando todas están decididas lo dice, como nota y no como alarma', () => {
    pintar(filas(2).map((f) => ({ ...f, decision: true })))
    const t = q('prorrateo-por-definir')!.textContent!
    expect(t).toContain('Todas definidas')
  })
})
