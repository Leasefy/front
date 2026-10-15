/**
 * afirmaciones — las clases salen del espejo del contrato y las 7 bandas son las del ADR-005 (D13-10, D13-23, U18).
 *
 * La tabla de abajo es una copia LITERAL de UI-SPEC §6.5 (= ADR-005 :55-65 = vocabulario-probabilidad.ts:49-57 del
 * agente); el render se arma acá, en el test, y no con la función que se prueba.
 */

import { describe, expect, it } from 'vitest'

import { CLAIM_CLASSES, IDS_DE_BANDA } from '@/lib/api/naira/contrato'

import { BANDAS_DE_PROBABILIDAD, CLASES_DE_AFIRMACION, renderizarBanda } from './afirmaciones'

const TABLA_DEL_ADR = [
  { id: 'casi_imposible', min: 1, max: 5, termino: 'casi imposible' },
  { id: 'muy_poco_probable', min: 5, max: 20, termino: 'muy poco probable' },
  { id: 'poco_probable', min: 20, max: 45, termino: 'poco probable' },
  { id: 'tan_probable_como_no', min: 45, max: 55, termino: 'tan probable como no' },
  { id: 'probable', min: 55, max: 80, termino: 'probable' },
  { id: 'muy_probable', min: 80, max: 95, termino: 'muy probable' },
  { id: 'casi_seguro', min: 95, max: 99, termino: 'casi seguro' },
] as const

describe('afirmaciones', () => {
  it('[N13:bandas-del-adr] las 7 bandas son las del ADR-005, en orden, y cada render es <termino> (<min>-<max> %)', () => {
    expect(BANDAS_DE_PROBABILIDAD).toEqual(TABLA_DEL_ADR)
    for (const fila of TABLA_DEL_ADR) {
      expect(renderizarBanda(fila.id), fila.id).toBe(fila.termino + ' (' + fila.min + '-' + fila.max + ' %)')
    }
  })

  it('[N13:clases-del-contrato] las clases son las del espejo de 13-01 (la misma referencia) y los id de banda también', () => {
    expect(CLASES_DE_AFIRMACION).toBe(CLAIM_CLASSES)
    expect([...CLASES_DE_AFIRMACION]).toEqual(['aritmetica', 'asociacion', 'hipotesis'])
    expect(BANDAS_DE_PROBABILIDAD.map((b) => b.id)).toEqual([...IDS_DE_BANDA])
  })

  it('[N13:control-positivo] la banda probable se escribe con su rango', () => {
    expect(renderizarBanda('probable')).toBe('probable (55-80 %)')
  })
})
