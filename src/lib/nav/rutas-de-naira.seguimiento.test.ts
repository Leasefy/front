/**
 * rutas-de-naira.seguimiento.test.ts — la ruta y la pestaña Seguimiento de Naira (13-04, Tarea 4).
 *
 * Qué prueba: las rutas del seguimiento salen del registro de 13-03; la pestaña vive en el workspace `naira`, justo después
 * del Briefing, con su icono y su acción real, y su página tiene un PageGuard con esa misma acción; las páginas de destino
 * existen; y un id hostil no escapa del prefijo del registro. Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ArrowsCounterClockwise } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'

import { AGENT_WORKSPACES } from './agentWorkspaceNav'
import { RUTA_DE_NAIRA, RUTA_DEL_SEGUIMIENTO, rutaDelLoop } from './rutas-de-naira'

const PAGINA = 'src/app/panel/inmobiliaria/reportes/naira/seguimiento/page.tsx'
const PAGINA_DE_LA_SENAL = 'src/app/panel/inmobiliaria/reportes/naira/senales/[promocionId]/page.tsx'

function workspaceDeNaira() {
  const ws = AGENT_WORKSPACES.find((w) => w.slug === 'naira')
  expect(ws).toBeDefined()
  return ws!
}

describe('rutas y pestaña del seguimiento', () => {
  it('[N13:control-positivo] la ruta de un loop y la de la pestaña salen del registro', () => {
    expect(rutaDelLoop('L-1')).toBe('/panel/inmobiliaria/reportes/naira/seguimiento/L-1')
    expect(RUTA_DEL_SEGUIMIENTO).toBe(RUTA_DE_NAIRA + '/seguimiento')
  })

  it('[N13:rutas-del-workspace] el workspace de Naira apunta a la pestaña del registro', () => {
    const ws = workspaceDeNaira()
    expect(ws.basePath).toBe(RUTA_DE_NAIRA)
    const item = ws.items.find((i) => i.action === 'open-loops-view')
    expect(item).toBeDefined()
    expect(item?.href).toBe(RUTA_DEL_SEGUIMIENTO)
  })

  it('[N13:pestana-por-su-accion] la pestaña va después del Briefing, con su icono y su acción, y su página la exige', () => {
    const ws = workspaceDeNaira()
    const i = ws.items.findIndex((x) => x.action === 'open-loops-view')
    const iBriefing = ws.items.findIndex((x) => x.action === 'briefing-view')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(iBriefing).toBeGreaterThanOrEqual(0)
    expect(i).toBe(iBriefing + 1)
    const item = ws.items[i]!
    expect(item.labelKey).toBe('inmobiliaria.ai.naira.tabs.seguimiento')
    expect(item.icon).toBe(ArrowsCounterClockwise)
    expect(item.module).toBe('naira')
    expect(item.exact).toBeUndefined()
    const fuente = readFileSync(join(process.cwd(), PAGINA), 'utf8')
    const guard = /<PageGuard\b([^>]*)>/.exec(fuente)
    expect(guard).not.toBeNull()
    expect(guard![1]).toContain('module="naira"')
    expect(guard![1]).toContain('action="open-loops-view"')
  })

  it('[N13:ruta-con-pagina] la pestaña y la señal enlazada tienen su página', () => {
    expect(existsSync(join(process.cwd(), PAGINA))).toBe(true)
    expect(existsSync(join(process.cwd(), PAGINA_DE_LA_SENAL))).toBe(true)
  })

  it('[N13:sin-href-del-agente] un id hostil queda codificado dentro del prefijo del registro', () => {
    for (const id of ['../../x', 'https://evil.test', 'javascript:alert(1)', 'a/b?c#d', '%2e%2e']) {
      const ruta = rutaDelLoop(id)
      expect(ruta.startsWith(RUTA_DEL_SEGUIMIENTO + '/'), id).toBe(true)
      const resto = ruta.slice((RUTA_DEL_SEGUIMIENTO + '/').length)
      expect(resto, id).toBe(encodeURIComponent(id))
      expect(resto, id).not.toMatch(/[/?#]/)
    }
  })
})
