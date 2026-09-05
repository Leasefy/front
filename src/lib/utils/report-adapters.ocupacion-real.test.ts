/**
 * El adaptador de ocupación contra la respuesta REAL del back.
 *
 * ── Qué pasó ───────────────────────────────────────────────────────────────
 *
 * Nico reportó «33 errores de consola» en Reportes. Buscarlos por el mensaje
 * no llevó a ningún lado —los avisos de `Progress` salen sin stack de React—,
 * así que se marcaron en el DOM los que recibían NaN y se leyó qué tarjeta
 * eran. Lo que apareció no era un aviso de consola: era la pantalla del
 * cliente diciendo, con todas las letras,
 *
 *     12 Total propiedades · 10 Arrendadas · NaN Vacantes · NaN% Tasa vacancia
 *     Medellín 5/ (NaN%) · Itagüí 1/ (NaN%) · Envigado 3/ (NaN%)
 *
 * con el denominador de cada zona directamente en blanco.
 *
 * La causa: `OcupacionReport` describía seis campos que el back no manda
 * —`totalAvailable`, `totalInProcess`, y por zona `totalProperties`,
 * `inProcess`, `available`, `occupancyRate`—. Como el tipo los daba por
 * presentes y obligatorios, `undefined + undefined` compiló sin una queja.
 *
 * ── Por qué este fixture ───────────────────────────────────────────────────
 *
 * El fixture de abajo NO se escribió desde el tipo: se copió de lo que
 * `ReportsService.getOcupacionReport()` construye y devuelve, campo por campo
 * (back-erp/src/inmobiliaria/reports/reports.service.ts). Un fixture derivado
 * del tipo habría vuelto a pasar con el bug puesto, que es exactamente lo que
 * hizo el test que ya existía sobre estas mismas zonas.
 */

import { describe, expect, it } from 'vitest'

import { adaptOccupancy } from './report-adapters'
import type { OcupacionReport } from '@/lib/types/inmobiliaria'

/** Copiado del `return` del servicio, no del tipo del front. */
const RESPUESTA_DEL_BACK: OcupacionReport = {
  totalProperties: 12,
  totalOccupied: 10,
  totalVacant: 2,
  overallOccupancyRate: 83.33,
  overallVacancyRate: 16.67,
  zones: [
    { zone: 'Medellín', total: 5, occupied: 5, vacant: 0, rate: 100, vacancyRate: 0 },
    { zone: 'Itagüí', total: 2, occupied: 1, vacant: 1, rate: 50, vacancyRate: 50 },
    { zone: 'Envigado', total: 4, occupied: 3, vacant: 1, rate: 75, vacancyRate: 25 },
    { zone: 'Sabaneta', total: 1, occupied: 1, vacant: 0, rate: 100, vacancyRate: 0 },
  ],
  byProperty: [],
  monthlyTrend: [{ month: '2026-09', rate: 83.33 }],
}

/** Nada de lo que el adaptador produce puede ser NaN. */
function hayNaN(valor: unknown): boolean {
  if (typeof valor === 'number') return Number.isNaN(valor)
  if (Array.isArray(valor)) return valor.some(hayNaN)
  if (valor && typeof valor === 'object') return Object.values(valor).some(hayNaN)
  return false
}

describe('adaptOccupancy contra la respuesta real del back', () => {
  it('no produce un solo NaN', () => {
    // El guardián general: si mañana el contrato vuelve a moverse, esto cae
    // antes de que la palabra NaN llegue a la pantalla de nadie.
    expect(hayNaN(adaptOccupancy(RESPUESTA_DEL_BACK))).toBe(false)
  })

  it('cuenta los vacantes con el campo que el back sí manda', () => {
    // Antes: `totalAvailable + totalInProcess`, dos campos inexistentes.
    expect(adaptOccupancy(RESPUESTA_DEL_BACK)!.summary.vacant).toBe(2)
  })

  it('la tasa de vacancia sale de números reales, no de undefined', () => {
    // 2 de 12 = 16.7 %. Antes: NaN.
    expect(adaptOccupancy(RESPUESTA_DEL_BACK)!.summary.vacancyRate).toBeCloseTo(16.7, 1)
  })

  it('cada zona conserva su denominador', () => {
    // El síntoma exacto en pantalla era «Medellín 5/ (NaN%)»: el total en
    // blanco porque `z.totalProperties` no existe.
    const medellin = adaptOccupancy(RESPUESTA_DEL_BACK)!.byZone[0]!
    expect(medellin.total).toBe(5)
    expect(medellin.rented).toBe(5)
    expect(medellin.vacant).toBe(0)
    expect(medellin.vacancyRate).toBe(0)
  })

  it('una zona a medio ocupar reporta su vacancia tal como la calculó el back', () => {
    // Itagüí: 1 de 2 ocupadas. La cuenta vieja hacía `(1 - occupancyRate)`,
    // que sólo tendría sentido con una fracción 0–1: aun con el campo
    // presente, el número habría salido mal.
    expect(adaptOccupancy(RESPUESTA_DEL_BACK)!.byZone[1]!.vacancyRate).toBe(50)
  })

  it('una inmobiliaria sin un solo inmueble no reporta 0 % de vacancia', () => {
    // 0 % se lee como «no hay vacancia», que es una medición. La verdad es
    // que no hubo nada que medir. Ver src/lib/tasas.ts.
    const vacia = adaptOccupancy({
      ...RESPUESTA_DEL_BACK,
      totalProperties: 0,
      totalOccupied: 0,
      totalVacant: 0,
      overallOccupancyRate: 0,
      overallVacancyRate: 0,
      zones: [],
      monthlyTrend: [],
    })!
    expect(vacia.summary.vacancyRate).toBeNull()
  })
})
