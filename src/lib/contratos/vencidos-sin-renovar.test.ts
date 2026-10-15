/**
 * 🔴 Juan (Portofino, 15-10-2026): «dice 5 contratos vencidos sin renovar, pero
 * no cuáles». El filtro de vigencia «Vencidos sin renovar» usa la MISMA regla
 * que la cifra de la lista, así que el enlace «ver cuáles» trae exactamente esos.
 */
import { describe, it, expect } from 'vitest'
import { FILTROS_INICIALES, filtrarContratos, vencidoSinRenovar } from './filtrar-contratos'

const HOY = new Date(2026, 9, 15)
const contratos = [
  { id: 'vencido', status: 'active', startDate: '2025-01-01', endDate: '2026-09-30' },
  { id: 'vigente', status: 'active', startDate: '2025-01-01', endDate: '2027-01-31' },
  { id: 'terminado', status: 'expired', startDate: '2024-01-01', endDate: '2025-01-01' },
] as never[]

describe('vencidos sin renovar', () => {
  it('el filtro trae exactamente los que cuenta la cifra', () => {
    const filtrados = filtrarContratos(contratos, { ...FILTROS_INICIALES, vigencia: 'vencido_sin_renovar' }, HOY)
    expect(filtrados.map((c: { id: string }) => c.id)).toEqual(['vencido'])
    expect(contratos.filter((c) => vencidoSinRenovar(c, HOY)).length).toBe(filtrados.length)
  })
})
