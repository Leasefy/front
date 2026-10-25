/**
 * La barra en reposo (21-10-2026, revisión de diseño de Operación): sin nada
 * marcado es UNA línea que nombra las acciones, sin botones apagados ni barra
 * fija; con algo marcado, la barra completa. `siempreConAcciones` la deja
 * completa para las pantallas con una acción que sirve sin marcar.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { BarraDeAccionesMasivas } from './acciones-masivas'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
function montar(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
}
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.innerHTML = ''
})

const barra = (marcadas: number, siempreConAcciones = false) => (
  <BarraDeAccionesMasivas
    marcadas={marcadas}
    queSon={['contrato', 'contratos']}
    onQuitar={() => {}}
    cuandoNoHayNada="Marca contratos para mandarles el estado de cuenta."
    siempreConAcciones={siempreConAcciones}
    testid="b"
  >
    <button type="button" disabled={marcadas === 0}>
      Mandar
    </button>
  </BarraDeAccionesMasivas>
)

describe('BarraDeAccionesMasivas en reposo', () => {
  it('sin nada marcado: la línea que nombra las acciones, sin botones ni barra fija', () => {
    montar(barra(0))
    const el = document.querySelector('[data-testid="b"]')!
    expect(el.hasAttribute('data-en-reposo')).toBe(true)
    expect(el.className).not.toContain('sticky')
    expect(el.textContent).toContain('Marca contratos para')
    expect(el.querySelector('[aria-hidden="true"] button')).not.toBeNull()
  })

  it('con algo marcado: la barra completa, pegada abajo', () => {
    montar(barra(2))
    const el = document.querySelector('[data-testid="b"]')!
    expect(el.hasAttribute('data-en-reposo')).toBe(false)
    expect(el.className).toContain('sticky')
    expect(el.textContent).toContain('Marcaste')
  })

  it('con `siempreConAcciones`, completa aun sin marcar', () => {
    montar(barra(0, true))
    expect(document.querySelector('[data-testid="b"]')!.hasAttribute('data-en-reposo')).toBe(false)
  })
})
