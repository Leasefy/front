/**
 * laboratorio.test.ts — lo puro del Laboratorio del maestro (Nico, 19-10-2026): la repetición dura unos 20 segundos con
 * esperas proporcionales a las reales; cuánto lleva cada rol; los nombres donde la bitácora dice «I3»; el anillo en vivo
 * sale de los pasos del lector; la hora de Bogotá.
 */
import { describe, expect, it } from 'vitest'

import type { PasoDelMaestro } from '@/lib/admin/agent-api'
import { avanceDeLosRoles, DURACION_DE_LA_REPETICION_MS, horaDeBogota, inmobiliariasDelAnillo, lineaDeTiempo, nombresPorAlias } from '@/lib/admin/laboratorio'

const paso = (orden: number, segundos: number, o: Partial<PasoDelMaestro> = {}): PasoDelMaestro => ({
  orden,
  en: new Date(Date.parse('2026-10-19T06:30:00.000Z') + segundos * 1000).toISOString(),
  rol: 'lector',
  paso: 'leyo',
  texto: `Paso ${orden}`,
  detalle: {},
  nombre: null,
  ...o,
})

describe('el laboratorio, lo puro', () => {
  it('[LAB-F:tiempo] la noche se comprime a unos 20 s; nada baja de 90 ms ni pasa de 1,6 s', () => {
    // Un paso que tardó 60 s (el modelo pensando) y diez de 1 s.
    const pasos = [paso(0, 0), ...Array.from({ length: 10 }, (_, i) => paso(i + 1, i + 1)), paso(11, 71)]
    const t = lineaDeTiempo(pasos)
    expect(t[0]).toBe(0)
    expect(Math.min(...t.slice(1))).toBeGreaterThanOrEqual(90)
    expect(Math.max(...t)).toBeLessThanOrEqual(1600)
    expect(t[11]).toBe(1600)
    expect(t.reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(DURACION_DE_LA_REPETICION_MS)
    expect(lineaDeTiempo([])).toEqual([])
  })

  it('[LAB-F:avance] cada rol: lo hecho hasta el paso n contra su total, y lo último que hizo', () => {
    const pasos = [paso(0, 0, { rol: 'archivista', paso: 'inicio' }), paso(1, 1), paso(2, 2), paso(3, 3, { rol: 'pensador', paso: 'resumen' })]
    const a = avanceDeLosRoles(pasos, 2)
    expect(a.lector).toMatchObject({ hechos: 1, total: 2 })
    expect(a.lector.ultimo?.orden).toBe(1)
    expect(a.pensador).toMatchObject({ hechos: 0, total: 1, ultimo: null })
    expect(a.revisor).toMatchObject({ hechos: 0, total: 0 })
  })

  it('[LAB-F:nombres] el alias se dice con el nombre: del anillo o, en vivo, del paso del lector', () => {
    const lab = { inmobiliarias: [{ alias: 'I1', tenantId: 'a', nombre: 'Portofino', diarios: 30, preguntas: 5, categorias: null, agentes: [] }] }
    const pasos = [paso(0, 0, { detalle: { alias: 'I2', tenantId: 'b', diarios: 12, preguntas: 3 }, nombre: 'Casas del Valle' })]
    expect(nombresPorAlias(lab, pasos)).toEqual({ I1: 'Portofino', I2: 'Casas del Valle' })
    expect(inmobiliariasDelAnillo(lab, pasos).map((i) => i.alias)).toEqual(['I1'])
    expect(inmobiliariasDelAnillo({ inmobiliarias: [] }, pasos)).toMatchObject([{ alias: 'I2', nombre: 'Casas del Valle', diarios: 12, preguntas: 3 }])
  })

  it('[LAB-F:hora] la hora del paso en Bogotá', () => {
    expect(horaDeBogota('2026-10-19T06:30:04.000Z')).toBe('01:30:04')
    expect(horaDeBogota('nada')).toBe('--:--:--')
  })
})
