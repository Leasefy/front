/**
 * AiLayout — una sola novedad, y sólo del agente en el que estás.
 *
 * Fija la regla de UX: dentro del workspace de un agente el único aviso
 * permitido es el de ESE agente. El tour multi-paso quedó eliminado porque
 * recorría agentes distintos — parado en /ai/cobranza, «Siguiente» anunciaba
 * el agente de Asegurabilidad y sacaba al usuario del agente que acababa de
 * abrir.
 *
 * `tourDismissed` es el interruptor global de novedades:
 *   false → mostrarlas · true → apagadas · null → hidratando (no parpadear).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import AiLayout from './layout'

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let pathname = '/panel/inmobiliaria/ai/cobranza'
let tourDismissed: boolean | null = false

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefs: () => ({ tourDismissed, setTourDismissed: vi.fn() }),
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
  pathname = '/panel/inmobiliaria/ai/cobranza'
  tourDismissed = false
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(<AiLayout>{null}</AiLayout>)
  })
}

const intro = () => container.querySelector('[data-testid="agent-intro"]')
const tour = () => container.querySelector('[data-testid="panel-tour"]')

describe('AiLayout — novedades', () => {
  it('nunca monta el tour multi-paso (recorría otros agentes)', () => {
    render()
    expect(tour()).toBeNull()
  })

  it('tampoco lo monta en el hub', () => {
    pathname = '/panel/inmobiliaria/ai'
    render()
    expect(tour()).toBeNull()
  })

  it('presenta el agente en el que estás, con las novedades activas', () => {
    render()
    expect(intro()?.getAttribute('data-path')).toBe('/panel/inmobiliaria/ai/cobranza')
  })

  it('sigue valiendo en una subruta profunda del agente', () => {
    pathname = '/panel/inmobiliaria/ai/cobranza/casos/abc-123'
    render()
    expect(intro()?.getAttribute('data-path')).toBe('/panel/inmobiliaria/ai/cobranza/casos/abc-123')
    expect(tour()).toBeNull()
  })

  it('no muestra nada con las novedades apagadas', () => {
    tourDismissed = true
    render()
    expect(intro()).toBeNull()
  })

  it('no parpadea mientras la preferencia hidrata (null)', () => {
    tourDismissed = null
    render()
    expect(intro()).toBeNull()
  })
})
