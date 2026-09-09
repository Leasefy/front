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
    // Las siete que sí van a producción siguen ahí.
    expect(hrefs).toEqual([
      RESUMEN,
      `${RESUMEN}/cola`,
      `${RESUMEN}/nueva`,
      `${RESUMEN}/aseguradoras`,
      `${RESUMEN}/insights`,
      `${RESUMEN}/costos`,
      `${RESUMEN}/configuracion`,
    ])
  })
})
