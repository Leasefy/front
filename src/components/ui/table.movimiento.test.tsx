/**
 * Las filas que entran y salen (`TableBodyAnimado` / `TableRowAnimada`) y las
 * listas (`Stagger` / `StaggerItem` de Cadence), con las animaciones DE
 * VERDAD y en el modo estricto de React, que es como corre `next dev`
 * (movimiento ola 2, 03-10-2026).
 *
 * 🔴 El defecto que fija: el `Stagger` orquestaba la entrada con variantes
 * heredadas (el contenedor pasaba de `hidden` a `shown` y arrastraba a los
 * ítems). En el doble montaje del modo estricto esa orquestación se perdía y
 * las filas se quedaban en `opacity: 0; translateY(8px)`: las tablas de
 * Contratos y Propietarios se veían VACÍAS en `next dev`. Ahora cada ítem se
 * anima solo, con su retraso por turno (y el techo de 320 ms).
 *
 * También: una lista que se monta dentro de algo que no anima su primer
 * contenido (el `CrossFade` tabla ⇄ tarjetas) se ve quieta, no invisible; la
 * que se va SALE y después se quita; y es un `<tbody>` con `<tr>` de verdad.
 */
import * as React from 'react'
import { StrictMode, act } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { TableBodyAnimado, TableRowAnimada } from './table'

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
/** Lo que el navegador hace en `next dev`: las animaciones corren (no se saltan). */
const conAnimaciones = () => {
  MotionGlobalConfig.skipAnimations = false
}
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
/** Entrada de 200 ms + escalonado de hasta 320 ms, con margen. */
const dejarQueTerminen = () => esperar(800)

const tabla = (ids: string[]) => (
  <table>
    <TableBodyAnimado>
      {ids.map((id) => (
        <TableRowAnimada key={id} data-testid={`fila-${id}`}>
          <td>{id}</td>
        </TableRowAnimada>
      ))}
    </TableBodyAnimado>
  </table>
)
const fila = (id: string) => host.querySelector<HTMLElement>(`[data-testid="fila-${id}"]`)
const seVe = (el: HTMLElement | null) => {
  expect(el).not.toBeNull()
  expect(['', '1']).toContain(el!.style.opacity)
  expect(el!.style.transform).not.toMatch(/translateY\((?!0)/)
}

describe('TableBodyAnimado / TableRowAnimada', () => {
  it('es un <tbody> con <tr>, con las clases de la fila de la tabla', () => {
    pintar(tabla(['a']))
    expect(fila('a')!.tagName).toBe('TR')
    expect(fila('a')!.parentElement!.tagName).toBe('TBODY')
    expect(fila('a')!.className).toMatch(/\bborder-b\b/)
    expect(fila('a')!.className).toMatch(/hover:bg-surface-muted/)
  })

  it('🔴 las filas que ya están al montarse terminan VISIBLES (modo estricto)', async () => {
    conAnimaciones()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    for (const id of ['a', 'b', 'c']) seVe(fila(id))
  })

  it('🔴 las filas que llegan después de montada la tabla terminan VISIBLES (modo estricto)', async () => {
    conAnimaciones()
    // La tabla se monta vacía (los datos todavía no llegan) y las filas llegan después.
    pintar(tabla([]))
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    for (const id of ['a', 'b', 'c']) seVe(fila(id))
  })

  it('🔴 al limpiar un filtro, las que vuelven también terminan visibles', async () => {
    conAnimaciones()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    pintar(tabla(['a']))
    await dejarQueTerminen()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    for (const id of ['a', 'b', 'c']) seVe(fila(id))
  })

  it('entran ESCALONADAS: al principio la primera va más adelantada que la última', async () => {
    conAnimaciones()
    pintar(tabla([]))
    pintar(tabla(['a', 'b', 'c', 'd', 'e']))
    await esperar(90)
    const primera = Number(fila('a')!.style.opacity || '1')
    const ultima = Number(fila('e')!.style.opacity || '1')
    expect(primera).toBeGreaterThan(ultima)
    await dejarQueTerminen()
    for (const id of ['a', 'b', 'c', 'd', 'e']) seVe(fila(id))
  })

  it('la que se va SALE con su animación y después se quita', async () => {
    conAnimaciones()
    pintar(tabla(['a', 'b', 'c']))
    await dejarQueTerminen()
    pintar(tabla(['a', 'c']))
    // Recién filtrada sigue en la tabla: se está yendo.
    expect(fila('b')).not.toBeNull()
    await dejarQueTerminen()
    expect(fila('b')).toBeNull()
    expect(host.querySelectorAll('tbody > tr')).toHaveLength(2)
  })

  it('🔴 dentro de algo que no anima su primer contenido (un CrossFade), se ven quietas', async () => {
    conAnimaciones()
    pintar(<CrossFade swapKey="tabla">{tabla(['a', 'b'])}</CrossFade>)
    await esperar(30)
    // Ni siquiera arrancan invisibles: el contenedor tampoco se anima.
    seVe(fila('a'))
    seVe(fila('b'))
  })
})

describe('Stagger / StaggerItem (Cadence)', () => {
  const lista = (ids: string[]) => (
    <Stagger as="ul" className="space-y-2" data-testid="lista">
      {ids.map((id) => (
        <StaggerItem key={id} as="li" data-testid={`el-${id}`}>
          {id}
        </StaggerItem>
      ))}
    </Stagger>
  )
  const el = (id: string) => host.querySelector<HTMLElement>(`[data-testid="el-${id}"]`)

  it('respeta las etiquetas y deja la lista `relative` (lo que sale se saca del flujo)', () => {
    pintar(lista(['a']))
    const l = host.querySelector('[data-testid="lista"]')!
    expect(l.tagName).toBe('UL')
    expect(l.className).toMatch(/\brelative\b/)
    expect(l.className).toMatch(/\bspace-y-2\b/)
    expect(el('a')!.tagName).toBe('LI')
  })

  it('🔴 el ítem que se agrega después termina visible (modo estricto)', async () => {
    conAnimaciones()
    pintar(lista(['a']))
    await dejarQueTerminen()
    seVe(el('a'))
    pintar(lista(['a', 'nuevo']))
    await dejarQueTerminen()
    seVe(el('nuevo'))
  })
})
