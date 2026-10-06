/**
 * @vitest-environment happy-dom
 *
 * IN-08 (QA de Inmuebles, 04-10): en «Importar propiedades» la etiqueta
 * «Guiado» de «Desde portales» quedaba más arriba que las de las otras tres
 * tarjetas. La causa: cada tarjeta es un <button>, y un botón CENTRA su
 * contenido en vertical; la de portales tiene la descripción más larga, así
 * que es la más alta y las demás —estiradas por la grilla a su altura—
 * bajaban su contenido. Con el contenido arriba (columna, `justify-start`)
 * las etiquetas quedan alineadas, sin depender del largo de cada texto.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))
vi.mock('../lib/parseFile', () => ({ downloadTemplate: vi.fn() }))

import { StepChooseMethod } from './StepChooseMethod'

let host: HTMLDivElement
let root: Root

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('IN-08: las cuatro tarjetas de método ponen su contenido arriba', () => {
  it('cada tarjeta es una columna con el contenido arriba, no centrado', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root.render(
        <StepChooseMethod state={{ method: null } as never} updateState={vi.fn()} />,
      )
    })
    const tarjetas = ['enlaces', 'excel', 'software', 'portal'].map(
      (m) => host.querySelector(`[data-testid="metodo-${m}"]`) as HTMLElement | null,
    )
    expect(tarjetas.every(Boolean)).toBe(true)
    for (const t of tarjetas) {
      const clases = t!.className.split(/\s+/)
      expect(clases).toEqual(expect.arrayContaining(['flex', 'flex-col', 'justify-start']))
    }
  })
})
