/**
 * categorias.ts — DATO / INFERENCIA / RECOMENDACIÓN de lo que dice Naira (Fase 13, plan 13-01; D13-9).
 *
 * La categoría visible sale del CAMPO de origen (la sección de salida del agente o la procedencia de una memoria) y
 * NUNCA del texto (FG13-11/12): ninguna heurística sobre palabras decide si algo es un dato o una inferencia. La guardia
 * estática de 13-02 recorre src/lib/naira/ buscando justamente eso.
 *
 * `MEMORY` no tiene categoría visible propia aquí: una memoria se clasifica por su procedencia.
 */

export type CategoriaVisible = 'dato' | 'inferencia' | 'recomendacion'
export const CATEGORIAS_VISIBLES = ['dato', 'inferencia', 'recomendacion'] as const satisfies readonly CategoriaVisible[] // +

// fuente: agent-account-manager src/naira/investigation/lint/contrato-de-salida.ts:49 (EXISTE)
export const SECCIONES_DE_SALIDA = ['KNOWLEDGE', 'LIVE_DATA', 'MEMORY', 'INFERENCE', 'RECOMMENDATION', 'ACTION'] as const
export type SeccionDeSalida = (typeof SECCIONES_DE_SALIDA)[number] // +

const CATEGORIA_POR_SECCION = {
  KNOWLEDGE: 'dato',
  LIVE_DATA: 'dato',
  INFERENCE: 'inferencia',
  RECOMMENDATION: 'recomendacion',
  ACTION: 'recomendacion',
} as const satisfies Record<Exclude<SeccionDeSalida, 'MEMORY'>, CategoriaVisible>

const CATEGORIA_POR_PROCEDENCIA = {
  observed: 'dato',
  stated_by_human: 'dato',
  inferred: 'inferencia',
} as const satisfies Record<'observed' | 'inferred' | 'stated_by_human', CategoriaVisible>

export function categoriaDeSeccion(seccion: Exclude<(typeof SECCIONES_DE_SALIDA)[number], 'MEMORY'>): CategoriaVisible {
  return CATEGORIA_POR_SECCION[seccion]
}

export function categoriaDeProcedencia(p: 'observed' | 'inferred' | 'stated_by_human'): CategoriaVisible {
  return CATEGORIA_POR_PROCEDENCIA[p]
}
