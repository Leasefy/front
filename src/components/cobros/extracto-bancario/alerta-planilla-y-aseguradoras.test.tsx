/**
 * Conciliación, ola 3 (Nico, 03-10-2026): la alerta de partidas a los 30 días
 * (P10), la planilla de caja sólo con el efectivo prendido (P12) y la relación
 * de pagos de una aseguradora con su mapeo de columnas (P6).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, conciliacion, toastMock, parse } = vi.hoisted(() => ({
  api: { alertas: vi.fn(), planillas: vi.fn(), conciliarPlanilla: vi.fn(), aseguradoras: vi.fn(), relaciones: vi.fn(), relacion: vi.fn(), cargarRelacion: vi.fn() },
  conciliacion: { conciliarConRecibos: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  parse: vi.fn(),
}));
vi.mock('@/lib/api/cierre-de-conciliacion', async (original) => {
  const real = await original<typeof import('@/lib/api/cierre-de-conciliacion')>();
  return { ...real, cierreDeConciliacionApi: api };
});
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: conciliacion }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({ parseSpreadsheetFile: parse }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }));

import { AlertaDePartidas } from './AlertaDePartidas';
import { PlanillaDeCaja } from './PlanillaDeCaja';
import { RelacionDeAseguradora } from './RelacionDeAseguradora';

let root: Root;
let contenedor: HTMLDivElement;
async function montar(nodo: React.ReactNode) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(nodo);
  });
}
const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('alerta de partidas', () => {
  it('🔴 con partidas de más de N días, el aviso dice cuántas, cuánto y los tres rangos', async () => {
    api.alertas.mockResolvedValue({
      hayAlerta: true,
      frase: '3 partidas del banco llevan más de 30 días sin conciliar ($120).',
      rangos: [
        { rango: '0-30', nombre: 'De 0 a 30 días', n: 1, valorAbsolutoCop: 100 },
        { rango: '31-60', nombre: 'De 31 a 60 días', n: 2, valorAbsolutoCop: 50 },
        { rango: 'mas-de-60', nombre: 'Más de 60 días', n: 1, valorAbsolutoCop: 70 },
      ],
      porCuenta: [],
    });
    await montar(<AlertaDePartidas />);
    expect($('alerta-de-partidas')?.textContent).toMatch(/3 partidas del banco llevan más de 30 días/);
    expect($('alerta-de-partidas')?.textContent).toMatch(/Más de 60 días: 1/);
  });

  it('sin nada viejo, o si no se pudo leer, no hay aviso', async () => {
    api.alertas.mockResolvedValue({ hayAlerta: false, frase: null, rangos: [], porCuenta: [] });
    await montar(<AlertaDePartidas />);
    expect($('alerta-de-partidas')).toBeNull();
    act(() => root.unmount());
    contenedor.remove();
    api.alertas.mockRejectedValue(new Error('caído'));
    await montar(<AlertaDePartidas />);
    expect($('alerta-de-partidas')).toBeNull();
  });
});

describe('planilla de caja', () => {
  it('🔴 con el efectivo apagado (por defecto) no se pinta nada', async () => {
    api.planillas.mockResolvedValue({ activo: false, motivo: 'no recibe efectivo', desde: null, hasta: null, planillas: [] });
    await montar(<PlanillaDeCaja puedeConciliar onCambio={() => {}} />);
    expect($('planilla-de-caja')).toBeNull();
  });

  it('prendido: cada día con su consignación; «Conciliar» manda el día y la línea', async () => {
    api.planillas.mockResolvedValue({
      activo: true,
      motivo: null,
      desde: '2026-09-01',
      hasta: '2026-09-30',
      planillas: [
        {
          fecha: '2026-09-14',
          recibos: [{ id: 'r1', numero: 1, valorCop: 500_000, respaldado: false }],
          totalCop: 500_000,
          porConsignarCop: 500_000,
          estado: 'POR_CONSIGNAR',
          diasSinConsignar: 2,
          reciboIdsPorConsignar: ['r1'],
          propuestas: [{ movimientoId: 'm1', fecha: '2026-09-15', valorCop: 500_000, descripcion: 'CONSIGNACION EFECTIVO', segura: true, porQue: ['Mismo valor.'] }],
        },
      ],
    });
    api.conciliarPlanilla.mockResolvedValue({});
    const onCambio = vi.fn();
    await montar(<PlanillaDeCaja puedeConciliar onCambio={onCambio} />);
    expect($('planilla-2026-09-14')?.textContent).toMatch(/Por consignar/);
    expect($('planilla-2026-09-14')?.textContent).toMatch(/Segura/);
    await act(async () => $('conciliar-planilla-2026-09-14-m1')!.click());
    expect(api.conciliarPlanilla).toHaveBeenCalledWith('2026-09-14', 'm1');
    expect(onCambio).toHaveBeenCalled();
  });
});

describe('relación de pagos de una aseguradora', () => {
  it('sin aseguradoras registradas no se pinta', async () => {
    api.aseguradoras.mockResolvedValue({ disponible: true, motivo: null, aseguradoras: [] });
    api.relaciones.mockResolvedValue({ disponible: true, relaciones: [] });
    await montar(<RelacionDeAseguradora puedeConciliar onCambio={() => {}} />);
    expect($('relacion-de-aseguradora')).toBeNull();
  });

  it('🔴 lee el archivo con el mapeo, lo carga y concilia la línea del banco con los recibos cruzados', async () => {
    api.aseguradoras.mockResolvedValue({
      disponible: true,
      motivo: null,
      aseguradoras: [{ id: 'as1', nombre: 'El Libertador', nit: '860002183', mapeo: null }],
    });
    api.relaciones.mockResolvedValue({ disponible: true, relaciones: [] });
    parse.mockResolvedValue({ headers: ['Siniestro', 'Valor pagado'], rows: [{ _rowIndex: 1, Siniestro: 'SIN-1', 'Valor pagado': '965.000' }], sheetNames: ['h'] });
    const relacion = {
      id: 'rel1',
      aseguradora: { id: 'as1', nombre: 'El Libertador', nit: '860002183' },
      nombreArchivo: 'r.xlsx',
      filas: 1,
      totalNetoCop: 965_000,
      totalBrutoCop: null,
      totalRetencionCop: null,
      fechaDesde: null,
      fechaHasta: null,
      cargadaAt: '2026-10-02T00:00:00.000Z',
      retencionConfiguradaPct: null,
      lineas: [{ fila: 1, fecha: null, netoCop: 965_000, siniestro: 'SIN-1', contrato: null, documento: null, nombre: null, cruce: { estado: 'CRUZADO', reciboId: 'r1', por: 'siniestro', retencionCop: 0, detalle: 'Recibo N.º 1 por siniestro.' } }],
      resumen: { cruzadas: 1, yaConciliadas: 0, aLaPersona: 0, sinRecibo: 0 },
      banco: { motivo: null, propuestas: [{ movimientoId: 'm9', fecha: '2026-09-05', valorCop: 965_000, descripcion: 'PAGO EL LIBERTADOR', reciboIds: ['r1'], sumaDeLosRecibosCop: 965_000, diferenciaCop: 0, segura: true, porQue: ['Total neto.'] }] },
    };
    api.cargarRelacion.mockResolvedValue(relacion);
    api.relacion.mockResolvedValue(relacion);
    conciliacion.conciliarConRecibos.mockResolvedValue({});
    await montar(<RelacionDeAseguradora puedeConciliar onCambio={() => {}} />);
    await act(async () => $('abrir-relacion')!.click());
    const select = $('elegir-aseguradora') as HTMLSelectElement;
    await act(async () => {
      select.value = 'as1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const input = $('archivo-de-la-relacion') as HTMLInputElement;
    const archivo = new File(['x'], 'r.xlsx');
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [archivo] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(($('columna-siniestro') as HTMLSelectElement).value).toBe('Siniestro');
    expect(($('columna-neto') as HTMLSelectElement).value).toBe('Valor pagado');
    await act(async () => $('cargar-relacion')!.click());
    expect(api.cargarRelacion).toHaveBeenCalledWith(
      expect.objectContaining({ aseguradoraId: 'as1', mapeo: { siniestro: 'Siniestro', neto: 'Valor pagado' }, filas: [expect.objectContaining({ siniestro: 'SIN-1', netoCop: 965_000 })] }),
    );
    expect($('relacion-cruzada')?.textContent).toMatch(/1 cruzadas/);
    await act(async () => ($('propuesta-de-la-relacion-m9')!.querySelector('button') as HTMLButtonElement).click());
    expect(conciliacion.conciliarConRecibos).toHaveBeenCalledWith('m9', ['r1']);
  });
});
