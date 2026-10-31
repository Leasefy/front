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
import { hayDatosDeEjemplo, hayDatosDeEjemploDelPropietario, lecturaDeLaDemo } from './datos-demo';

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
    expect(new Set(t.contratos.map((c) => c.estadoDelMes))).toEqual(new Set(['AL_DIA', 'POR_REVISAR', 'SIN_FACTURA', 'RECHAZADA', 'SIN_INICIAR']));
    expect(t.resumen.sinIniciar).toBe(1);
    // Portofino 29-10-2026: la factura cuenta por el corte (del 16 de agosto al 15 de septiembre = septiembre).
    expect(t.contratos.find((c) => c.estadoDelMes === 'AL_DIA')?.ultimaFactura?.corte).toEqual({ desde: '2026-08-16', hasta: '2026-09-15', dias: 31 });
    expect(t.contratos.some((c) => c.cuentas?.some((x) => x.cobertura === '12 meses sin servicio de EPM'))).toBe(true);
    expect(lecturaDeLaDemo('/contracts/demo-sp-2/servicios-publicos')).toMatchObject({ contractId: 'demo-sp-2' });
    // Las liquidaciones de entrada y de entrega también tienen su ejemplo (la pestaña no le pega al back con un id falso).
    const salida = lecturaDeLaDemo('/contracts/demo-sp-2/servicios-publicos/liquidacion-de-salida?fechaEntrega=2026-10-29') as { filas: unknown[]; totalCop: number };
    expect(salida.filas.length).toBeGreaterThan(1);
    expect(salida.totalCop).toBeGreaterThan(0);
    expect(
      lecturaDeLaDemo('/inmobiliaria/servicios-publicos/liquidacion-de-entrada?periodoDesde=2026-08-15&periodoHasta=2026-09-15&valorCop=115260&entrega=2026-09-08'),
    ).toMatchObject({ diasDelCorte: 32, anterior: { dias: 24, valorCop: 86_445 }, nuevo: { dias: 8, valorCop: 28_815 } });
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

describe('los datos de ejemplo de Propietarios (Nico 30-10)', () => {
  it('la lista abre con dos giros atrasados, la ficha trae sus inmuebles y sólo sus consignaciones', () => {
    const lista = lecturaDeLaDemo('/inmobiliaria/propietarios') as Array<{ id: string; pendingBalance: number }>;
    expect(lista.length).toBe(6);
    expect(lista.filter((p) => p.pendingBalance > 0)).toHaveLength(2);
    const ficha = lecturaDeLaDemo('/inmobiliaria/propietarios/demo-pr-1') as { inmuebles: unknown[]; bankAccountNumber: string | null };
    expect(ficha.inmuebles).toHaveLength(2);
    expect(ficha.bankAccountNumber).toBeTruthy();
    const suyas = lecturaDeLaDemo('/inmobiliaria/consignaciones?propietarioId=demo-pr-1') as Array<{ propietarioId: string; listingType: string }>;
    expect(suyas).toHaveLength(2);
    expect(suyas.every((c) => c.propietarioId === 'demo-pr-1' && c.listingType === 'RENT')).toBe(true);
    // La lista general de consignaciones sigue siendo la de la demo de Mantenimientos.
    expect((lecturaDeLaDemo('/inmobiliaria/consignaciones') as Array<{ propietarioId: string }>).some((c) => c.propietarioId.startsWith('demo-pr-'))).toBe(false);
    expect(hayDatosDeEjemplo('propietarios')).toBe(true);
  });
});

describe('el propietario independiente en lo gratis (Nico 30-10)', () => {
  it('sus partes cerradas sirven los datos de ejemplo; lo abierto (sus inmuebles) va al back', async () => {
    entrarAlModoDemo();
    window.history.pushState({}, '', '/panel/giros');
    const g = await apiClient.get<{ giros: Array<{ estado: string }> }>('/portal/propietario/giros');
    expect(g.giros.some((x) => x.estado === 'REGIRADO')).toBe(true);
    expect(pedir).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/panel/propiedades');
    await apiClient.get('/portal/propietario/giros').catch(() => null);
    expect(pedir).toHaveBeenCalled();
    expect(hayDatosDeEjemploDelPropietario('giros')).toBe(true);
    expect(hayDatosDeEjemploDelPropietario('contratos-que-no-existen')).toBe(false);
  });
});

