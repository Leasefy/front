/**
 * La portada de Contabilidad, QA de Contabilidad (CB-04, 03-10-2026).
 *
 *   · la fecha de «Últimos asientos» es la corta de la casa («4 oct 2026») y
 *     cabe; antes «4 de oct de …» se cortaba;
 *   · la alerta «Septiembre … sigue abierto» ya no trae su botón «Cerrar el
 *     mes»: la acción es UNA, «Cerrar período…» de la tarjeta del período.
 *
 * El armado (mocks del API) es el de `HubDeContabilidad.test.tsx`.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, gastos, exogena, procesos, toastMock } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: {
      listar: vi.fn(),
      cierre: vi.fn(),
      faltantes: vi.fn(),
      reprocesar: vi.fn(),
    },
    reportes: { balanceDePrueba: vi.fn() },
    mapeo: { rubros: vi.fn() },
  },
  /*
   * Las dos piezas del 18-09 que la portada consulta. Van mockeadas aunque el
   * test que las usa sea uno: sin esto, `gastosApi` y `exogenaApi` reales pegan
   * al `apiClient` y las OTRAS ocho pruebas de este archivo se caen por una
   * petición que no tiene nada que ver con lo que están probando.
   */
  gastos: { facturas: { listar: vi.fn() }, lotes: { listar: vi.fn() } },
  exogena: { resumen: vi.fn() },
  procesos: { exportarLibro: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/contabilidad.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/contabilidad.service')>()),
  contabilidadApi: api,
}));
vi.mock('@/lib/api/gastos.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/gastos.service')>()),
  gastosApi: gastos,
}));
vi.mock('@/lib/api/exogena.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/exogena.service')>()),
  exogenaApi: exogena,
}));
vi.mock('@/lib/api/procesos.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/procesos.service')>()),
  procesosApi: procesos,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('./Monto', () => ({
  Monto: ({ valor }: { valor: number }) => <span>{valor}</span>,
}));
// El rango sale con su marca, para poder afirmar DÓNDE vive (en el cajón, no
// en la portada) sin montar los dos `<input type="date">` de verdad.
vi.mock('./RangoDeFechas', () => ({
  RangoDeFechas: () => <div data-testid="rango-de-fechas" />,
}));
vi.mock('./asientos/CierreDePeriodo', () => ({
  CierreDePeriodo: ({ fallo }: { fallo?: boolean }) => (
    <div data-testid="cierre" data-fallo={String(Boolean(fallo))} />
  ),
}));

import { HubDeContabilidad } from './HubDeContabilidad';

const SIN_FALTANTES = {
  recibos: 0,
  lotes: 0,
  cobros: 0,
  total: 0,
  mapeoCompleto: true,
  eventosSinCuenta: [],
};

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<HubDeContabilidad />);
  });
  await esperar();
  await esperar();
}

const $ = (s: string) => document.querySelector<HTMLElement>(s);

beforeEach(() => {
  api.puc.listar.mockReset().mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
  api.asientos.listar.mockReset().mockResolvedValue({ asientos: [], total: 0 });
  api.asientos.cierre.mockReset().mockResolvedValue({ cerradaHasta: null });
  api.asientos.faltantes.mockReset().mockResolvedValue(SIN_FALTANTES);
  api.asientos.reprocesar.mockReset();
  api.reportes.balanceDePrueba.mockReset().mockResolvedValue({ cuadra: true, diferenciaCop: 0 });
  // Las cuatro del 18-09, en «nada que reportar»: cada prueba las pisa si le
  // interesan. `disponible: false` = la pieza todavía no existe ⇒ sin alerta.
  api.mapeo.rubros
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, completo: true, faltantes: [], rubros: [] });
  gastos.facturas.listar.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    total: 0,
    limite: 1,
    desplazamiento: 0,
    totales: { subtotalCop: 0, ivaCop: 0, retencionesCop: 0, totalCop: 0, netoCop: 0 },
    facturas: [],
  });
  gastos.lotes.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 0, lotes: [] });
  exogena.resumen.mockReset().mockResolvedValue({
    anio: new Date().getFullYear() - 1,
    formatos: [],
    disponible: true,
    cuantiasMenores: { activa: false, topeCop: 0, nit: '222222222', filas: 0 },
  });
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  toastMock.warning.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});


describe('HubDeContabilidad — CB-04', () => {
  it('🔴 «Últimos asientos» con la fecha corta de la casa', async () => {
    api.asientos.listar.mockResolvedValue({
      total: 1,
      asientos: [
        {
          id: 'a-163',
          numero: 163,
          fecha: '2026-10-04T00:00:00.000Z',
          descripcion: 'Reversa del asiento N.º 18',
          origen: 'MANUAL',
          origenId: null,
          cerrado: false,
          movimientos: [{ id: 'm', debitoCop: 1500000, creditoCop: 0 }],
        },
      ],
    });
    await montar();
    const fila = $('[data-testid="ultimo-asiento-a-163"]')!;
    expect(fila.textContent).toContain('4 oct 2026');
    expect(fila.textContent).not.toContain('de oct de');
  });

  it('🔴 la alerta del mes sin cerrar no repite la acción de la tarjeta del período', async () => {
    // El mes anterior tiene asientos y nada está cerrado ⇒ alerta «sigue abierto».
    api.asientos.listar.mockResolvedValue({ total: 50, asientos: [] });
    await montar();
    const alerta = $('[data-testid="alerta-mes-sin-cerrar"]')!;
    expect(alerta).not.toBeNull();
    expect(alerta.textContent).toMatch(/sigue abierto/);
    expect(alerta.querySelector('button')).toBeNull();
    expect(alerta.textContent).not.toContain('Cerrar el mes');
  });
});
