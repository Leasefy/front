/**
 * Ronda 30 (K4, tras el cajón): las acciones del caso van en el PIE FIJO del
 * cajón, no al final del cuerpo (con la vista previa larga había que bajar
 * para aprobar). Fuera del cajón —la página `[id]`— quedan donde siempre.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CajonDelCaso, EnElPieDelCajon } from './CajonDelCaso'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  document.body.innerHTML = ''
})

const q = (id: string) => document.querySelector(`[data-testid="${id}"]`)

function Detalle() {
  return (
    <div data-testid="detalle-cuerpo">
      <p>Vista previa larga</p>
      <EnElPieDelCajon>
        <button type="button" data-testid="approval-aprobar-x">Aprobar</button>
      </EnElPieDelCajon>
    </div>
  )
}

describe('CajonDelCaso — las acciones en el pie fijo', () => {
  it('dentro del cajón, aprobar se pinta en su pie y no al final del cuerpo', async () => {
    await act(async () => {
      root.render(
        <CajonDelCaso abierto onCerrar={() => undefined} titulo="Carta" data-testid="cajon-prueba">
          <Detalle />
        </CajonDelCaso>,
      )
    })
    await act(async () => {})
    const pie = q('cajon-del-caso-pie')
    expect(pie).not.toBeNull()
    expect(pie?.querySelector('[data-testid="approval-aprobar-x"]')).not.toBeNull()
    expect(q('detalle-cuerpo')?.querySelector('[data-testid="approval-aprobar-x"]')).toBeNull()
  })

  it('fuera del cajón (la página [id]), las acciones quedan en su lugar', async () => {
    await act(async () => {
      root.render(<Detalle />)
    })
    expect(q('detalle-cuerpo')?.querySelector('[data-testid="approval-aprobar-x"]')).not.toBeNull()
    expect(q('cajon-del-caso-pie')).toBeNull()
  })

  it('sin acciones (cargando, sólo lectura) no pinta un pie vacío', async () => {
    await act(async () => {
      root.render(
        <CajonDelCaso abierto onCerrar={() => undefined} titulo="Escalación">
          <p>Sólo lectura</p>
        </CajonDelCaso>,
      )
    })
    expect(q('cajon-del-caso-pie')).toBeNull()
  })
})