describe('las demás secciones del propietario independiente (Nico 30-10: «cada sección»)', () => {
  it('todas tienen datos de ejemplo', () => {
    for (const clave of ['cobro', 'estudio', 'aprobaciones', 'revisar-canon', 'informes', 'certificados', 'solicitudes']) {
      expect(hayDatosDeEjemploDelPropietario(clave)).toBe(true);
    }
  });

  it('cuadran entre sí: el canon de Contratos, el giro de Giros, el estado de cuenta, el certificado y la retención', () => {
    const [arriendo] = lecturaDeLaDemo('/leases') as Array<{ monthlyRent: number; contractId: string }>;
    const contrato = lecturaDeLaDemo(`/contracts/${arriendo!.contractId}`) as { monthlyRent: number };
    expect(arriendo!.monthlyRent).toBe(contrato.monthlyRent);

    const giros = (lecturaDeLaDemo('/portal/propietario/giros') as { giros: Array<{ mes: string; estado: string; valorCop: number }> }).giros;
    const estado = lecturaDeLaDemo('/portal/estado-de-cuenta') as {
      contratos: Array<{ secciones: { arriendos: Array<{ fechaVencimiento: string; estado: string; valorNeto: number }> } }>;
      porGirar: { porGirarCop: number };
    };
    const filas = estado.contratos[0]!.secciones.arriendos;
    for (const g of giros.filter((x) => x.mes >= '2026-03')) {
      const fila = filas.find((f) => f.fechaVencimiento.startsWith(g.mes))!;
      expect(fila.valorNeto).toBe(g.valorCop);
      // Lo que va en camino en Giros sigue por girar en el estado de cuenta.
      expect(fila.estado).toBe(g.estado === 'EN_CAMINO' ? 'PENDIENTE' : 'CANCELADA');
    }
    expect(estado.porGirar.porGirarCop).toBe(giros.find((g) => g.estado === 'EN_CAMINO')!.valorCop);

    const informe = lecturaDeLaDemo('/portal/propietario/certificado-de-ingresos?anio=2025') as { retencionesQueLePracticaronCop: number; ingresoBrutoCop: number };
    const { certificados } = lecturaDeLaDemo('/portal/certificados-de-retencion') as { certificados: Array<{ anio: number; baseCop: number; totalRetenidoCop: number }> };
    expect(certificados[0]).toMatchObject({ anio: 2025, baseCop: informe.ingresoBrutoCop, totalRetenidoCop: informe.retencionesQueLePracticaronCop });
  });

  it('Escoger inquilino trae candidatos sin datos de contacto; Aprobaciones, el historial por páginas y el detalle', () => {
    const e = lecturaDeLaDemo('/portal/elecciones-de-inquilino') as { pendientes: Array<{ candidatos: object[] }> };
    expect(e.pendientes[0]!.candidatos.length).toBeGreaterThan(2);
    expect(JSON.stringify(e)).not.toMatch(/@|telefono|phone|documento/i);
    const pagina = lecturaDeLaDemo('/portal/aprobaciones-de-reparacion/historial?pagina=1&porPagina=2') as { filas: object[]; total: number };
    expect(pagina.filas).toHaveLength(2);
    expect(pagina.total).toBe(3);
    expect(lecturaDeLaDemo('/portal/aprobaciones-de-reparacion/demo-apr-1/detalle')).toMatchObject({ id: 'demo-apr-1' });
  });

  it('🔴 la pregunta del portal sobre la sesión NUNCA sale de la demo (si no, el independiente se volvía de inmobiliaria)', async () => {
    entrarAlModoDemo();
    window.history.pushState({}, '', '/panel/estado-de-cuenta');
    const deEjemplo = await apiClient.get<{ contratos: unknown[] }>('/portal/estado-de-cuenta');
    expect(deEjemplo.contratos).toHaveLength(1);
    expect(pedir).not.toHaveBeenCalled();
    const deVerdad = await apiClient.getDeVerdad<{ delBack?: boolean }>('/portal/estado-de-cuenta');
    expect(deVerdad).toEqual({ delBack: true });
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('en la demo no se bajan documentos: se frena con su frase, sin pedirle nada al back', async () => {
    entrarAlModoDemo();
    window.history.pushState({}, '', '/panel/certificados');
    await expect(apiClient.getBlob('/portal/propietario/facturas/demo-fc-2026-10/pdf')).rejects.toMatchObject({
      status: 403,
      code: 'MODO_DEMO',
      message: 'En la demo no se descargan documentos: son datos de ejemplo.',
    });
    expect(pedir).not.toHaveBeenCalled();
  });
});
