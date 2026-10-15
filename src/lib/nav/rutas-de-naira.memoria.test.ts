/**
 * rutas-de-naira.memoria.test.ts — la ruta de «Qué cree Naira» en el registro de rutas y su pestaña en el workspace (13-07,
 * Tarea 4). Qué prueba: la ruta y sus filtros codificados; la pestaña es la 5.ª y última del workspace `naira`, gateada por
 * `memory-view` en el registro Y en el primer PageGuard de su página. Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Notebook } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'

import { AGENT_WORKSPACES } from './agentWorkspaceNav'
import { RUTA_DE_LA_MEMORIA, RUTA_DE_NAIRA, rutaDeLaMemoria } from './rutas-de-naira'

const PAGINA = 'src/app/panel/inmobiliaria/reportes/naira/memoria/page.tsx'
const naira = () => AGENT_WORKSPACES.find((w) => w.slug === 'naira')

describe('rutas de la memoria de Naira', () => {
  it('[N13:control-positivo] la ruta y sus filtros solo con lo elegido, en orden', () => {
    expect(RUTA_DE_LA_MEMORIA).toBe(RUTA_DE_NAIRA + '/memoria')
    expect(rutaDeLaMemoria()).toBe(RUTA_DE_LA_MEMORIA)
    expect(rutaDeLaMemoria({ capa: 'todas', procedencia: 'todas' })).toBe(RUTA_DE_LA_MEMORIA)
    expect(rutaDeLaMemoria({ capa: 'procedural', procedencia: 'todas' })).toBe(RUTA_DE_LA_MEMORIA + '?capa=procedural')
    expect(rutaDeLaMemoria({ capa: 'todas', procedencia: 'inferred' })).toBe(RUTA_DE_LA_MEMORIA + '?procedencia=inferred')
    expect(rutaDeLaMemoria({ capa: 'semantic', procedencia: 'observed' })).toBe(
      RUTA_DE_LA_MEMORIA + '?capa=semantic&procedencia=observed',
    )
  })

  it('[N13:rutas-del-workspace] el workspace naira monta la pestaña en la ruta del registro', () => {
    const w = naira()
    expect(w?.basePath).toBe(RUTA_DE_NAIRA)
    const item = w?.items.find((i) => i.action === 'memory-view')
    expect(item?.href).toBe(RUTA_DE_LA_MEMORIA)
  })

  it('[N13:pestana-por-su-accion] la 5.ª y última pestaña, gateada por memory-view en el registro y en su página', () => {
    const items = naira()?.items ?? []
    const i = items.findIndex((x) => x.action === 'memory-view')
    const item = items[i]
    expect(item?.labelKey).toBe('inmobiliaria.ai.naira.tabs.memoria')
    expect(item?.icon).toBe(Notebook)
    expect(item?.module).toBe('naira')
    expect((item as { exact?: boolean } | undefined)?.exact).toBeUndefined()
    expect(items[i - 1]?.action).toBe('conversation-ask')
    expect(i).toBe(items.length - 1)
    const fuente = readFileSync(join(process.cwd(), PAGINA), 'utf8')
    const primero = /<PageGuard\b([^>]*)>/.exec(fuente)
    expect(primero?.[1]).toContain('module="naira"')
    expect(primero?.[1]).toContain('action="memory-view"')
  })

  it('[N13:pestana-con-pagina] la pestaña tiene su página', () => {
    expect(existsSync(join(process.cwd(), PAGINA))).toBe(true)
  })

  it('[N13:sin-href-del-agente] los filtros se codifican: nada escapa de la consulta', () => {
    const r = rutaDeLaMemoria({ capa: '../../x', procedencia: 'a&b=c#d' })
    expect(r.startsWith(RUTA_DE_LA_MEMORIA + '?')).toBe(true)
    const consulta = r.slice((RUTA_DE_LA_MEMORIA + '?').length)
    expect(consulta).not.toContain('/')
    expect(consulta).not.toContain('#')
    const p = new URLSearchParams(consulta)
    expect(p.get('capa')).toBe('../../x')
    expect(p.get('procedencia')).toBe('a&b=c#d')
    expect([...p.keys()]).toEqual(['capa', 'procedencia'])
  })
})
