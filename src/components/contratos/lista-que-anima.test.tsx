/**
 * Las filas que entran y salen (03-10-2026, «cada interacción con su
 * animación»), con `lista-que-anima`:
 *
 *   · la fila que llega DESPUÉS de montada la lista termina visible, también
 *     en el modo estricto de React (con las primitivas tal cual se quedaba en
 *     `opacity: 0`: así se vieron vacías Contratos y Propietarios en `next dev`);
 *   · la fila que se va SALE (sigue un instante en la tabla con su salida) y
 *     después se quita;
 *   · es un `<tbody>` con `<tr>` de verdad, con las clases de `TableRow`.
 */
import * as React from 'react'
import { StrictMode, act } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { CuerpoQueAnima, ElementoQueAnima, FilaQueAnima, ListaQueAnima } from './lista-que-anima'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

const pintar = (el: React.ReactElement) => act(() => root.render(<StrictMode>{el}</StrictMode>))
/** La salida termina al instante en las pruebas, pero el nodo se quita cuando avisa que terminó. */
const esperar = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {})
}
/**
 * Con las animaciones DE VERDAD (no saltadas): lo que el navegador hace en
 * `next dev`. Espera a que terminen (entrada de 200 ms + escalonado ≤ 320 ms).
 */
const conAnimaciones = () => {
  MotionGlobalConfig.skipAnimations = false
}
const dejarQueTerminen = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 800))
  })
}

const tabla = (ids: string[]) => (
  <table>
    <CuerpoQueAnima>
      {ids.map((id) => (
        <FilaQueAnima key={id} data-testid={`fila-${id}`}>
          <td>{id}</td>
        </FilaQueAnima>
      ))}
    </CuerpoQueAnima>
  </table>
)

const fila = (id: string) => host.querySelector<HTMLElement>(`[data-testid="fila-${id}"]`)

describe('CuerpoQueAnima / FilaQueAnima', () => {
  it('es un <tbody> con <tr>, con las clases de la fila de la tabla', () => {
    pintar(tabla(['a']))
    expect(fila('a')!.tagName).toBe('TR')
    expect(fila('a')!.parentElement!.tagName).toBe('TBODY')
    expect(fila('a')!.className).toMatch(/\bborder-b\b/)
    expect(fila('a')!.className).toMatch(/hover:bg-surface-muted/)
  })

  it('🔴 la fila que llega después de montada la tabla termina VISIBLE (modo estricto)', async () => {
    conAnimaciones()
    // La tabla se monta vacía (los datos todavía no llegan) y las filas llegan después.
    pintar(tabla([]))
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    for (const id of ['a', 'b', 'c']) {
      expect(fila(id)!.style.opacity).toBe('1')
      expect(fila(id)!.style.transform).not.toContain('translateY(8px)')
    }
  })

  it('🔴 al limpiar un filtro, las que vuelven también terminan visibles', async () => {
    conAnimaciones()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    pintar(tabla(['a']))
    await dejarQueTerminen()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    expect(fila('b')!.style.opacity).toBe('1')
    expect(fila('c')!.style.opacity).toBe('1')
  })

  it('la que se va sale con su animación y después se quita', async () => {
    pintar(tabla(['a', 'b', 'c']))
    await esperar()
    pintar(tabla(['a', 'c']))
    // Recién filtrada sigue en la tabla: se está yendo.
    expect(fila('b')).not.toBeNull()
    await esperar()
    expect(fila('b')).toBeNull()
    expect(host.querySelectorAll('tbody > tr')).toHaveLength(2)
  })
})

describe('ListaQueAnima / ElementoQueAnima', () => {
  const lista = (ids: string[], as: 'ul' | 'div' = 'ul') => (
    <ListaQueAnima as={as} className="space-y-2" data-testid="lista">
      {ids.map((id) => (
        <ElementoQueAnima key={id} as={as === 'ul' ? 'li' : 'div'} data-testid={`el-${id}`}>
          {id}
        </ElementoQueAnima>
      ))}
    </ListaQueAnima>
  )

  it('respeta las etiquetas y deja la lista `relative` (lo que sale se saca del flujo)', () => {
    pintar(lista(['a']))
    const l = host.querySelector('[data-testid="lista"]')!
    expect(l.tagName).toBe('UL')
    expect(l.className).toMatch(/\brelative\b/)
    expect(l.className).toMatch(/\bspace-y-2\b/)
    expect(host.querySelector('[data-testid="el-a"]')!.tagName).toBe('LI')
  })

  it('🔴 el ítem que se agrega después termina visible (modo estricto)', async () => {
    conAnimaciones()
    pintar(lista(['a']))
    await dejarQueTerminen()
    expect(host.querySelector<HTMLElement>('[data-testid="el-a"]')!.style.opacity).toBe('1')
    pintar(lista(['a', 'nuevo']))
    await dejarQueTerminen()
    expect(host.querySelector<HTMLElement>('[data-testid="el-nuevo"]')!.style.opacity).toBe('1')
  })
})
