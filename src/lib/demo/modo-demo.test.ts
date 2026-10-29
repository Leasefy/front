/**
 * @vitest-environment happy-dom
 *
 * El modo demo (Nico 29-10-2026: «Ver con datos demo», sólo en lo cerrado). Lo que sostiene:
 *   1. apagado, todo va al back como siempre;
 *   2. prendido y en una parte cerrada del panel, la lectura con dato de ejemplo no sale de la pestaña y ninguna
 *      escritura sale (403 MODO_DEMO con su frase);
 *   3. prendido pero en una parte abierta, nada cambia; en una cerrada, el micro tampoco se toca (salvo el chat de Ori);
 *   4. los datos de ejemplo de Servicios públicos respetan el mes pedido y traen la cuenta de EPM.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { agentFetch } from '@/lib/api/agent-fetch';
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

  it('en una parte cerrada, el micro tampoco se toca: la lectura dice «no disponible» y la escritura se frena; el chat de Ori sigue', async () => {
    entrarAlModoDemo();
    const micro = 'http://localhost:4300/api/agency/a1';
    const lectura = await agentFetch(`${micro}/ai-hub/agentes/pagos/overview`);
    expect(lectura.status).toBe(404);
    const escritura = await agentFetch(`${micro}/ai-hub/work-items/pagos/w1/acciones`, { method: 'POST', body: '{}' });
    expect(escritura.status).toBe(403);
    expect(await escritura.json()).toMatchObject({ code: 'MODO_DEMO' });
    expect(pedir).not.toHaveBeenCalled();
    await agentFetch(`${micro}/ai-hub/chat/stream`, { method: 'POST', body: '{}' });
    expect(pedir).toHaveBeenCalledTimes(1);
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
    expect(hayDatosDeEjemplo('agenda')).toBe(false);
  });
});

describe('los datos de ejemplo de Contratos', () => {
  it('siete contratos inventados, el detalle de cada uno, y la sección cuenta como «con datos»', () => {
    const lista = lecturaDeLaDemo('/contracts') as Array<{ id: string; status: string; tenantName: string }>;
    expect(lista).toHaveLength(7);
    expect(lista.filter((c) => c.status === 'ACTIVE')).toHaveLength(5);
    expect(lecturaDeLaDemo('/contracts/demo-ct-3')).toMatchObject({ tenantName: 'Comercializadora El Poblado SAS' });
    expect(hayDatosDeEjemplo('contratos')).toBe(true);
  });
});

describe('los datos de ejemplo de Solicitudes', () => {
  it('seis solicitudes con su resumen (una vencida) y la sección cuenta como «con datos»', () => {
    const l = lecturaDeLaDemo('/inmobiliaria/pqrs') as { resumen: { total: number; vencidas: number }; solicitudes: unknown[] };
    expect(l.solicitudes).toHaveLength(6);
    expect(l.resumen).toMatchObject({ total: 6, vencidas: 1 });
    expect(hayDatosDeEjemplo('solicitudes')).toBe(true);
  });
});

describe('los datos de ejemplo de Mantenimientos', () => {
  it('ocho solicitudes en la forma del back, filtrables por estado, y la bandeja con el propietario cuenta las mismas', () => {
    const todas = lecturaDeLaDemo('/inmobiliaria/mantenimiento') as Array<{ id: string; status: string; priority: string }>;
    expect(todas).toHaveLength(8);
    expect(todas.find((s) => s.id === 'demo-mant-1')).toMatchObject({ status: 'REPORTED', priority: 'EMERGENCY' });
    const enCurso = lecturaDeLaDemo('/inmobiliaria/mantenimiento?status=IN_PROGRESS') as unknown[];
    expect(enCurso).toHaveLength(1);
    const bandeja = lecturaDeLaDemo('/inmobiliaria/mantenimiento/con-el-propietario') as {
      grupo: string;
      conteos: Record<string, number>;
      filas: Array<{ solicitudId: string }>;
    };
    expect(bandeja.grupo).toBe('ESPERANDO');
    expect(bandeja.conteos).toEqual({ ESPERANDO: 1, RECHAZADAS: 0, LA_HACE_EL: 1 });
    expect(bandeja.filas.map((f) => f.solicitudId)).toEqual(['demo-mant-3']);
    const laHaceEl = lecturaDeLaDemo('/inmobiliaria/mantenimiento/con-el-propietario?grupo=LA_HACE_EL') as { filas: Array<{ solicitudId: string }> };
    expect(laHaceEl.filas.map((f) => f.solicitudId)).toEqual(['demo-mant-8']);
    expect(lecturaDeLaDemo('/inmobiliaria/mantenimiento/demo-mant-4')).toMatchObject({ status: 'MAINT_APPROVED', approvedAmount: 650_000 });
    expect((lecturaDeLaDemo('/inmobiliaria/consignaciones') as unknown[]).length).toBe(8);
    expect(hayDatosDeEjemplo('mantenimientos')).toBe(true);
  });
});
