/**
 * MANDO-DATOS (05-10-2026) · la sexta meta del director (Nico: «Sexta por
 * defecto»): lo recuperado, en PESOS. Se escribe como la plata de la casa y se
 * ajusta escribiéndola como se escribe en Colombia.
 */
import { describe, expect, it } from 'vitest'

import { normalizarHoy, normalizarMeta } from '@/lib/api/piloto-director'

import { objetivoDesdeElCampo, objetivoEnElCampo, valorDeMeta } from './director'

describe('la meta en pesos', () => {
  it('se escribe en pesos de la casa (con el espacio duro)', () => {
    expect(valorDeMeta(48_750_000, 'pesos')).toBe('$\u00a048.750.000')
    expect(valorDeMeta(1_234_567.5, 'pesos')).toMatch(/^\$\u00a01\.234\.56/)
    expect(valorDeMeta(null, 'pesos')).toBe('—')
  })
  it('el objetivo se lee como se escribe la plata: puntos de mil, coma de centavos, con o sin el «$»', () => {
    expect(objetivoDesdeElCampo('$ 55.000.000', 'pesos')).toBe(55_000_000)
    expect(objetivoDesdeElCampo('55000000', 'pesos')).toBe(55_000_000)
    expect(objetivoDesdeElCampo('1.234.567,5', 'pesos')).toBe(1_234_567.5)
    expect(objetivoDesdeElCampo('cincuenta', 'pesos')).toBeNull()
    expect(objetivoDesdeElCampo('1,234', 'pesos')).toBeNull()
    expect(objetivoEnElCampo(55_000_000, 'pesos')).toBe('55000000')
  })
  it('las otras unidades siguen igual', () => {
    expect(objetivoDesdeElCampo('88', 'porcentaje')).toBe(0.88)
    expect(objetivoDesdeElCampo('12,5', 'dias')).toBe(12.5)
  })
  it('la meta llega con su unidad', () => {
    expect(normalizarMeta({ id: 'm', metrica: 'recuperado', nombre: 'Plata recuperada (30 días)', unidad: 'pesos', estado: 'propuesta', objetivo: 1 })?.unidad).toBe('pesos')
  })
})

describe('🔴 dato 9 · el «cuándo» de cada orden también como instante', () => {
  it('normalizarHoy conserva `cuandoIso` (y `null` si la orden es para «hoy»)', () => {
    const h = normalizarHoy({
      encendido: true,
      ordenes: [
        { ordenId: 'o-1', agente: 'cobranza', cuando: 'el lunes 5 de octubre a las 3:00 p. m.', cuandoIso: '2026-10-05T15:00:00.000-05:00', estado: 'en_bandeja' },
        { ordenId: 'o-2', agente: 'cobranza', cuando: 'hoy', cuandoIso: null, estado: 'en_bandeja' },
      ],
    })
    expect(h.ordenes[0]?.cuandoIso).toBe('2026-10-05T15:00:00.000-05:00')
    expect(h.ordenes[1]?.cuandoIso).toBeNull()
  })
})
