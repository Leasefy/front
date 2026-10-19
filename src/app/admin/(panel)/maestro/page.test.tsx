/**
 * @vitest-environment happy-dom
 *
 * /admin/maestro — el maestro de Leasefy (Fase 3 y 4 de «Naira lo sabe todo», Nico 19-10-2026): las mejoras por decidir con
 * su porqué y dónde se vio; aprobar pide confirmar y, confirmado, reparte y dice a cuántas llegó; los insights con el nombre
 * de cada inmobiliaria donde el modelo escribió su alias; el menú lo enlaza.
 */

import * as React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({ getMaestro: vi.fn(), decidir: vi.fn() }))

vi.mock('@/lib/admin/agent-api', () => ({
  getMaestro: red.getMaestro,
  decidirMejoraDelMaestro: red.decidir,
  getDiariosDelMaestro: vi.fn(async () => ({ desde: '', hasta: '', diarios: [] })),
  getDiarioDelMaestro: vi.fn(),
  guardarAjustesDelMaestro: vi.fn(),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/maestro', useRouter: () => ({ push: vi.fn() }) }))

import { conNombres, queProponeLaMejora } from '@/lib/admin/maestro'

import MaestroPage from './page'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const MEJORA = {
  id: 'p1',
  estado: 'por_decidir',
  contenido: { tipo: 'leccion', texto: 'Suelen descartar las inspecciones de salida que prepara Vidi.', agente: 'inspeccion' },
  categoria: { dimension: 'tamano', valor: 'pequena', nombre: 'Pequeñas (hasta 149 contratos activos)' },
  porque: 'En tres inmobiliarias pequeñas descartaron las 27 inspecciones de salida del mes.',
  evidencia: [
    { id: 'a', nombre: 'Arrendamientos Sur' },
    { id: 'b', nombre: 'Casas del Valle' },
    { id: 'c', nombre: 'Inmobiliaria Norte' },
  ],
  alcance: 4,
  creadaEn: '2026-10-19T06:30:00.000Z',
  decision: null,
  aplicacion: null,
}
const RESPUESTA = {
  prendido: true,
  ajustes: { tamanoPequenaHasta: 149, tamanoMedianaHasta: 600 },
  corridas: [
    {
      id: 'c1',
      dia: '2026-10-18',
      estado: 'listo',
      modelo: 'claude-sonnet-5-5',
      costoUsd: 0.12,
      diarios: 12,
      inmobiliarias: 4,
      insights: [{ titulo: 'Vidi no sirve en I1', detalle: 'En I1 e I2 se descartó todo.', tipo: 'agente', inmobiliarias: [{ id: 'a', nombre: 'Arrendamientos Sur' }] }],
      alias: { I1: 'Arrendamientos Sur', I2: 'Casas del Valle' },
      descubiertas: [],
      descartadas: [],
      creadaEn: '2026-10-19T06:30:00.000Z',
    },
  ],
  propuestas: [MEJORA],
  inmobiliarias: [{ id: 'a', nombre: 'Arrendamientos Sur', tamano: 'pequena', ciudad: 'medellin', negocio: 'arriendos' }],
  generadoEn: '2026-10-19T07:00:00.000Z',
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  red.getMaestro.mockReset()
  red.decidir.mockReset()
  red.getMaestro.mockResolvedValue(RESPUESTA)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const asentar = async () => {
  for (let i = 0; i < 5; i++) await act(async () => await Promise.resolve())
}
const boton = (t: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(t))

describe('/admin/maestro', () => {
  it('[MAESTRO-F:mejoras] la mejora por decidir con su porqué, su categoría y dónde se vio', async () => {
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    const m = container.querySelector('[data-maestro-mejora="por_decidir"]')
    expect(m?.textContent).toContain('Enseñarle a Ori: «Suelen descartar las inspecciones de salida que prepara Vidi.»')
    expect(m?.textContent).toContain('Pequeñas (hasta 149 contratos activos)')
    expect(m?.textContent).toContain('Lo vio en: Arrendamientos Sur, Casas del Valle, Inmobiliaria Norte')
  })

  it('[MAESTRO-F:aprobar] aprobar pide confirmar; confirmado, reparte y dice a cuántas llegó', async () => {
    red.decidir.mockResolvedValue({ estado: 'aplicada', inmobiliarias: 4, porResultado: { aplicado: 4 }, porInmobiliaria: [] })
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    await act(async () => boton('Aprobar')!.click())
    expect(red.decidir).not.toHaveBeenCalled()
    expect(container.textContent).toContain('la aplica sola, ahora mismo')
    await act(async () => boton('Sí, aprobar y repartir')!.click())
    await asentar()
    expect(red.decidir).toHaveBeenCalledWith('p1', 'aprobar')
    expect(container.textContent).toContain('Listo: llegó a 4 inmobiliarias.')
  })

  it('[MAESTRO-F:insights] los insights dicen el nombre donde el modelo escribió el alias', async () => {
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    await act(async () => boton('Insights')!.click())
    expect(container.textContent).toContain('Vidi no sirve en Arrendamientos Sur')
    expect(container.textContent).toContain('En Arrendamientos Sur e Casas del Valle se descartó todo.')
    expect(conNombres('I12 e I1', { I1: 'Uno' })).toBe('I12 e Uno')
    expect(queProponeLaMejora({ tipo: 'modo', agente: 'inspeccion', modo: 'sombra' })).toBe('Poner a inspeccion en Manual')
  })

  it('[MAESTRO-F:menu] el menú del admin enlaza /admin/maestro', () => {
    const nav = readFileSync(resolve(__dirname, '../../../../components/admin/Nav.tsx'), 'utf8')
    expect(nav).toContain("href: '/admin/maestro'")
  })
})
