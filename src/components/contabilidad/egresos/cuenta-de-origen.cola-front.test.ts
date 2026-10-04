/**
 * COLA-FRONT (04-10-2026), CB-R09: el archivo del lote de egresos sale DESDE una
 * cuenta bancaria de la inmobiliaria (`cuentaId`), que el back exige.
 */
import { describe, expect, it, vi } from 'vitest';

const { getBlob } = vi.hoisted(() => ({ getBlob: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, apiClient: { ...actual.apiClient, getBlob } };
});

import { cuentasQueSirvenDeOrigen, nombreDeLaCuentaDeOrigen } from './cuenta-de-origen';
import { gastosApi } from '@/lib/api/gastos.service';

describe('la cuenta de origen del archivo del banco', () => {
  it('🔴 sólo las activas con banco y número', () => {
    const cuentas = cuentasQueSirvenDeOrigen([
      { id: 'a', nombre: 'Bancolombia ahorros recaudo', banco: 'Bancolombia', tipoDeCuenta: 'AHORROS', numeroEnmascarado: '•••• 5678', activa: true },
      { id: 'b', nombre: 'Nequi', banco: null, tipoDeCuenta: null, numeroEnmascarado: null, activa: true },
      { id: 'c', nombre: 'Vieja', banco: 'Davivienda', tipoDeCuenta: 'CORRIENTE', numeroEnmascarado: '•••• 1111', activa: false },
    ]);
    expect(cuentas.map((c) => c.id)).toEqual(['a']);
    expect(nombreDeLaCuentaDeOrigen(cuentas[0])).toBe('Bancolombia ahorros recaudo · •••• 5678');
  });

  it('🔴 la descarga manda `cuentaId`', async () => {
    getBlob.mockResolvedValue(new Blob(['x']));
    await gastosApi.lotes.archivo('l1', 'BANCOLOMBIA_PAB', 'medio-1');
    expect(getBlob.mock.calls.at(-1)![0]).toContain('cuentaId=medio-1');
    expect(getBlob.mock.calls.at(-1)![0]).toContain('formato=BANCOLOMBIA_PAB');
  });
});
