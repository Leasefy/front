/**
 * vocabulario-de-seguimiento.test.ts — el vocabulario visible del seguimiento de Naira (13-04, Tarea 1).
 *
 * Qué prueba: el nombre de la métrica sale del catálogo cerrado (y nada heredado del prototipo lo resuelve); cada mapa de
 * claves cubre EXACTAMENTE su vocabulario del contrato y resuelve a texto en es y en; el dueño se dice como rol (nunca el
 * valor del agente ni un rol del sistema); y una fecha que no es cifra sale de los formateadores de la fase, en cualquier
 * zona del proceso, y nunca cruda. Marcador [N13:*] en el TÍTULO del `it`.
 */

import { afterAll, describe, expect, it } from 'vitest'

import {
  DESENLACES_DEL_LOOP,
  DUENOS_DE_ROL,
  ESTADOS_DEL_LOOP,
  FORMAS_DEL_LOOP,
  TIPOS_DE_EVENTO_DEL_LOOP,
} from '@/lib/api/naira/contrato'
import en from '@/lib/i18n/locales/en.json'
import es from '@/lib/i18n/locales/es.json'
import { formatearDia } from '@/lib/naira/briefing-y-senal'
import { formatearCorte } from '@/lib/naira/formato'
import { METRICAS_DEL_CATALOGO } from '@/lib/naira/fuente-a-ruta'

import {
  CLAVE_DE_LA_FORMA_DEL_LOOP,
  CLAVE_DE_LA_VERIFICACION_DEL_EVENTO,
  CLAVE_DEL_CANDIDATO_DEL_LOOP,
  CLAVE_DEL_DESENLACE_DEL_LOOP,
  CLAVE_DEL_ESTADO_DEL_LOOP,
  CLAVE_DEL_EVENTO_DEL_LOOP,
  CLAVE_DEL_ROL,
  NOMBRE_CONVERSACIONAL_DE_LA_METRICA,
  fechaLegible,
  nombreConversacional,
  tituloDeLaMetrica,
} from './vocabulario-de-seguimiento'

const texto = (d: unknown, k: string): unknown =>
  k.split('.').reduce<unknown>((a, p) => (a !== null && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), d)

const ordenado = (xs: readonly string[]) => [...xs].sort()

const MAPAS: readonly (readonly [string, Readonly<Record<string, string>>, readonly string[]])[] = [
  ['CLAVE_DEL_ROL', CLAVE_DEL_ROL, DUENOS_DE_ROL],
  ['CLAVE_DEL_ESTADO_DEL_LOOP', CLAVE_DEL_ESTADO_DEL_LOOP, ESTADOS_DEL_LOOP],
  ['CLAVE_DE_LA_FORMA_DEL_LOOP', CLAVE_DE_LA_FORMA_DEL_LOOP, FORMAS_DEL_LOOP],
  ['CLAVE_DEL_DESENLACE_DEL_LOOP', CLAVE_DEL_DESENLACE_DEL_LOOP, DESENLACES_DEL_LOOP],
  ['CLAVE_DEL_CANDIDATO_DEL_LOOP', CLAVE_DEL_CANDIDATO_DEL_LOOP, DESENLACES_DEL_LOOP.filter((d) => d !== 'expirado')],
  ['CLAVE_DEL_EVENTO_DEL_LOOP', CLAVE_DEL_EVENTO_DEL_LOOP, TIPOS_DE_EVENTO_DEL_LOOP],
  ['CLAVE_DE_LA_VERIFICACION_DEL_EVENTO', CLAVE_DE_LA_VERIFICACION_DEL_EVENTO, ['nacimiento', 'del_dia', 'sin_veredicto']],
]

const ZONA_PREVIA = process.env.TZ

afterAll(() => {
  if (ZONA_PREVIA === undefined) delete process.env.TZ
  else process.env.TZ = ZONA_PREVIA
})

