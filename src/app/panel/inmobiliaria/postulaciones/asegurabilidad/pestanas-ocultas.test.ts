/**
 * Asegurabilidad — las tres pestañas que eran maquetas.
 *
 * «Comparador» tenía los criterios escritos a mano y barras grises sin dato;
 * «Ejecución» mostraba «Aseguradora A…G» rotuladas «datos ilustrativos»;
 * «Integraciones» ofrecía seis «Conectar» deshabilitados y diez métricas en
 * «—». Ninguna leía del micro. Se retiraron de la lista de pestañas y sus
 * rutas redirigen al Resumen de la sección, como hizo `avaluos-ia` con las
 * pantallas que afirmaban envíos que no ocurrían.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// No relanza: en Next `redirect()` corta el render con una excepción, pero acá
// lo único que interesa es A DÓNDE manda.
const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))

import CompararOcultaPage from './comparar/page'
import EjecucionOcultaPage from './ejecucion/page'
import IntegracionesOcultaPage from './integraciones/page'
import { AGENT_WORKSPACES } from '@/lib/nav/agentWorkspaceNav'

const RESUMEN = '/panel/inmobiliaria/postulaciones/asegurabilidad'

beforeEach(() => redirectMock.mockClear())

describe('asegurabilidad — pestañas que eran maquetas', () => {
  it('/comparar ya no sostiene la matriz inventada: redirige al Resumen', () => {
    CompararOcultaPage()
    expect(redirectMock).toHaveBeenCalledWith(RESUMEN)
  })

  it('/ejecucion ya no sostiene «Aseguradora A…G»: redirige al Resumen', () => {
    EjecucionOcultaPage()
    expect(redirectMock).toHaveBeenCalledWith(RESUMEN)
  })

  it('/integraciones ya no ofrece «Conectar» sin conexión: redirige al Resumen', () => {
    IntegracionesOcultaPage()
    expect(redirectMock).toHaveBeenCalledWith(RESUMEN)
  })

  it('la lista de pestañas de la sección ya no las ofrece', () => {
    const ws = AGENT_WORKSPACES.find((w) => w.slug === 'asegurabilidad')
    expect(ws).toBeDefined()
    const hrefs = ws!.items.map((i) => i.href)
    expect(hrefs).not.toContain(`${RESUMEN}/comparar`)
    expect(hrefs).not.toContain(`${RESUMEN}/ejecucion`)
    expect(hrefs).not.toContain(`${RESUMEN}/integraciones`)
    // Las cinco que sí van a producción siguen ahí. «Por revisar» (`/cola`)
    // salió el 05-10-2026 (PROMESAS-Y-DIRECTOR, opción A de main): la cola del
    // cotizador el micro la devuelve SIEMPRE vacía a propósito
    // (`agency-ai-hub-work-items.ts`, `case 'cotizador'` → `emptyResponse`: el
    // motor resuelve cada cotización solo y no deja nada que aprobar). Una
    // pestaña que lleva a nada es una pestaña muerta; la ruta sigue viva por URL.
    expect(hrefs).toEqual([
      RESUMEN,
      `${RESUMEN}/aseguradoras`,
      `${RESUMEN}/insights`,
      `${RESUMEN}/costos`,
      `${RESUMEN}/configuracion`,
    ])
  })

  it('«Nueva consulta» ya no es pestaña, pero la ruta sigue viva', () => {
    // Nico (2026-09-08): «¿para qué tienes una sección de nueva consulta si
    // tienes un CTA en Resumen? Deja lo de Resumen y ya». La pestaña se va;
    // la pantalla no, porque es a donde lleva ese CTA.
    const ws = AGENT_WORKSPACES.find((w) => w.slug === 'asegurabilidad')
    expect(ws!.items.map((i) => i.href)).not.toContain(`${RESUMEN}/nueva`)
  })
})
