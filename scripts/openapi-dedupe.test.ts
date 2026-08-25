/**
 * openapi-dedupe.test.ts — la desambiguación de `operationId` del spec del back.
 *
 * Existe por un problema que NO es del front: NestJS deriva el `operationId`
 * de `Clase_metodo`, así que montar el mismo controller en dos rutas (público
 * y admin) emite el MISMO id dos veces. `openapi-typescript` lo traduce a dos
 * claves iguales dentro de `interface operations` y `tsc` corta el CI con
 * TS2300 — que fue exactamente lo que pasó con avalúos y
 * registration-profiles.
 *
 * La regla que se prueba acá es la que hace la desambiguación confiable:
 * cuando dos operaciones comparten id, se renombran LAS DOS. Dejar que la
 * primera del recorrido conserve el nombre corto ataría el contrato al orden
 * de las claves del JSON — el back reordena un path y el tipo "bueno" cambia
 * de dueño en silencio.
 */

import { describe, it, expect } from 'vitest'

import { dedupeOperationIds } from './openapi-dedupe.mjs'

function specCon(paths: Record<string, unknown>) {
  return { openapi: '3.0.0', paths }
}

/**
 * Recorre el spec en orden de declaración y junta los `operationId`.
 *
 * Toma `unknown` a propósito: `dedupeOperationIds` vive en un `.mjs` sin
 * tipos, así que su salida llega como `object`. Navegarlo acá —en vez de
 * castear en cada caso— deja los tests legibles y el narrowing en un solo
 * lugar.
 */
function idsDe(spec: unknown): string[] {
  const paths = (spec as { paths?: Record<string, unknown> })?.paths ?? {}
  const ids: string[] = []
  for (const item of Object.values(paths)) {
    for (const op of Object.values((item ?? {}) as Record<string, unknown>)) {
      const id = (op as { operationId?: unknown })?.operationId
      if (typeof id === 'string') ids.push(id)
    }
  }
  return ids
}

describe('dedupeOperationIds', () => {
  it('un spec sin colisiones queda intacto', () => {
    const spec = specCon({
      '/avaluos': { get: { operationId: 'AvaluosController_list' } },
      '/leases': { get: { operationId: 'LeasesController_list' } },
    })

    const { renamed, spec: salida } = dedupeOperationIds(spec)

    expect(renamed).toEqual([])
    expect(idsDe(salida)).toEqual(['AvaluosController_list', 'LeasesController_list'])
  })

  it('cuando dos operaciones colisionan, se renombran LAS DOS', () => {
    const spec = specCon({
      '/inmobiliaria/avaluos': { get: { operationId: 'AvaluosController_list' } },
      '/api/v1/admin/avaluos': { get: { operationId: 'AvaluosController_list' } },
    })

    const { renamed, spec: salida } = dedupeOperationIds(spec)

    // Ninguna conserva el nombre corto: el orden del JSON no decide quién gana.
    expect(idsDe(salida)).not.toContain('AvaluosController_list')
    expect(renamed).toHaveLength(2)
    expect(idsDe(salida)).toEqual([
      'AvaluosController_list__get_inmobiliaria_avaluos',
      'AvaluosController_list__get_api_v1_admin_avaluos',
    ])
  })

  it('el invariante: después de pasar, no queda ningún id repetido', () => {
    const spec = specCon({
      '/a': { get: { operationId: 'X' }, post: { operationId: 'X' } },
      '/b': { get: { operationId: 'X' } },
      '/c': { get: { operationId: 'Y' } },
    })

    const ids = idsDe(dedupeOperationIds(spec).spec)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('el verbo entra en el sufijo: dos operaciones del mismo path no colisionan', () => {
    const spec = specCon({
      '/a': { get: { operationId: 'X' }, post: { operationId: 'X' } },
    })

    expect(idsDe(dedupeOperationIds(spec).spec)).toEqual(['X__get_a', 'X__post_a'])
  })

  it('las claves que no son operaciones no se tocan', () => {
    const spec = specCon({
      '/a': {
        parameters: [{ name: 'id', in: 'path' }],
        get: { operationId: 'X' },
        post: { summary: 'sin operationId' },
      },
    })

    const salida = dedupeOperationIds(spec).spec as typeof spec
    const item = salida.paths['/a'] as Record<string, unknown>

    expect(item.parameters).toEqual([{ name: 'id', in: 'path' }])
    expect(item.post).toEqual({ summary: 'sin operationId' })
  })

  it('es determinista: dos corridas dan exactamente lo mismo', () => {
    const hacerSpec = () =>
      specCon({
        '/inmobiliaria/avaluos': { get: { operationId: 'AvaluosController_list' } },
        '/api/v1/admin/avaluos': { get: { operationId: 'AvaluosController_list' } },
      })

    expect(idsDe(dedupeOperationIds(hacerSpec()).spec)).toEqual(
      idsDe(dedupeOperationIds(hacerSpec()).spec),
    )
  })

  it('un spec sin paths no explota', () => {
    expect(dedupeOperationIds({ openapi: '3.0.0' }).renamed).toEqual([])
  })
})
