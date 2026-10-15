/**
 * categorias.test.ts — la categoría visible sale del campo, nunca del texto (13-01, Tarea 4; FG13-12, D13-9).
 * Marcador [N13:*] en el TÍTULO.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CATEGORIAS_VISIBLES,
  SECCIONES_DE_SALIDA,
  categoriaDeProcedencia,
  categoriaDeSeccion,
  type CategoriaVisible,
} from './categorias'

describe('categorías de Naira', () => {
  it('[N13:categoria-por-campo] sección y procedencia ⇒ su categoría, con los vocabularios del contrato', () => {
    expect([...SECCIONES_DE_SALIDA]).toEqual(['KNOWLEDGE', 'LIVE_DATA', 'MEMORY', 'INFERENCE', 'RECOMMENDATION', 'ACTION'])
    expect([...CATEGORIAS_VISIBLES]).toEqual(['dato', 'inferencia', 'recomendacion'])
    expect(categoriaDeSeccion('KNOWLEDGE')).toBe('dato')
    expect(categoriaDeSeccion('LIVE_DATA')).toBe('dato')
    expect(categoriaDeSeccion('INFERENCE')).toBe('inferencia')
    expect(categoriaDeSeccion('RECOMMENDATION')).toBe('recomendacion')
    expect(categoriaDeSeccion('ACTION')).toBe('recomendacion')
    expect(categoriaDeProcedencia('observed')).toBe('dato')
    expect(categoriaDeProcedencia('stated_by_human')).toBe('dato')
    expect(categoriaDeProcedencia('inferred')).toBe('inferencia')
  })

  it('[N13:sin-heuristica-de-texto] el código de categorias.ts no mira texto', () => {
    const codigo = readFileSync(join(process.cwd(), 'src/lib/naira/categorias.ts'), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')
    for (const prohibido of ['RegExp', '.match(', '.test(', '.includes(', '.search(', '.indexOf(']) {
      expect(codigo.includes(prohibido), prohibido).toBe(false)
    }
  })

  it('[N13:control-positivo] cada una de las tres categorías visibles sale de al menos una entrada', () => {
    const salidas = new Set<CategoriaVisible>([
      categoriaDeSeccion('KNOWLEDGE'),
      categoriaDeSeccion('LIVE_DATA'),
      categoriaDeSeccion('INFERENCE'),
      categoriaDeSeccion('RECOMMENDATION'),
      categoriaDeSeccion('ACTION'),
      categoriaDeProcedencia('observed'),
      categoriaDeProcedencia('inferred'),
      categoriaDeProcedencia('stated_by_human'),
    ])
    expect(salidas).toEqual(new Set(CATEGORIAS_VISIBLES))
  })
})
