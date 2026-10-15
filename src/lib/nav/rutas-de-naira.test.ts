/**
 * rutas-de-naira.test.ts — las rutas de Naira salen de UN registro con las formas de E13-1(a) (13-03, Tarea 1).
 *
 * Qué prueba: las cuatro formas que enlazan el correo y el WhatsApp del briefing (B, B?dia=, B/senales/<id>,
 * B?dia=<lunes>#recall); que un id hostil no puede cambiar la ruta (FG13-6); y que todas cuelgan de la base.
 * Marcador [N13:*] en el TÍTULO.
 */

import { describe, expect, it } from 'vitest'

import { ANCLA_DEL_RECALL, RUTA_DE_NAIRA, rutaDeLaSenal, rutaDelBriefing, rutaDelRecall } from './rutas-de-naira'

const BASE = '/panel/inmobiliaria/reportes/naira'
const ID = '00000000-0000-4000-8000-000000000001'

describe('rutas de Naira', () => {
  it('[N13:deep-links] las cuatro formas de E13-1(a)', () => {
    expect(RUTA_DE_NAIRA).toBe(BASE)
    expect(rutaDelBriefing()).toBe(BASE)
    expect(rutaDelBriefing('')).toBe(BASE)
    expect(rutaDelBriefing('2026-10-05')).toBe(BASE + '?dia=2026-10-05')
    expect(rutaDeLaSenal(ID)).toBe(BASE + '/senales/' + ID)
    expect(rutaDelRecall('2026-10-05')).toBe(BASE + '?dia=2026-10-05#recall')
    expect(ANCLA_DEL_RECALL).toBe('recall')
  })

  it('[N13:senal-href-codificado] un id hostil no cambia la ruta de la señal', () => {
    const hostil = '../x?y=1#z'
    const ruta = rutaDeLaSenal(hostil)
    expect(ruta).toBe(BASE + '/senales/' + encodeURIComponent(hostil))
    expect(ruta.includes('?')).toBe(false)
    expect(ruta.includes('#')).toBe(false)
    expect(ruta.includes('/../')).toBe(false)
    expect(ruta.slice(BASE.length + '/senales/'.length).includes('/')).toBe(false)
  })

  it('[N13:control-positivo] todas cuelgan de la base y ninguna termina en barra', () => {
    const rutas = [rutaDelBriefing(), rutaDelBriefing('2000-01-03'), rutaDeLaSenal(ID), rutaDelRecall('2000-01-03')]
    for (const ruta of rutas) {
      expect(ruta.startsWith(BASE), ruta).toBe(true)
      expect(ruta.endsWith('/'), ruta).toBe(false)
    }
  })
})
