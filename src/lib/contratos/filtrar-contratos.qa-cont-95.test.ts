/**
 * QA-CONT-95 (04-10-2026): la lista de contratos.
 *  · A-06: «#3» es el contrato 3 (no los que contienen un 3) y, buscando «3»
 *    a secas, el contrato 3 va primero.
 *  · A-11 / A-03: «Activo» es lo que la fila llama «Activo»: ni el que todavía
 *    no empieza («Empieza el…») ni el vencido sin renovar («Vencido»).
 */
import { describe, it, expect } from 'vitest';
import type { Contract } from '@/lib/types/contract';
import {
  filtrarContratos,
  esActivoDeVerdad,
  vencidoSinRenovar,
  FILTROS_INICIALES,
  type FiltrosDeContratos,
} from './filtrar-contratos';

const HOY = new Date(2026, 9, 4); // 4 de octubre de 2026

function contrato(overrides: Partial<Contract>): Partial<Contract> {
  return {
    id: 'c', code: 1, externalId: null, status: 'active', contractOrigin: 'GENERATED',
    propertyId: 'p-1', tenantId: 't-1', tenantName: 'Ana Díaz', propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín', monthlyRent: 1_500_000, startDate: '2026-01-01', endDate: '2026-12-31',
    ...overrides,
  };
}
const con = (p: Partial<FiltrosDeContratos>): FiltrosDeContratos => ({ ...FILTROS_INICIALES, ...p });

const LISTA = [
  contrato({ id: 'c53', code: 53, tenantName: 'Sofía' }),
  contrato({ id: 'c43', code: 43, tenantName: 'QA E3', propertyAddress: 'Calle 3 # 10-12' }),
  contrato({ id: 'c3', code: 3, tenantName: 'Iván' }),
  contrato({ id: 'c41', code: 41, externalId: '3', contractOrigin: 'MIGRATED', tenantName: 'Panadería' }),
];

describe('A-06 · buscar por número', () => {
  it('🔴 «#3» trae SÓLO el contrato 3 (el nuestro y el 3 de la inmobiliaria), no el 53 ni el 43', () => {
    const ids = filtrarContratos(LISTA, con({ busqueda: '#3' }), HOY).map((c) => c.id);
    expect(ids.sort()).toEqual(['c3', 'c41']);
  });
  it('🔴 «3» a secas sigue buscando adentro, pero el contrato 3 va primero', () => {
    const ids = filtrarContratos(LISTA, con({ busqueda: '3' }), HOY).map((c) => c.id);
    expect(ids.slice(0, 2).sort()).toEqual(['c3', 'c41']);
    expect(ids).toContain('c53');
  });
  it('un orden elegido a mano manda', () => {
    const ids = filtrarContratos(LISTA, con({ busqueda: '3', campo: 'numero', sentido: 'desc' }), HOY).map((c) => c.id);
    expect(ids[0]).toBe('c53');
  });
});

describe('A-11 / A-03 · «Activo» es el activo de verdad', () => {
  const porEmpezar = contrato({ id: 'pe', startDate: '2026-11-01', endDate: '2027-10-31' });
  const vencido = contrato({ id: 've', startDate: '2025-10-16', endDate: '2026-10-15' });
  const vencidoSin = contrato({ id: 'vs', startDate: '2025-09-01', endDate: '2026-08-31' });
  const vigente = contrato({ id: 'vi' });
  it('🔴 el filtro «Activo» no trae al que empieza el 1 de noviembre ni al vencido sin renovar', () => {
    const ids = filtrarContratos([porEmpezar, vencido, vencidoSin, vigente], con({ estado: 'active' }), HOY).map((c) => c.id);
    expect(ids.sort()).toEqual(['ve', 'vi']);
  });
  it('esActivoDeVerdad y vencidoSinRenovar se excluyen', () => {
    expect(esActivoDeVerdad(vencidoSin, HOY)).toBe(false);
    expect(vencidoSinRenovar(vencidoSin, HOY)).toBe(true);
    expect(esActivoDeVerdad(porEmpezar, HOY)).toBe(false);
    expect(vencidoSinRenovar(porEmpezar, HOY)).toBe(false);
  });
});
