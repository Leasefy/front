/**
 * rutas-de-naira.preguntar.test.ts — la pestaña Preguntar en el registro de Naira (13-06, Tarea 4).
 *
 * Qué prueba: el workspace de Naira tiene la pestaña con su acción real (`conversation-ask`), su icono y su lugar (después
 * de Aprobaciones) y su página la exige; la pestaña tiene página y el destino de «Ir a Aprobaciones» también; ninguna
 * pregunta tiene URL (el texto no va a la barra ni al historial). Marcador en el TÍTULO.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ChatTeardropText } from '@phosphor-icons/react'
import { describe, expect, it } from 'vitest'

import { AGENT_WORKSPACES } from './agentWorkspaceNav'
import * as rutas from './rutas-de-naira'
import { RUTA_DE_APROBACIONES, RUTA_DE_NAIRA } from './rutas-de-naira'

const CARPETA = 'src/app/panel/inmobiliaria/reportes/naira/preguntar'
const PAGINA = CARPETA + '/page.tsx'
const PAGINA_DE_APROBACIONES = 'src/app/panel/inmobiliaria/reportes/naira/aprobaciones/page.tsx'

function workspaceDeNaira() {
  const ws = AGENT_WORKSPACES.find((w) => w.slug === 'naira')
  expect(ws).toBeDefined()
  return ws!
}

describe('pestaña Preguntar de Naira', () => {
  it('[N13:control-positivo] el workspace de Naira tiene una pestaña con conversation-ask', () => {
    expect(workspaceDeNaira().items.some((i) => i.action === 'conversation-ask')).toBe(true)
  })

  it('[N13:pestana-por-su-accion] la pestaña va después de Aprobaciones, con su icono y su acción, y su página la exige', () => {
    const ws = workspaceDeNaira()
    const i = ws.items.findIndex((x) => x.action === 'conversation-ask')
    const iAprobaciones = ws.items.findIndex((x) => x.action === 'action-view')
    expect(i).toBeGreaterThanOrEqual(0)
    expect(iAprobaciones).toBeGreaterThanOrEqual(0)
    expect(i).toBe(iAprobaciones + 1)
    const item = ws.items[i]!
    expect(item.labelKey).toBe('inmobiliaria.ai.naira.tabs.preguntar')
    expect(item.href).toBe(RUTA_DE_NAIRA + '/preguntar')
    expect(item.icon).toBe(ChatTeardropText)
    expect(item.module).toBe('naira')
    expect(item.exact).toBeUndefined()
    const fuente = readFileSync(join(process.cwd(), PAGINA), 'utf8')
    const guard = /<PageGuard\b([^>]*)>/.exec(fuente)
    expect(guard).not.toBeNull()
    expect(guard![1]).toContain('module="naira"')
    expect(guard![1]).toContain('action="conversation-ask"')
  })

  it('[N13:ruta-con-pagina] la pestaña y el destino de Ir a Aprobaciones tienen su página', () => {
    expect(existsSync(join(process.cwd(), PAGINA))).toBe(true)
    expect(RUTA_DE_APROBACIONES).toBe(RUTA_DE_NAIRA + '/aprobaciones')
    expect(existsSync(join(process.cwd(), PAGINA_DE_APROBACIONES))).toBe(true)
  })

  it('[N13:sin-url-por-pregunta] ninguna pregunta tiene URL: sin subcarpetas ni rutas de preguntas en el registro', () => {
    const subcarpetas = readdirSync(join(process.cwd(), CARPETA), { withFileTypes: true }).filter((e) => e.isDirectory())
    expect(subcarpetas.map((e) => e.name)).toEqual([])
    const nombres = Object.keys(rutas)
    expect(nombres.length).toBeGreaterThan(0)
    expect(nombres.filter((n) => n.toLowerCase().includes('regunt'))).toEqual([])
  })
})