describe('vocabulario del seguimiento', () => {
  it('[N13:control-positivo] nombre, título, fecha y rol de un caso conocido', () => {
    expect(nombreConversacional('cartera.morosidad_rate')).toBe('índice de morosidad')
    expect(tituloDeLaMetrica('cartera.morosidad_rate')).toBe('Índice de morosidad')
    expect(fechaLegible('2000-01-03')).not.toBeNull()
    expect(texto(es, CLAVE_DEL_ROL['role:cartera'])).toBe('Cartera')
  })

  it('[N13:nombres-del-catalogo] un nombre por métrica del catálogo, sin cifras, sin repetir y sin claves heredadas', () => {
    expect(ordenado(Object.keys(NOMBRE_CONVERSACIONAL_DE_LA_METRICA))).toEqual(ordenado(METRICAS_DEL_CATALOGO))
    const nombres = Object.values(NOMBRE_CONVERSACIONAL_DE_LA_METRICA)
    for (const n of nombres) {
      expect(n, n).not.toMatch(/\d/)
      expect(n, n).not.toContain('%')
    }
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const hostil of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf', '', 'cartera.morosidad_rate ', 'x']) {
      expect(nombreConversacional(hostil), hostil).toBeNull()
      expect(tituloDeLaMetrica(hostil), hostil).toBeNull()
    }
  })

  it('[N13:vocabulario-exhaustivo] cada mapa cubre su vocabulario y resuelve a texto distinto en es y en', () => {
    for (const [nombre, mapa, vocabulario] of MAPAS) {
      expect(ordenado(Object.keys(mapa)), nombre).toEqual(ordenado(vocabulario))
      const textosEs: string[] = []
      for (const clave of Object.values(mapa)) {
        const enEs = texto(es, clave)
        const enEn = texto(en, clave)
        expect(typeof enEs === 'string' && enEs.trim() !== '', `${nombre} es: ${clave}`).toBe(true)
        expect(typeof enEn === 'string' && enEn.trim() !== '', `${nombre} en: ${clave}`).toBe(true)
        textosEs.push(String(enEs))
      }
      expect(new Set(textosEs).size, nombre).toBe(textosEs.length)
    }
    expect(texto(es, CLAVE_DEL_EVENTO_DEL_LOOP.cambio_de_forma)).toContain('{{forma}}')
    expect(texto(en, CLAVE_DEL_EVENTO_DEL_LOOP.cambio_de_forma)).toContain('{{forma}}')
  })

  it('[N13:rol-no-persona] el dueño se dice como rol del panel, nunca como valor del agente ni rol del sistema', () => {
    expect(texto(es, CLAVE_DEL_ROL['role:cartera'])).toBe('Cartera')
    expect(texto(es, CLAVE_DEL_ROL['role:portafolio'])).toBe('Inmuebles')
    expect(texto(es, CLAVE_DEL_ROL['role:prospectos'])).toBe('Prospectos')
    for (const clave of Object.values(CLAVE_DEL_ROL)) {
      for (const d of [es, en]) {
        const t = String(texto(d, clave))
        expect(t).not.toContain('role:')
        expect(t).not.toMatch(/\b(OWNER|ADMIN|OPERATOR|VIEWER)\b/)
      }
    }
    expect(texto(es, 'inmobiliaria.ai.naira.seguimiento.rol')).toContain('{{rol}}')
    expect(texto(en, 'inmobiliaria.ai.naira.seguimiento.rol')).toContain('{{rol}}')
  })

  it('[N13:fecha-legible] día con formatearDia e instante con formatearCorte en cualquier zona; lo ilegible es null', () => {
    const casos: readonly (readonly [string, string, number])[] = [
      ['America/Los_Angeles', '2000-01-03T00:30:00.000Z', 2],
      ['Asia/Tokyo', '2000-01-03T20:00:00.000Z', 4],
    ]
    for (const [zona, control, diaEsperado] of casos) {
      process.env.TZ = zona
      expect(new Date(control).getDate(), `la zona ${zona} tomó`).toBe(diaEsperado)
      const dia = fechaLegible('2000-01-03')
      expect(dia).toBe(formatearDia('2000-01-03'))
      expect(dia).not.toBe('2000-01-03')
      expect(dia).toContain('2000')
      const instante = '2000-01-03T11:45:00.000Z'
      expect(fechaLegible(instante)).toBe(formatearCorte(instante, new Date())?.absoluto)
      for (const malo of ['2000-02-30', '2000-1-3', '03/01/2000', 'hoy', '', '2000-01-03T11:45:00']) {
        expect(fechaLegible(malo), malo).toBeNull()
      }
    }
  })
})
