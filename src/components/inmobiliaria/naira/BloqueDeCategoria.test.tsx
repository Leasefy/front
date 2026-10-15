/**
 * @vitest-environment happy-dom
 *
 * BloqueDeCategoria — la categoría visible sale del CAMPO (sección o procedencia), nunca de lo que dicen los hijos, y se
 * distingue por etiqueta + icono + borde (D13-9, FG13-12, UI-SPEC §6.3).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { BloqueDeCategoria, type OrigenDeCategoria } from './BloqueDeCategoria'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

function montar(nodo: React.ReactNode): void {
  act(() => {
    root.render(nodo)
  })
}

const seccion = () => container.querySelector('section')

/** El `<p>` al que apunta `aria-labelledby` (la etiqueta visible del bloque). */
function etiqueta(): HTMLElement | null {
  const id = seccion()?.getAttribute('aria-labelledby')
  return id ? document.getElementById(id) : null
}

const clases = () => (seccion()?.getAttribute('class') ?? '').split(/\s+/)

describe('<BloqueDeCategoria>', () => {
  it('[N13:control-positivo] LIVE_DATA es un bloque DATO con su etiqueta visible, su icono y sus hijos', () => {
    montar(
      <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'LIVE_DATA' }}>
        <p>Valor (ejemplo)</p>
      </BloqueDeCategoria>,
    )
    expect(container.querySelector('section[data-categoria="dato"][data-seccion="LIVE_DATA"]')).not.toBeNull()
    expect(etiqueta()?.tagName.toLowerCase()).toBe('p')
    expect(etiqueta()?.textContent).toContain('DATO')
    expect(seccion()?.querySelector('svg')).not.toBeNull()
    expect(seccion()?.textContent).toContain('Valor (ejemplo)')
  })

  it('[N13:categoria-por-campo] la categoría sale del campo aunque los hijos digan lo contrario', () => {
    const tabla: [OrigenDeCategoria, string, 'dato' | 'inferencia' | 'recomendacion', string[]][] = [
      [{ kind: 'seccion', seccion: 'INFERENCE' }, 'Dato medido: la morosidad es 12 % (ejemplo)', 'inferencia', ['INFERENCIA']],
      [{ kind: 'seccion', seccion: 'LIVE_DATA' }, 'probablemente subió porque bajó (ejemplo)', 'dato', ['DATO']],
      [{ kind: 'seccion', seccion: 'KNOWLEDGE' }, 'Una política (ejemplo)', 'dato', ['DATO', 'CONOCIMIENTO']],
      [{ kind: 'seccion', seccion: 'RECOMMENDATION' }, 'Una recomendación (ejemplo)', 'recomendacion', ['RECOMENDACIÓN']],
      [{ kind: 'seccion', seccion: 'ACTION' }, 'Una acción (ejemplo)', 'recomendacion', ['RECOMENDACIÓN', 'ACCIÓN']],
      [{ kind: 'memoria', procedencia: 'observed' }, 'Algo observado (ejemplo)', 'dato', ['DATO', 'MEMORIA']],
      [{ kind: 'memoria', procedencia: 'stated_by_human' }, 'Algo dicho (ejemplo)', 'dato', ['DATO', 'MEMORIA']],
      [{ kind: 'memoria', procedencia: 'inferred' }, 'Algo inferido (ejemplo)', 'inferencia', ['INFERENCIA', 'MEMORIA']],
    ]
    for (const [origen, hijos, categoria, rotulos] of tabla) {
      const caso = JSON.stringify(origen)
      montar(
        <BloqueDeCategoria origen={origen}>
          <p>{hijos}</p>
        </BloqueDeCategoria>,
      )
      expect(seccion()?.getAttribute('data-categoria'), caso).toBe(categoria)
      for (const r of rotulos) expect(etiqueta()?.textContent, caso).toContain(r)
    }
  })

  it('[N13:categoria-no-solo-color] cada categoría tiene su borde, su icono y su etiqueta, sin el cobalto', () => {
    const casos: [OrigenDeCategoria, (c: string[]) => void][] = [
      [
        { kind: 'seccion', seccion: 'LIVE_DATA' },
        (c) => {
          expect(c).toContain('border-border')
          expect(c).not.toContain('border-dashed')
          expect(c).not.toContain('border-l-4')
        },
      ],
      [{ kind: 'seccion', seccion: 'INFERENCE' }, (c) => expect(c).toContain('border-dashed')],
      [{ kind: 'seccion', seccion: 'RECOMMENDATION' }, (c) => expect(c).toContain('border-l-4')],
    ]
    for (const [origen, bordes] of casos) {
      montar(
        <BloqueDeCategoria origen={origen}>
          <p>Contenido (ejemplo)</p>
        </BloqueDeCategoria>,
      )
      bordes(clases())
      expect(seccion()?.querySelector('svg'), JSON.stringify(origen)).not.toBeNull()
      expect((etiqueta()?.textContent ?? '').trim().length, JSON.stringify(origen)).toBeGreaterThan(0)
      const todas = [...(seccion()?.querySelectorAll('*') ?? [])].flatMap((e) => (e.getAttribute('class') ?? '').split(/\s+/))
      for (const c of [...clases(), ...todas]) {
        expect(c, JSON.stringify(origen)).not.toBe('bg-primary')
        expect(c, JSON.stringify(origen)).not.toBe('text-primary')
      }
    }
  })

  it('[N13:vacio-no-se-pinta] sin hijos ni razón no se pinta; con la razón de vacío, se dice', () => {
    montar(<BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'RECOMMENDATION' }} />)
    expect(container.innerHTML).toBe('')
    montar(
      <BloqueDeCategoria origen={{ kind: 'memoria', procedencia: 'observed' }} razonDeVacio="Sin datos de esta procedencia (ejemplo)" />,
    )
    expect(seccion()).not.toBeNull()
    expect(seccion()?.textContent).toContain('Sin datos de esta procedencia (ejemplo)')
  })
})
