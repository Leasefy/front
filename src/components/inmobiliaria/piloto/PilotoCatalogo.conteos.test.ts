/**
 * 🟡 PI-33 (QA-PILOTO 04-10-2026; PILOTO-ACTIVO) — los chips del catálogo
 * cuentan lo que QUEDA con los otros filtros puestos. Antes «Sin modo 26» con
 * «Captación» elegida mostraba 2 filas: los chips de modo no miraban el área.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))

import { conteosDelCatalogo } from './PilotoCatalogo'
import type { ProcesoDelCatalogo } from '@/lib/api/piloto'

const p = (id: string, area: string, modo: string | null, nombre = id): ProcesoDelCatalogo =>
  ({ id, area, modo, nombre, queHace: '', quien: { etiqueta: '' }, disparador: '' }) as unknown as ProcesoDelCatalogo

const CATALOGO = [
  p('a', 'captacion', null, 'Leads del portal'),
  p('b', 'captacion', null, 'Visitas'),
  p('c', 'captacion', 'copiloto'),
  p('d', 'dinero', null),
  p('e', 'dinero', null),
  p('f', 'dinero', 'autonomo'),
  p('g', 'operacion', null),
]

describe('PI-33: los chips del catálogo se cruzan con los otros filtros', () => {
  it('con «Captación» elegida, «Sin modo» cuenta sólo los de captación', () => {
    const { porModo, porArea } = conteosDelCatalogo(CATALOGO, { area: 'captacion', modo: 'todos', busqueda: '' })
    expect(porModo).toEqual({ todos: 3, sombra: 0, copiloto: 1, autonomo: 0, sistema: 2 })
    // El área no se filtra a sí misma: cada chip de área dice cuántas filas daría.
    expect(porArea).toEqual({ todas: 7, dinero: 3, operacion: 1, captacion: 3, plataforma: 0 })
  })

  it('con un modo elegido, los chips de área cuentan sólo ese modo; la búsqueda cuenta en los dos', () => {
    const { porArea } = conteosDelCatalogo(CATALOGO, { area: 'todas', modo: 'sistema', busqueda: '' })
    expect(porArea).toEqual({ todas: 5, dinero: 2, operacion: 1, captacion: 2, plataforma: 0 })
    const buscando = conteosDelCatalogo(CATALOGO, { area: 'captacion', modo: 'todos', busqueda: 'visitas' })
    expect(buscando.porModo.sistema).toBe(1)
    expect(buscando.porArea.captacion).toBe(1)
  })
})
