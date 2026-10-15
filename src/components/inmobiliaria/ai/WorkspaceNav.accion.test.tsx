/**
 * @vitest-environment happy-dom
 *
 * WorkspaceNav — cada pestaña se gatea por SU acción, y los demás workspaces siguen preguntando 'view' (13-03,
 * Tarea 5; D13-3, U4).
 *
 * Qué prueba: en Naira toda pregunta al gate lleva la acción que la pestaña declara en `AGENT_WORKSPACES` (leída del
 * registro real: cuando 13-04..13-07 agreguen pestañas con otras acciones, esto sigue en verde); en cualquier otro
 * workspace, 'view'; y una pestaña cuya acción no se tiene no se dibuja. `WorkspaceNav.test.tsx` no se toca: esto va
 * aparte.
 *
 * Arnés: createRoot + act, i18n contra el es.json real (stub), `next/link` → `<a href>`, la ruta del test, un gate que
 * responde por conjunto y un workspace SINTÉTICO de tres pestañas de Naira (en `/__sintetica`) que el registro real no
 * tiene. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const estado = { ruta: '/panel/inmobiliaria/reportes/naira', permitidas: new Set<string>() }
  const canAccess = vi.fn((m: string, a: string) => estado.permitidas.has(m + ':' + a))
  return { estado, canAccess }
})

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({ usePathname: () => h.estado.ruta }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: h.canAccess, isAdmin: false, agencyRole: 'ADMIN' }),
}))
vi.mock('@/lib/nav/agentWorkspaceNav', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/nav/agentWorkspaceNav')>()
  const { ArrowsCounterClockwise, Newspaper, Notebook } = await import('@phosphor-icons/react')
  const SINTETICO = {
    slug: 'sintetico',
    basePath: '/__sintetica',
    labelKey: 'inmobiliaria.ai.nav.naira',
    icon: Newspaper,
    module: 'naira',
    items: [
      { labelKey: 'inmobiliaria.ai.naira.tabs.briefing', href: '/__sintetica', icon: Newspaper, exact: true, module: 'naira', action: 'briefing-view' },
      { labelKey: 'inmobiliaria.ai.naira.briefing.secciones.seguimiento', href: '/__sintetica/b', icon: ArrowsCounterClockwise, module: 'naira', action: 'open-loops-view' },
      { labelKey: 'inmobiliaria.ai.naira.inventario.madurez', href: '/__sintetica/c', icon: Notebook, module: 'naira', action: 'memory-view' },
    ],
  }
  return {
    ...real,
    findAgentWorkspace: (p: string) => (p.startsWith('/__sintetica') ? SINTETICO : real.findAgentWorkspace(p)),
  }
})

import { ACCIONES_DE_NAIRA } from '@/lib/api/naira/contrato'
import { AGENT_WORKSPACES } from '@/lib/nav/agentWorkspaceNav'
import { RUTA_DE_NAIRA } from '@/lib/nav/rutas-de-naira'

import { WorkspaceNav } from './WorkspaceNav'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  h.estado.ruta = RUTA_DE_NAIRA
  h.estado.permitidas = new Set(ACCIONES_DE_NAIRA.map((a) => 'naira:' + a))
  h.canAccess.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => root.unmount())
  contenedor.remove()
})

async function montarEn(ruta: string): Promise<void> {
  h.estado.ruta = ruta
  await act(async () => {
    root.render(<WorkspaceNav />)
  })
}

const llamadasA = (modulo: string) => h.canAccess.mock.calls.filter(([m]) => m === modulo)

describe('WorkspaceNav — la acción de cada pestaña', () => {
  it('[N13:control-positivo] en la raíz de Naira el gate pregunta por la acción del Briefing', async () => {
    await montarEn(RUTA_DE_NAIRA)
    expect(h.canAccess).toHaveBeenCalledWith('naira', 'briefing-view')
  })

  it('[N13:workspace-accion] en Naira toda pregunta lleva la acción que la pestaña declara, nunca view', async () => {
    const naira = AGENT_WORKSPACES.find((w) => w.slug === 'naira')
    expect(naira).toBeDefined()
    const declaradas = naira!.items.filter((i) => i.module === 'naira').map((i) => i.action)
    expect(declaradas.length).toBeGreaterThan(0)
    for (const a of declaradas) {
      expect(typeof a, 'pestaña de Naira sin acción').toBe('string')
      expect(a).not.toBe('view')
    }

    await montarEn(RUTA_DE_NAIRA)
    const llamadas = llamadasA('naira')
    expect(llamadas.length).toBeGreaterThan(0)
    for (const [, accion] of llamadas) {
      expect(accion).not.toBe('view')
      expect(declaradas).toContain(accion)
    }
    expect(new Set(llamadas.map(([, a]) => a))).toEqual(new Set(declaradas))
  })

  it('[N13:otros-workspaces-igual] en los demás workspaces el gate pregunta la acción que declara cada pestaña (view por defecto)', async () => {
    const otros = AGENT_WORKSPACES.filter((w) => w.slug !== 'naira')
    expect(otros.length).toBeGreaterThan(0)
    for (const ws of otros) {
      await act(async () => root.unmount())
      root = createRoot(contenedor)
      h.canAccess.mockClear()
      await montarEn(ws.basePath)
      const llamadas = h.canAccess.mock.calls
      // bugs-nico-1 también declara acciones (p. ej. Cobranza › ARCO pide `resolve-arco`): cada llamada es la acción
      // de alguna pestaña del workspace, o `view` si la pestaña no declara ninguna.
      const declaradas = new Set(ws.items.map((i) => i.action ?? 'view'))
      for (const [, accion] of llamadas) expect(declaradas.has(accion), ws.slug + ': ' + accion).toBe(true)
      if (ws.items.some((i) => i.module)) expect(llamadas.length, ws.slug).toBeGreaterThan(0)
    }
  })

  it('[N13:pestana-oculta-por-accion] una pestaña cuya acción no se tiene no se dibuja', async () => {
    h.estado.permitidas = new Set(['naira:briefing-view', 'naira:memory-view'])
    await montarEn('/__sintetica')
    expect(contenedor.querySelector('a[href="/__sintetica"]')).not.toBeNull()
    expect(contenedor.querySelector('a[href="/__sintetica/c"]')).not.toBeNull()
    expect(contenedor.querySelector('a[href="/__sintetica/b"]')).toBeNull()

    h.estado.permitidas = new Set(['naira:briefing-view', 'naira:open-loops-view', 'naira:memory-view'])
    await montarEn('/__sintetica')
    for (const href of ['/__sintetica', '/__sintetica/b', '/__sintetica/c']) {
      expect(contenedor.querySelector(`a[href="${href}"]`), href).not.toBeNull()
    }
  })
})
