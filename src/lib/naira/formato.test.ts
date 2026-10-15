/**
 * formato.test.ts — corte y valor de Naira (13-01, Tarea 4).
 *
 * La máquina corre en America/Bogota: un test de zona que no fuerce OTRA zona sería vacuo (P15). Por eso el proceso se
 * pone en Asia/Tokyo en `beforeAll`, se comprueba que tomó y se restaura en `afterAll`. Los esperados del valor se arman
 * con el MISMO Intl que el agente (09-03-PLAN.md:531-535), no con un literal copiado (salvo el del propio agente,
 * «12,5%», 09-03-PLAN.md:504). Marcador [N13:*] en el TÍTULO.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { formatearCorte, formatearValorDeNaira, ZONA_DE_NAIRA } from './formato'

const normalizar = (s: string) => s.replace(/\s+/g, ' ')

describe('formatearCorte — en America/Bogota aunque el proceso esté en otra zona', () => {
  let tzPrevia: string | undefined

  beforeAll(() => {
    tzPrevia = process.env.TZ
    process.env.TZ = 'Asia/Tokyo'
  })

  afterAll(() => {
    if (tzPrevia === undefined) delete process.env.TZ
    else process.env.TZ = tzPrevia
  })

  it('[N13:asof-bogota] 03:30 Z del 5 de octubre se escribe «4 de oct, 10:30 p. m.» (hora de Colombia)', () => {
    // Control: la zona del proceso SÍ cambió (en Tokio ese instante ya es el día 5).
    expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
    const ahora = new Date('2026-10-06T00:00:00.000Z')
    const corte = formatearCorte('2026-10-05T03:30:00.000Z', ahora)
    expect(corte).not.toBeNull()
    const absoluto = normalizar(corte!.absoluto)
    expect(absoluto.startsWith('4 ')).toBe(true)
    expect(absoluto).toContain('oct')
    expect(absoluto).toContain('10:30')
    const conOffset = formatearCorte('2026-10-04T22:30:00-05:00', ahora)
    expect(conOffset?.absoluto).toBe(corte!.absoluto)
  })

  it('[N13:asof-invalido] vacío, texto, sin hora, sin zona, mes imposible y día imposible ⇒ null', () => {
    const ahora = new Date('2026-10-06T00:00:00.000Z')
    for (const malo of ['', 'ayer', '2026-10-05', '2026-10-05T10:00:00', '2026-13-45T00:00:00Z', '2026-02-30T00:00:00Z']) {
      expect(formatearCorte(malo, ahora), malo).toBeNull()
    }
    // Date.parse SÍ acepta el 30 de febrero (lo corre a marzo): por eso se valida el día.
    expect(Number.isNaN(Date.parse('2026-02-30T00:00:00Z'))).toBe(false)
  })

  it('[N13:asof-edad] la edad es ahora − asOf en ms (hace 13 h), y nunca negativa', () => {
    const corte = formatearCorte('2026-10-05T11:15:00.000Z', new Date('2026-10-06T00:15:00.000Z'))
    expect(corte?.edadMs).toBe(46_800_000)
    const futuro = formatearCorte('2026-10-07T00:00:00.000Z', new Date('2026-10-06T00:15:00.000Z'))
    expect(futuro?.edadMs).toBe(0)
  })

  it('[N13:control-positivo] un asOf válido da un absoluto no vacío; la zona es America/Bogota', () => {
    expect(ZONA_DE_NAIRA).toBe('America/Bogota')
    const corte = formatearCorte('2000-01-03T11:00:00.000Z', new Date('2000-01-03T12:00:00.000Z'))
    expect(corte?.absoluto.length).toBeGreaterThan(0)
    expect(corte?.edadMs).toBe(3_600_000)
  })
})

describe('formatearValorDeNaira — la fórmula del agente', () => {
  const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
  const enteroEsCo = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
  const porcentaje = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })

  it('[N13:valor-como-el-agente] cop, count, days y pct salen igual que en el agente, sin perder precisión', () => {
    expect(formatearValorDeNaira('1500000', 'cop')).toBe(cop.format(1500000))
    expect(formatearValorDeNaira('4500000', 'count')).toBe(enteroEsCo.format(4500000))
    expect(formatearValorDeNaira('96', 'days')).toBe(enteroEsCo.format(96) + ' días')
    expect(formatearValorDeNaira('12.5', 'pct')).toBe('12,5%')
    expect(formatearValorDeNaira('12.5', 'pct')).toBe(porcentaje.format(1250 / 10000))
    expect(formatearValorDeNaira('9007199254740993', 'cop')).toContain('740.993')
  })

  it('[N13:valor-invalido] decimales en cop, texto, vacío, más de 2 decimales, exponente y espacios ⇒ null', () => {
    expect(formatearValorDeNaira('1500000.5', 'cop')).toBeNull()
    expect(formatearValorDeNaira('abc', 'count')).toBeNull()
    expect(formatearValorDeNaira('', 'days')).toBeNull()
    expect(formatearValorDeNaira('12.345', 'pct')).toBeNull()
    expect(formatearValorDeNaira('1e3', 'pct')).toBeNull()
    expect(formatearValorDeNaira(' 1', 'cop')).toBeNull()
  })
})
