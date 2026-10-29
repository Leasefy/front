/**
 * @vitest-environment happy-dom
 *
 * El modo demo (Nico 29-10-2026: «Ver con datos demo», sólo en lo cerrado). Lo que sostiene:
 *   1. apagado, todo va al back como siempre;
 *   2. prendido y en una parte cerrada del panel, la lectura con dato de ejemplo no sale de la pestaña y ninguna
 *      escritura sale (403 MODO_DEMO con su frase);
 *   3. prendido pero en una parte abierta, nada cambia;
 *   4. los datos de ejemplo de Servicios públicos respetan el mes pedido y traen la cuenta de EPM.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api/client';
import type { TableroDeServicios } from '@/lib/api/servicios-publicos.service';
import { entrarAlModoDemo, estaEnModoDemo, salirDelModoDemo } from './modo-demo-estado';
import { hayDatosDeEjemplo, lecturaDeLaDemo } from './datos-demo';

const pedir = vi.fn(async () => new Response(JSON.stringify({ delBack: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  vi.stubGlobal('fetch', pedir);
  window.history.pushState({}, '', '/panel/inmobiliaria/servicios-publicos');
});
afterEach(() => {
  salirDelModoDemo();
  vi.unstubAllGlobals();
  pedir.mockClear();
});

describe('el modo demo', () => {
  it('se prende y se apaga por pestaña', () => {
    expect(estaEnModoDemo()).toBe(false);
    entrarAlModoDemo();
    expect(estaEnModoDemo()).toBe(true);
    salirDelModoDemo();
    expect(estaEnModoDemo()).toBe(false);
  });

  it('en una parte cerrada: la lectura de ejemplo no sale y la escritura se frena con su frase', async () => {
    entrarAlModoDemo();
    const t = await apiClient.get<TableroDeServicios>('/inmobiliaria/servicios-publicos?mes=2026-10');
    expect(t.mes).toBe('2026-10');
    expect(t.contratos.length).toBeGreaterThan(3);
    await expect(apiClient.post('/contracts/demo-sp-1/servicios-publicos/facturas', {})).rejects.toMatchObject({
      status: 403,
      code: 'MODO_DEMO',
      message: 'En la demo no se guarda nada: son datos de ejemplo.',
    });
    expect(pedir).not.toHaveBeenCalled();
  });

  it('en una parte abierta, nada cambia (aunque esté prendido)', async () => {
    entrarAlModoDemo();
    window.history.pushState({}, '', '/panel/inmobiliaria/inmuebles');
    const r = await apiClient.get<{ delBack: boolean }>('/inmobiliaria/servicios-publicos?mes=2026-10').catch(() => null);
    expect(pedir).toHaveBeenCalled();
    expect(r === null || r.delBack === true).toBe(true);
  });

  it('los datos de Servicios públicos: el mes pedido, sus estados y la cuenta de EPM; sólo esa sección los tiene', () => {
    const t = lecturaDeLaDemo('/inmobiliaria/servicios-publicos?mes=2026-09') as TableroDeServicios;
    expect(t.mes).toBe('2026-09');
    expect(new Set(t.contratos.map((c) => c.estadoDelMes))).toEqual(new Set(['AL_DIA', 'POR_REVISAR', 'SIN_FACTURA', 'RECHAZADA']));
    expect(t.contratos.some((c) => c.cuentas?.some((x) => x.cobertura === '12 meses sin servicio de EPM'))).toBe(true);
    expect(lecturaDeLaDemo('/contracts/demo-sp-2/servicios-publicos')).toMatchObject({ contractId: 'demo-sp-2' });
    expect(lecturaDeLaDemo('/inmobiliaria/contratos')).toBeUndefined();
    expect(hayDatosDeEjemplo('servicios-publicos')).toBe(true);
    expect(hayDatosDeEjemplo('nomina')).toBe(false);
  });
});
