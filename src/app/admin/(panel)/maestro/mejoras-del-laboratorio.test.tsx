/**
 * @vitest-environment happy-dom
 *
 * /admin/maestro → Mejoras con el laboratorio (Nico, 19-10-2026): cada mejora trae su ensayo y lo que dijo el revisor;
 * lo «Por revisar» no se puede aprobar (sólo rechazar) y dice por qué; lo aplicado trae «¿Sirvió?»; el «Deshacer» del
 * maestro se confirma diciendo que cada Naira lo revierte sola.
 */
import * as React from 'react'
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

import MaestroPage from './page'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const base = {
  categoria: { dimension: 'tamano', valor: 'pequena', nombre: 'Pequeñas (hasta 149 contratos activos)' },
  evidencia: [{ id: 'a', nombre: 'Portofino' }],
  alcance: 3,
  creadaEn: '2026-10-19T06:30:00.000Z',
  decision: null,
  aplicacion: null,
  deshace: null,
  deshacerPropuesto: null,
  medicion: null,
  revision: null,
  ensayo: null,
  motivos: [],
  veredicto: 'pasa',
}
const ensayo = (veredicto: string, resumen: string) => ({ version: 1, veredicto, resumen, cifras: {}, filas: [], dias: [], grillas: [], porInmobiliaria: [] })
const RESPUESTA = {
  prendido: true,
  ajustes: { tamanoPequenaHasta: 149, tamanoMedianaHasta: 600 },
  corridas: [],
  inmobiliarias: [],
  generadoEn: '2026-10-19T07:00:00.000Z',
  propuestas: [
    {
      ...base,
      id: 'tumbada',
      estado: 'por_revisar',
      veredicto: 'por_revisar',
      motivos: ['ensayo_empeora'],
      contenido: { tipo: 'modo', agente: 'pagos', modo: 'autonomo' },
      que: 'Cobri (pagos) en Automático',
      porque: 'Se aprueba casi todo en tres inmobiliarias pequeñas.',
      ensayo: ensayo('empeora', '30 descartadas habrían salido sin revisión.'),
    },
    {
      ...base,
      id: 'buena',
      estado: 'por_decidir',
      contenido: { tipo: 'leccion', texto: 'Aclarar que la inspección se agenda desde el contrato.', agente: null },
      que: 'Enseñarle a Ori: «Aclarar que la inspección se agenda desde el contrato.»',
      porque: 'Lo preguntan en tres inmobiliarias y no se responde.',
      ensayo: ensayo('mejora', '20 preguntas reales tocan lo mismo; 8 salieron mal.'),
      revision: { aguanta: true, objecion: 'Mirar si aplica a las que no hacen inspecciones.', confianza: 'media', modelo: 'claude-sonnet-5-5' },
    },
    {
      ...base,
      id: 'deshacer',
      estado: 'por_decidir',
      contenido: { tipo: 'deshacer', propuestaId: 'vieja', que: 'Vinci (retención) en Automático' },
      que: 'Deshacer: Vinci (retención) en Automático',
      porque: 'Empeoró. A los 14 días pasó de 10 % a 30 %.',
      alcance: 2,
    },
    {
      ...base,
      id: 'vieja',
      estado: 'aplicada',
      contenido: { tipo: 'modo', agente: 'retencion', modo: 'autonomo' },
      que: 'Vinci (retención) en Automático',
      porque: 'Se aprobaba todo.',
      medicion: { veredicto: 'empeoro', resumen: 'A los 14 días pasó de 10 % a 30 %.', aLosDias: 14, medidaEn: '2026-10-19T06:30:00.000Z' },
      deshacerPropuesto: 'deshacer',
    },
  ],
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
const tarjeta = (id: string) => [...container.querySelectorAll('[data-maestro-mejora]')].find((x) => x.textContent?.includes(id)) as HTMLElement | undefined
const botonEn = (el: HTMLElement | undefined, t: string) => [...(el?.querySelectorAll('button') ?? [])].find((b) => b.textContent?.trim().startsWith(t))

describe('/admin/maestro → Mejoras con el laboratorio', () => {
  it('[MEJ-LAB:por-revisar] no se aprueba; dice por qué y trae su ensayo; sí se rechaza', async () => {
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    const t = tarjeta('Cobri (pagos) en Automático')
    expect(t?.getAttribute('data-maestro-mejora')).toBe('por_revisar')
    expect(t?.textContent).toContain('No se puede aprobar: el ensayo con 30 días reales dice que empeora.')
    expect(t?.textContent).toContain('30 descartadas habrían salido sin revisión.')
    expect(botonEn(t, 'Aprobar')).toBeUndefined()
    expect(botonEn(t, 'Rechazar')).toBeDefined()
    expect(container.textContent).toContain('por revisar · el ensayo o el revisor las tumbaron')
  })

  it('[MEJ-LAB:pasa] la que pasa trae el ensayo y lo que dijo el revisor', async () => {
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    const t = tarjeta('Aclarar que la inspección')
    expect(t?.textContent).toContain('20 preguntas reales tocan lo mismo; 8 salieron mal.')
    expect(t?.textContent).toContain('Aguanta (confianza media). Mirar si aplica a las que no hacen inspecciones.')
    expect(botonEn(t, 'Aprobar')).toBeDefined()
  })

  it('[MEJ-LAB:deshacer] «¿Sirvió?» en la aplicada; el «Deshacer» confirma que cada Naira la revierte sola', async () => {
    red.decidir.mockResolvedValue({ estado: 'aplicada', inmobiliarias: 2, porResultado: { aplicado: 2 }, porInmobiliaria: [] })
    await act(async () => root.render(<MaestroPage />))
    await asentar()
    expect(container.textContent).toContain('Empeoró. A los 14 días pasó de 10 % a 30 %. El maestro propone deshacerla (arriba, por decidir).')
    const t = tarjeta('Deshacer: Vinci')
    expect(t?.textContent).toContain('Empeoró en: Portofino')
    await act(async () => botonEn(t, 'Deshacer en todas')!.click())
    expect(container.textContent).toContain('la revierte sola, ahora mismo (2)')
    await act(async () => botonEn(tarjeta('Deshacer: Vinci'), 'Sí, aprobar y repartir')!.click())
    await asentar()
    expect(red.decidir).toHaveBeenCalledWith('deshacer', 'aprobar')
    expect(container.textContent).toContain('Listo: se deshizo en 2 inmobiliarias.')
  })
})
