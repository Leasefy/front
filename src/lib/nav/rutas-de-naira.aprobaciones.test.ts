/**
 * rutas-de-naira.aprobaciones.test.ts — las rutas y la pestaña de Aprobaciones en el registro de Naira (13-05, Tareas 4-5).
 *
 * Qué prueba: la ruta de una propuesta y la de la pestaña salen del registro; el workspace de Naira apunta a la pestaña con
 * su acción real (`action-view`), su icono y su lugar (después de Seguimiento), y su página la exige; la pestaña tiene
 * página; y un id hostil queda codificado dentro del prefijo del registro (nunca un `href` del agente). Marcador en el
 * TÍTULO.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SealCheck } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'

import { AGENT_WORKSPACES, findAgentWorkspace } from './agentWorkspaceNav'
import { RUTA_DE_APROBACIONES, RUTA_DE_NAIRA, rutaDeLaPropuesta } from './rutas-de-naira'

const PAGINA = 'src/app/panel/inmobiliaria/reportes/naira/aprobaciones/page.tsx'
const PAGINA_DE_LA_FICHA = 'src/app/panel/inmobiliaria/reportes/naira/aprobaciones/[proposalId]/page.tsx'

function workspaceDeNaira() {
  const ws = AGENT_WORKSPACES.find((w) => w.slug === 'naira')
  expect(ws).toBeDefined()
  return ws!
}

describe('rutas y pestaña de las aprobaciones', () => {
  it('[N13:control-positivo] la ruta de una propuesta y la de la pestaña salen del registro', () => {
    expect(rutaDeLaPropuesta('P-1')).toBe('/panel/inmobiliaria/reportes/naira/aprobaciones/P-1')
    expect(RUTA_DE_APROBACIONES).toBe(RUTA_DE_NAIRA + '/aprobaciones')
  })

  it('[N13:rutas-del-workspace] el workspace de Naira apunta a la pestaña del registro', () => {
    const ws = workspaceDeNaira()
    expect(ws.basePath).toBe(RUTA_DE_NAIRA)
    const item = ws.items.find((i) => i.action === 'action-view')
    expect(item).toBeDefined()
    expect(item?.href).toBe(RUTA_DE_APROBACIONES)
  })

  it('[N13:pestana-por-su-accion] la pestaña va después de Seguimiento, con su icono y su acción, y su página la exige', () => {
    const ws = workspaceDeNaira()
    const i = ws.items.findIndex((x) => x.action === 'action-view')
    const iSeguimiento = ws.items.findIndex((x) => x.action === 'open-loops-view')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(iSeguimiento).toBeGreaterThanOrEqual(0)
    expect(i).toBe(iSeguimiento + 1)
    const item = ws.items[i]!
    expect(item.labelKey).toBe('inmobiliaria.ai.naira.tabs.aprobaciones')
    expect(item.icon).toBe(SealCheck)
    expect(item.module).toBe('naira')
    expect(item.exact).toBeUndefined()
    const fuente = readFileSync(join(process.cwd(), PAGINA), 'utf8')
    const guard = /<PageGuard\b([^>]*)>/.exec(fuente)
    expect(guard).not.toBeNull()
    expect(guard![1]).toContain('module="naira"')
    expect(guard![1]).toContain('action="action-view"')
  })

  it('[N13:pestana-con-pagina] la pestaña tiene su página', () => {
    expect(existsSync(join(process.cwd(), PAGINA))).toBe(true)
  })

  it('[N13:ficha-con-pagina] la ficha de una propuesta tiene su página, con la acción de la pestaña, y es del workspace', () => {
    expect(existsSync(join(process.cwd(), PAGINA_DE_LA_FICHA))).toBe(true)
    const fuente = readFileSync(join(process.cwd(), PAGINA_DE_LA_FICHA), 'utf8')
    const guard = /<PageGuard\b([^>]*)>/.exec(fuente)
    expect(guard).not.toBeNull()
    expect(guard![1]).toContain('module="naira"')
    expect(guard![1]).toContain('action="action-view"')
    expect(findAgentWorkspace(rutaDeLaPropuesta('P-1'))?.slug).toBe('naira')
  })

  it('[N13:sin-href-del-agente] un id hostil queda codificado dentro del prefijo del registro', () => {
    for (const id of ['../../x', 'https://evil.test', 'javascript:alert(1)', 'a/b?c#d', '%2e%2e']) {
      const ruta = rutaDeLaPropuesta(id)
      expect(ruta.startsWith(RUTA_DE_APROBACIONES + '/'), id).toBe(true)
      const resto = ruta.slice((RUTA_DE_APROBACIONES + '/').length)
      expect(resto, id).toBe(encodeURIComponent(id))
      expect(resto, id).not.toMatch(/[/?#]/)
    }
  })
})
