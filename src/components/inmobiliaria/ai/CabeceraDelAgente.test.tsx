/**
 * CabeceraDelAgente — una sola novedad, y sólo del agente en el que estás.
 *
 * Vivía en el layout del namespace `/ai` (retirado); los agentes ya no cuelgan de
 * `/ai/*` y esto se monta una vez en el layout del panel.
 *
 * Fija la regla de UX: dentro del workspace de un agente el único aviso
 * permitido es el de ESE agente. El tour multi-paso quedó eliminado porque
 * recorría agentes distintos — parado en /ai/cobranza, «Siguiente» anunciaba
 * el agente de Asegurabilidad y sacaba al usuario del agente que acababa de
 * abrir.
 *
 * `tourDismissed` dice si la INMOBILIARIA ya vio el recorrido del panel
 * (23-09): la presentación del agente sale DESPUÉS del recorrido, nunca
 * encima ni mientras no se sabe:
 *   true → el recorrido ya pasó: se presenta · false → el recorrido está
 *   saliendo: espera · null → no se sabe: nada.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CabeceraDelAgente } from './CabeceraDelAgente'

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let pathname = '/panel/inmobiliaria/pagos/cobranza'
let tourDismissed: boolean | null = true

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefs: () => ({ tourDismissed }),
}))

// El nav del workspace hace fetch propio — fuera del alcance de este test.
vi.mock('@/components/inmobiliaria/ai/WorkspaceNav', () => ({
  WorkspaceNav: () => null,
}))

// Si el layout volviera a montar el tour multi-paso, este doble lo delataría.
vi.mock('@/components/tour/PanelTour', () => ({
  PanelTour: () => <div data-testid="panel-tour" />,
}))

// Double que refleja el contrato real: se muestra salvo que venga suprimido.
vi.mock('@/components/tour/AgentIntroModal', () => ({
  AgentIntroModal: ({ pathname: p, suppressed }: { pathname: string; suppressed?: boolean }) =>
    suppressed ? null : <div data-testid="agent-intro" data-path={p} />,
}))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  pathname = '/panel/inmobiliaria/pagos/cobranza'
  tourDismissed = true
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(<CabeceraDelAgente />)
  })
}

const intro = () => container.querySelector('[data-testid="agent-intro"]')
const tour = () => container.querySelector('[data-testid="panel-tour"]')

describe('CabeceraDelAgente — novedades', () => {
  it('nunca monta el tour multi-paso (recorría otros agentes)', () => {
    render()
    expect(tour()).toBeNull()
  })

  it('tampoco lo monta en el hub', () => {
    pathname = '/panel/inmobiliaria/configuracion/agentes'
    render()
    expect(tour()).toBeNull()
  })

  it('presenta el agente en el que estás, cuando la inmobiliaria ya vio el recorrido', () => {
    render()
    expect(intro()?.getAttribute('data-path')).toBe('/panel/inmobiliaria/pagos/cobranza')
  })

  it('sigue valiendo en una subruta profunda del agente', () => {
    pathname = '/panel/inmobiliaria/pagos/cobranza/casos/abc-123'
    render()
    expect(intro()?.getAttribute('data-path')).toBe('/panel/inmobiliaria/pagos/cobranza/casos/abc-123')
    expect(tour()).toBeNull()
  })

  it('🔴 no se monta ENCIMA del recorrido del panel (false: el recorrido está saliendo)', () => {
    tourDismissed = false
    render()
    expect(intro()).toBeNull()
  })

  it('🔴 que la inmobiliaria ya haya visto el recorrido NO apaga las presentaciones (el sentido viejo las mataba para siempre)', () => {
    tourDismissed = true
    render()
    expect(intro()).not.toBeNull()
  })

  it('no parpadea mientras no se sabe si la inmobiliaria ya vio el recorrido (null)', () => {
    tourDismissed = null
    render()
    expect(intro()).toBeNull()
  })
})
