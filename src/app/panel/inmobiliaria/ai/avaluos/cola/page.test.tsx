/**
 * cola/page.test.tsx — el estado vacío no puede ofrecer una puerta cerrada.
 *
 * Esta pestaña es la única pantalla que ve alguien que todavía no pidió ningún
 * avalúo, y su estado vacío ofrecía «Solicitar avalúo» apuntando al Resumen.
 * Pero en el Resumen ese mismo botón está DESHABILITADO cuando el micro de
 * avalúos no está conectado (`NEXT_PUBLIC_AVALUO_API_URL` sin definir, que es
 * el caso hoy en todos los worktrees). O sea: la salida llevaba a otra puerta
 * cerrada, y encima sin decir por qué.
 *
 * El criterio es el mismo que en el Resumen —si no se alcanza el servicio, no
 * se ofrece la acción— y se decide acá, en el call site, no adentro de
 * <ColaHumana>: es esta pantalla la que sabe a dónde manda su CTA.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── El origen del micro, controlable por test ─────────────────────────────
let _origen = ''
vi.mock('@/lib/avaluo/wizard-url', () => ({
  get AVALUO_WIZARD_ORIGIN() {
    return _origen
  },
  get AVALUO_WIZARD_URL() {
    return _origen ? `${_origen}/avaluo` : ''
  },
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/lib/i18n', () => ({
  // Devolver la clave alcanza: lo que se prueba es CUÁL se elige, no su texto.
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/lib/hooks/ai/use-agent-work-items', () => ({
  useAgentWorkItems: () => ({
    items: [],
    total: 0,
    isLoading: false,
    error: null,
    runAction: vi.fn(),
  }),
}))

// <ColaHumana> tiene sus propios tests; acá interesa QUÉ le pasa la página.
const props: { emptyAction?: unknown; emptyHint?: unknown } = {}
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({
  ColaHumana: (p: { emptyAction?: unknown; emptyHint?: unknown }) => {
    props.emptyAction = p.emptyAction
    props.emptyHint = p.emptyHint
    return null
  },
}))

import AvaluosColaPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _origen = ''
  delete props.emptyAction
  delete props.emptyHint
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(AvaluosColaPage))
  })
}

const NS = 'inmobiliaria.ai.workspace.pages.avaluos'

describe('Cola de Avalúos — el vacío no manda a una puerta cerrada', () => {
  it('sin servicio conectado no ofrece el CTA, y dice por qué', async () => {
    await montar()

    expect(props.emptyAction).toBeUndefined()
    expect(props.emptyHint).toBe(`${NS}.solicitarUnavailable`)
  })

  it('con el servicio conectado sí ofrece pedir el primero', async () => {
    _origen = 'http://localhost:3003'
    await montar()

    expect(props.emptyAction).toEqual({
      label: `${NS}.solicitarCta`,
      href: '/panel/inmobiliaria/ai/avaluos',
    })
    expect(props.emptyHint).toBe(`${NS}.colaEmptyHint`)
  })
})
